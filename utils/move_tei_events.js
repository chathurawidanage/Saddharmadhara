#!/usr/bin/env node

/**
 * Script to copy events from a duplicate DHIS2 Tracked Entity Instance (TEI)
 * to a target TEI so all historical participations and applications are consolidated.
 * (Source TEI is preserved so you can review and delete it manually via the UI).
 *
 * Usage:
 *   node move_tei_events.js [keep_tei_id] [source_tei_id]
 *   node move_tei_events.js --token <token> [keep_tei_id] [source_tei_id]
 *   node move_tei_events.js [keep_tei_id] [source_tei_id] <token>
 *   node move_tei_events.js --dry-run [keep_tei_id] [source_tei_id]
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Load .env files
function loadEnv() {
  const envPaths = [
    path.join(__dirname, ".env"),
    path.join(__dirname, "../application/.env.local"),
    path.join(__dirname, "../../application/.env.local"),
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

const DHIS2_API_URL = (
  process.env.DHIS2_ENDPOINT ||
  process.env.DHIS2_API_URL ||
  "https://manager.srisambuddhamission.org/api"
).replace(/\/+$/, "");

let DHIS2_TOKEN = process.env.D2_AUTH || process.env.DHIS2_TOKEN;

const DHIS2_PROGRAM = "KdYt2OP9VjD";
const DHIS2_PROGRAM_STAGE_EOI = "BLn1j2VgLZf";
const DHIS2_PROGRAM_STAGE_PARTICIPATION = "NYxnKQd6goA";
const DHIS2_PROGRAM_STAGE_SPECIAL_COMMENT = "owqAYpdS5dr";

const DHIS2_RETREAT_DATA_ELEMENT = "rYqV3VQu7LS";
const DHIS2_SELECTION_STATE_DATA_ELEMENT = "MVaziT78i7p";
const DHIS2_ATTENDANCE_DATA_ELEMENT = "CzwVwJ30hTj";
const DHIS2_SPECIAL_COMMENT_DATA_ELEMENT = "PH2ygv78F19";

const STAGE_NAMES = {
  [DHIS2_PROGRAM_STAGE_EOI]: "Expression of Interest",
  [DHIS2_PROGRAM_STAGE_PARTICIPATION]: "Participation / Attendance",
  [DHIS2_PROGRAM_STAGE_SPECIAL_COMMENT]: "Special Comment",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(query) {
  return new Promise((resolve) => {
    if (rl.closed) {
      resolve("");
      return;
    }
    rl.question(query, resolve);
    rl.once("close", () => resolve(""));
  });
}

async function askConfirm(query, defaultYes = false) {
  const suffix = defaultYes ? " (Y/n): " : " (y/N): ";
  const answer = (await ask(query + suffix)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `ApiToken ${DHIS2_TOKEN}`,
  };
}

async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${DHIS2_API_URL}/${endpoint.replace(/^\/+/, "")}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // raw text response
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data: json || text,
  };
}

async function fetchTei(teiId) {
  const res = await apiRequest(
    `tracker/trackedEntities/${teiId}?program=${DHIS2_PROGRAM}&fields=trackedEntity,createdAt,updatedAt,attributes[attribute,displayName,value],enrollments[enrollment,status,createdAt,events[event,programStage,occurredAt,scheduledAt,status,orgUnit,attributeOptionCombo,attributeCategoryOptions,dataValues[dataElement,value]]]`
  );

  if (!res.ok) {
    return null;
  }
  return res.data;
}

function getTeiAttr(tei, displayNamePart) {
  const attr = tei.attributes?.find(
    (a) =>
      a.displayName?.toLowerCase().includes(displayNamePart.toLowerCase()) ||
      a.attribute === displayNamePart
  );
  return attr?.value || "-";
}

function formatTeiSummary(tei, label) {
  const name = getTeiAttr(tei, "Full Name");
  const nic = getTeiAttr(tei, "National Identity Card Number");
  const passport = getTeiAttr(tei, "Passport");
  const phone = getTeiAttr(tei, "Mobile");
  const createdAt = tei.createdAt ? new Date(tei.createdAt).toLocaleString() : "-";
  const updatedAt = tei.updatedAt ? new Date(tei.updatedAt).toLocaleString() : "-";
  const eventsCount = tei.enrollments?.[0]?.events?.length || 0;

  return [
    `------------------------------------------------------------------------`,
    `[${label}] TEI ID: ${tei.trackedEntity}`,
    `  Name:        ${name}`,
    `  NIC:         ${nic}`,
    `  Passport:    ${passport}`,
    `  Mobile:      ${phone}`,
    `  Created At:  ${createdAt}`,
    `  Updated At:  ${updatedAt}`,
    `  Events:      ${eventsCount} in Saddharmadhara enrollment`,
    `------------------------------------------------------------------------`,
  ].join("\n");
}

const DHIS2_INVITATION_STATE_DATA_ELEMENT = "UkXg5kMsDBH";

function summarizeEvent(event) {
  const stageName = STAGE_NAMES[event.programStage] || event.programStage;
  const retreat = event.dataValues?.find((dv) => dv.dataElement === DHIS2_RETREAT_DATA_ELEMENT)?.value || "Unknown Retreat";
  const state = event.dataValues?.find((dv) => dv.dataElement === DHIS2_SELECTION_STATE_DATA_ELEMENT)?.value;
  const invitation = event.dataValues?.find((dv) => dv.dataElement === DHIS2_INVITATION_STATE_DATA_ELEMENT)?.value;
  const attendance = event.dataValues?.find((dv) => dv.dataElement === DHIS2_ATTENDANCE_DATA_ELEMENT)?.value;
  const comment = event.dataValues?.find((dv) => dv.dataElement === DHIS2_SPECIAL_COMMENT_DATA_ELEMENT)?.value;

  const details = [
    retreat,
    state ? `State: ${state}` : null,
    invitation ? `Invitation: ${invitation}` : null,
    attendance ? `Attendance: ${attendance}` : null,
    comment ? `Comment: "${comment.trim().slice(0, 30)}..."` : null,
    event.occurredAt ? `Date: ${event.occurredAt.split("T")[0]}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return `[${stageName}] ${details} (event: ${event.event})`;
}

async function main() {
  console.log("\n========================================================================");
  console.log("       DHIS2 Tracked Entity Instance (TEI) Merge & Event Mover         ");
  console.log("========================================================================\n");

  // Parse command line arguments and options
  const rawArgs = process.argv.slice(2);
  const isDryRun = rawArgs.includes("--dry-run");

  let cliToken = null;
  const nonFlagArgs = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "--dry-run") {
      continue;
    } else if (arg.startsWith("--token=")) {
      cliToken = arg.slice(arg.indexOf("=") + 1).trim();
    } else if ((arg === "--token" || arg === "-t") && i + 1 < rawArgs.length) {
      cliToken = rawArgs[++i].trim();
    } else if (arg.startsWith("d2pat_")) {
      cliToken = arg.trim();
    } else if (!arg.startsWith("-")) {
      nonFlagArgs.push(arg);
    }
  }

  if (cliToken) {
    DHIS2_TOKEN = cliToken;
  }

  // If 3 non-flag args passed and token was not yet set: <keepId> <deleteId> <token>
  if (!cliToken && nonFlagArgs.length >= 3) {
    DHIS2_TOKEN = nonFlagArgs.pop();
  }

  if (!DHIS2_TOKEN) {
    DHIS2_TOKEN = (await ask("Enter DHIS2 Personal Access Token: ")).trim();
  }

  if (!DHIS2_TOKEN) {
    console.error("❌ Error: DHIS2 token is required!");
    console.error("Pass it via --token <token>, D2_AUTH, DHIS2_TOKEN, or in .env file.");
    process.exit(1);
  }

  if (cliToken) {
    console.log("🔑 Using DHIS2 token provided via command-line argument.");
  }

  // Verify connection & token permissions
  console.log(`Connecting to: ${DHIS2_API_URL}`);
  const meRes = await apiRequest("me");
  if (!meRes.ok) {
    console.error(`❌ Authentication failed: HTTP ${meRes.status} (${meRes.statusText})`);
    console.error("Please check your DHIS2 token credentials.");
    process.exit(1);
  }
  console.log(` Authenticated as: ${meRes.data.displayName} (${meRes.data.username})\n`);

  if (isDryRun) {
    console.log(" Running in DRY-RUN mode (no changes will be applied to DHIS2).\n");
  }

  let keepId = nonFlagArgs[0];
  let deleteId = nonFlagArgs[1];

  if (!keepId) {
    keepId = (await ask("Enter TEI ID to KEEP (target profile): ")).trim();
  }
  if (!deleteId) {
    deleteId = (await ask("Enter TEI ID to MOVE FROM & DELETE (source duplicate): ")).trim();
  }

  if (!keepId || !deleteId) {
    console.error("❌ Both TEI IDs are required.");
    process.exit(1);
  }

  if (keepId === deleteId) {
    console.error("❌ Target and Source TEI IDs cannot be identical.");
    process.exit(1);
  }

  // Fetch TEIs
  console.log(`\nFetching TEI profiles from DHIS2...`);
  let [targetTei, sourceTei] = await Promise.all([fetchTei(keepId), fetchTei(deleteId)]);

  if (!targetTei) {
    console.error(`❌ Target TEI not found: ${keepId}`);
    process.exit(1);
  }
  if (!sourceTei) {
    console.error(`❌ Source TEI not found: ${deleteId}`);
    process.exit(1);
  }

  // Compare Profiles & Creation Dates
  console.log("\n" + formatTeiSummary(targetTei, "TARGET: TEI TO KEEP"));
  console.log("\n" + formatTeiSummary(sourceTei, "SOURCE: TEI TO MOVE FROM & DELETE"));

  const targetCreated = new Date(targetTei.createdAt || 0).getTime();
  const sourceCreated = new Date(sourceTei.createdAt || 0).getTime();
  const targetUpdated = new Date(targetTei.updatedAt || 0).getTime();
  const sourceUpdated = new Date(sourceTei.updatedAt || 0).getTime();

  // Check if target is indeed newer
  if (targetCreated < sourceCreated || targetUpdated < sourceUpdated) {
    console.log("\n⚠️  AGE NOTICE:");
    console.log(`   The TEI you selected to KEEP (${keepId}) appears to be OLDER than`);
    console.log(`   the TEI you selected to DELETE (${deleteId}).`);
    console.log(`   Keeping the newest profile is recommended so recent contact information is retained.`);

    const shouldSwap = await askConfirm(
      `   Would you like to SWAP them (KEEP: ${deleteId}, DELETE: ${keepId})?`,
      true
    );

    if (shouldSwap) {
      const tempTei = targetTei;
      targetTei = sourceTei;
      sourceTei = tempTei;

      const tempId = keepId;
      keepId = deleteId;
      deleteId = tempId;

      console.log(`\n🔄 Swapped! Now KEEPING: ${keepId}, and MOVING FROM / DELETING: ${deleteId}`);
    }
  } else {
    console.log(`\n Profile direction verified: ${keepId} is newer than ${deleteId}.`);
  }

  // Check Target Enrollment
  const targetEnrollment = targetTei.enrollments?.[0];
  if (!targetEnrollment) {
    console.error(`❌ Target TEI (${keepId}) has no active enrollment in program ${DHIS2_PROGRAM}!`);
    console.error("Cannot move events without a target enrollment.");
    process.exit(1);
  }

  // Check Source Events
  const sourceEnrollment = sourceTei.enrollments?.[0];
  const sourceEvents = sourceEnrollment?.events || [];

  if (sourceEvents.length === 0) {
    console.log(`\nℹ️  Source TEI (${deleteId}) has 0 events to move.`);
    const deleteEmpty = await askConfirm(
      `Do you want to proceed straight to deleting the empty duplicate TEI (${deleteId})?`,
      false
    );
    if (!deleteEmpty) {
      console.log("Operation cancelled.");
      process.exit(0);
    }
  } else {
    const targetEvents = targetEnrollment.events || [];
    const plan = [];

    for (const sEvent of sourceEvents) {
      const stage = sEvent.programStage;
      const sRetreat = sEvent.dataValues?.find((dv) => dv.dataElement === DHIS2_RETREAT_DATA_ELEMENT)?.value;
      const sState = sEvent.dataValues?.find((dv) => dv.dataElement === DHIS2_SELECTION_STATE_DATA_ELEMENT)?.value;
      const sAttendance = sEvent.dataValues?.find((dv) => dv.dataElement === DHIS2_ATTENDANCE_DATA_ELEMENT)?.value;
      const sComment = sEvent.dataValues?.find((dv) => dv.dataElement === DHIS2_SPECIAL_COMMENT_DATA_ELEMENT)?.value?.trim();

      // Find if target already has an equivalent event
      const matchingTargetEvent = targetEvents.find((tEvent) => {
        if (tEvent.event === sEvent.event) return true;
        if (tEvent.programStage !== stage) return false;

        if (stage === DHIS2_PROGRAM_STAGE_SPECIAL_COMMENT) {
          const tComment = tEvent.dataValues?.find((dv) => dv.dataElement === DHIS2_SPECIAL_COMMENT_DATA_ELEMENT)?.value?.trim();
          return tComment && sComment && tComment === sComment;
        }

        const tRetreat = tEvent.dataValues?.find((dv) => dv.dataElement === DHIS2_RETREAT_DATA_ELEMENT)?.value;
        return tRetreat && sRetreat && tRetreat.toLowerCase() === sRetreat.toLowerCase();
      });

      if (matchingTargetEvent) {
        // Check if values match or conflict
        const tState = matchingTargetEvent.dataValues?.find((dv) => dv.dataElement === DHIS2_SELECTION_STATE_DATA_ELEMENT)?.value;
        const tAttendance = matchingTargetEvent.dataValues?.find((dv) => dv.dataElement === DHIS2_ATTENDANCE_DATA_ELEMENT)?.value;

        const isExactMatch =
          (!sState || sState === tState) &&
          (!sAttendance || sAttendance === tAttendance);

        if (isExactMatch) {
          // Event was already moved to target in a previous run
          plan.push({
            event: sEvent,
            status: "ALREADY_MOVED",
            matchingEvent: matchingTargetEvent,
          });
          console.log(`  ✅ [ALREADY ON TARGET] ${summarizeEvent(sEvent)} (already on target, skipping)`);
        } else {
          // Both have an event for this retreat, but with different states
          plan.push({
            event: sEvent,
            status: "CONFLICT",
            matchingEvent: matchingTargetEvent,
          });
          console.log(`  ⚠️  [STATUS CONFLICT] ${summarizeEvent(sEvent)} (Target has: ${tState || tAttendance || "unknown"})`);
        }
      } else {
        plan.push({
          event: sEvent,
          status: "NEW",
        });
        console.log(`  ➡️  [WILL MOVE] ${summarizeEvent(sEvent)}`);
      }
    }

    const alreadyMoved = plan.filter((p) => p.status === "ALREADY_MOVED");
    const conflicts = plan.filter((p) => p.status === "CONFLICT");
    const newToMove = plan.filter((p) => p.status === "NEW");

    if (conflicts.length > 0) {
      console.log(`\n⚠️  Warning: Found ${conflicts.length} retreat event(s) with conflicting status.`);
      const skipConflicts = await askConfirm(
        "Do you want to KEEP target's existing status and SKIP moving conflicting source events?",
        true
      );
      for (const item of conflicts) {
        if (skipConflicts) {
          item.action = "SKIP";
        } else {
          item.action = "OVERWRITE";
        }
      }
    }

    for (const item of alreadyMoved) {
      item.action = "SKIP";
    }
    for (const item of newToMove) {
      item.action = "COPY";
    }

    const activeActions = plan.filter((p) => p.action !== "SKIP");
    const copies = plan.filter((p) => p.action === "COPY");

    console.log(`\nExecution Plan:`);
    console.log(`  • ${copies.length} event(s) to copy to target.`);
    if (alreadyMoved.length > 0) {
      console.log(`  • ${alreadyMoved.length} event(s) already on target (skipping).`);
    }
    if (conflicts.length > 0) {
      console.log(`  • ${conflicts.length} conflicting event(s) handled.`);
    }

    if (activeActions.length === 0) {
      console.log("\nNo new events need to be copied.");
    } else {
      const confirmMove = await askConfirm("Proceed with copying these events?", true);

      if (!confirmMove) {
        console.log("Operation cancelled by user.");
        process.exit(0);
      }

      if (isDryRun) {
        console.log(`\n[DRY-RUN] Would copy ${activeActions.length} event(s):`);
        for (const item of activeActions) {
          console.log(`  [DRY-RUN] Copy event ${item.event.event} → enrollment ${targetEnrollment.enrollment}`);
        }
      } else {
        console.log("\nProcessing events...");
        let successCount = 0;

        for (const item of activeActions) {
          const sEvent = item.event;
          process.stdout.write(`  Copying event ${sEvent.event}... `);

          // Create event on target enrollment
          const createPayload = {
            events: [
              {
                trackedEntity: targetTei.trackedEntity,
                enrollment: targetEnrollment.enrollment,
                orgUnit: sEvent.orgUnit,
                program: DHIS2_PROGRAM,
                programStage: sEvent.programStage,
                occurredAt: sEvent.occurredAt,
                scheduledAt: sEvent.scheduledAt,
                status: sEvent.status,
                dataValues: sEvent.dataValues || [],
              },
            ],
          };

          const createRes = await apiRequest("tracker?async=false&importStrategy=CREATE", {
            method: "POST",
            body: JSON.stringify(createPayload),
          });

          const createOk = createRes.ok && createRes.data?.status === "OK" && createRes.data?.stats?.created > 0;

          if (createOk) {
            console.log("✅ Created on target successfully.");
            successCount++;
          } else {
            console.log("❌ FAILED to copy!");
            console.error("  Details:", JSON.stringify(createRes.data));
          }
        }

        console.log(`\nFinished: ${successCount}/${activeActions.length} event(s) successfully processed.`);

        if (successCount < activeActions.length) {
          console.error("⚠️ Some events failed to copy.");
          process.exit(1);
        }
      }
    }
  }

  console.log("\n------------------------------------------------------------------------");
  console.log("Migration Completed");
  console.log("------------------------------------------------------------------------");
  console.log(`✅ All events have been copied to target TEI: ${keepId}`);
  console.log(`ℹ️  Source TEI (${deleteId}) was NOT modified or deleted.`);
  console.log(`   You can now review ${keepId} and safely delete ${deleteId} via the DHIS2 UI.`);

  console.log("\n========================================================================");
  console.log("                              COMPLETED                                 ");
  console.log("========================================================================\n");

  rl.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  rl.close();
  process.exit(1);
});
