const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

// Attempt to load .env file right next to this script or application/.env.local
function loadEnv() {
  const envPaths = [
    path.join(__dirname, ".env"),
    path.join(__dirname, "../../application/.env.local"),
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
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const DHIS2_ENDPOINT =
  process.env.DHIS2_ENDPOINT || "https://manager.srisambuddhamission.org/api/";
const DHIS2_TOKEN = process.env.DHIS2_TOKEN;

if (!DHIS2_TOKEN) {
  console.error(
    "Error: DHIS2_TOKEN is not defined in environment or .env files."
  );
  process.exit(1);
}
const DHIS2_PROGRAM = "KdYt2OP9VjD";

// Attribute UIDs
const ATTR_FULL_NAME = "fvk2p04ylAA";
const ATTR_NAME_WITH_INITIALS = "MMb2cXBOrSY";
const ATTR_MOBILE = "lLXB9cYYgEP";
const ATTR_WHATSAPP = "CpF36JSasMJ";
const ATTR_HOME_PHONE = "ZRXiTWo2Vbq";

const normalizePhoneNumber = (phone) => {
  if (!phone) return "";
  return phone.replace(/^\+94/, "0");
};

const parseScientificNotation = (str) => {
  const num = Number(str);
  if (!isNaN(num)) {
    return num.toLocaleString("fullwide", { useGrouping: false });
  }
  return String(str);
};

const cleanString = (str) => {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, " ")
    .trim();
};

const isValidSriLankanMobile = (phone) => {
  return /^07\d{8}$/.test(phone);
};

const parseTokenToPhone = (token) => {
  if (!token) return null;
  let s = token.trim();

  s = s.replace(
    /^(?:mobile|whatsapp|what'?s|phone|tel|contact|normal|no)\s*[:\.\-]?\s*/i,
    ""
  );
  s = s.replace(/^no\.\s*/i, "");

  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(s)) {
    s = parseScientificNotation(s);
  }

  s = s.replace(/^[Oo](\d+)/, "0$1");

  const hasPlus = s.startsWith("+");
  let cleaned = s.replace(/[^\d]/g, "");
  if (hasPlus) cleaned = "+" + cleaned;

  if (!cleaned || cleaned === "+") return null;

  if (/^\d{9}[vVxX]$/i.test(s.trim())) return null;
  if (/^(?:19|20)\d{6}$/.test(cleaned) && s.includes(" ")) return null;

  let formatted = cleaned;
  if (formatted.startsWith("+94")) {
    formatted = normalizePhoneNumber(formatted);
  } else if (formatted.startsWith("0094")) {
    formatted = "0" + formatted.slice(4);
  } else if (/^94\d{9}$/.test(formatted)) {
    formatted = "0" + formatted.slice(2);
  } else if (/^7\d{8}$/.test(formatted)) {
    formatted = "0" + formatted;
  } else if (/^07\d{8}[vV]$/i.test(s.trim())) {
    formatted = formatted.slice(0, 10);
  }

  return formatted;
};

const extractPhoneNumber = (raw) => {
  if (raw === undefined || raw === null) return "";
  const str = cleanString(raw);
  if (!str) return "";

  const pipeParts = str
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of pipeParts) {
    const subParts = part
      .split(/[\/\r\n]+|,\s*(?=[+0-9Oo])|\b(?:whatsapp|what'?s|mobile|normal)\b/i)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sub of subParts) {
      const p = parseTokenToPhone(sub);
      if (p && isValidSriLankanMobile(p)) {
        return p;
      }
    }
  }

  // If no valid Sri Lankan mobile was found, check if any token parsed at all
  for (const part of pipeParts) {
    const subParts = part
      .split(/[\/\r\n]+|,\s*(?=[+0-9Oo])|\b(?:whatsapp|what'?s|mobile|normal)\b/i)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sub of subParts) {
      const p = parseTokenToPhone(sub);
      if (p) return p;
    }
  }

  return "";
};

async function fetchAllTrackedEntities() {
  const instances = [];
  let page = 1;
  const pageSize = 250;
  const baseUrl = DHIS2_ENDPOINT.endsWith("/")
    ? DHIS2_ENDPOINT
    : DHIS2_ENDPOINT + "/";

  console.log(`Connecting to DHIS2 at ${baseUrl}...`);

  while (true) {
    const url = new URL(
      `tracker/trackedEntities?program=${DHIS2_PROGRAM}&ouMode=ACCESSIBLE&fields=trackedEntity,attributes[attribute,value]&pageSize=${pageSize}&page=${page}`,
      baseUrl
    );

    process.stdout.write(`Fetching page ${page}... `);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: "ApiToken " + DHIS2_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`DHIS2 error HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const batch = data.instances || [];
    instances.push(...batch);
    console.log(`got ${batch.length} records (Total so far: ${instances.length}/${data.total || "?"})`);

    if (batch.length < pageSize || (data.total && instances.length >= data.total)) {
      break;
    }
    page++;
  }

  return instances;
}

async function main() {
  console.log("=== DHIS2 Tracked Entities Phone Formatter ===");
  const teList = await fetchAllTrackedEntities();
  console.log(`\nSuccessfully fetched ${teList.length} tracked entities from DHIS2.`);

  const validRecords = [];
  const invalidRecords = [];
  const emptyRecords = [];

  for (const te of teList) {
    const attrs = te.attributes || [];
    const getAttr = (uid) => {
      const found = attrs.find((a) => a.attribute === uid);
      return found ? found.value : "";
    };

    const fullName = cleanString(getAttr(ATTR_FULL_NAME));
    const nameWithInitials = cleanString(getAttr(ATTR_NAME_WITH_INITIALS));
    const name = fullName || nameWithInitials || "Unknown";

    const rawMobile = getAttr(ATTR_MOBILE);
    const rawWhatsapp = getAttr(ATTR_WHATSAPP);
    const rawHomePhone = getAttr(ATTR_HOME_PHONE);

    // Prefer mobile, then whatsapp, then home
    let phoneCandidate = "";
    let rawUsed = "";

    // Test mobile
    if (rawMobile) {
      const extracted = extractPhoneNumber(rawMobile);
      if (isValidSriLankanMobile(extracted)) {
        phoneCandidate = extracted;
        rawUsed = rawMobile;
      }
    }

    // If mobile didn't produce a valid mobile, try whatsapp
    if (!phoneCandidate && rawWhatsapp) {
      const extracted = extractPhoneNumber(rawWhatsapp);
      if (isValidSriLankanMobile(extracted)) {
        phoneCandidate = extracted;
        rawUsed = rawWhatsapp;
      }
    }

    // If still not valid, try home phone (sometimes people put mobile in home phone field)
    if (!phoneCandidate && rawHomePhone) {
      const extracted = extractPhoneNumber(rawHomePhone);
      if (isValidSriLankanMobile(extracted)) {
        phoneCandidate = extracted;
        rawUsed = rawHomePhone;
      }
    }

    // If still no valid phone, see what raw values were entered
    if (!phoneCandidate) {
      const fallbackRaw = rawMobile || rawWhatsapp || rawHomePhone;
      if (!fallbackRaw) {
        emptyRecords.push({ id: te.trackedEntity, name });
      } else {
        const extracted = extractPhoneNumber(fallbackRaw);
        invalidRecords.push({
          id: te.trackedEntity,
          name,
          raw: fallbackRaw,
          extracted,
        });
      }
    } else {
      validRecords.push({
        Name: name,
        Phone: phoneCandidate,
      });
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`Total Tracked Entities: ${teList.length}`);
  console.log(`Valid 07xxxxxxxx phone numbers: ${validRecords.length}`);
  const uniquePhones = new Set(validRecords.map((r) => r.Phone));
  console.log(`Unique valid phone numbers:     ${uniquePhones.size}`);
  console.log(`Empty phone records:            ${emptyRecords.length}`);
  console.log(`Invalid phone records:          ${invalidRecords.length}`);

  if (invalidRecords.length > 0) {
    console.log("\nSample invalid phone entries:");
    invalidRecords.slice(0, 10).forEach((inv, idx) => {
      console.log(
        `  ${idx + 1}. [${inv.name}] Raw: "${inv.raw}" -> Parsed: "${inv.extracted}"`
      );
    });
  }

  // Export to CSV
  const csvPath = path.join(__dirname, "DHIS2-TrackedEntities-Formatted.csv");
  const csvLines = ["Name,Phone"];
  for (const r of validRecords) {
    const escName = `"${r.Name.replace(/"/g, '""')}"`;
    const escPhone = `"${r.Phone.replace(/"/g, '""')}"`;
    csvLines.push(`${escName},${escPhone}`);
  }
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf-8");
  console.log(`\nExported CSV: ${csvPath}`);

  // Export to XLSX
  const xlsxPath = path.join(__dirname, "DHIS2-TrackedEntities-Formatted.xlsx");
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(validRecords, {
    header: ["Name", "Phone"],
  });
  xlsx.utils.book_append_sheet(wb, ws, "TrackedEntities");
  xlsx.writeFile(wb, xlsxPath);
  console.log(`Exported XLSX: ${xlsxPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
