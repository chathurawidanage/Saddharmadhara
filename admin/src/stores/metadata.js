import { makeAutoObservable, runInAction } from "mobx";
import {
  DHIS2_ACTIVE_RETREATS_SQL_VIEW,
  DHIS2_LANGUAGES_OPTION_SET_ID,
  DHIS2_RETREAT_CODE_ATTRIBUTE,
  DHIS2_RETREAT_DATE_ATTRIBUTE,
  DHIS2_RETREAT_DISABLED_ATTRIBUTE,
  DHIS2_RETREAT_LOCATION_ATTRIBUTE,
  DHIS2_RETREAT_NO_OF_DAYS_ATTRIBUTE,
  DHIS2_RETREAT_TOTAL_YOGIS_ATTRIBUTE,
  DHIS2_RETREAT_TYPE_ATTRIBUTE,
  DHIS2_ROOMS_FLOOR_ATTRIBUTE,
  DHIS2_ROOMS_OPTION_SET_ID,
  DHIS_RETREAT_SELECTION_STATE_OPTION_SET_ID,
  DHIS_RETREAT_TYPE_OPTION_SET_ID,
  DHIS2_RETREAT_MEDIUM_ATTRIBUTE,
  DHIS2_RETREAT_FINALIZED_ATTRIBUTE,
  DHIS2_ATTENDANCE_OPTION_SET_ID,
  DHIS2_RETREAT_ATTENDANCE_CONFIRMATION_DATE_ATTRIBUTE,
} from "../dhis2";

// Retreats Transforming
const getEndDate = (startDate, noOfDays) => {
  let endDate = new Date(startDate.getTime() + noOfDays * 24 * 60 * 60 * 1000);
  return endDate;
};

const transformRetreats = (retreatsReponse) => {
  let retreats = retreatsReponse?.listGrid?.rows?.map((row) => {
    let attributeIdToValueMap = JSON.parse(row[3]);
    let date = new Date(attributeIdToValueMap[DHIS2_RETREAT_DATE_ATTRIBUTE]);
    let noOfDays = attributeIdToValueMap[DHIS2_RETREAT_NO_OF_DAYS_ATTRIBUTE];
    let endDate = getEndDate(date, noOfDays);
    return {
      id: row[0],
      code: row[1],
      name: row[2],
      current: row[4] === "true",
      retreatCode: attributeIdToValueMap[DHIS2_RETREAT_CODE_ATTRIBUTE],
      date,
      endDate,
      disabled:
        attributeIdToValueMap[DHIS2_RETREAT_DISABLED_ATTRIBUTE] === "true",
      location: attributeIdToValueMap[DHIS2_RETREAT_LOCATION_ATTRIBUTE],
      totalYogis: attributeIdToValueMap[DHIS2_RETREAT_TOTAL_YOGIS_ATTRIBUTE],
      retreatType: attributeIdToValueMap[DHIS2_RETREAT_TYPE_ATTRIBUTE],
      noOfDays: attributeIdToValueMap[DHIS2_RETREAT_NO_OF_DAYS_ATTRIBUTE],
      medium: attributeIdToValueMap[DHIS2_RETREAT_MEDIUM_ATTRIBUTE],
      finalized:
        attributeIdToValueMap[DHIS2_RETREAT_FINALIZED_ATTRIBUTE] === "true",
    };
  });

  retreats.sort((a, b) => a.date - b.date);

  return retreats;
};
// End of Retreats Transforming

const transformRooms = (roomResponse) => {
  return roomResponse.options.map((room) => {
    let attributeIdToValueMap = {};
    room.attributeValues.forEach((attribute) => {
      attributeIdToValueMap[attribute.attribute.id] = attribute.value;
    });
    return {
      code: room.code,
      name: room.name,
      location: attributeIdToValueMap[DHIS2_RETREAT_LOCATION_ATTRIBUTE],
      floor: attributeIdToValueMap[DHIS2_ROOMS_FLOOR_ATTRIBUTE],
    };
  });
};

const transformLanguages = (languagesResponse) => {
  return languagesResponse.options.map((language) => {
    let attributeIdToValueMap = {};
    language.attributeValues.forEach((attribute) => {
      attributeIdToValueMap[attribute.attribute.id] = attribute.value;
    });
    return {
      code: language.code,
      name: language.name,
    };
  });
};

const transformAttendance = (attendanceResponse) => {
  return attendanceResponse.options.map((attendance) => {
    return {
      code: attendance.code,
      name: attendance.name,
    };
  });
};

const metadataQuery = {
  retreatTypes: {
    resource: `optionSets/${DHIS_RETREAT_TYPE_OPTION_SET_ID}.json`,
    params: {
      fields: "options[name,code]",
    },
  },
  retreats: {
    resource: `sqlViews/${DHIS2_ACTIVE_RETREATS_SQL_VIEW}/data.json`,
    params: {
      skipPaging: true,
    },
  },
  selectionStates: {
    resource: `optionSets/${DHIS_RETREAT_SELECTION_STATE_OPTION_SET_ID}.json`,
    params: {
      fields: "options[code,name,style]",
    },
  },
  rooms: {
    resource: `optionSets/${DHIS2_ROOMS_OPTION_SET_ID}.json`,
    params: {
      fields: "options[code,name,attributeValues]",
    },
  },
  languages: {
    resource: `optionSets/${DHIS2_LANGUAGES_OPTION_SET_ID}.json`,
    params: {
      fields: "options[code,name,attributeValues]",
    },
  },
  attendance: {
    resource: `optionSets/${DHIS2_ATTENDANCE_OPTION_SET_ID}.json`,
    params: {
      fields: "options[code,name]",
    },
  },
};

class MetadataStore {
  retreatTypes;
  retreats;
  selectionStates;
  rooms;
  languages;
  attendance;
  smsCredits = null;

  constructor(engine) {
    this.engine = engine;
    makeAutoObservable(this);
  }

  get retreatsMapWithIdKey() {
    let retreatsMap = {};
    this.retreats?.forEach((retreat) => {
      retreatsMap[retreat.id] = retreat;
    });
    return retreatsMap;
  }

  get retreatsMapWithCodeKey() {
    let retreatsMap = {};
    this.retreats?.forEach((retreat) => {
      retreatsMap[retreat.code] = retreat;
    });
    return retreatsMap;
  }

  get currentRetreats() {
    return this.retreats.filter((retreat) => retreat.current);
  }

  get oldRetreats() {
    return this.retreats.filter((retreat) => !retreat.current);
  }

  markRetreatAsFinalized = async (retreat) => {
    const finalized = await this.updateRetreatAttribute(
      retreat,
      DHIS2_RETREAT_FINALIZED_ATTRIBUTE,
      true,
    );

    if (finalized) {
      runInAction(() => {
        const retreatIndex = this.retreats.indexOf(retreat);
        this.retreats[retreatIndex].finalized = true;
      });
    }
  };

  setRetreatAttendanceConfirmationDate = async (retreat, date) => {
    await this.updateRetreatAttribute(
      retreat,
      DHIS2_RETREAT_ATTENDANCE_CONFIRMATION_DATE_ATTRIBUTE,
      date,
    );
  };

  updateRetreatAttribute = async (retreat, attributeId, value) => {
    const retreatObj = await this.engine.query({
      retreat: {
        resource: `options/${retreat.id}.json`,
        params: {
          fields: "id,code,name,optionSet,attributeValues[attribute[id],value]",
        },
      },
    });

    const existingRetreatOnServer = retreatObj.retreat;
    const updatingAttributeIndex =
      existingRetreatOnServer.attributeValues.findIndex(
        (attributeValue) => attributeValue.attribute.id === attributeId,
      );
    if (updatingAttributeIndex !== -1) {
      // remove
      existingRetreatOnServer.attributeValues.splice(updatingAttributeIndex, 1);
    }

    const mutatedRetreat = {
      ...existingRetreatOnServer,
      attributeValues: [
        ...existingRetreatOnServer.attributeValues,
        {
          attribute: {
            id: attributeId,
          },
          value: value,
        },
      ],
    };

    const mutation = {
      resource: "options",
      id: retreat.id,
      data: mutatedRetreat,
      type: "update",
    };
    let response = await this.engine.mutate(mutation);

    return response.httpStatusCode === 200;
  };

  fetchSmsCredits = async () => {
    try {
      const response = await fetch("https://application.srisambuddhamission.org/api/sms/balance");
      if (response.ok) {
        const data = await response.json();
        runInAction(() => {
          this.smsCredits = data;
        });
      }
    } catch (error) {
      console.error("Failed to fetch SMS credits", error);
    }
  };

  loadRetreats = async () => {
    let response = await this.engine.query({
      retreats: metadataQuery.retreats,
    });
    runInAction(() => {
      this.retreats = transformRetreats(response.retreats);
    });
  };

  init = async () => {
    let response = await this.engine.query(metadataQuery);
    runInAction(() => {
      this.retreatTypes = response.retreatTypes.options;
      this.selectionStates = response.selectionStates.options;
      this.retreats = transformRetreats(response.retreats);
      this.rooms = transformRooms(response.rooms);
      this.languages = transformLanguages(response.languages);
      this.attendance = transformAttendance(response.attendance);
      this.fetchSmsCredits();
    });
  };
}

export default MetadataStore;
