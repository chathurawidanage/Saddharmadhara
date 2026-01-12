import { Tooltip } from "@dhis2/ui";
import { observer } from "mobx-react";
import "./ApplicationIndicator.css";
import COMMENT from "./img/comment.png";

const ParticipationIndicator = observer(({ trackedEntity, store }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {Object.entries(
        Object.keys(trackedEntity.participation)
          .filter((retreatId) => retreatId !== undefined)
          .map((retreatId) => {
            let retreat = store.metadata.retreatsMapWithCodeKey[retreatId];
            if (!retreat) return null;
            return {
              retreat,
              participation: trackedEntity.participation[retreatId],
              year: new Date(retreat.date).getFullYear(),
            };
          })
          .filter((item) => item !== null)
          .reduce((acc, item) => {
            if (!acc[item.year]) acc[item.year] = [];
            acc[item.year].push(item);
            return acc;
          }, {})
      )
        .sort(([yearA], [yearB]) => yearB - yearA)
        .map(([year, items]) => (
          <div key={year} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#888" }}>
              {year}
            </div>
            <div className="yogi-applications">
              {items.map(({ retreat, participation: p }) => {
                let hasSpecialComment =
                  p.specialComment && p.specialComment.trim().length > 0;
                return (
                  <Tooltip
                    content={
                      <>
                        <p>{retreat.name}</p>
                        {hasSpecialComment && <p>{p.specialComment}</p>}
                      </>
                    }
                    key={retreat.code + p.attendance}
                  >
                    <div className="yogi-application">
                      <div className="yogi-application-retreat">
                        {retreat.retreatCode || "UNKW"}
                      </div>
                      <div
                        className={`yogi-application-state participation-state-${p.attendance}`}
                      >
                        {p.attendance || "Pending"}
                      </div>
                      {hasSpecialComment && (
                        <div className="yogi-application-special-comment">
                          <img src={COMMENT} width={15} alt="comment" />
                        </div>
                      )}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
});

export default ParticipationIndicator;
