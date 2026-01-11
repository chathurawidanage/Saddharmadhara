import {
  Button,
  DropdownButton,
  FlyoutMenu,
  IconArrowLeft16,
  MenuItem,
  Tag,
} from "@dhis2/ui";
import { observer } from "mobx-react";
import React from "react";
import { Col, Container, Row } from "react-bootstrap";
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import {
  DHIS2_TEI_ATTRIBUTE_FULL_NAME,
  DHIS2_TEI_ATTRIBUTE_GENDER,
  DHIS2_TEI_ATTRIBUTE_MOBILE,
  DHIS2_TEI_ATTRIBUTE_NIC,
  DHIS2_TEI_ATTRIBUTE_PASSPORT,
} from "../dhis2";
import YogisList, { sortYogiList } from "./manager/YogiList";
import RetreatFinaliseModal from "./RetreatFinaliseModal";
import RetreatInvitationModal from "./RetreatInvitationModal";
import RetreatLocation from "./RetreatLocation";

const styles = {
  container: {
    marginTop: 5,
  },
  backButton: {
    marginBottom: 10,
  },
  mediumText: {
    textTransform: "capitalize",
  },
  retreatHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  retreatHeaderButtons: {
    display: "flex",
    flexDirection: "row",
    columnGap: 10,
  },
  retreatHeaderTitle: {
    display: "flex",
    flexDirection: "row",
    columnGap: 10,
    alignItems: "center",
  },
};

function downloadTextFile(text, fileName, extension = "txt") {
  const BOM = "\uFEFF"; // UTF-8 BOM
  const blob = new Blob([BOM + text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.${extension}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const RetreatManager = observer(({ store }) => {
  const params = useParams();
  const navigate = useNavigate();

  const [showFinaliseModel, setShowFinaliseModel] = React.useState(false);
  const [showInvitationModel, setShowInvitationModel] = React.useState(false);

  const retreat = store.metadata.retreatsMapWithIdKey[params.retreatId];

  const downloadYogiList = async (
    retreatCode,
    gender,
    selectionState,
    format,
  ) => {
    const yogis = await store.yogis.fetchExpressionOfInterests(
      retreatCode,
      retreat.name,
    );
    const yogiNames = [];

    if (format === "csv") {
      yogiNames.push(
        ["", "Name", "NIC", "Passport", "Phone", "Room"].join(","),
      );
    }

    let index = 0;
    const yogiObj = yogis.map(
      (yogiId) => store.yogis.yogiIdToObjectMap[yogiId],
    );
    sortYogiList(yogiObj, retreat);

    for (const yogi of yogiObj) {
      if (
        yogi.attributes[DHIS2_TEI_ATTRIBUTE_GENDER] === gender &&
        yogi.expressionOfInterests[retreatCode].state === selectionState
      ) {
        if (format === "csv") {
          const room = yogi.participation[retreat.code]?.room || "N/A";
          yogiNames.push(
            [
              (++index).toString().padStart(2, "0"),
              yogi.attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME].trim(),
              yogi.attributes[DHIS2_TEI_ATTRIBUTE_NIC]?.trim() || "",
              yogi.attributes[DHIS2_TEI_ATTRIBUTE_PASSPORT]?.trim() || "",
              yogi.attributes[DHIS2_TEI_ATTRIBUTE_MOBILE]?.trim() || "",
              room,
            ].join(","),
          );
        } else {
          yogiNames.push(
            `${(++index).toString().padStart(2, "0")} ${yogi.attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME].trim()}`,
          );
        }
      }
    }
    downloadTextFile(
      yogiNames.join("\n"),
      `${retreatCode}_${gender}_${selectionState}`,
      format,
    );
  };

  return (
    <Container style={styles.container}>
      <div>
        <div>
          <Row>
            <Col style={styles.backButton}>
              <Button
                small
                icon={<IconArrowLeft16 />}
                onClick={() => {
                  navigate("/");
                }}
              >
                Back to Retreats List
              </Button>
            </Col>
          </Row>
          <Row>
            <Col style={styles.retreatHeader}>
              <div style={styles.retreatHeaderTitle}>
                <h3 style={{ padding: 0, margin: 0 }}>{retreat.name} </h3>
                {retreat.finalized ? (
                  <Tag positive bold>
                    Finalized
                  </Tag>
                ) : null}
              </div>
              <div style={styles.retreatHeaderButtons}>
                <Button onClick={() => setShowInvitationModel(true)}>
                  Send Invitations
                </Button>
                {showInvitationModel && (
                  <RetreatInvitationModal
                    retreat={retreat}
                    store={store}
                    onCancel={() => setShowInvitationModel(false)}
                  />
                )}
                <DropdownButton
                  component={
                    <FlyoutMenu>
                      <MenuItem label="Applied">
                        {["Male", "Female"].map((gender) => (
                          <MenuItem label={gender} key={gender}>
                            <MenuItem
                              label="Name List (Text)"
                              onClick={() => {
                                downloadYogiList(
                                  retreat.code,
                                  gender.toLowerCase(),
                                  "applied",
                                  "txt",
                                );
                              }}
                            />
                            <MenuItem
                              label="Name with details (Excel)"
                              onClick={() => {
                                downloadYogiList(
                                  retreat.code,
                                  gender.toLowerCase(),
                                  "applied",
                                  "csv",
                                );
                              }}
                            />
                          </MenuItem>
                        ))}
                      </MenuItem>
                      <MenuItem label="Pending Confirmation">
                        {["Male", "Female"].map((gender) => (
                          <MenuItem label={gender} key={gender}>
                            <MenuItem
                              label="Name List (Text)"
                              onClick={() => {
                                downloadYogiList(
                                  retreat.code,
                                  gender.toLowerCase(),
                                  "pending",
                                  "txt",
                                );
                              }}
                            />
                            <MenuItem
                              label="Name with details (Excel)"
                              onClick={() => {
                                downloadYogiList(
                                  retreat.code,
                                  gender.toLowerCase(),
                                  "pending",
                                  "csv",
                                );
                              }}
                            />
                          </MenuItem>
                        ))}
                      </MenuItem>
                      <MenuItem label="Selected">
                        {["Male", "Female"].map((gender) => (
                          <MenuItem label={gender} key={gender}>
                            <MenuItem
                              label="Name List (Text)"
                              onClick={() => {
                                downloadYogiList(
                                  retreat.code,
                                  gender.toLowerCase(),
                                  "selected",
                                  "txt",
                                );
                              }}
                            />
                            <MenuItem
                              label="Name with details (Excel)"
                              onClick={() => {
                                downloadYogiList(
                                  retreat.code,
                                  gender.toLowerCase(),
                                  "selected",
                                  "csv",
                                );
                              }}
                            />
                          </MenuItem>
                        ))}
                      </MenuItem>
                      <MenuItem label="Waiting">
                        {["Male", "Female"].map((gender) => (
                          <MenuItem label={gender} key={gender}>
                            <MenuItem
                              label="Name List (Text)"
                              onClick={() => {
                                downloadYogiList(
                                  retreat.code,
                                  gender.toLowerCase(),
                                  "waiting",
                                  "txt",
                                );
                              }}
                            />
                            <MenuItem
                              label="Name with details (Excel)"
                              onClick={() => {
                                downloadYogiList(
                                  retreat.code,
                                  gender.toLowerCase(),
                                  "waiting",
                                  "csv",
                                );
                              }}
                            />
                          </MenuItem>
                        ))}
                      </MenuItem>
                    </FlyoutMenu>
                  }
                >
                  Download
                </DropdownButton>
                <Button
                  primary
                  disabled={
                    Date.now() - retreat.date.getTime() <
                    retreat.noOfDays * 24 * 60 * 60 * 1000 ||
                    retreat.finalized
                  }
                  onClick={() => setShowFinaliseModel(true)}
                >
                  Finalise Retreat
                </Button>
                {showFinaliseModel && (
                  <RetreatFinaliseModal
                    retreat={retreat}
                    store={store}
                    onCancel={() => setShowFinaliseModel(false)}
                  />
                )}
              </div>
            </Col>
          </Row>
          <Row>
            <Col>
              <Tag>{retreat.retreatType?.toUpperCase()}</Tag>
            </Col>
            <Col>
              <Tag neutral>{retreat.retreatCode}</Tag>
            </Col>
            <Col style={styles.mediumText}>
              🌐 {retreat.medium || "Sinhala"}
            </Col>
            <Col>📅 {retreat.date.toDateString()}</Col>
            <Col>⛺ {retreat.noOfDays} Days</Col>
            <Col>
              📍 <RetreatLocation locationId={retreat.location} />
            </Col>
            <Col>🧘‍♂️ {retreat.totalYogis}</Col>
          </Row>
        </div>
        <div>
          <YogisList retreat={retreat} store={store} />
        </div>
      </div>
    </Container>
  );
});

export default RetreatManager;
