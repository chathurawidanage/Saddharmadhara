import {
  getYogiSortScore,
  selectionPrioritySorter,
  ageSorter,
  sortYogiList,
  SELECTION_PRIORITY_SORT,
  FIRST_TIME_YOGI_BOOST,
  DHAMMA_SEVA_BOOST,
} from "../../utils/yogiUtils";
import { SelectionState } from "../../types/domain";

describe("YogiList Sorting Helpers", () => {
  const retreat = { code: "R1" } as any;

  test("getYogiSortScore identifies reverends and priority members", () => {
    const reverend = {
      attributes: { maritalState: "reverend" },
    } as any;
    const trustMember = {
      attributes: { priority: "trust_member" },
    } as any;
    const normal = { attributes: {} } as any;

    expect(getYogiSortScore(reverend).total).toBeGreaterThan(
      getYogiSortScore(trustMember).total,
    );
    expect(getYogiSortScore(trustMember).total).toBeGreaterThan(
      getYogiSortScore(normal).total,
    );
  });

  test("getYogiSortScore dynamically calculates mFlex using actual retreat count in a season", () => {
    // Yogi with 1 request in target season S1 and 1 request in another season S2
    const yogi = {
      attributes: { dob: "1990-01-01" }, // age score: 50
      expressionOfInterests: {
        R1: { state: "PENDING", occurredAt: "2024-01-01" },
        R_other: { state: "PENDING", occurredAt: "2024-01-01" },
      },
      participation: {},
    } as any;

    const allRetreats = [
      { code: "R1", season: "S1", totalYogis: "10" },
      { code: "R2", season: "S1", totalYogis: "10" },
      { code: "R3", season: "S1", totalYogis: "10" },
      { code: "R4", season: "S1", totalYogis: "10" },
      { code: "R5", season: "S1", totalYogis: "10" },
      { code: "R6", season: "S1", totalYogis: "10" },
      { code: "R_other", season: "S2", totalYogis: "10" },
    ] as any[];

    const eoiSummary = [] as any[]; // dEffective = 1 (R_other is in S2, which is ignored)

    const currentRetreat = { code: "R1", season: "S1" } as any;

    const scoreWithSeason = getYogiSortScore(yogi, allRetreats, eoiSummary, currentRetreat).total;
    const scoreWithoutSeason = getYogiSortScore(yogi, allRetreats, eoiSummary).total;

    expect(scoreWithSeason).toBe(225);
    expect(scoreWithoutSeason).toBe(150);
  });


  test("selectionPrioritySorter sorts by score then date", () => {
    const y1 = {
      attributes: { maritalState: "reverend" },
      expressionOfInterests: { R1: { occurredAt: "2024-01-02" } },
    } as any;
    const y2 = {
      attributes: { maritalState: "reverend" },
      expressionOfInterests: { R1: { occurredAt: "2024-01-01" } },
    } as any;

    // Both are reverends, so y2 (earlier date) should come first (negative result for y2 - y1 sort style)
    // selectionPrioritySorter returns negative if y1 should come before y2
    expect(selectionPrioritySorter(y1, y2, retreat)).toBeGreaterThan(0);
    expect(selectionPrioritySorter(y2, y1, retreat)).toBeLessThan(0);
  });

  test("ageSorter sorts by DOB then priority", () => {
    const y1 = {
      attributes: { dob: "1990-01-01" },
      expressionOfInterests: { R1: { occurredAt: "2024-01-01" } },
    } as any;
    const y2 = {
      attributes: { dob: "1980-01-01" },
      expressionOfInterests: { R1: { occurredAt: "2024-01-01" } },
    } as any;

    // y2 is older, should come first (earlier DOB)
    expect(ageSorter(y1, y2, retreat)).toBeGreaterThan(0);
    expect(ageSorter(y2, y1, retreat)).toBeLessThan(0);
  });

  test("sortYogiList correctly sorts an array", () => {
    const y1 = {
      attributes: { maritalState: "reverend" },
      expressionOfInterests: { R1: { occurredAt: "2024-01-02" } },
    } as any;
    const y2 = {
      attributes: { maritalState: "reverend" },
      expressionOfInterests: { R1: { occurredAt: "2024-01-01" } },
    } as any;
    const list = [y1, y2];
    sortYogiList(list, retreat, SELECTION_PRIORITY_SORT);
    expect(list[0]).toBe(y2);
  });

  test("getYogiSortScore applies a -25 penalty for a no-show within the last year", () => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    const yogiWithRecentNoShow = {
      attributes: { dob: "1990-01-01" }, // age score: 50
      participation: {
        R1: { retreat: "R1", attendance: "noshow" },
      },
    } as any;

    const yogiWithOldNoShow = {
      attributes: { dob: "1990-01-01" }, // age score: 50
      participation: {
        R2: { retreat: "R2", attendance: "noshow" },
      },
    } as any;

    const allRetreats = [
      { code: "R1", date: sixMonthsAgo },
      { code: "R2", date: twoYearsAgo },
    ] as any[];

    const currentRetreat = { code: "R3" } as any;

    const scoreRecent = getYogiSortScore(yogiWithRecentNoShow, allRetreats, [], currentRetreat);
    const scoreOld = getYogiSortScore(yogiWithOldNoShow, allRetreats, [], currentRetreat);

    // base score: status(0) + age(50) + participation(100) + deduction(-25) = 125.
    // without recent deduction: 150.
    expect(scoreRecent.total).toBe(125);
    expect(scoreRecent.breakdown.participation.score).toBe(100);
    expect(scoreRecent.breakdown.deductions.score).toBe(-25);
    expect(scoreRecent.breakdown.deductions.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "No-show within last year (R1)", points: -25 }),
      ]),
    );

    expect(scoreOld.total).toBe(150);
    expect(scoreOld.breakdown.participation.score).toBe(100);
    expect(scoreOld.breakdown.deductions.score).toBe(0);
  });

  test("getYogiSortScore reduces marks for every occurrence of hasSelectionInSeason (50 for first, 25 for subsequent)", () => {
    const yogiWithOneOccurrence = {
      attributes: { dob: "1990-01-01" }, // age score: 50
      expressionOfInterests: {
        R1: { state: SelectionState.SELECTED, occurredAt: "2024-01-01" },
        R2: { state: SelectionState.PENDING, occurredAt: "2024-01-01" }, // Current retreat being graded is R2, so it's ignored for deduction
      },
      participation: {},
    } as any;

    const yogiWithThreeOccurrences = {
      attributes: { dob: "1990-01-01" }, // age score: 50
      expressionOfInterests: {
        R1: { state: SelectionState.SELECTED, occurredAt: "2024-01-01" },
        R2: { state: SelectionState.SELECTED, occurredAt: "2024-01-01" },
        R3: { state: SelectionState.PENDING, occurredAt: "2024-01-01" },
        R4: { state: SelectionState.PENDING, occurredAt: "2024-01-01" }, // Current retreat being graded is R4, so it's ignored
      },
      participation: {},
    } as any;

    const allRetreats = [
      { code: "R1", season: "S1", date: "2027-06-15" },
      { code: "R2", season: "S1", date: "2027-06-20" },
      { code: "R3", season: "S1", date: "2027-06-25" },
      { code: "R4", season: "S1", date: "2027-06-30" },
    ] as any[];

    // 1 occurrence deduction: -25
    const resOne = getYogiSortScore(yogiWithOneOccurrence, allRetreats, [], allRetreats[1]);
    expect(resOne.breakdown.deductions.score).toBe(-25);

    // 3 occurrences deduction: -25 - 50 * 2 = -125
    const resThree = getYogiSortScore(yogiWithThreeOccurrences, allRetreats, [], allRetreats[3]);
    expect(resThree.breakdown.deductions.score).toBe(-125);
  });

  test("getYogiSortScore adds a boost if a yogi has never attended, selected for, or pending for any retreat ever", () => {
    const currentRetreat = { code: "R1", retreatType: "general" } as any;

    const brandNewYogi = {
      attributes: { dob: "1990-01-01" }, // age score: 50
      expressionOfInterests: {
        R1: { state: SelectionState.APPLIED, occurredAt: "2024-01-01" },
      },
      participation: {},
    } as any;

    const previouslySelectedYogi = {
      attributes: { dob: "1990-01-01" },
      expressionOfInterests: {
        R1: { state: SelectionState.APPLIED, occurredAt: "2024-01-01" },
        R2: { state: SelectionState.SELECTED, occurredAt: "2024-01-01" },
      },
      participation: {},
    } as any;

    const previouslyPendingYogi = {
      attributes: { dob: "1990-01-01" },
      expressionOfInterests: {
        R1: { state: SelectionState.APPLIED, occurredAt: "2024-01-01" },
        R2: { state: SelectionState.PENDING, occurredAt: "2024-01-01" },
      },
      participation: {},
    } as any;

    const previouslyAttendedYogi = {
      attributes: { dob: "1990-01-01" },
      expressionOfInterests: {
        R1: { state: SelectionState.APPLIED, occurredAt: "2024-01-01" },
      },
      participation: {
        R0: { retreat: "R0", attendance: "attended" },
      },
    } as any;

    const resNew = getYogiSortScore(brandNewYogi, [currentRetreat], [], currentRetreat);
    const resSelected = getYogiSortScore(previouslySelectedYogi, [currentRetreat], [], currentRetreat);
    const resPending = getYogiSortScore(previouslyPendingYogi, [currentRetreat], [], currentRetreat);
    const resAttended = getYogiSortScore(previouslyAttendedYogi, [currentRetreat], [], currentRetreat);

    // Brand new yogi receives base participation (100) + boost (50) = 150
    expect(resNew.breakdown.participation.score).toBe(100 + FIRST_TIME_YOGI_BOOST);
    expect(resNew.breakdown.participation.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "First-time Yogi Boost", points: FIRST_TIME_YOGI_BOOST }),
      ]),
    );

    // Yogis with prior selection, pending, or attendance history do not receive boost
    expect(resSelected.breakdown.participation.score).toBe(100);
    expect(resSelected.breakdown.participation.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "First-time Yogi Boost" }),
      ]),
    );

    expect(resPending.breakdown.participation.score).toBe(100);
    expect(resPending.breakdown.participation.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "First-time Yogi Boost" }),
      ]),
    );

    expect(resAttended.breakdown.participation.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "First-time Yogi Boost" }),
      ]),
    );

    // Yogi whose pending retreat date is in the past gets the first-time boost (stale/expired pending)
    const pastRetreat = {
      code: "R_PAST",
      retreatType: "general",
      date: new Date(Date.now() - 86400000 * 30), // 30 days ago
    } as any;
    const pastPendingYogi = {
      attributes: { dob: "1990-01-01" },
      expressionOfInterests: {
        R1: { state: SelectionState.APPLIED, occurredAt: "2024-01-01" },
        R_PAST: { state: SelectionState.PENDING, occurredAt: "2024-01-01" },
      },
      participation: {},
    } as any;
    const resPastPending = getYogiSortScore(pastPendingYogi, [currentRetreat, pastRetreat], [], currentRetreat);
    expect(resPastPending.breakdown.participation.score).toBe(100 + FIRST_TIME_YOGI_BOOST);
    expect(resPastPending.breakdown.participation.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "First-time Yogi Boost", points: FIRST_TIME_YOGI_BOOST }),
      ]),
    );

    // Yogi whose pending retreat date is in the future does NOT get the first-time boost
    const futureRetreat = {
      code: "R_FUTURE",
      retreatType: "general",
      date: new Date(Date.now() + 86400000 * 30), // 30 days in future
    } as any;
    const futurePendingYogi = {
      attributes: { dob: "1990-01-01" },
      expressionOfInterests: {
        R1: { state: SelectionState.APPLIED, occurredAt: "2024-01-01" },
        R_FUTURE: { state: SelectionState.PENDING, occurredAt: "2024-01-01" },
      },
      participation: {},
    } as any;
    const resFuturePending = getYogiSortScore(futurePendingYogi, [currentRetreat, futureRetreat], [], currentRetreat);
    expect(resFuturePending.breakdown.participation.score).toBe(100);
    expect(resFuturePending.breakdown.participation.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "First-time Yogi Boost" }),
      ]),
    );
  });

  test("getYogiSortScore adds a boost if yogi indicated ordination intention within the last 2 years only based on ordinationIntentionSpecifiedOn", () => {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), 1);

    const yogiWithRecentOrdination = {
      attributes: {
        ordinationIntended: true,
        ordinationIntentionSpecifiedOn: sixMonthsAgo,
      },
    } as any;

    const yogiWithOldOrdination = {
      attributes: {
        ordinationIntended: true,
        ordinationIntentionSpecifiedOn: threeYearsAgo,
      },
    } as any;

    const yogiWithoutOrdination = {
      attributes: {
        ordinationIntended: false,
        ordinationIntentionSpecifiedOn: sixMonthsAgo,
      },
    } as any;

    const resRecent = getYogiSortScore(yogiWithRecentOrdination, [], [], retreat);
    const resOld = getYogiSortScore(yogiWithOldOrdination, [], [], retreat);
    const resNone = getYogiSortScore(yogiWithoutOrdination, [], [], retreat);

    expect(resRecent.breakdown.status.score).toBe(25);
    expect(resRecent.breakdown.status.label).toContain("Intends Ordination in coming 2 years (specified on");

    expect(resOld.breakdown.status.score).toBe(0);
    expect(resOld.breakdown.status.label).not.toContain("Intends Ordination");

    expect(resNone.breakdown.status.score).toBe(0);
    expect(resNone.breakdown.status.label).not.toContain("Intends Ordination");
  });

  test("getYogiSortScore adds a boost of 100 if yogi has participated in at least one Dhamma Seva retreat within the last 2 years", () => {
    const today = new Date();
    const fourYearsAgo = new Date(today.getFullYear() - 4, today.getMonth(), 1);
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);

    const dsRetreatOld = {
      code: "DS1",
      retreatCode: "DS-OLD",
      retreatType: "dhamma-seva",
      date: fourYearsAgo,
    } as any;

    const dsRetreatRecent = {
      code: "DS2",
      retreatCode: "DS-NEW",
      retreatType: "dhamma-seva",
      date: sixMonthsAgo,
    } as any;

    const currentGeneralRetreat = {
      code: "GEN1",
      retreatType: "general",
      date: today,
    } as any;

    // Yogi attended Dhamma Seva 4 years ago (past the 2-year cutoff) - should expire
    const yogiWithOldDs = {
      attributes: {},
      participation: {
        p1: { retreat: "DS1", attendance: "attended" },
      },
      expressionOfInterests: {},
    } as any;

    // Yogi attended Dhamma Seva 6 months ago (within 2 years) - receives boost
    const yogiWithRecentDs = {
      attributes: {},
      participation: {
        p1: { retreat: "DS2", attendance: "attended" },
      },
      expressionOfInterests: {},
    } as any;

    // Yogi attended multiple Dhamma Seva retreats
    const yogiWithMultipleDs = {
      attributes: {},
      participation: {
        p1: { retreat: "DS1", attendance: "attended" },
        p2: { retreat: "DS2", attendance: "attended" },
      },
      expressionOfInterests: {},
    } as any;

    // Yogi who only had no-show for Dhamma Seva
    const yogiWithNoShowDs = {
      attributes: {},
      participation: {
        p1: { retreat: "DS2", attendance: "noshow" },
      },
      expressionOfInterests: {},
    } as any;

    const allRetreatsList = [dsRetreatOld, dsRetreatRecent, currentGeneralRetreat];

    const resOld = getYogiSortScore(yogiWithOldDs, allRetreatsList, [], currentGeneralRetreat);
    const resRecent = getYogiSortScore(yogiWithRecentDs, allRetreatsList, [], currentGeneralRetreat);
    const resMulti = getYogiSortScore(yogiWithMultipleDs, allRetreatsList, [], currentGeneralRetreat);
    const resNoShow = getYogiSortScore(yogiWithNoShowDs, allRetreatsList, [], currentGeneralRetreat);

    // Old Dhamma Seva participation (4 years ago) has expired, no boost
    expect(resOld.breakdown.participation.score).toBe(100);
    expect(resOld.breakdown.participation.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Dhamma Seva Boost" }),
      ]),
    );

    // Recent Dhamma Seva participation receives +100 boost
    expect(resRecent.breakdown.participation.score).toBe(100 + DHAMMA_SEVA_BOOST);
    expect(resRecent.breakdown.participation.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Dhamma Seva Boost", points: DHAMMA_SEVA_BOOST }),
      ]),
    );

    // Multiple Dhamma Seva attendances only receive the boost once
    expect(resMulti.breakdown.participation.score).toBe(100 + DHAMMA_SEVA_BOOST);

    // No-show does not receive boost
    expect(resNoShow.breakdown.participation.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Dhamma Seva Boost" }),
      ]),
    );
  });
});
