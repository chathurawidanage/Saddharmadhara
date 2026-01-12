import { useAlert } from "@dhis2/app-runtime";
import {
  Button,
  ButtonStrip,
  Checkbox,
  DropdownButton,
  FlyoutMenu,
  InputField,
  LinearLoader,
  MenuItem,
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
  Pagination,
  SingleSelectField,
  SingleSelectOption,
  Tab,
  TabBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableCellHead,
  TableRow,
  TableRowHead,
  Tag,
  TextAreaField,
} from "@dhis2/ui";
import { computed } from "mobx";
import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";
import {
  DHIS2_RETREAT_SELECTION_STATE_PENDING_CONFIRMATION_CODE,
  DHIS2_RETREAT_SELECTION_STATE_SELECTED_CODE,
  DHIS2_TEI_ATTRIBUTE_DOB,
  DHIS2_TEI_ATTRIBUTE_FULL_NAME,
  DHIS2_TEI_ATTRIBUTE_GENDER,
  DHIS2_TEI_ATTRIBUTE_MARITAL_STATE,
  DHIS2_TEI_ATTRIBUTE_MOBILE,
  DHIS2_TEI_ATTRIBUTE_NIC,
  DHIS2_TEI_ATTRIBUTE_PASSPORT,
  DHIS2_TEI_ATTRIBUTE_YOGI_PRIORITY,
} from "../../dhis2";
import GenderIndicator from "../indicators/GenderIndicator";
import ReverendIndicator from "../indicators/ReverendIndicator";
import "./YogiList.css";
import YogiRow from "./YogiRow";

const SELECTION_PRIORITY_SORT = "selection-priority";
const AGE_SORT = "age";

const getYogiSortScore = (yogiObj) => {
  // reverends comes first
  let score = 0;
  if (yogiObj.attributes[DHIS2_TEI_ATTRIBUTE_MARITAL_STATE] === "reverend") {
    score += Math.pow(10, 5);
  }

  if (
    yogiObj.attributes[DHIS2_TEI_ATTRIBUTE_YOGI_PRIORITY]?.toLowerCase() ===
    "trust_member"
  ) {
    score += Math.pow(10, 4);
  }

  if (
    yogiObj.attributes[DHIS2_TEI_ATTRIBUTE_YOGI_PRIORITY]?.toLowerCase() ===
    "trust_members_family"
  ) {
    score += Math.pow(10, 3);
  }

  return score;
};

const selectionPrioritySorter = (y1, y2, retreat) => {
  let y1Score = getYogiSortScore(y1);
  let y2Score = getYogiSortScore(y2);

  if (y1Score === y2Score) {
    // finally sort by applied date, lowest date comes first
    let y1RegisteredDate = new Date(
      y1.expressionOfInterests[retreat.code].occurredAt,
    );
    let y2RegisteredDate = new Date(
      y2.expressionOfInterests[retreat.code].occurredAt,
    );
    return y1RegisteredDate.getTime() - y2RegisteredDate.getTime();
  }

  // highest score comes first
  return y2Score - y1Score;
};

const ageSorter = (y1, y2, retreat) => {
  let dobY1 = new Date(y1.attributes[DHIS2_TEI_ATTRIBUTE_DOB]);
  let dobY2 = new Date(y2.attributes[DHIS2_TEI_ATTRIBUTE_DOB]);

  let diff = dobY1.getTime() - dobY2.getTime();

  if (diff === 0) {
    return selectionPrioritySorter(y1, y2, retreat);
  } else {
    return diff;
  }
};

export const sortYogiList = (
  yogiList,
  retreat,
  sortBy = SELECTION_PRIORITY_SORT,
) => {
  if (sortBy === SELECTION_PRIORITY_SORT) {
    yogiList.sort((a, b) => {
      return selectionPrioritySorter(a, b, retreat);
    });
  } else if (sortBy === AGE_SORT) {
    yogiList.sort((a, b) => {
      return ageSorter(a, b, retreat);
    });
  }
};

const YogisList = observer(({ retreat, store }) => {
  const [selectionState, setSelectionState] = useState(
    store.metadata.selectionStates[0].code,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [yogiList, setYogiList] = useState([]);
  const [yogisFetched, setYogisFetched] = useState(false);

  const [loadProgress, setLoadProgress] = useState(0);

  const [filters, setFilters] = useState({
    male: true,
    female: true,
    reverend: true,
  });

  const [searchQuery, setSearchQuery] = useState("");


  const [sortBy, setSortBy] = useState(SELECTION_PRIORITY_SORT);

  const countByState = computed(() => {
    let stateMap = {};
    yogiList.forEach((yogi) => {
      let state = yogi.expressionOfInterests[retreat.code]?.state;
      if (!stateMap[state]) {
        stateMap[state] = 0;
      }
      stateMap[state]++;
    });
    return stateMap;
  }).get();

  useEffect(() => {
    setCurrentPage(1);
  }, [selectionState, filters]);

  useEffect(() => {
    let yogiListCopy = [...yogiList];
    sortYogiList(yogiListCopy, retreat, sortBy);
    setYogiList(yogiListCopy);
  }, [retreat, sortBy]);

  useEffect(() => {
    (async () => {
      setYogisFetched(false);

      const yogiIdList = await store.yogis.fetchExpressionOfInterests(
        retreat.code,
        retreat.name,
      );

      let completion = 0;

      let yogiFetchPromoises = yogiIdList.map((yogiId) => {
        return store.yogis.fetchYogi(yogiId).then(() => {
          completion++;
          setLoadProgress((completion * 100) / yogiIdList.length);
        });
      });

      Promise.all(yogiFetchPromoises)
        .then(() => {
          let yogiList = yogiIdList.map(
            (yogiId) => store.yogis.yogiIdToObjectMap[yogiId],
          );
          sortYogiList(yogiList, retreat, sortBy);

          setYogiList(yogiList);
          setYogisFetched(true);
        })
        .catch((err) => {
          console.error("Error in fetching yogis", err);
        });
    })();
  }, [retreat]);

  const pagination = (total) => {
    return (
      <Pagination
        page={currentPage}
        pageCount={Math.ceil(total / pageSize)}
        pageSize={pageSize}
        total={total}
        hidePageSizeSelect
        onPageChange={(page) => {
          setCurrentPage(page);
        }}
        className="pagination"
      />
    );
  };

  if (!yogisFetched)
    return <LinearLoader width="100%" amount={loadProgress} margin="0" />;

  let filteredYogis = yogiList
    .filter(
      (yogi) =>
        yogi.expressionOfInterests[retreat.code].state === selectionState,
    )
    .filter(
      (yogi) =>
        filters.male ||
        yogi.attributes[DHIS2_TEI_ATTRIBUTE_GENDER].toLowerCase() !== "male",
    )
    .filter(
      (yogi) =>
        filters.female ||
        yogi.attributes[DHIS2_TEI_ATTRIBUTE_GENDER].toLowerCase() !== "female",
    )
    .filter(
      (yogi) =>
        filters.reverend ||
        yogi.attributes[DHIS2_TEI_ATTRIBUTE_MARITAL_STATE].toLowerCase() !==
        "reverend",
    )
    .filter((yogi) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const name =
        yogi.attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME]?.toLowerCase() || "";
      const mobile =
        yogi.attributes[DHIS2_TEI_ATTRIBUTE_MOBILE]?.toLowerCase() || "";
      const nic =
        yogi.attributes[DHIS2_TEI_ATTRIBUTE_NIC]?.toLowerCase() || "";
      const passport =
        yogi.attributes[DHIS2_TEI_ATTRIBUTE_PASSPORT]?.toLowerCase() || "";

      return (
        name.includes(query) ||
        mobile.includes(query) ||
        nic.includes(query) ||
        passport.includes(query)
      );
    });

  return (
    <div>
      <div className="yogi-list-top-bar">
        <YogiFilter filters={filters} setFilters={setFilters} />

        <SingleSelectField
          placeholder="Sort"
          prefix="Sort"
          onChange={(e) => {
            setSortBy(e.selected);
          }}
          selected={sortBy}
          tabIndex="0"
        >
          <SingleSelectOption
            value={SELECTION_PRIORITY_SORT}
            label="Selection Priority"
          />
          <SingleSelectOption value={AGE_SORT} label="Age" />
        </SingleSelectField>
        <InputField
          className="yogi-search-input"
          placeholder="Search by Name, NIC/Passport, Mobile"
          value={searchQuery}
          onChange={({ value }) => setSearchQuery(value)}
          type="search"
        />

      </div>
      <div>
        <TabBar>
          {store.metadata.selectionStates.map((state) => {
            return (
              <Tab
                key={state.code}
                selected={selectionState === state.code}
                onClick={() => {
                  setSelectionState(state.code);
                }}
              >
                {state.name} [{countByState[state.code] || "0"}]
              </Tab>
            );
          })}
        </TabBar>
      </div>
      <div>
        <div>
          {pagination(filteredYogis.length)}
          <div className="yogi-table-container">
            <Table className="yogi-table">
              <TableHead>
                <TableRowHead>
                  <TableCellHead>Profile</TableCellHead>
                  <TableCellHead width="100px">Indicators</TableCellHead>
                  <TableCellHead width="250px">Applications</TableCellHead>
                  <TableCellHead width="150px">Partiticipation</TableCellHead>
                  {!retreat.finalized && <TableCellHead width="160px">Action</TableCellHead>}
                </TableRowHead>
              </TableHead>
              <TableBody>
                {filteredYogis.map((yogi, index) => {
                  // pagination
                  if (
                    !(
                      index >= (currentPage - 1) * pageSize &&
                      index < currentPage * pageSize
                    )
                  ) {
                    return null;
                  }

                  return (
                    <YogiRow
                      trackedEntity={yogi}
                      key={yogi.id}
                      currentRetreat={retreat}
                      store={store}
                      actions={
                        <>
                          <StateChangeButton
                            store={store}
                            yogi={yogi}
                            currentState={selectionState}
                            retreat={retreat}
                          />
                          {selectionState ===
                            DHIS2_RETREAT_SELECTION_STATE_SELECTED_CODE ? (
                            <RoomSelect
                              store={store}
                              retreat={retreat}
                              yogi={yogi}
                              allYogis={yogiList}
                            />
                          ) : null}
                          {selectionState ===
                            DHIS2_RETREAT_SELECTION_STATE_SELECTED_CODE ? (
                            <AttendanceButton
                              store={store}
                              retreat={retreat}
                              yogi={yogi}
                            />
                          ) : null}
                          {selectionState ===
                            DHIS2_RETREAT_SELECTION_STATE_PENDING_CONFIRMATION_CODE ? (
                            <InvitationIndicator
                              store={store}
                              retreat={retreat}
                              yogi={yogi}
                            />
                          ) : null}
                        </>
                      }
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {pagination(filteredYogis.length)}
        </div>
      </div>
    </div>
  );
});



const YogiFilter = ({ filters, setFilters }) => {
  return (
    <DropdownButton
      component={
        <FlyoutMenu>
          <MenuItem
            label={
              <Checkbox
                label={<ReverendIndicator />}
                checked={filters.reverend}
              />
            }
            onClick={() => {
              setFilters({ ...filters, reverend: !filters.reverend });
            }}
          />
          <MenuItem
            label={
              <Checkbox
                label={<GenderIndicator gender="male" />}
                checked={filters.male}
              />
            }
            onClick={() => {
              setFilters({ ...filters, male: !filters.male });
            }}
          />
          <MenuItem
            label={
              <Checkbox
                label={<GenderIndicator gender="female" />}
                checked={filters.female}
              />
            }
            onClick={() => {
              setFilters({ ...filters, female: !filters.female });
            }}
          />
        </FlyoutMenu>
      }
    >
      Filters
    </DropdownButton>
  );
};

const StateChangeButton = ({ currentState, yogi, retreat, store }) => {
  const { show: alertStateChangeStatus } = useAlert(
    ({ yogiName, toState, success }) =>
      success
        ? `${yogiName} moved to ${toState}`
        : `Failed to move ${yogiName}`,
    ({ success }) => {
      return {
        success,
        critical: !success,
        duration: 2000,
      };
    },
  );

  const { show: changeFromSelectedStatePrompt } = useAlert(
    ({ yogiName }) =>
      `Are you sure you want to remove ${yogiName} from the 'Selected' state? This will result in the loss of their room allocations and any attendance records if they exist.`,
    ({ onMoveClicked }) => {
      return {
        critical: true,
        permanent: true,
        actions: [
          { label: "Move", onClick: onMoveClicked },
          {
            label: "Don't Move",
            onClick: () => { },
          },
        ],
      };
    },
  );

  const doStateChange = async (toStateCode) => {
    let success = await store.yogis.changeRetreatState(
      yogi.id,
      retreat.code,
      toStateCode,
    );
    alertStateChangeStatus({
      yogiName: yogi.attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME],
      toState: toStateCode,
      success,
    });
  };

  const onStateChanged = async (toStateCode) => {
    if (
      currentState === DHIS2_RETREAT_SELECTION_STATE_SELECTED_CODE &&
      yogi.participation[retreat.code]
    ) {
      changeFromSelectedStatePrompt({
        yogiName: yogi.attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME],
        onMoveClicked: async () => {
          let success = await store.yogis.deleteParticipationEvent(
            yogi.id,
            retreat,
          );
          if (success) {
            await doStateChange(toStateCode);
          }
        },
      });
    } else {
      await doStateChange(toStateCode);
    }
  };

  return (
    <DropdownButton
      component={
        <FlyoutMenu>
          {store.metadata.selectionStates
            .filter((state) => state.code !== currentState)
            .map((state) => {
              return (
                <MenuItem
                  key={state.code}
                  onClick={() => {
                    onStateChanged(state.code);
                  }}
                  label={state.name}
                />
              );
            })}
        </FlyoutMenu>
      }
    >
      Move to
    </DropdownButton>
  );
};

const RoomSelect = observer(({ yogi, retreat, allYogis, store }) => {
  let roomsAssignedToOthers = new Set(
    allYogis
      .filter((y) => y.id !== yogi.id)
      .map((y) => {
        return y.participation[retreat.code]?.room;
      })
      .filter((roomCode) => roomCode !== undefined),
  );

  let roomOptions = store.metadata.rooms
    .filter((room) => room.location === retreat.location)
    .filter((room) => !roomsAssignedToOthers.has(room.code))
    .map((room) => (
      <SingleSelectOption label={room.name} value={room.code} key={room.code} />
    ));

  const { show: alertStateChangeStatus } = useAlert(
    ({ yogiName, toRoomCode, success }) =>
      success
        ? `${toRoomCode} assigned to ${yogiName}`
        : `Failed to assign room  ${toRoomCode} to ${yogiName}`,
    ({ success }) => {
      return {
        success,
        critical: !success,
        duration: 2000,
      };
    },
  );

  const onRoomAssigned = async ({ selected: roomCode }) => {
    let success = await store.yogis.assignRoom(yogi.id, retreat, roomCode);
    alertStateChangeStatus({
      yogiName: yogi.attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME],
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

const AttendanceButton = observer(({ yogi, retreat, store }) => {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState(
    yogi.participation[retreat.code]?.attendance,
  );
  const [specialComment, setSpecialComment] = useState(
    yogi.participation[retreat.code]?.specialComment || "",
  );
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const attendanceOptions = store.metadata?.attendance?.map((att) => (
    <SingleSelectOption label={att?.name} value={att?.code} key={att?.code} />
  ));
  return (
    <div>
      <Modal hide={!showModal}>
        <ModalTitle>
          Mark Attendance for {yogi.attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME]}
        </ModalTitle>
        <ModalContent className="attendance-fields">
          <SingleSelectField
            label="Status"
            required
            selected={status}
            onChange={(selection) => {
              setStatus(selection.selected);
            }}
            tabIndex="0"
          >
            {attendanceOptions}
          </SingleSelectField>
          <TextAreaField
            label="Special Comment"
            value={specialComment}
            onChange={(e) => setSpecialComment(e.value)}
          />
        </ModalContent>
        <ModalActions>
          <ButtonStrip>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              disabled={status === undefined}
              primary
              onClick={async () => {
                setIsMarkingAttendance(true);
                await store.yogis.markAttendance(
                  yogi.id,
                  retreat,
                  status,
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

const InvitationIndicator = observer(({ yogi, retreat, store }) => {
  const status =
    yogi.expressionOfInterests[retreat.code]?.invitationSent || "pending";
  return (
    <div style={{ marginTop: 20 }}>
      <Tag positive={status === "sent"}>
        {status === "sent" ? "Invitation Sent" : "Invitation Pending"}
      </Tag>
    </div>
  );
});

export default YogisList;
