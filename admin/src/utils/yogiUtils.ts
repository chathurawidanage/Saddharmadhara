import { Retreat, Yogi, EoiSummary, MaritalState, SelectionState, YogiPriority, AttendanceState, Gender } from "../types/domain";
import { isGeneralRetreat, isSilentRetreat, isDhammaSevaRetreat } from "./retreatUtils";

export const SELECTION_PRIORITY_SORT = "selection-priority";
export const AGE_SORT = "age";
export const PARTICIPATION_LOOKBACK_YEARS = 2;
export const PARTICIPATION_LOOKBACK_DAYS = 730;
export const MAX_PARTICIPATION_DEDUCTION = 20;
export const FIRST_TIME_YOGI_BOOST = 50;
export const ORDINATION_INTENDED_BOOST = 25;
export const DHAMMA_SEVA_BOOST = 100;
export const DISCRETIONARY_QUOTA_PERCENTAGE = 0.07;
export const DISCRETIONARY_QUOTA_MAX_CAP = 4;

/**
 * Calculates time-decay participation deduction using quadratic curve (Equation 2):
 * Deduction(t) = -MAX_PARTICIPATION_DEDUCTION * (1 - t / 730)^2
 * - High decay initially (-20 max at t=0, ~ -15 at 3mo, ~ -11 at 6mo, ~ -5 at 1yr)
 * - Smoothly approaches 0 at 2 years mark (730 days)
 */
export const calculateParticipationDecayDeduction = (
  retreatDate: Date | string,
  maxDeduction = MAX_PARTICIPATION_DEDUCTION,
  lookbackDays = PARTICIPATION_LOOKBACK_DAYS,
): number => {
  const dateObj = typeof retreatDate === "string" ? new Date(retreatDate) : retreatDate;
  const timeDiff = Date.now() - dateObj.getTime();
  const daysElapsed = Math.max(0, timeDiff / (1000 * 60 * 60 * 24));

  if (daysElapsed >= lookbackDays) {
    return 0;
  }

  const decayFactor = Math.pow(1 - daysElapsed / lookbackDays, 2);
  return Math.round(-maxDeduction * decayFactor);
};

export interface StatusBreakdown {
  score: number;
  label: string;
}

export interface AgeBreakdown {
  score: number;
  age: number | null;
  categoryLabel: string;
  details: string;
}

export interface BreakdownLineItem {
  label: string;
  points: number;
  type?: "base" | "deduction" | "bonus" | "info";
}

export interface ParticipationBreakdown {
  score: number;
  items: BreakdownLineItem[];
}

export interface DeductionBreakdown {
  score: number;
  items: BreakdownLineItem[];
}

export interface FlexBreakdown {
  multiplier: number;
  seasonRetreatCount: number;
  openRequestsCount: number;
  isApplicable: boolean;
  details: string;
}

export interface YogiSortScoreBreakdown {
  status: StatusBreakdown;
  age: AgeBreakdown;
  participation: ParticipationBreakdown;
  deductions: DeductionBreakdown;
  flexibility: FlexBreakdown;
}

export const getYogiSortScore = (
  yogiObj: Yogi,
  allRetreats: Retreat[] = [],
  eoiSummary: EoiSummary[] = [],
  currentRetreat?: Retreat,
): { total: number; breakdown: YogiSortScoreBreakdown } => {
  // 1. Status Score (S_status)
  let sStatus = 0;
  let statusReason = "Normal Status";

  if (yogiObj.attributes.maritalState === MaritalState.REVEREND) {
    sStatus = 9999;
    statusReason = "Reverend Status";
  } else {
    const statusReasons: string[] = [];

    if (yogiObj.attributes.priority === YogiPriority.TRUST_MEMBER) {
      sStatus += 40;
      statusReasons.push("Trust / Saddharmasena Member");
    } else if (yogiObj.attributes.priority === YogiPriority.TRUST_MEMBERS_FAMILY) {
      sStatus += 40;
      statusReasons.push("Trust / Saddharmasena Member's Family");
    }

    if (yogiObj.attributes.ordinationIntended) {
      const specifiedOn = yogiObj.attributes.ordinationIntentionSpecifiedOn;
      let isWithinLastTwoYears = true;
      if (specifiedOn) {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const specifiedDate = specifiedOn instanceof Date ? specifiedOn : new Date(specifiedOn);
        if (!isNaN(specifiedDate.getTime())) {
          isWithinLastTwoYears = specifiedDate >= twoYearsAgo;
        }
      }

      if (isWithinLastTwoYears) {
        sStatus += ORDINATION_INTENDED_BOOST;
        let dateDetail = "";
        if (specifiedOn) {
          const d = specifiedOn instanceof Date ? specifiedOn : new Date(specifiedOn);
          if (!isNaN(d.getTime())) {
            dateDetail = ` (specified on ${d.toISOString().split("T")[0]})`;
          }
        }
        statusReasons.push(`Intends Ordination in coming 2 years${dateDetail}`);
      }
    }

    if (statusReasons.length > 0) {
      statusReason = statusReasons.join(", ");
    }
  }

  const statusBreakdown: StatusBreakdown = {
    score: sStatus,
    label: statusReason,
  };

  // 2. Age Score (S_age)
  let sAge = 0;
  let yogiAge: number | null = null;
  let ageCategoryLabel = "Not provided";
  let ageDetails = "Date of birth not provided";

  if (yogiObj.attributes.dob) {
    const age = Math.floor(
      (Date.now() - new Date(yogiObj.attributes.dob).getTime()) / 31557600000,
    );
    yogiAge = age;
    if (age >= 20 && age <= 40) {
      sAge = 50;
      ageCategoryLabel = "Young adult (20-40)";
      ageDetails = `Age ${age} • Young adult priority (20-40)`;
    } else if (age > 40 && age <= 70) {
      sAge = 30 + 1.33 * Math.abs(55 - age);
      ageCategoryLabel = "Priority age range (41-70)";
      ageDetails = `Age ${age} • Formula: 30 + 1.33 × |55 - ${age}| = ${sAge.toFixed(2)}`;
    } else {
      sAge = 0;
      ageCategoryLabel = "Outside priority range";
      ageDetails = `Age ${age} • Outside priority range`;
    }
  }

  const ageBreakdown: AgeBreakdown = {
    score: sAge,
    age: yogiAge,
    categoryLabel: ageCategoryLabel,
    details: ageDetails,
  };

  // 3. Participation Score (S_participation)
  const participationCutoffDate = new Date();
  participationCutoffDate.setFullYear(participationCutoffDate.getFullYear() - PARTICIPATION_LOOKBACK_YEARS);

  let nDhammaSeva = 0;
  const attendedGeneralRetreats: { code: string; date: Date }[] = [];
  const attendedSilentRetreats: { code: string; date: Date }[] = [];
  const attendedDhammaSevaRetreats: string[] = [];

  const processedRetreatCodes = new Set<string>();

  Object.values(yogiObj.participation || {}).forEach((p) => {
    if (p.attendance === AttendanceState.ATTENDED) {
      const retreat = allRetreats.find((r) => r.code === p.retreat);
      if (retreat && retreat.date) {
        processedRetreatCodes.add(retreat.code);
        const retreatDate = new Date(retreat.date);
        if (retreatDate >= participationCutoffDate) {
          const retreatNameOrCode = retreat.retreatCode || p.retreat;
          if (isDhammaSevaRetreat(retreat)) {
            nDhammaSeva++;
            attendedDhammaSevaRetreats.push(retreatNameOrCode);
          } else if (isGeneralRetreat(retreat)) {
            attendedGeneralRetreats.push({ code: retreatNameOrCode, date: retreatDate });
          } else if (isSilentRetreat(retreat)) {
            attendedSilentRetreats.push({ code: retreatNameOrCode, date: retreatDate });
          }
        }
      }
    }
  });

  // Also consider retreats that are already over where attendance was not explicitly marked,
  // leaving the yogi in SELECTED state (treated as attended unless marked noshow/absent).
  Object.entries(yogiObj.expressionOfInterests || {}).forEach(([code, eoi]) => {
    if (currentRetreat && code === currentRetreat.code) return;
    if (processedRetreatCodes.has(code)) return;

    const stateStr = String(eoi?.state || "").toLowerCase();
    if (stateStr === SelectionState.SELECTED) {
      const retreat = allRetreats.find((r) => r.code === code);
      if (retreat && retreat.date) {
        const retreatEndDate = retreat.endDate ? new Date(retreat.endDate) : new Date(retreat.date);
        const isRetreatOver = retreatEndDate.getTime() < Date.now();
        if (isRetreatOver) {
          const existingPart = yogiObj.participation?.[code];
          const wasMarkedAbsentOrNoShow =
            existingPart &&
            (existingPart.attendance === AttendanceState.NOSHOW ||
              existingPart.attendance === AttendanceState.ABSENT);

          if (!wasMarkedAbsentOrNoShow) {
            processedRetreatCodes.add(retreat.code);
            const retreatDate = new Date(retreat.date);
            if (retreatDate >= participationCutoffDate) {
              const retreatNameOrCode = retreat.retreatCode || code;
              if (isDhammaSevaRetreat(retreat)) {
                nDhammaSeva++;
                attendedDhammaSevaRetreats.push(retreatNameOrCode);
              } else if (isGeneralRetreat(retreat)) {
                attendedGeneralRetreats.push({ code: retreatNameOrCode, date: retreatDate });
              } else if (isSilentRetreat(retreat)) {
                attendedSilentRetreats.push({ code: retreatNameOrCode, date: retreatDate });
              }
            }
          }
        }
      }
    }
  });

  let sParticipation = 100;
  const participationItems: BreakdownLineItem[] = [
    { label: "Base score", points: 100, type: "base" },
  ];

  if (currentRetreat && isGeneralRetreat(currentRetreat)) {
    attendedGeneralRetreats.forEach(({ code, date }) => {
      const pts = calculateParticipationDecayDeduction(date);
      sParticipation += pts;
      participationItems.push({
        label: `Attended General (${code})`,
        points: pts,
        type: pts === 0 ? "info" : "deduction",
      });
    });
    attendedSilentRetreats.forEach(({ code }) => {
      sParticipation += 10;
      participationItems.push({
        label: `Attended Silent (${code})`,
        points: 10,
        type: "bonus",
      });
    });
  } else if (currentRetreat && isSilentRetreat(currentRetreat)) {
    attendedSilentRetreats.forEach(({ code, date }) => {
      const pts = calculateParticipationDecayDeduction(date);
      sParticipation += pts;
      participationItems.push({
        label: `Attended Silent (${code})`,
        points: pts,
        type: pts === 0 ? "info" : "deduction",
      });
    });
  } else if (currentRetreat && isDhammaSevaRetreat(currentRetreat)) {
    sParticipation = 100;
  } else {
    attendedGeneralRetreats.forEach(({ code, date }) => {
      const pts = calculateParticipationDecayDeduction(date);
      sParticipation += pts;
      participationItems.push({
        label: `Attended General (${code})`,
        points: pts,
        type: pts === 0 ? "info" : "deduction",
      });
    });
    attendedSilentRetreats.forEach(({ code }) => {
      sParticipation += 10;
      participationItems.push({
        label: `Attended Silent (${code})`,
        points: 10,
        type: "bonus",
      });
    });
  }

  if (nDhammaSeva > 0) {
    sParticipation += DHAMMA_SEVA_BOOST;
    participationItems.push({
      label: "Dhamma Seva Boost",
      points: DHAMMA_SEVA_BOOST,
      type: "bonus",
    });
  }

  const hasParticipationEver = Object.keys(yogiObj.participation || {}).length > 0;
  const hasBeenSelectedOrPendingEver = Object.entries(
    yogiObj.expressionOfInterests || {}
  ).some(([code, eoi]) => {
    if (currentRetreat && code === currentRetreat.code) {
      return false;
    }
    const stateStr = String(eoi?.state || "").toLowerCase();
    if (stateStr === SelectionState.SELECTED) {
      return true;
    }
    if (stateStr === SelectionState.PENDING) {
      const retreat = allRetreats.find((r) => r.code === code);
      const isPastRetreat =
        retreat?.date && new Date(retreat.date).getTime() < Date.now();
      return !isPastRetreat;
    }
    return false;
  });

  if (!hasParticipationEver && !hasBeenSelectedOrPendingEver) {
    sParticipation += FIRST_TIME_YOGI_BOOST;
    participationItems.push({
      label: "First-time Yogi Boost",
      points: FIRST_TIME_YOGI_BOOST,
      type: "bonus",
    });
  }

  const participationBreakdown: ParticipationBreakdown = {
    score: sParticipation,
    items: participationItems,
  };

  // 3b. Deductions (S_deduction)
  let sDeduction = 0;
  const deductionItems: BreakdownLineItem[] = [];

  let hasNoShowLastYear = false;
  const noShowRetreatCodes: string[] = [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  Object.values(yogiObj.participation || {}).forEach((p) => {
    if (p.attendance === AttendanceState.NOSHOW) {
      const retreat = allRetreats.find((r) => r.code === p.retreat);
      if (retreat && retreat.date) {
        const retreatDate = new Date(retreat.date);
        if (retreatDate >= oneYearAgo) {
          hasNoShowLastYear = true;
          const retreatNameOrCode = retreat.retreatCode || p.retreat;
          noShowRetreatCodes.push(retreatNameOrCode);
        }
      }
    }
  });

  if (hasNoShowLastYear) {
    if (noShowRetreatCodes.length > 0) {
      noShowRetreatCodes.forEach((code) => {
        sDeduction += -25;
        deductionItems.push({
          label: `No-show within last year (${code})`,
          points: -25,
          type: "deduction",
        });
      });
    } else {
      sDeduction += -25;
      deductionItems.push({
        label: "No-show within last year",
        points: -25,
        type: "deduction",
      });
    }
  }

  let selectionInSeasonCount = 0;
  const inSeasonDeductionItemsList: { label: string; points: number }[] = [];
  if (currentRetreat?.season) {
    Object.entries(yogiObj.expressionOfInterests || {}).forEach(([code, eoi]) => {
      if (code === currentRetreat.code) {
        return;
      }
      const retreat = allRetreats.find((r) => r.code === code);
      if (retreat && retreat.season === currentRetreat.season) {
        const rCodeStr = retreat.retreatCode || retreat.name || code;
        if (eoi.state === SelectionState.SELECTED) {
          selectionInSeasonCount++;
          const pts = selectionInSeasonCount === 1 ? -25 : -50;
          inSeasonDeductionItemsList.push({
            label: `Selected for ${rCodeStr} (In-season)`,
            points: pts,
          });
        } else if (eoi.state === SelectionState.PENDING) {
          const isPastRetreat = retreat.date && new Date(retreat.date).getTime() < Date.now();
          if (!isPastRetreat) {
            selectionInSeasonCount++;
            const pts = selectionInSeasonCount === 1 ? -25 : -50;
            inSeasonDeductionItemsList.push({
              label: `Pending for ${rCodeStr} (In-season)`,
              points: pts,
            });
          }
        }
      }
    });
  }

  if (selectionInSeasonCount > 0) {
    const seasonDeduction = -25 - 50 * (selectionInSeasonCount - 1);
    sDeduction += seasonDeduction;
    inSeasonDeductionItemsList.forEach((item) => {
      deductionItems.push({
        label: item.label,
        points: item.points,
        type: "deduction",
      });
    });
  }

  const deductionBreakdown: DeductionBreakdown = {
    score: sDeduction,
    items: deductionItems,
  };

  // 4. Dynamic Flexibility Multiplier (M_flex)
  // D_effective: count of active/upcoming retreats requested by the yogi that still have open capacity for their gender
  let dEffective = 0;
  const requestedRetreatCodes = Object.keys(yogiObj.expressionOfInterests || {});

  requestedRetreatCodes.forEach((code) => {
    const retreat = allRetreats.find((r) => r.code === code);
    if (retreat) {
      if (currentRetreat?.season && retreat.season !== currentRetreat.season) {
        return;
      }

      // Exclude retreats already started or finished
      const isPastRetreat = retreat.date && new Date(retreat.date).getTime() < Date.now();
      if (isPastRetreat) {
        return;
      }

      let capacity = parseInt(retreat.totalYogis, 10) || 0;
      if (yogiObj.attributes.gender === Gender.FEMALE && retreat.femaleYogis) {
        capacity = parseInt(retreat.femaleYogis, 10) || 0;
      } else if (yogiObj.attributes.gender === Gender.MALE && retreat.maleYogis) {
        capacity = parseInt(retreat.maleYogis, 10) || 0;
      }

      // Filter by the current yogi's gender to calculate gender-specific occupancy
      const currentCount = eoiSummary.filter(
        (e) =>
          e.retreatCode === code &&
          e.gender === yogiObj.attributes.gender &&
          (e.state === SelectionState.SELECTED ||
            e.state === SelectionState.PENDING),
      ).length;

      if (currentCount < capacity) {
        dEffective++;
      }
    }
  });

  let mFlex = 1;
  let mFlexReason = "Not applicable (Season not defined)";
  let activeSeasonCount = 0;

  if (currentRetreat?.season) {
    let seasonRetreatCount = 4;
    // Exclude past retreats from the active retreats in the season
    const activeRetreatsInSeason = allRetreats.filter(
      (r) => r.season === currentRetreat.season && !(r.date && new Date(r.date).getTime() < Date.now()),
    );
    if (activeRetreatsInSeason.length > 0) {
      seasonRetreatCount = activeRetreatsInSeason.length;
    }
    activeSeasonCount = seasonRetreatCount;
    mFlex = 1 + 0.1 * (seasonRetreatCount - dEffective);
    mFlexReason = `Calculation: 1.0 + 0.10 × (${seasonRetreatCount} total retreat${seasonRetreatCount === 1 ? "" : "s"} - ${dEffective} open choice${dEffective === 1 ? "" : "s"}) = x${mFlex.toFixed(2)}`;
  }

  const flexBreakdown: FlexBreakdown = {
    multiplier: mFlex,
    seasonRetreatCount: activeSeasonCount,
    openRequestsCount: dEffective,
    isApplicable: !!currentRetreat?.season,
    details: mFlexReason,
  };

  const total = Math.floor((sStatus + sAge + sParticipation + sDeduction) * mFlex);

  return {
    total,
    breakdown: {
      status: statusBreakdown,
      age: ageBreakdown,
      participation: participationBreakdown,
      deductions: deductionBreakdown,
      flexibility: flexBreakdown,
    },
  };
};

export const selectionPrioritySorter = (
  y1: Yogi,
  y2: Yogi,
  retreat: Retreat,
  allRetreats: Retreat[] = [],
  eoiSummary: EoiSummary[] = [],
) => {
  const y1Score = getYogiSortScore(y1, allRetreats, eoiSummary, retreat).total;
  const y2Score = getYogiSortScore(y2, allRetreats, eoiSummary, retreat).total;

  if (y1Score === y2Score) {
    // finally sort by applied date, lowest date comes first
    const y1RegisteredDate = new Date(
      y1.expressionOfInterests[retreat.code].occurredAt,
    );
    const y2RegisteredDate = new Date(
      y2.expressionOfInterests[retreat.code].occurredAt,
    );
    return y1RegisteredDate.getTime() - y2RegisteredDate.getTime();
  }

  // highest score comes first
  return y2Score - y1Score;
};

export const ageSorter = (
  y1: Yogi,
  y2: Yogi,
  retreat: Retreat,
  allRetreats: Retreat[] = [],
  eoiSummary: EoiSummary[] = [],
) => {
  const dobY1 = new Date(y1.attributes.dob || "");
  const dobY2 = new Date(y2.attributes.dob || "");

  let diff = dobY1.getTime() - dobY2.getTime();

  if (isNaN(diff)) diff = 0;

  if (diff === 0) {
    return selectionPrioritySorter(y1, y2, retreat, allRetreats, eoiSummary);
  } else {
    return diff;
  }
};

export const sortYogiList = (
  yogiList: Yogi[],
  retreat: Retreat,
  sortBy: string = SELECTION_PRIORITY_SORT,
  allRetreats: Retreat[] = [],
  eoiSummary: EoiSummary[] = [],
) => {
  if (sortBy === SELECTION_PRIORITY_SORT) {
    yogiList.sort((a, b) => {
      return selectionPrioritySorter(
        a,
        b,
        retreat,
        allRetreats,
        eoiSummary,
      );
    });
  } else if (sortBy === AGE_SORT) {
    yogiList.sort((a, b) => {
      return ageSorter(a, b, retreat, allRetreats, eoiSummary);
    });
  }
};
