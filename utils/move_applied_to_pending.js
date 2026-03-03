const DHIS2_API_URL = 'https://manager.srisambuddhamission.org/api';
const authToken = process.env.D2_AUTH;

if (!authToken) {
    console.error("D2_AUTH environment variable is required.");
    process.exit(1);
}

const requestOptions = {
    headers: {
        'content-type': 'application/json',
        Authorization: 'ApiToken ' + authToken,
    },
};

const DHIS2_PROGRAM = 'KdYt2OP9VjD';
const DHIS2_PROGRAM_STAGE_EXPRESSION_OF_INTEREST = 'BLn1j2VgLZf';
const DHIS_RETREATS_OPTION_SET_ID = 'ys2Pv9hTS0O';

const DHIS2_RETREAT_DATA_ELEMENT = 'rYqV3VQu7LS';
const DHIS2_RETREAT_SELECTION_STATE_DATA_ELEMENT = 'MVaziT78i7p';
const DHIS2_RETREAT_INVITATION_SENT_DATA_ELEMENT = 'UkXg5kMsDBH';

/**
 * Looks up a retreat option from the OptionSet by:
 *   - exact DHIS2 option id
 *   - exact option code
 *   - partial / case-insensitive name match
 * Returns an array of matches so ambiguity can be detected.
 */
const findRetreats = async (query) => {
    let res = await fetch(
        `${DHIS2_API_URL}/optionSets/${DHIS_RETREATS_OPTION_SET_ID}.json?fields=options[id,code,name]`,
        requestOptions
    );
    if (!res.ok) {
        console.error(`Failed to fetch option set: ${res.status} ${res.statusText}`);
        process.exit(1);
    }
    let json = await res.json();
    let options = json.options || [];

    let queryLower = query.toLowerCase();
    return options.filter(opt =>
        opt.id === query ||
        opt.code === query ||
        opt.name.toLowerCase().includes(queryLower)
    );
};

const changeState = async (retreatQuery, dryRun = false) => {
    console.log(`Looking up retreat matching: "${retreatQuery}"...`);

    let matches = await findRetreats(retreatQuery);

    if (matches.length === 0) {
        console.error(`❌ No retreat found matching "${retreatQuery}".`);
        console.error('Hint: pass a partial retreat name, its option code, or its DHIS2 option ID.');
        process.exit(1);
    }
    if (matches.length > 1) {
        console.error(`❌ Multiple retreats matched "${retreatQuery}". Please be more specific:`);
        matches.forEach(m => console.error(`  id=${m.id}  code=${m.code}  name="${m.name}"`));
        process.exit(1);
    }

    let retreat = matches[0];
    console.log(`✅ Matched retreat: id=${retreat.id}  code=${retreat.code}  name="${retreat.name}"`);

    // The admin app stores retreat.name (not code) in the EOI data element.
    // Reference: fetchExpressionOfInterests uses `retreatName || retreatCode` as the filter value.
    let retreatFilterValue = encodeURIComponent(retreat.name);
    let eventsUrl = `${DHIS2_API_URL}/tracker/events.json`
        + `?programStage=${DHIS2_PROGRAM_STAGE_EXPRESSION_OF_INTEREST}`
        + `&filter=${DHIS2_RETREAT_DATA_ELEMENT}:eq:${retreatFilterValue}`
        + `&skipPaging=true`;

    console.log(`Fetching EOI events...`);
    let res = await fetch(eventsUrl, requestOptions);
    let json = await res.json();

    if (!json.instances) {
        console.error("Unexpected response — no 'instances' field:", json);
        return;
    }
    console.log(`Found ${json.instances.length} EOI events total for this retreat.`);

    const eventsToUpdate = json.instances.filter(event => {
        let stateDataValue = event.dataValues.find(dv => dv.dataElement === DHIS2_RETREAT_SELECTION_STATE_DATA_ELEMENT);
        return stateDataValue && stateDataValue.value.toLowerCase() === 'applied';
    });

    console.log(
        `Found ${eventsToUpdate.length} events in 'Applied' state. ` +
        (dryRun ? '(dry run — no changes will be made)' : 'Proceeding to update to Pending...')
    );

    let processed = 0;

    for (const event of eventsToUpdate) {
        processed++;

        if (dryRun) {
            console.log(`[DRY RUN] Would update event ${event.event} (trackedEntity: ${event.trackedEntity}) → 'pending' (${processed}/${eventsToUpdate.length})`);
            continue;
        }

        // Use the tracker v2 API: POST /api/tracker?async=false&importStrategy=UPDATE
        // Per the docs, non-collection fields must all be included; dataValues (a collection)
        // only needs the values we want to change.
        const updatePayload = {
            events: [
                {
                    // Required non-collection fields — pass through from the GET response
                    event: event.event,
                    trackedEntity: event.trackedEntity,
                    enrollment: event.enrollment,
                    enrollmentStatus: event.enrollmentStatus,
                    orgUnit: event.orgUnit,
                    program: event.program,
                    programStage: event.programStage,
                    occurredAt: event.occurredAt,
                    scheduledAt: event.scheduledAt,
                    status: event.status,
                    attributeOptionCombo: event.attributeOptionCombo,
                    attributeCategoryOptions: event.attributeCategoryOptions,
                    // Send all existing dataValues, overriding just the selection state
                    dataValues: event.dataValues.map(dv =>
                        dv.dataElement === DHIS2_RETREAT_SELECTION_STATE_DATA_ELEMENT
                            ? { ...dv, value: 'pending' }
                            : dv
                    ),
                },
            ],
        };

        let updateRes = await fetch(
            `${DHIS2_API_URL}/tracker?async=false&importStrategy=UPDATE`,
            {
                method: 'POST',
                headers: requestOptions.headers,
                body: JSON.stringify(updatePayload),
            }
        );

        let updateJson = await updateRes.json();
        let stats = updateJson?.stats;
        let hasError = updateJson?.status === 'ERROR' || (stats && stats.updated === 0 && stats.ignored > 0);

        if (updateRes.ok && !hasError) {
            console.log(`✅ Updated event ${event.event} (${processed}/${eventsToUpdate.length})`);
        } else {
            console.error(`❌ Failed to update event ${event.event}: ${updateRes.status} ${updateRes.statusText}`);
            console.error(JSON.stringify(updateJson, null, 2));
        }
    }

    if (dryRun) {
        console.log(`\n[DRY RUN] Would have moved ${processed} yogis from Applied → Pending. No changes were made.`);
    } else {
        console.log(`Done! Moved ${processed} yogis from Applied → Pending.`);
    }
};

// ── CLI entry point ──────────────────────────────────────────────────────────

const args = process.argv.slice(2).filter(a => a !== '--dry-run');
const dryRun = process.argv.includes('--dry-run');
const retreatQuery = args[0];

if (!retreatQuery) {
    console.log('Usage: node move_applied_to_pending.js "<retreat name or code>" [--dry-run]');
    console.log('Example: node move_applied_to_pending.js "Jan 11 2024 Attanagalle" --dry-run');
    process.exit(1);
}

if (dryRun) console.log('🔍 DRY RUN mode: no changes will be made.\n');

changeState(retreatQuery, dryRun);
