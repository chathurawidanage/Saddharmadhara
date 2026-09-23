import { useConfig } from "@dhis2/app-runtime";
import { Button, TableRow, TableCell, Tooltip } from "@dhis2/ui";
import { observer } from "mobx-react";
import React, { ReactNode, useState } from "react";
import {
  DHIS2_ROOT_ORG,
  DHIS_PROGRAM,
} from "../../dhis2";
import ActiveApplicationIndicator from "../indicators/ActiveApplicationsIndicator";
import { useStore } from "../../stores/StoreProvider";
import {
  HasKidsIndicator,
  HasPermission,
  HasStress,
  HasUnattendedDeformities,
  HasAlcoholAndDrugs,
  HasLitigations,
  HasDiseases,
  HasDeformities,
} from "../indicators/BooleanWithCommentIndicator";
import GenderIndicator from "../indicators/GenderIndicator";
import ParticipationIndicator from "../indicators/ParticipationIndicator";
import {
  AgeProfileInfor,
  IdProfileInfo,
  PhoneProfileInfo,
  WhatsappProfileInfo,
} from "../indicators/ProfileInfo";
import { BiLinkExternal, BiChevronLeft, BiChevronRight } from "react-icons/bi";
import "./YogiRow.css";
import { Retreat, Yogi, EoiSummary, MaritalState, SelectionState } from "../../types/domain";
import { getYogiSortScore } from "../../utils/yogiUtils";
import { YogiScoreTooltip } from "./YogiScoreTooltip";
import { DENY_REASON_MAP, DISCRETIONARY_REASON_MAP } from "./YogiRowActions";

interface YogiRowProps {
  trackedEntity: Yogi;
  currentRetreat: Retreat;
  allRetreats?: Retreat[];
  eoiSummary?: EoiSummary[];
  actions?: ReactNode;
}

const getReasonLabel = (reason: string) => {
  return DENY_REASON_MAP[reason] || reason;
};

const getDiscretionaryReasonLabel = (reason: string) => {
  return DISCRETIONARY_REASON_MAP[reason] || reason;
};

const YogiRow = observer(({ trackedEntity, currentRetreat, allRetreats, eoiSummary, actions }: YogiRowProps) => {
  const { baseUrl } = useConfig();
  const store = useStore();
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);

  const comments = React.useMemo(() => {
    return (trackedEntity.specialComments || [])
      .filter((comment) => comment.comment?.trim().length > 0)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [trackedEntity.specialComments]);

  const staffNotes = React.useMemo(() => {
    return [...(trackedEntity.notes || [])]
      .filter((note) => note.value?.trim().length > 0)
      .reverse();
  }, [trackedEntity.notes]);

  const denyFeedback =
    store.yogis?.denyFeedbacks.get(`${currentRetreat.code}_${trackedEntity.id}`) ||
    store.yogis?.denyFeedbacks.get(`${currentRetreat.retreatCode}_${trackedEntity.id}`);

  const discretionarySelection =
    store.yogis?.discretionarySelections.get(`${currentRetreat.code}_${trackedEntity.id}`) ||
    store.yogis?.discretionarySelections.get(`${currentRetreat.retreatCode}_${trackedEntity.id}`);

  const currentRetreatState = trackedEntity.expressionOfInterests[currentRetreat.code]?.state;
  const isDiscretionaryActive =
    discretionarySelection &&
    (currentRetreatState === SelectionState.PENDING || currentRetreatState === SelectionState.SELECTED);

  const rowClassNames = [];

  if (
    trackedEntity.attributes.maritalState === MaritalState.REVEREND
  ) {
    rowClassNames.push("yogi-row-reverend");
  }

  return (
    <TableRow className={rowClassNames.join(" ")} key={trackedEntity.id}>
      <TableCell className="yogi-row-td">
        <div className="yogi-name-row">
          {trackedEntity.attributes.fullName}
          {(() => {
            const scoreObj = getYogiSortScore(
              trackedEntity,
              allRetreats,
              eoiSummary,
              currentRetreat,
            );
            const { total, breakdown } = scoreObj;
            return (
              <Tooltip
                content={
                  <div className="yogi-score-tooltip">
                    <YogiScoreTooltip total={total} breakdown={breakdown} />
                  </div>
                }
              >
                <span className="yogi-score">
                  {total.toFixed(2)}
                </span>
              </Tooltip>
            );
          })()}
          <Button
            small
            onClick={() => {
              const tempElement = document.createElement("a");
              tempElement.href = baseUrl;
              window.open(
                new URL(
                  `dhis-web-tracker-capture/index.html#/dashboard?tei=${trackedEntity.id}&program=${DHIS_PROGRAM}&ou=${DHIS2_ROOT_ORG}`,
                  tempElement.href,
                ).toString(),
                "_blank",
              );
            }}
          >
            <BiLinkExternal />
          </Button>
        </div>
        <div className="yogi-profile-info">
          <IdProfileInfo
            idArray={[
              trackedEntity.attributes.nic,
              trackedEntity.attributes.passport,
            ]}
          />
          <PhoneProfileInfo
            phonesArray={[
              trackedEntity.attributes.mobile,
            ]}
          />
          <WhatsappProfileInfo
            whatsapp={
              trackedEntity.attributes.whatsapp ||
              trackedEntity.attributes.CpF36JSasMJ
            }
          />
          <AgeProfileInfor
            birthday={trackedEntity.attributes.dob}
          />
        </div>
        {comments.length > 0 && (
          <div className="yogi-special-comments-subrow">
            <div className="yogi-comment-container">
              <div className="yogi-comment-header">
                <div className="yogi-comment-title-section">
                  <span className="yogi-comment-badge">Special Comment</span>
                  <span className="yogi-comment-date">
                    {new Date(comments[currentCommentIndex].occurredAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {comments.length > 1 && (
                  <div className="yogi-comment-nav">
                    <Button
                      small
                      secondary
                      disabled={currentCommentIndex === 0}
                      onClick={() => setCurrentCommentIndex((prev) => prev - 1)}
                      title="Newer comment"
                    >
                      <BiChevronLeft />
                    </Button>
                    <span className="yogi-comment-counter">
                      {currentCommentIndex + 1} of {comments.length}
                    </span>
                    <Button
                      small
                      secondary
                      disabled={currentCommentIndex === comments.length - 1}
                      onClick={() => setCurrentCommentIndex((prev) => prev + 1)}
                      title="Older comment"
                    >
                      <BiChevronRight />
                    </Button>
                  </div>
                )}
              </div>
              <div className="yogi-comment-body">
                {comments[currentCommentIndex].comment}
              </div>
            </div>
          </div>
        )}
        {staffNotes.length > 0 && (
          <div className="yogi-staff-notes-subrow">
            <div className="yogi-comment-container">
              <div className="yogi-comment-header">
                <div className="yogi-comment-title-section">
                  <span className="yogi-staff-note-badge">Internal Note</span>
                  {staffNotes[currentNoteIndex].storedAt && (
                    <span className="yogi-comment-date">
                      {new Date(staffNotes[currentNoteIndex].storedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {staffNotes[currentNoteIndex].createdBy?.username && (
                    <span className="yogi-comment-author">
                      By {staffNotes[currentNoteIndex].createdBy.username}
                    </span>
                  )}
                </div>
                {staffNotes.length > 1 && (
                  <div className="yogi-comment-nav">
                    <Button
                      small
                      secondary
                      disabled={currentNoteIndex === 0}
                      onClick={() => setCurrentNoteIndex((prev) => prev - 1)}
                      title="Newer note"
                    >
                      <BiChevronLeft />
                    </Button>
                    <span className="yogi-comment-counter">
                      {currentNoteIndex + 1} of {staffNotes.length}
                    </span>
                    <Button
                      small
                      secondary
                      disabled={currentNoteIndex === staffNotes.length - 1}
                      onClick={() => setCurrentNoteIndex((prev) => prev + 1)}
                      title="Older note"
                    >
                      <BiChevronRight />
                    </Button>
                  </div>
                )}
              </div>
              <div className="yogi-comment-body">
                {staffNotes[currentNoteIndex].value}
              </div>
            </div>
          </div>
        )}
        {denyFeedback && (
          <div className="yogi-deny-feedback-subrow">
            <div className="yogi-comment-container">
              <div className="yogi-comment-header">
                <div className="yogi-comment-title-section">
                  <span className="yogi-deny-badge">System Proposal Denied</span>
                  {denyFeedback.submittedAt && (
                    <span className="yogi-comment-date">
                      {new Date(denyFeedback.submittedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="yogi-comment-body">
                System proposal denied by <strong>{denyFeedback.deniedBy || "unknown"}</strong> due to: <strong>{getReasonLabel(denyFeedback.reason)}</strong>
                {denyFeedback.comment && (
                  <div style={{ marginTop: "6px", fontStyle: "italic", color: "var(--color-grey-600)" }}>
                    "{denyFeedback.comment}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {isDiscretionaryActive && (
          <div className="yogi-discretionary-feedback-subrow">
            <div className="yogi-comment-container">
              <div className="yogi-comment-header">
                <div className="yogi-comment-title-section">
                  <span className="yogi-discretionary-badge">Added at Selector's Discretion</span>
                  {discretionarySelection.submittedAt && (
                    <span className="yogi-comment-date">
                      {new Date(discretionarySelection.submittedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="yogi-comment-body">
                Added at selector's discretion by <strong>{discretionarySelection.addedBy || "unknown"}</strong> due to <strong>{getDiscretionaryReasonLabel(discretionarySelection.reason)}</strong>
                {discretionarySelection.comment && (
                  <div style={{ marginTop: "6px", fontStyle: "italic", color: "var(--color-grey-600)" }}>
                    "{discretionarySelection.comment}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </TableCell>
      <TableCell className="yogi-row-td">
        <div className="mini-indicators-container">
          <GenderIndicator
            gender={trackedEntity.attributes.gender}
          />
          <HasKidsIndicator
            hasKids={trackedEntity.attributes.hasKids}
            comment={
              trackedEntity.attributes.hasKidsComment
            }
          />
          <HasPermission
            hasPermission={
              trackedEntity.attributes.hasPermission
            }
            comment={
              trackedEntity.attributes.hasPermissionComment
            }
          />
          <HasUnattendedDeformities
            hasUnattendedDeformities={
              trackedEntity.attributes.hasUnattendedDeformities
            }
            comment={
              trackedEntity.attributes.hasUnattendedDeformitiesComment
            }
          />
          <HasStress
            hasStress={
              trackedEntity.attributes.hasStress
            }
            comment={
              trackedEntity.attributes.hasStressComment
            }
          />
          <HasAlcoholAndDrugs
            hasAlcoholAndDrugs={
              trackedEntity.attributes.fyV0EfY0dnR
            }
            comment={
              trackedEntity.attributes.la4960WBUC3
            }
          />
          <HasLitigations
            hasLitigations={
              trackedEntity.attributes.g1QmlpA14bX
            }
            comment={
              trackedEntity.attributes.GL9bAKX2wl3
            }
          />
          <HasDiseases
            hasDiseases={
              trackedEntity.attributes.iaW1GDx6k3P
            }
            comment={
              trackedEntity.attributes.nOm8SVX2VbC
            }
          />
          <HasDeformities
            hasDeformities={
              trackedEntity.attributes.nwItPNW72se
            }
            comment={
              trackedEntity.attributes.aHZ7BJDzntQ
            }
          />
        </div>
      </TableCell>
      <TableCell className="yogi-row-td">
        <ActiveApplicationIndicator
          currentRetreat={currentRetreat}
          trackedEntity={trackedEntity}
        />
      </TableCell>
      <TableCell className="yogi-row-td">
        <ParticipationIndicator trackedEntity={trackedEntity} />
      </TableCell>
      {!currentRetreat.finalized && (
        <TableCell className="yogi-row-td">
          <div className="yogi-row-actions">{actions}</div>
        </TableCell>
      )}
    </TableRow>
  );
},
);

export default YogiRow;
