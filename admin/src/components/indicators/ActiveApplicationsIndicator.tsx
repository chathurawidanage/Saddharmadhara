import { Tooltip } from "@dhis2/ui";
import { observer } from "mobx-react";
import React from "react";
import { BiCalendar } from "react-icons/bi";
import "./ApplicationIndicator.css";

import { useStore } from "../../stores/StoreProvider";
import { Retreat, Yogi, AttendanceState, SelectionState } from "../../types/domain";

interface ActiveApplicationIndicatorProps {
  currentRetreat: Retreat;
  trackedEntity: Yogi;
}

const ActiveApplicationIndicator = observer(
  ({ currentRetreat, trackedEntity }: ActiveApplicationIndicatorProps) => {
    const store = useStore();

    if (!store.metadata) return null;

    const targetRetreatsMap = new Map<string, Retreat>();

    // 1. Add all retreats in the same season (if defined)
    if (currentRetreat.season) {
      store.metadata.retreats
        .filter((r) => r.season === currentRetreat.season)
        .forEach((r) => targetRetreatsMap.set(r.code, r));
    }

    // 2. Add all globally current/upcoming retreats
    store.metadata.currentRetreats.forEach((r) => targetRetreatsMap.set(r.code, r));

    // 3. Convert back to unique array
    const targetRetreats = Array.from(targetRetreatsMap.values());

    const seasonRetreats = targetRetreats.filter(
      (r) =>
        r.code !== currentRetreat.code &&
        currentRetreat.season &&
        r.season === currentRetreat.season &&
        trackedEntity.expressionOfInterests[r.code]
    );

    const otherRetreats = targetRetreats.filter(
      (r) =>
        r.code !== currentRetreat.code &&
        (!currentRetreat.season || r.season !== currentRetreat.season) &&
        trackedEntity.expressionOfInterests[r.code]
    );

    const coveredRetreatCodes = new Set<string>([
      currentRetreat.code,
      ...seasonRetreats.map((r) => r.code),
      ...otherRetreats.map((r) => r.code),
    ]);

    const oldRetreats = Object.keys(trackedEntity.expressionOfInterests || {})
      .filter((code) => {
        if (coveredRetreatCodes.has(code)) {
          return false;
        }
        // Exclude if attended (Option 2: only show past applications that were not attended)
        const attendance = trackedEntity.participation?.[code]?.attendance;
        if (attendance === AttendanceState.ATTENDED) {
          return false;
        }
        return true;
      })
      .map((code) => {
        return (
          store.metadata?.retreatsMapWithCodeKey[code] ||
          ({
            id: code,
            code: code,
            name: code,
            retreatCode: code,
            current: false,
            date: new Date(0),
          } as Retreat)
        );
      })
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

    const currentEoi = trackedEntity.expressionOfInterests[currentRetreat.code];
    const appliedDateFormatted = currentEoi?.occurredAt
      ? (() => {
          const d = new Date(currentEoi.occurredAt);
          return isNaN(d.getTime())
            ? currentEoi.occurredAt
            : d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
        })()
      : null;

    if (
      !appliedDateFormatted &&
      seasonRetreats.length === 0 &&
      otherRetreats.length === 0 &&
      oldRetreats.length === 0
    ) {
      return null;
    }

    const getStateLabel = (state: string) => {
      const normalized = (state || "").toLowerCase();
      if (normalized === SelectionState.UNCONFIRMED || normalized === "unconfirmed") {
        return "failed to confirm";
      }
      if (normalized === SelectionState.UNATTENDING || normalized === "unattending") {
        return "not attending";
      }
      return state;
    };

    const renderRetreatBadge = (r: Retreat) => {
      const state = trackedEntity.expressionOfInterests[r.code]?.state;
      return (
        <Tooltip content={r.name} key={r.code}>
          <div className="yogi-application">
            <div className="yogi-application-retreat">
              {r.retreatCode || "UNKW"}
            </div>
            <div
              className={`yogi-application-state active-application-state-${state}`}
            >
              {getStateLabel(state)}
            </div>
          </div>
        </Tooltip>
      );
    };

    return (
      <div className="yogi-applications-container">
        {appliedDateFormatted && (
          <div className="yogi-current-applied-date">
            <BiCalendar className="yogi-applied-icon" />
            <span className="yogi-applied-label">Applied On:</span>
            <span className="yogi-applied-value">{appliedDateFormatted}</span>
          </div>
        )}
        {seasonRetreats.length > 0 && (
          <div className="yogi-applications-section">
            <div className="yogi-applications-section-title">This Season</div>
            <div className="yogi-applications-section-list">
              {seasonRetreats.map(renderRetreatBadge)}
            </div>
          </div>
        )}
        {otherRetreats.length > 0 && (
          <div className="yogi-applications-section">
            <div className="yogi-applications-section-title">Recent</div>
            <div className="yogi-applications-section-list">
              {otherRetreats.map(renderRetreatBadge)}
            </div>
          </div>
        )}
        {oldRetreats.length > 0 && (
          <div className="yogi-applications-section">
            <div className="yogi-applications-section-title">Old Applications</div>
            <div className="yogi-applications-section-list">
              {oldRetreats.map(renderRetreatBadge)}
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default ActiveApplicationIndicator;
