-- SQL Views for Dashboard Statistics

-- View 1: Participation Dump
-- Returns: yogi_id, retreat_code
-- Used to calculate: Total General Participants, One-time vs Repeat, Missed
-- Name: DASHBOARD_PARTICIPATION_DUMP
SELECT
    tei.uid as yogi_uid,
    psi.eventdatavalues -> 'rYqV3VQu7LS' ->> 'value' as retreat_code
FROM programstageinstance psi
JOIN programinstance pi ON psi.programinstanceid = pi.programinstanceid
JOIN trackedentityinstance tei ON pi.trackedentityinstanceid = tei.trackedentityinstanceid
WHERE psi.programstageid = (SELECT programstageid FROM programstage WHERE uid = 'NYxnKQd6goA') -- Participation Stage
  AND psi.deleted = false
  AND psi.eventdatavalues -> 'CzwVwJ30hTj' ->> 'value' = 'true'; -- Only count if marked as attended

-- View 2: Expression of Interest (EOI) Dump
-- Returns: yogi_id, retreat_code
-- Used to calculate: "Unable to participate" (Applied but didn't attend)
-- Name: DASHBOARD_EOI_DUMP
SELECT
    tei.uid as yogi_uid,
    psi.eventdatavalues -> 'rYqV3VQu7LS' ->> 'value' as retreat_code,
    psi.eventdatavalues -> 'UkXg5kMsDBH' ->> 'value' as invitation_sent
FROM programstageinstance psi
JOIN programinstance pi ON psi.programinstanceid = pi.programinstanceid
JOIN trackedentityinstance tei ON pi.trackedentityinstanceid = tei.trackedentityinstanceid
WHERE psi.programstageid = (SELECT programstageid FROM programstage WHERE uid = 'BLn1j2VgLZf') -- EOI Stage
  AND psi.deleted = false;
