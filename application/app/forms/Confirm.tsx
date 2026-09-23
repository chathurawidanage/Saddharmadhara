"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Model, surveyLocalization, SurveyModel } from "survey-core";
import "survey-core/defaultV2.min.css";
import { Survey } from "survey-react-ui";
import englishLocaleStrings, { ENGLISH_LOCALE } from "./locale/english";
import sinhalaLocaleStrings, { SINHALA_LOCALE } from "./locale/sinhala";
import Loader from "./components/Loader";
import "./App.css";
import attendance from "./pages/attendance";
import { DHIS2_RETREAT_ATTRIBUTE_MEDIUM } from "./dhis2";
import { confirmAttendance } from "../../backend/Dhis2Client";

surveyLocalization.locales[SINHALA_LOCALE] = {
  ...sinhalaLocaleStrings,
  completeText: "සනාථ කරන්න",
};
surveyLocalization.locales[ENGLISH_LOCALE] = englishLocaleStrings;

const surveyJson = {
  title: {
    [ENGLISH_LOCALE]: "🪷 Saddharmadhara",
    [SINHALA_LOCALE]: "🪷 සද්ධර්මධාරා",
  },
  completedHtml: {
    [ENGLISH_LOCALE]: "<h4>Thank you!</h4>",
    [SINHALA_LOCALE]: "<h4>ස්තුතියි!</h4>",
  },
  pages: [],
  showQuestionNumbers: false,
};

export default function Confirm({
  expressionOfInterestEvent,
  retreatObj,
  teiName,
}: {
  expressionOfInterestEvent: any;
  retreatObj: any;
  teiName: string;
}) {
  const survey = useMemo(
    () =>
      new Model({
        ...surveyJson,
        pages: [...surveyJson.pages, attendance(retreatObj, teiName)],
      }),
    [expressionOfInterestEvent, retreatObj, teiName],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    survey.setLoading = setLoading;
    let medium = retreatObj.attributes[DHIS2_RETREAT_ATTRIBUTE_MEDIUM];
    survey.locale = medium === "english" ? ENGLISH_LOCALE : SINHALA_LOCALE;
    setLoading(false);
  }, [survey, retreatObj]);

  const onComplete = async (survey: SurveyModel, options: any) => {
    options.showSaveInProgress();
    try {
      const attending = survey.data?.RSVP === true;
      const accommodationDenied = survey.data?.AccommodationDenied === true;
      const saved = await confirmAttendance(
        expressionOfInterestEvent,
        attending,
        accommodationDenied,
      );
      if (!saved) {
        options.showSaveError();
      } else {
        options.showSaveSuccess();
      }
    } catch (error) {
      console.error("Error in saving", error);
      options.showSaveError();
    }
  };

  return (
    <div className="App">
      <Loader visible={loading} />
      {!loading && <Survey model={survey} onComplete={onComplete} />}
    </div>
  );
}
