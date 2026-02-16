import { ENGLISH_LOCALE } from "../locale/english";
import { SINHALA_LOCALE } from "../locale/sinhala";
import {
  DHIS2_RETREAT_ATTRIBUTE_ACCOMMODATION_NOT_PROVIDED,
  DHIS2_RETREAT_ATTRIBUTE_ACCOMMODATION_OPTIONAL,
  DHIS2_RETREAT_ATTRIBUTE_DATE,
  DHIS2_RETREAT_ATTRIBUTE_DAYS,
} from "../dhis2";

const attendancePage = (retreatObj, teiName: string) => {
  let startDate = new Date(retreatObj.attributes[DHIS2_RETREAT_ATTRIBUTE_DATE]);
  let noOfDays = parseInt(retreatObj.attributes[DHIS2_RETREAT_ATTRIBUTE_DAYS]);
  let endDate = new Date(
    startDate.getTime() + (noOfDays + 1) * 24 * 60 * 60 * 1000,
  );
  let accommodationOptional =
    retreatObj.attributes[DHIS2_RETREAT_ATTRIBUTE_ACCOMMODATION_OPTIONAL];
  let accommodationNotProvided = retreatObj.attributes[DHIS2_RETREAT_ATTRIBUTE_ACCOMMODATION_NOT_PROVIDED];

  let description = {
    [ENGLISH_LOCALE]: "",
    [SINHALA_LOCALE]: ""
  };

  if (accommodationNotProvided === "true") {
    description = {
      [ENGLISH_LOCALE]: "Accommodation will not be provided for this program. Please make your own arrangements.",
      [SINHALA_LOCALE]: "මෙම වැඩසටහන සඳහා නේවාසික පහසුකම් සපයනු නොලැබේ. එබැවින්, ඔබගේ නේවාසික පහසුකම් පෞද්ගලිකව සලසා ගත යුතු බව කරුණාවෙන් සලකන්න."
    }
  }

  return {
    name: "Attendance",
    title: {
      [ENGLISH_LOCALE]: "📨 RSVP",
      [SINHALA_LOCALE]: "📨 පැමිණීම/නොපැමිණීම",
    },
    elements: [
      {
        name: "RSVP",
        type: "boolean",
        title: {
          [ENGLISH_LOCALE]: `You (${teiName}) have been selected to attend the ${noOfDays} days Saddharmadhara retreat from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}. Please confirm you attendance below.`,
          [SINHALA_LOCALE]: `ඔබ (${teiName}) ${startDate.toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            },
          )} සිට ${endDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })} දක්වා දක්වා පැවැත්වෙන දින ${noOfDays}ක සද්ධර්මධාරා වැඩසටහන හා සම්බන්ධවීමට තේරී පත් ව ඇත. කරුණාකර ඔබගේ සහභාගිත්වය තහවුරු කරන්න.`,
        },
        description,
        isRequired: true,
        labelTrue: {
          [ENGLISH_LOCALE]: "Attending",
          [SINHALA_LOCALE]: "පැමිණේ",
        },
        labelFalse: {
          [ENGLISH_LOCALE]: "Not Attending",
          [SINHALA_LOCALE]: "නොපැමිණේ",
        },
      },
      {
        name: "AccommodationDenied",
        type: "boolean",
        title: {
          [ENGLISH_LOCALE]: `For this program, you...`,
          [SINHALA_LOCALE]: `මෙම වැඩසටහන සඳහා ඔබ,`,
        },
        isRequired: true,
        visibleIf: `{RSVP} = 'true' and ${accommodationOptional} = 'true'`,
        labelTrue: {
          [ENGLISH_LOCALE]: "Commute daily from home",
          [SINHALA_LOCALE]: "නිවසේ සිට දිනපතා පැමිණෙයි.",
        },
        labelFalse: {
          [ENGLISH_LOCALE]: "Stay on-site during the program",
          [SINHALA_LOCALE]:
            "වැඩසටහන පවතින කාලය තුළ පූර්ණ නේවාසිකව රැඳී සිටීයි.",
        },
      },
    ],
  };
};
export default attendancePage;
