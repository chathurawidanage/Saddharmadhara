import { useAlert } from "@dhis2/app-runtime";
import {
  Button,
  ButtonStrip,
  DropdownButton,
  FlyoutMenu,
  MenuItem,
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
  NoticeBox,
  SingleSelectField,
  SingleSelectOption,
  Tag,
  TextAreaField,
  Radio,
} from "@dhis2/ui";
import { observer } from "mobx-react";
import React, { useState } from "react";
import {
  DHIS2_RETREAT_SELECTION_STATE_SELECTED_CODE,
} from "../../dhis2";
import { useStore } from "../../stores/StoreProvider";
import { Retreat, SelectionState, InvitationState, Yogi } from "../../types/domain";

interface StateChangeButtonProps {
  currentState: string;
  yogi: Yogi;
  retreat: Retreat;
  allYogis?: Yogi[];
}

export const StateChangeButton = observer(({ currentState, yogi, retreat, allYogis = [] }: StateChangeButtonProps) => {
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [showDiscretionaryModal, setShowDiscretionaryModal] = useState(false);
  const [targetDiscretionaryState, setTargetDiscretionaryState] = useState<SelectionState>(SelectionState.PENDING);
  const [selectedReason, setSelectedReason] = useState("");
  const [comment, setComment] = useState("");

  const { show: alertStateChangeStatus } = useAlert(
    ({ yogiName, toState, success }: { yogiName: string; toState: string; success: boolean }) =>
      success
        ? `${yogiName} moved to ${toState}`
        : `Failed to move ${yogiName}`,
    ({ success }: { success: boolean }) => ({
      success,
      critical: !success,
      duration: 2000,
    }),
  );

  const { show: alertError } = useAlert(
    (message: string) => message,
    { critical: true, duration: 4000 }
  );

  const { show: changeFromSelectedStatePrompt } = useAlert(
    ({ yogiName }: { yogiName: string }) =>
      `Are you sure you want to remove ${yogiName} from the 'Selected' state? This will result in the loss of their room allocations and any attendance records if they exist.`,
    ({ onMoveClicked }: { onMoveClicked: () => void }) => ({
      critical: true,
      permanent: true,
      actions: [
        { label: "Move", onClick: onMoveClicked },
        { label: "Don't Move", onClick: () => {} },
      ],
    }),
  );

  const doStateChange = async (toStateCode: SelectionState) => {
    if (!store.yogis) return;
    setLoading(true);
    const success = await store.yogis.changeRetreatState(
      yogi.id,
      retreat.code,
      toStateCode,
    );
    setLoading(false);
    alertStateChangeStatus({
      yogiName: yogi.attributes.fullName,
      toState: toStateCode,
      success,
    });
  };

  const onStateChanged = async (toStateCode: SelectionState) => {
    if (!store.yogis) return;
    if (
      currentState === DHIS2_RETREAT_SELECTION_STATE_SELECTED_CODE &&
      yogi.participation[retreat.code]
    ) {
      changeFromSelectedStatePrompt({
        yogiName: yogi.attributes.fullName,
        onMoveClicked: async () => {
          const success = await store.yogis?.deleteParticipationEvent(
            yogi.id,
            retreat,
          );
          if (success) {
            await doStateChange(toStateCode);
          }
        },
      });
    } else {
      if (toStateCode === SelectionState.APPLIED) {
        await store.yogis.deleteProposedDenyFeedback(retreat.code, yogi.id, retreat.retreatCode);
        await store.yogis.deleteDiscretionarySelection(retreat.code, yogi.id, retreat.retreatCode);
      }
      await doStateChange(toStateCode);
    }
  };

  const handleDenyConfirm = async () => {
    if (!selectedReason) return;
    if (selectedReason === "OTHER" && !comment.trim()) return;

    setLoading(true);
    const feedbackSaved = await store.yogis?.saveProposedDenyFeedback(
      retreat.code,
      yogi.id,
      selectedReason,
      comment,
      store.metadata?.currentUser?.username,
    );

    if (!feedbackSaved) {
      setLoading(false);
      alertError("Failed to save deny feedback to DHIS2 datastore. Please try again.");
      return;
    }

    const success = await store.yogis?.changeRetreatState(
      yogi.id,
      retreat.code,
      SelectionState.DESELECTED,
    );

    setLoading(false);
    setShowDenyModal(false);

    alertStateChangeStatus({
      yogiName: yogi.attributes.fullName,
      toState: SelectionState.DESELECTED,
      success,
    });
  };

  const handleDiscretionaryConfirm = async () => {
    if (!selectedReason) return;
    if (selectedReason === "OTHER" && !comment.trim()) return;

    setLoading(true);
    const saved = await store.yogis?.saveDiscretionarySelection(
      retreat.code,
      yogi.id,
      selectedReason,
      comment,
      yogi.attributes.gender,
      store.metadata?.currentUser?.username,
    );

    if (!saved) {
      setLoading(false);
      alertError("Failed to save discretionary selection to DHIS2 datastore. Please try again.");
      return;
    }

    const success = await store.yogis?.changeRetreatState(
      yogi.id,
      retreat.code,
      targetDiscretionaryState,
    );

    setLoading(false);
    setShowDiscretionaryModal(false);

    alertStateChangeStatus({
      yogiName: yogi.attributes.fullName,
      toState: targetDiscretionaryState,
      success,
    });
  };

  const DENY_OPTIONS = [
    { label: "Based on past staff review (eg: inappropriate behavior)", value: "PAST_REVIEW" },
    { label: "Possible disciplinary or behavioral concerns", value: "DISCIPLINARY_CONCERNS" },
    { label: "Too many no shows across past years", value: "TOO_MANY_NO_SHOWS" },
    { label: "Too many participations across past retreats", value: "TOO_MANY_PARTICIPATIONS" },
    { label: "Already known to be not attending based on outside communication", value: "OUTSIDE_COMMUNICATION" },
    { label: "Based on the answers to the questions Physical & Psychological Readiness.", value: "READINESS_ANSWERS" },
    { label: "Health issues", value: "HEALTH_ISSUES" },
    { label: "Age concerns", value: "AGE_CONCERNS" },
    { label: "Eligibility Not Met", value: "ELIGIBILITY_NOT_MET" },
    { label: "Other", value: "OTHER" },
  ];

  const DISCRETIONARY_OPTIONS = [
    { label: "Monastic / Reverend Recommendation", value: "MONASTIC_RECOMMENDATION" },
    { label: "Mission / Retreat Volunteer", value: "MISSION_VOLUNTEER" },
    { label: "Serious Practitioner", value: "SERIOUS_PRACTITIONER" },
    { label: "Exceptional Administrative Case", value: "EXCEPTIONAL_ADMIN_CASE" },
    { label: "Other", value: "OTHER" },
  ];

  const getStateName = (code: string) => {
    const found = (store.metadata?.selectionStates || []).find(
      (state: any) => state.code === code,
    );
    return found?.name || code;
  };

  if (currentState === "applied" || currentState === SelectionState.APPLIED) {
    const quota = store.yogis?.getDiscretionaryQuota(retreat.code, allYogis) || {
      availableSlots: 0,
      usedSlots: 0,
      maxSlots: 0,
      activeCount: 0,
    };
    const canSelectDiscretionary = quota.availableSlots > 0;

    return (
      <>
        <DropdownButton
          open={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={loading}
          component={
            <FlyoutMenu>
              <MenuItem
                label={getStateName(SelectionState.PENDING)}
                disabled={!canSelectDiscretionary}
                onClick={() => {
                  setMenuOpen(false);
                  setSelectedReason("");
                  setComment("");
                  setTargetDiscretionaryState(SelectionState.PENDING);
                  setShowDiscretionaryModal(true);
                }}
              />
              <MenuItem
                label={getStateName(SelectionState.SELECTED)}
                disabled={!canSelectDiscretionary}
                onClick={() => {
                  setMenuOpen(false);
                  setSelectedReason("");
                  setComment("");
                  setTargetDiscretionaryState(SelectionState.SELECTED);
                  setShowDiscretionaryModal(true);
                }}
              />
            </FlyoutMenu>
          }
        >
          Move to
        </DropdownButton>

        {showDiscretionaryModal && (
          <Modal hide={!showDiscretionaryModal}>
            <ModalTitle>Select {yogi.attributes.fullName} via Selector's Discretion</ModalTitle>
            <ModalContent>
              <div style={{ marginBottom: "15px" }}>
                <NoticeBox error>
                  <p style={{ margin: 0 }}>
                    This action bypasses the standard scored waitlist.
                  </p>
                  <p style={{ margin: "4px 0 0 0" }}>
                    ({quota.usedSlots}/{quota.maxSlots} discretionary slots used)
                  </p>
                  <p style={{ margin: "6px 0 0 0" }}>
                    If this action was not intended, please cancel and use the <strong>Selection</strong> tab for normal selections.
                  </p>
                </NoticeBox>
              </div>
              <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--color-grey-700)" }}>
                Please specify the reason for this manual selection.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                {DISCRETIONARY_OPTIONS.map((opt) => (
                  <Radio
                    key={opt.value}
                    label={opt.label}
                    value={opt.value}
                    checked={selectedReason === opt.value}
                    onChange={() => setSelectedReason(opt.value)}
                    dense
                  />
                ))}
              </div>
              <TextAreaField
                label="Comment / Note"
                value={comment}
                onChange={({ value }: { value: string }) => setComment(value)}
                required={selectedReason === "OTHER"}
                validationText={
                  selectedReason === "OTHER" && !comment.trim()
                    ? "Comment is required when 'Other' is selected"
                    : undefined
                }
                error={selectedReason === "OTHER" && !comment.trim()}
              />
            </ModalContent>
            <ModalActions>
              <ButtonStrip>
                <Button onClick={() => setShowDiscretionaryModal(false)} secondary disabled={loading}>
                  Cancel
                </Button>
                <Button
                  primary
                  loading={loading}
                  disabled={!selectedReason || (selectedReason === "OTHER" && !comment.trim())}
                  onClick={handleDiscretionaryConfirm}
                >
                  Confirm Selection
                </Button>
              </ButtonStrip>
            </ModalActions>
          </Modal>
        )}

        {showDenyModal && (
          <Modal hide={!showDenyModal}>
            <ModalTitle>Disqualify / Deny {yogi.attributes.fullName}</ModalTitle>
            <ModalContent>
              <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "var(--color-grey-700)" }}>
                Please specify why this applicant is unsuited for this retreat.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                {DENY_OPTIONS.map((opt) => (
                  <Radio
                    key={opt.value}
                    label={opt.label}
                    value={opt.value}
                    checked={selectedReason === opt.value}
                    onChange={() => setSelectedReason(opt.value)}
                    dense
                  />
                ))}
              </div>
              <TextAreaField
                label="Comment"
                value={comment}
                onChange={({ value }: { value: string }) => setComment(value)}
                required={selectedReason === "OTHER"}
                validationText={
                  selectedReason === "OTHER" && !comment.trim()
                    ? "Comment is required when 'Other' is selected"
                    : undefined
                }
                error={selectedReason === "OTHER" && !comment.trim()}
              />
            </ModalContent>
            <ModalActions>
              <ButtonStrip>
                <Button onClick={() => setShowDenyModal(false)} secondary disabled={loading}>
                  Cancel
                </Button>
                <Button
                  destructive
                  loading={loading}
                  disabled={!selectedReason || (selectedReason === "OTHER" && !comment.trim())}
                  onClick={handleDenyConfirm}
                >
                  Deny
                </Button>
              </ButtonStrip>
            </ModalActions>
          </Modal>
        )}
      </>
    );
  }

  let targetCodes: SelectionState[] = [];

  if (currentState === SelectionState.PENDING || currentState === "pending") {
    targetCodes = [
      SelectionState.SELECTED,
      SelectionState.UNATTENDING,
      SelectionState.UNCONFIRMED,
    ];
  } else if (currentState === SelectionState.SELECTED || currentState === "selected") {
    targetCodes = [SelectionState.UNATTENDING];
  } else if (
    currentState === SelectionState.DESELECTED ||
    currentState === "deselected" ||
    currentState === SelectionState.UNATTENDING ||
    currentState === "unattending" ||
    currentState === SelectionState.UNCONFIRMED ||
    currentState === "unconfirmed" ||
    currentState === SelectionState.WAITING ||
    currentState === "waiting"
  ) {
    targetCodes = [SelectionState.APPLIED];
  }

  const allowedTargets = targetCodes.map((code) => ({
    code,
    name: getStateName(code),
  }));

  if (allowedTargets.length === 0) {
    return null;
  }

  return (
    <DropdownButton
      open={menuOpen}
      onClick={() => setMenuOpen(!menuOpen)}
      disabled={loading}
      component={
        <FlyoutMenu>
          {allowedTargets.map((target) => (
            <MenuItem
              key={target.code}
              onClick={() => {
                setMenuOpen(false);
                onStateChanged(target.code);
              }}
              label={target.name}
            />
          ))}
        </FlyoutMenu>
      }
    >
      Move to
    </DropdownButton>
  );
});

interface RoomSelectProps {
  yogi: Yogi;
  retreat: Retreat;
  allYogis: Yogi[];
}

export const RoomSelect = observer(({ yogi, retreat, allYogis }: RoomSelectProps) => {
  const store = useStore();
  const roomsAssignedToOthers = new Set(
    allYogis
      .filter((y) => y.id !== yogi.id)
      .map((y) => {
        return y.participation[retreat.code]?.room;
      })
      .filter((roomCode) => roomCode !== undefined),
  );

  const roomOptions = (store.metadata?.rooms || [])
    .filter((room) => room.location === retreat.location)
    .filter((room) => !roomsAssignedToOthers.has(room.code))
    .map((room) => (
      <SingleSelectOption label={room.name} value={room.code} key={room.code} />
    ));

  const { show: alertStateChangeStatus } = useAlert(
    ({ yogiName, toRoomCode, success }: { yogiName: string; toRoomCode: string; success: boolean }) =>
      success
        ? `${toRoomCode} assigned to ${yogiName}`
        : `Failed to assign room  ${toRoomCode} to ${yogiName}`,
    ({ success }: { success: boolean }) => {
      return {
        success,
        critical: !success,
        duration: 2000,
      };
    },
  );

  const onRoomAssigned = async ({ selected: roomCode }: { selected: string }) => {
    if (!store.yogis) return;
    const success = await store.yogis.assignRoom(yogi.id, retreat, roomCode);
    alertStateChangeStatus({
      yogiName: yogi.attributes.fullName,
      toRoomCode: roomCode,
      success,
    });
  };

  return (
    <SingleSelectField
      filterable
      clearable
      dense
      placeholder="Room"
      prefix="Room"
      onChange={onRoomAssigned}
      selected={yogi.participation[retreat.code]?.room}
      tabIndex="0"
    >
      {roomOptions}
    </SingleSelectField>
  );
});

interface AttendanceButtonProps {
  yogi: Yogi;
  retreat: Retreat;
}

export const AttendanceButton = observer(({ yogi, retreat }: AttendanceButtonProps) => {
  const store = useStore();
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<string | undefined>(
    yogi.participation[retreat.code]?.attendance,
  );
  const [specialComment, setSpecialComment] = useState(
    yogi.participation[retreat.code]?.specialComment || "",
  );
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const attendanceOptions = (store.metadata?.attendance || []).map((att) => (
    <SingleSelectOption label={att?.name} value={att?.code} key={att?.code} />
  ));
  return (
    <div>
      <Modal hide={!showModal}>
        <ModalTitle>
          Mark Attendance for {yogi.attributes.fullName}
        </ModalTitle>
        <ModalContent className="attendance-fields">
          <SingleSelectField
            label="Status"
            required
            selected={status}
            onChange={(selection: { selected: string }) => {
              setStatus(selection.selected);
            }}
            tabIndex="0"
          >
            {attendanceOptions}
          </SingleSelectField>
          <TextAreaField
            label="Special Comment"
            value={specialComment}
            onChange={(e: { value: string }) => setSpecialComment(e.value)}
          />
        </ModalContent>
        <ModalActions>
          <ButtonStrip>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              disabled={status === undefined}
              primary
              onClick={async () => {
                if (!store.yogis) return;
                setIsMarkingAttendance(true);
                await store.yogis.markAttendance(
                  yogi.id,
                  retreat,
                  status ?? "",
                  specialComment,
                );
                setIsMarkingAttendance(false);
                setShowModal(false);
              }}
              loading={isMarkingAttendance}
            >
              Mark
            </Button>
          </ButtonStrip>
        </ModalActions>
      </Modal>
      <Button onClick={() => setShowModal(true)}>
        {status ? "Update Attendance" : "Mark Attendance"}
      </Button>
    </div>
  );
});

interface InvitationIndicatorProps {
  yogi: Yogi;
  retreat: Retreat;
}

export const InvitationIndicator = observer(({ yogi, retreat }: InvitationIndicatorProps) => {
  const status =
    yogi.expressionOfInterests[retreat.code]?.invitationSent;
  const isSent = status === InvitationState.SENT || status === InvitationState.DELIVERED;
  return (
    <div className="invitation-tag-wrapper">
      <Tag positive={isSent}>
        {isSent ? "Invitation Sent" : "Invitation Pending"}
      </Tag>
    </div>
  );
});

interface ProposedActionsProps {
  yogi: Yogi;
  retreat: Retreat;
}

export const ProposedActions = observer(({ yogi, retreat }: ProposedActionsProps) => {
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [comment, setComment] = useState("");

  const { show: alertStateChangeStatus } = useAlert(
    ({ yogiName, toState, success }: { yogiName: string; toState: string; success: boolean }) =>
      success
        ? `${yogiName} moved to ${toState}`
        : `Failed to move ${yogiName}`,
    ({ success }: { success: boolean }) => {
      return {
        success,
        critical: !success,
        duration: 2000,
      };
    },
  );

  const { show: alertError } = useAlert(
    (message: string) => message,
    { critical: true, duration: 4000 }
  );

  const handleAction = async (toStateCode: SelectionState) => {
    if (!store.yogis) return;
    setLoading(true);

    if (toStateCode === SelectionState.PENDING) {
      await store.yogis.deleteProposedDenyFeedback(
        retreat.code,
        yogi.id,
      );
      await store.yogis.deleteDiscretionarySelection(
        retreat.code,
        yogi.id,
      );
    }

    const success = await store.yogis.changeRetreatState(
      yogi.id,
      retreat.code,
      toStateCode,
    );
    setLoading(false);
    alertStateChangeStatus({
      yogiName: yogi.attributes.fullName,
      toState: toStateCode,
      success,
    });
  };

  const handleOpenDenyModal = () => {
    setSelectedReason("");
    setComment("");
    setShowDenyModal(true);
  };

  const handleDenyConfirm = async () => {
    if (!selectedReason) return;
    if (selectedReason === "OTHER" && !comment.trim()) return;

    setLoading(true);
    const feedbackSaved = await store.yogis?.saveProposedDenyFeedback(
      retreat.code,
      yogi.id,
      selectedReason,
      comment,
      store.metadata?.currentUser?.username,
    );

    if (!feedbackSaved) {
      setLoading(false);
      alertError("Failed to save deny feedback to DHIS2 datastore. Please try again.");
      return;
    }

    const success = await store.yogis?.changeRetreatState(
      yogi.id,
      retreat.code,
      SelectionState.DESELECTED,
    );

    setLoading(false);
    setShowDenyModal(false);

    alertStateChangeStatus({
      yogiName: yogi.attributes.fullName,
      toState: SelectionState.DESELECTED,
      success,
    });
  };

  const OPTIONS = [
    { label: "Based on past staff review (eg: inappropriate behavior)", value: "PAST_REVIEW" },
    { label: "Possible disciplinary or behavioral concerns", value: "DISCIPLINARY_CONCERNS" },
    { label: "Too many no shows across past years", value: "TOO_MANY_NO_SHOWS" },
    { label: "Too many participations across past retreats", value: "TOO_MANY_PARTICIPATIONS" },
    { label: "Already known to be not attending based on outside communication", value: "OUTSIDE_COMMUNICATION" },
    { label: "Based on the answers to the questions Physical & Psychological Readiness.", value: "READINESS_ANSWERS" },
    { label: "Health issues", value: "HEALTH_ISSUES" },
    { label: "Age concerns", value: "AGE_CONCERNS" },
    { label: "Eligibility Not Met", value: "ELIGIBILITY_NOT_MET" },
    { label: "Other", value: "OTHER" },
  ];

  return (
    <ButtonStrip>
      <Button
        primary
        loading={loading}
        onClick={() => handleAction(SelectionState.PENDING)}
      >
        Accept
      </Button>
      <Button
        destructive
        loading={loading}
        onClick={handleOpenDenyModal}
      >
        Deny
      </Button>

      {showDenyModal && (
        <Modal hide={!showDenyModal}>
          <ModalTitle>Deny System Proposal for {yogi.attributes.fullName}</ModalTitle>
          <ModalContent>
            <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "var(--color-grey-700)" }}>
              Please tell us why you think this system proposal is invalid. This feedback will be used to improve the scoring algorithm.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {OPTIONS.map((opt) => (
                <Radio
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                  checked={selectedReason === opt.value}
                  onChange={() => setSelectedReason(opt.value)}
                  dense
                />
              ))}
            </div>
            <TextAreaField
              label="Comment"
              value={comment}
              onChange={({ value }: { value: string }) => setComment(value)}
              required={selectedReason === "OTHER"}
              validationText={
                selectedReason === "OTHER" && !comment.trim()
                  ? "Comment is required when 'Other' is selected"
                  : undefined
              }
              error={selectedReason === "OTHER" && !comment.trim()}
            />
          </ModalContent>
          <ModalActions>
            <ButtonStrip>
              <Button onClick={() => setShowDenyModal(false)} secondary disabled={loading}>
                Cancel
              </Button>
              <Button
                destructive
                loading={loading}
                disabled={!selectedReason || (selectedReason === "OTHER" && !comment.trim())}
                onClick={handleDenyConfirm}
              >
                Deny
              </Button>
            </ButtonStrip>
          </ModalActions>
        </Modal>
      )}
    </ButtonStrip>
  );
});

