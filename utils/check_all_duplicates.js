#!/usr/bin/env node

/**
 * Script to check all DHIS2 Tracked Entity Instances (TEIs) for duplicates
 * based on NIC (old & new formats), Passport, Phone Number, Name, DOB, and Email.
 *
 * Usage:
 *   node check_all_duplicates.js [--refresh] [--json]
 */

const fs = require("fs");
const path = require("path");
const lankaNic = require("lanka-nic-2019");

function loadEnv() {
  const envPaths = [
    path.join(__dirname, ".env"),
    path.join(__dirname, "../application/.env.local"),
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "application/.env.local"),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const DHIS2_TOKEN = process.env.D2_AUTH || process.env.DHIS2_TOKEN;
const DHIS2_API_URL = (
  process.env.DHIS2_ENDPOINT ||
  process.env.DHIS2_API_URL ||
  "https://manager.srisambuddhamission.org/api"
).replace(/\/+$/, "");

const DHIS2_PROGRAM = "KdYt2OP9VjD";
const CACHE_FILE = path.join(__dirname, "tei_dump.json");

const ATTRS = {
  FULL_NAME: "fvk2p04ylAA",
  NAME_WITH_INITIALS: "MMb2cXBOrSY",
  NIC: "W1fmUMMnQdu",
  PRIMARY_ID: "EDhjneO1ofm",
  PASSPORT: "hv3aLM80Mrn",
  MOBILE: "lLXB9cYYgEP",
  HOME_PHONE: "ZRXiTWo2Vbq",
  WHATSAPP: "CpF36JSasMJ",
  DOB: "oZkvTN1dcPw",
  EMAIL: "lByRbJqnG5q",
};

const getAttr = (tei, code) => tei.attributes?.find((a) => a.attribute === code || a.displayName === code)?.value;

function normalizeNic(raw) {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[\s\-\.]/g, "").toUpperCase();
  if (!cleaned || cleaned.length < 5 || ["NA", "N/A", "NONE", "NULL", "0", "NIL", "NO", "NOTAVAILABLE"].includes(cleaned)) return null;
  try {
    const info = lankaNic.infoNic(cleaned);
    if (info && info.isValidated && info.newFormat) {
      return { key: info.newFormat, raw: cleaned, validated: true };
    }
  } catch (e) {}
  return { key: cleaned, raw: cleaned, validated: false };
}

function normalizePassport(raw) {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[\s\-\.]/g, "").toUpperCase();
  if (!cleaned || cleaned.length < 5 || ["NA", "N/A", "NONE", "NULL", "0", "NIL", "NO", "NOTAVAILABLE"].includes(cleaned)) return null;
  return cleaned;
}

function normalizePhone(raw) {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0094")) digits = digits.slice(4);
  else if (digits.startsWith("94") && digits.length >= 11) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) digits = digits.slice(1);
  if (digits.length < 7 || /^0+$/.test(digits) || digits === "12345670" || digits === "1234567890" || digits === "12345678" || digits === "987654321") return null;
  return digits;
}

function normalizeName(raw) {
  if (!raw) return "";
  let s = raw.toLowerCase().trim();
  s = s.replace(/\b(ven|ven\.|venerable|rev|rev\.|thero|mr|mr\.|mrs|mrs\.|miss|ms|ms\.|dr|dr\.|prof|prof\.)\b/gi, "");
  s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

async function fetchAllTeis(refresh = false) {
  if (!refresh && fs.existsSync(CACHE_FILE)) {
    console.log(`Loading TEIs from cache file (${CACHE_FILE})...`);
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  }

  if (!DHIS2_TOKEN) {
    console.error("Error: DHIS2_TOKEN or D2_AUTH environment variable is required.");
    process.exit(1);
  }

  console.log(`Fetching TEIs from ${DHIS2_API_URL}...`);
  let all = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    const url = `${DHIS2_API_URL}/tracker/trackedEntities.json?program=${DHIS2_PROGRAM}&ouMode=ACCESSIBLE&pageSize=${pageSize}&page=${page}&fields=trackedEntity,createdAt,updatedAt,attributes[attribute,displayName,value],enrollments[enrollment,events[event]]`;
    const res = await fetch(url, { headers: { Authorization: "ApiToken " + DHIS2_TOKEN } });
    if (!res.ok) {
      console.error(`Failed to fetch page ${page}: ${res.status} ${res.statusText}`);
      break;
    }
    const data = await res.json();
    const instances = data.instances || [];
    all.push(...instances);
    console.log(`  Page ${page}: ${instances.length} TEIs (total: ${all.length})`);
    if (instances.length < pageSize) break;
    page++;
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(all, null, 2));
  console.log(`Saved ${all.length} TEIs to cache.`);
  return all;
}

class UnionFind {
  constructor() {
    this.parent = new Map();
    this.edges = new Map();
  }
  find(i) {
    if (!this.parent.has(i)) {
      this.parent.set(i, i);
      this.edges.set(i, []);
      return i;
    }
    if (this.parent.get(i) === i) return i;
    const root = this.find(this.parent.get(i));
    this.parent.set(i, root);
    return root;
  }
  union(i, j, reason) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (!this.edges.has(i)) this.edges.set(i, []);
    this.edges.get(i).push({ with: j, reason });
    if (!this.edges.has(j)) this.edges.set(j, []);
    this.edges.get(j).push({ with: i, reason });

    if (rootI !== rootJ) {
      this.parent.set(rootI, rootJ);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const refresh = args.includes("--refresh");
  const jsonOnly = args.includes("--json");

  const teis = await fetchAllTeis(refresh);

  const list = teis.map((t) => {
    const id = t.trackedEntity;
    const fullName = getAttr(t, ATTRS.FULL_NAME) || "";
    const nameWithInitials = getAttr(t, ATTRS.NAME_WITH_INITIALS) || "";
    const nicAttr = getAttr(t, ATTRS.NIC);
    const primaryId = getAttr(t, ATTRS.PRIMARY_ID);
    const passportAttr = getAttr(t, ATTRS.PASSPORT);
    const mobile = getAttr(t, ATTRS.MOBILE);
    const homePhone = getAttr(t, ATTRS.HOME_PHONE);
    const whatsapp = getAttr(t, ATTRS.WHATSAPP);
    const dob = getAttr(t, ATTRS.DOB);
    const email = getAttr(t, ATTRS.EMAIL);
    const eventsCount = t.enrollments?.reduce((acc, e) => acc + (e.events?.length || 0), 0) || 0;

    const nicNorm = normalizeNic(nicAttr) || normalizeNic(primaryId);
    const passNorm = normalizePassport(passportAttr) || (primaryId && !normalizeNic(primaryId) ? normalizePassport(primaryId) : null);
    const mobileNorm = normalizePhone(mobile);
    const allPhones = new Set([mobileNorm, normalizePhone(homePhone), normalizePhone(whatsapp)].filter(Boolean));

    return {
      id,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      fullName,
      normName: normalizeName(fullName),
      nameWithInitials,
      nicRaw: nicAttr,
      primaryId,
      nicNorm: nicNorm?.key || null,
      passNorm,
      mobile: mobileNorm,
      allPhones: Array.from(allPhones),
      dob: dob && dob.length >= 8 ? dob : null,
      email: email && email.includes("@") ? email.toLowerCase().trim() : null,
      eventsCount,
    };
  });

  const uf = new UnionFind();

  // 1. Same NIC (using 12-digit canonical format or raw)
  const nicMap = new Map();
  for (let t of list) {
    if (t.nicNorm) {
      if (!nicMap.has(t.nicNorm)) nicMap.set(t.nicNorm, []);
      nicMap.get(t.nicNorm).push(t);
    }
  }
  for (let [nic, arr] of nicMap.entries()) {
    if (arr.length > 1) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          uf.union(arr[i].id, arr[j].id, `Same NIC (${nic})`);
        }
      }
    }
  }

  // 2. Same Passport
  const passMap = new Map();
  for (let t of list) {
    if (t.passNorm) {
      if (!passMap.has(t.passNorm)) passMap.set(t.passNorm, []);
      passMap.get(t.passNorm).push(t);
    }
  }
  for (let [pass, arr] of passMap.entries()) {
    if (arr.length > 1) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          uf.union(arr[i].id, arr[j].id, `Same Passport (${pass})`);
        }
      }
    }
  }

  // 3. Same Full Name & Same DOB
  const nameDobMap = new Map();
  for (let t of list) {
    if (t.normName && t.dob) {
      let key = `${t.normName}___${t.dob}`;
      if (!nameDobMap.has(key)) nameDobMap.set(key, []);
      nameDobMap.get(key).push(t);
    }
  }
  for (let [k, arr] of nameDobMap.entries()) {
    if (arr.length > 1) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          uf.union(arr[i].id, arr[j].id, `Same Name & DOB (${arr[i].dob})`);
        }
      }
    }
  }

  // 4. Same Full Name & Same Mobile
  const nameMobileMap = new Map();
  for (let t of list) {
    if (t.normName && t.mobile) {
      let key = `${t.normName}___${t.mobile}`;
      if (!nameMobileMap.has(key)) nameMobileMap.set(key, []);
      nameMobileMap.get(key).push(t);
    }
  }
  for (let [k, arr] of nameMobileMap.entries()) {
    if (arr.length > 1) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          uf.union(arr[i].id, arr[j].id, `Same Name & Mobile (${arr[i].mobile})`);
        }
      }
    }
  }

  // 5. Same Mobile & Same DOB
  const mobileDobMap = new Map();
  for (let t of list) {
    if (t.mobile && t.dob) {
      let key = `${t.mobile}___${t.dob}`;
      if (!mobileDobMap.has(key)) mobileDobMap.set(key, []);
      mobileDobMap.get(key).push(t);
    }
  }
  for (let [k, arr] of mobileDobMap.entries()) {
    if (arr.length > 1) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          uf.union(arr[i].id, arr[j].id, `Same Mobile (${arr[i].mobile}) & DOB (${arr[i].dob})`);
        }
      }
    }
  }

  // 6. Exact Full Name matches
  const exactNameMap = new Map();
  for (let t of list) {
    if (t.normName && t.normName.length > 5) {
      if (!exactNameMap.has(t.normName)) exactNameMap.set(t.normName, []);
      exactNameMap.get(t.normName).push(t);
    }
  }
  for (let [k, arr] of exactNameMap.entries()) {
    if (arr.length > 1) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          uf.union(arr[i].id, arr[j].id, `Exact Full Name: "${arr[i].fullName}"`);
        }
      }
    }
  }

  // Group into clusters
  const teiLookup = new Map(list.map((t) => [t.id, t]));
  const clusters = new Map();
  for (let t of list) {
    let root = uf.find(t.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(t.id);
  }

  const duplicateClusters = Array.from(clusters.values()).filter((c) => c.length > 1);

  const results = duplicateClusters.map((cluster, idx) => {
    const teisInCluster = cluster.map((id) => teiLookup.get(id));
    // Sort: most events first, then earliest created
    teisInCluster.sort((a, b) => b.eventsCount - a.eventsCount || a.createdAt.localeCompare(b.createdAt));
    const keepTei = teisInCluster[0];
    const sourceTeis = teisInCluster.slice(1);

    const reasons = new Set();
    for (let id of cluster) {
      let edges = uf.edges.get(id) || [];
      for (let e of edges) {
        if (cluster.includes(e.with)) reasons.add(e.reason);
      }
    }

    return {
      clusterIndex: idx + 1,
      reasons: Array.from(reasons),
      keepTei: keepTei.id,
      keepTeiName: keepTei.fullName,
      keepTeiEvents: keepTei.eventsCount,
      sourceTeis: sourceTeis.map((s) => s.id),
      mergeCommands: sourceTeis.map((s) => `node move_tei_events.js ${keepTei.id} ${s.id}`),
      teis: teisInCluster.map((t) => ({
        id: t.id,
        name: t.fullName,
        initials: t.nameWithInitials,
        nic: t.nicRaw || t.nicNorm || "-",
        passport: t.passNorm || "-",
        mobile: t.mobile || "-",
        dob: t.dob || "-",
        eventsCount: t.eventsCount,
        createdAt: t.createdAt,
      })),
    };
  });

  const outputPath = path.join(__dirname, "final_confirmed_duplicates.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  if (jsonOnly) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(`\n======================================================`);
  console.log(`DHIS2 TEI DUPLICATE ANALYSIS SUMMARY`);
  console.log(`======================================================`);
  console.log(`Total Tracked Entity Instances analyzed: ${list.length}`);
  console.log(`Total Confirmed Duplicate Clusters:     ${results.length}`);
  console.log(`Total TEIs in Duplicate Clusters:       ${duplicateClusters.reduce((s, c) => s + c.length, 0)}`);
  console.log(`Output saved to:                        ${outputPath}\n`);

  results.forEach((c) => {
    console.log(`------------------------------------------------------`);
    console.log(`Cluster #${c.clusterIndex} | Primary: [${c.keepTei}] ${c.keepTeiName} (${c.keepTeiEvents} events)`);
    console.log(`Match Reason(s): ${c.reasons.join(" | ")}`);
    console.log(`TEIs:`);
    c.teis.forEach((t) => {
      const isKeep = t.id === c.keepTei ? " [KEEP]" : " [MERGE/DELETE]";
      console.log(`  * ${t.id}${isKeep} | Name: "${t.name}" | NIC: ${t.nic} | Passport: ${t.passport} | Phone: ${t.mobile} | DOB: ${t.dob} | Events: ${t.eventsCount}`);
    });
    console.log(`Merge Command(s):`);
    c.mergeCommands.forEach((cmd) => console.log(`  $ ${cmd}`));
  });
}

main().catch(console.error);
