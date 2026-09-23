import { SURVEY_JS_NAME_TO_D2_TRACKED_ENTITY_ATTRIBUTES_MAP } from "../dhis2";
import agreementPage from "../pages/agreement";
import identificationPage from "../pages/identification";
import instructionsPage from "../pages/instructions";
import languagePage from "../pages/language";
import retreatsPage from "../pages/retreats";
import specialCommentsPage, {
  changeSpecialCommentPromptToExistingYogi,
} from "../pages/specialComments";
import {
  EXISTING_YOGI_CHECK_DONE,
  EXISTING_YOGI_ENROLLMENT_ID_PROPERTY,
} from "../properties";
import lankaNic from "lanka-nic-2019";
import { getExistingEnrollment } from "../../../backend/Dhis2Client";
import { SurveyModel } from "survey-core";

const visiblePageNamesForExistingYogis = new Set([
  languagePage.name,
  identificationPage.name,
  instructionsPage.name,
  specialCommentsPage.name,
  retreatsPage.name,
  agreementPage.name,
]);

const searchExisting = ({ NIC, Passport }) => {
  let checks = [];

  if (Passport !== undefined && typeof Passport === "string") {
    const trimmedPassport = Passport.trim().replace(/\s+/g, "");
    if (trimmedPassport) {
      checks.push(
        getExistingEnrollment(
          SURVEY_JS_NAME_TO_D2_TRACKED_ENTITY_ATTRIBUTES_MAP["Passport"],
          trimmedPassport,
        ),
      );
    }
  } else if (Passport) {
    checks.push(
      getExistingEnrollment(
        SURVEY_JS_NAME_TO_D2_TRACKED_ENTITY_ATTRIBUTES_MAP["Passport"],
        Passport,
      ),
    );
  }

  if (NIC !== undefined && typeof NIC === "string") {
    const trimmedNic = NIC.trim().replace(/\s+/g, "");
    const nicInfo = lankaNic.infoNic(trimmedNic);

    if (nicInfo && nicInfo.isValidated) {
      const oldBase = nicInfo.oldFormat.slice(0, 9);
      const nicSearchValues = new Set([
        nicInfo.newFormat,
        `${oldBase}V`,
        `${oldBase}X`,
      ]);

      for (const val of nicSearchValues) {
        checks.push(
          getExistingEnrollment(
            SURVEY_JS_NAME_TO_D2_TRACKED_ENTITY_ATTRIBUTES_MAP["NIC"],
            val,
          ),
        );
      }
    } else if (trimmedNic) {
      // Fallback search for unvalidated/non-standard NICs
      checks.push(
        getExistingEnrollment(
          SURVEY_JS_NAME_TO_D2_TRACKED_ENTITY_ATTRIBUTES_MAP["NIC"],
          trimmedNic,
        ),
      );
    }
  }

  return Promise.any(checks);
};

const onCurrentPageChanging = (survey: SurveyModel, options) => {
  if (
    options.oldCurrentPage?.name === identificationPage.name &&
    !survey.getPropertyValue(EXISTING_YOGI_CHECK_DONE) &&
    !options.oldCurrentPage?.readOnly // has already set to an existing yogi
  ) {
    options.allowChanging = false;
    survey.setLoading(true);
    searchExisting(survey.data)
      .then((enrollmentId) => {
        console.info("Found an existing yogi", enrollmentId);
        options.oldCurrentPage.readOnly = true;
        survey.setPropertyValue(
          EXISTING_YOGI_ENROLLMENT_ID_PROPERTY,
          enrollmentId,
        );
        // hide pages
        for (let page of survey.pages) {
          if (!visiblePageNamesForExistingYogis.has(page.name)) {
            page.visible = false;
          }
        }

        // user clicked a specific page instead of clicking next
        if (visiblePageNamesForExistingYogis.has(options.newCurrentPage.name)) {
          survey.currentPage = options.newCurrentPage;
        } else {
          survey.currentPage = survey.getPageByName(specialCommentsPage.name);
        }

        // change the title of the special comment
        changeSpecialCommentPromptToExistingYogi(survey);
      })
      .catch((err) => {
        // didn't find an existing one
        console.info("Couldn't find an existing yogi", err.message);
        survey.currentPage = options.newCurrentPage;
        return null;
      })
      .finally(() => {
        survey.setPropertyValue(EXISTING_YOGI_CHECK_DONE, true);
        survey.setLoading(false);
      });
  } else if (
    options.newCurrentPage?.name === identificationPage.name &&
    !options.newCurrentPage.readOnly
  ) {
    // set to false, so it will recheck since applicant can edit the values
    survey.setPropertyValue(EXISTING_YOGI_CHECK_DONE, false);
  }
};

export default onCurrentPageChanging;
