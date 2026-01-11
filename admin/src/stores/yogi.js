import { makeAutoObservable, runInAction } from "mobx";
import {
  DHIS2_ATTENDANCE_DATA_ELEMENT,
  DHIS2_EXPRESSION_OF_INTEREST_PROGRAM_STAGE,
  DHIS2_PARTICIPATION_PROGRAM_STAGE,
  DHIS2_RETREAT_DATA_ELEMENT,
  DHIS2_RETREAT_INVITATION_SENT_DATA_ELEMENT,
  DHIS2_RETREAT_SELECTION_STATE_DATA_ELEMENT,
  DHIS2_ROOM_ALLOCATION_DATA_ELEMENT,
  DHIS2_SPECIAL_COMMENT_DATA_ELEMENT,
  DHIS2_SPECIAL_COMMENT_PROGRAM_STAGE,
  DHIS_PROGRAM,
} from "../dhis2";

const attendanceEventData = ({
  retreat,
  roomCode,
  attendance,
  specialComment,
  trackedEntityInstance,
  orgUnit,
  eventDate,
}) => {
  const dataValues = [];
  if (roomCode) {
    dataValues.push({
      dataElement: DHIS2_ROOM_ALLOCATION_DATA_ELEMENT,
      value: roomCode,
    });
  }

  if (retreat) {
    dataValues.push({
      dataElement: DHIS2_RETREAT_DATA_ELEMENT,
      value: retreat.code,
    });
  }

  if (attendance) {
    dataValues.push({
      dataElement: DHIS2_ATTENDANCE_DATA_ELEMENT,
      value: attendance,
    });
  }

  if (specialComment) {
    dataValues.push({
      dataElement: DHIS2_SPECIAL_COMMENT_DATA_ELEMENT,
      value: specialComment,
    });
  }

  return {
    program: DHIS_PROGRAM,
    programStage: DHIS2_PARTICIPATION_PROGRAM_STAGE,
    status: "ACTIVE",
    dataValues,
    trackedEntityInstance,
    orgUnit,
    eventDate,
  };
};

class YogiStore {
  yogiIdToObjectMap = {};
  expressionOfInterestsYogiIds = {};

  constructor(engine) {
    this.engine = engine;
    makeAutoObservable(this);
  }

  fetchExpressionOfInterests = async (retreatCode, retreatName) => {
    if (this.expressionOfInterestsYogiIds[retreatCode]) {
      return this.expressionOfInterestsYogiIds[retreatCode];
    }

    let response = await this.engine.query({
      yogis: {
        resource: `tracker/events.json`,
        params: {
          programStage: DHIS2_EXPRESSION_OF_INTEREST_PROGRAM_STAGE,
          filter: `${DHIS2_RETREAT_DATA_ELEMENT}:eq:${retreatName || retreatCode
            }`,
          fields: "trackedEntity",
          skipPaging: true,
        },
      },
    });

    // optional: remove duplicates. Only first interest will be considered
    const yogiIdList = [
      ...new Set(response.yogis?.instances.map((i) => i.trackedEntity)),
    ];
    runInAction(() => {
      this.expressionOfInterestsYogiIds[retreatCode] = yogiIdList;
    });
    return yogiIdList;
  };

  fetchYogi = async (yogiId, forceRefetch = false) => {
    if (this.yogiIdToObjectMap[yogiId] && !forceRefetch) {
      return this.yogiIdToObjectMap[yogiId];
    }

    let response = await this.engine.query({
      trackedEntity: {
        resource: `tracker/trackedEntities/${yogiId}`,
        params: {
          inactive: false,
          fields:
            "attributes[attribute,value],enrollments[status,notes[value,createdBy[username]],events[programStage,event,occurredAt,dataValues[dataElement,value]]]",
          program: DHIS_PROGRAM,
        },
      },
    });

    // attributes
    let attributeIdToValueMap = {};
    response.trackedEntity.attributes.forEach((attribute) => {
      attributeIdToValueMap[attribute.attribute] = attribute.value;
    });

    let active = false;

    // events
    let expressionOfInterests = {};
    let specialComments = [];
    let participation = {};
    let notes = [];
    if (response.trackedEntity.enrollments.length > 0) {
      let enrollment = response.trackedEntity.enrollments[0];
      active = enrollment.status === "ACTIVE";

      enrollment.events.forEach((event) => {
        let dataElementIdToValueMap = {};
        event.dataValues.forEach((dv) => {
          dataElementIdToValueMap[dv.dataElement] = dv.value;
        });

        if (event.programStage === DHIS2_EXPRESSION_OF_INTEREST_PROGRAM_STAGE) {
          expressionOfInterests[
            dataElementIdToValueMap[DHIS2_RETREAT_DATA_ELEMENT]
          ] = {
            eventId: event.event,
            state:
              dataElementIdToValueMap[
              DHIS2_RETREAT_SELECTION_STATE_DATA_ELEMENT
              ],
            invitationSent:
              dataElementIdToValueMap[
              DHIS2_RETREAT_INVITATION_SENT_DATA_ELEMENT
              ],
            occurredAt: event.occurredAt,
          };
        } else if (event.programStage === DHIS2_SPECIAL_COMMENT_PROGRAM_STAGE) {
          specialComments.push({
            eventId: event.event,
            comment:
              dataElementIdToValueMap[DHIS2_SPECIAL_COMMENT_DATA_ELEMENT],
            occurredAt: event.occurredAt,
          });
        } else if (event.programStage === DHIS2_PARTICIPATION_PROGRAM_STAGE) {
          participation[dataElementIdToValueMap[DHIS2_RETREAT_DATA_ELEMENT]] = {
            eventId: event.event,
            attendance: dataElementIdToValueMap[DHIS2_ATTENDANCE_DATA_ELEMENT],
            room: dataElementIdToValueMap[DHIS2_ROOM_ALLOCATION_DATA_ELEMENT],
            retreat: dataElementIdToValueMap[DHIS2_RETREAT_DATA_ELEMENT],
            specialComment:
              dataElementIdToValueMap[DHIS2_SPECIAL_COMMENT_DATA_ELEMENT],
            occurredAt: event.occurredAt,
          };
        }
      });
      notes.push(...enrollment.notes);
    }

    const yogiObj = {
      id: yogiId,
      active,
      attributes: attributeIdToValueMap,
      expressionOfInterests,
      specialComments,
      participation,
      notes,
    };

    runInAction(() => {
      this.yogiIdToObjectMap[yogiId] = yogiObj;
    });

    return yogiObj;
  };

  deleteParticipationEvent = async (yogiId, retreat) => {
    let eventId =
      this.yogiIdToObjectMap[yogiId].participation[retreat.code]?.eventId;
    if (eventId) {
      const mutation = {
        resource: "events",
        id: eventId,
        type: "delete",
      };
      let response = await this.engine.mutate(mutation);
      if (response.httpStatusCode === 200) {
        runInAction(() => {
          delete this.yogiIdToObjectMap[yogiId].participation[retreat.code];
        });
      }
      return response.httpStatusCode === 200;
    } else {
      return true;
    }
  };

  markAttendance = async (yogiId, retreat, attendance, specialComment) => {
    let eventId =
      this.yogiIdToObjectMap[yogiId].participation[retreat.code]?.eventId;
    try {
      const type = eventId ? "update" : "create";
      const data = eventId
        ? attendanceEventData({ attendance, specialComment, retreat })
        : attendanceEventData({
          attendance,
          specialComment,
          retreat,
          trackedEntityInstance: yogiId,
          orgUnit: retreat.location,
          eventDate: new Date(),
        });
      const mutation = {
        resource: "events",
        id: eventId,
        data,
        type,
      };

      let response = await this.engine.mutate(mutation);

      if (response.httpStatusCode === 200) {
        runInAction(() => {
          this.yogiIdToObjectMap[yogiId].participation[retreat.code] = {
            attendance,
            specialComment,
            eventId: eventId || response.response.importSummaries[0].reference,
            retreat: retreat.code,
            occurredAt: data.eventDate,
          };
        });
      }
      return response.httpStatusCode === 200;
    } catch (e) {
      console.error("Attendance marking failed", e);
      return false;
    }
  };

  assignRoom = async (yogiId, retreat, roomCode) => {
    let eventId =
      this.yogiIdToObjectMap[yogiId].participation[retreat.code]?.eventId;

    try {
      const type = eventId ? "update" : "create";
      const data = eventId
        ? attendanceEventData({ roomCode, retreat })
        : attendanceEventData({
          roomCode,
          retreat,
          trackedEntityInstance: yogiId,
          orgUnit: retreat.location,
          eventDate: new Date(),
        });

      const mutation = {
        resource: "events",
        id: eventId,
        data,
        type,
      };

      let response = await this.engine.mutate(mutation);

      if (response.httpStatusCode === 200) {
        runInAction(() => {
          this.yogiIdToObjectMap[yogiId].participation[retreat.code] = {
            room: roomCode,
            eventId: response.response.importSummaries[0].reference,
            retreat: retreat.code,
            occurredAt: data.eventDate,
          };
        });
      }
      return response.httpStatusCode === 200;
    } catch (e) {
      console.error("Room assignment failed", e);
      return false;
    }
  };

  changeRetreatState = async (yogiId, retreatCode, newState) => {
    const dataValues = [
      {
        dataElement: DHIS2_RETREAT_SELECTION_STATE_DATA_ELEMENT,
        value: newState,
      },
      {
        dataElement: DHIS2_RETREAT_DATA_ELEMENT,
        value: retreatCode,
      },
    ];

    if (
      this.yogiIdToObjectMap[yogiId].expressionOfInterests[retreatCode]
        .invitationSent
    ) {
      dataValues.push({
        dataElement: DHIS2_RETREAT_INVITATION_SENT_DATA_ELEMENT,
        value:
          this.yogiIdToObjectMap[yogiId].expressionOfInterests[retreatCode]
            .invitationSent,
      });
    }

    const mutation = {
      resource: "events",
      id: this.yogiIdToObjectMap[yogiId].expressionOfInterests[retreatCode]
        .eventId,
      data: {
        program: DHIS_PROGRAM,
        programStage: DHIS2_EXPRESSION_OF_INTEREST_PROGRAM_STAGE,
        status: "COMPLETED",
        dataValues,
      },
      type: "update",
    };

    try {
      let response = await this.engine.mutate(mutation);

      if (response.httpStatusCode === 200) {
        runInAction(() => {
          this.yogiIdToObjectMap[yogiId].expressionOfInterests[
            retreatCode
          ].state = newState;
        });
      }

      return response.httpStatusCode === 200;
    } catch (e) {
      console.error("Yogi state change failed", e);
      return false;
    }
  };

  changeInvitationSentState = async (yogiId, retreatCode, invitationState) => {
    const mutation = {
      resource: "events",
      id: this.yogiIdToObjectMap[yogiId].expressionOfInterests[retreatCode]
        .eventId,
      data: {
        program: DHIS_PROGRAM,
        programStage: DHIS2_EXPRESSION_OF_INTEREST_PROGRAM_STAGE,
        status: "COMPLETED",
        dataValues: [
          {
            dataElement: DHIS2_RETREAT_INVITATION_SENT_DATA_ELEMENT,
            value: invitationState,
          },
          {
            dataElement: DHIS2_RETREAT_DATA_ELEMENT,
            value: retreatCode,
          },
          {
            dataElement: DHIS2_RETREAT_SELECTION_STATE_DATA_ELEMENT,
            value:
              this.yogiIdToObjectMap[yogiId].expressionOfInterests[retreatCode]
                .state,
          },
        ],
      },
      type: "update",
    };

    try {
      let response = await this.engine.mutate(mutation);

      if (response.httpStatusCode === 200) {
        runInAction(() => {
          this.yogiIdToObjectMap[yogiId].expressionOfInterests[
            retreatCode
          ].invitationSent = invitationState;
        });
      }

      return response.httpStatusCode === 200;
    } catch (e) {
      console.error("Yogi state change failed", e);
      return false;
    }
  };
}

export default YogiStore;
