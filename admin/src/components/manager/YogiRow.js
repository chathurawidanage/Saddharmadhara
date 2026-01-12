import { useConfig } from "@dhis2/app-runtime";
import {
    Button,
    TableRow,
    TableCell
} from "@dhis2/ui";
import { observer } from "mobx-react";
import {
    DHIS2_ROOT_ORG,
    DHIS2_TEI_ATTRIBUTE_DOB,
    DHIS2_TEI_ATTRIBUTE_FULL_NAME, DHIS2_TEI_ATTRIBUTE_GENDER,
    DHIS2_TEI_ATTRIBUTE_HAS_KIDS, DHIS2_TEI_ATTRIBUTE_HAS_KIDS_COMMENT,
    DHIS2_TEI_ATTRIBUTE_HAS_PERMISSION, DHIS2_TEI_ATTRIBUTE_HAS_PERMISSION_COMMENT,
    DHIS2_TEI_ATTRIBUTE_HAS_STRESS, DHIS2_TEI_ATTRIBUTE_HAS_STRESS_COMMENT,
    DHIS2_TEI_ATTRIBUTE_HAS_UNATTENDED_DEFORMITIES,
    DHIS2_TEI_ATTRIBUTE_HAS_UNATTENDED_DEFORMITIES_COMMENT,
    DHIS2_TEI_ATTRIBUTE_MARITAL_STATE,
    DHIS2_TEI_ATTRIBUTE_MOBILE, DHIS2_TEI_ATTRIBUTE_NIC, DHIS2_TEI_ATTRIBUTE_PASSPORT, DHIS_PROGRAM
} from "../../dhis2";
import ActiveApplicationIndicator from "../indicators/ActiveApplicationsIndicator";
import { HasKidsIndicator, HasPermission, HasStress, HasUnattendedDeformities } from "../indicators/BooleanWithCommentIndicator";
import GenderIndicator from "../indicators/GenderIndicator";
import "./YogiRow.css";
import SpecialCommentsIndicator from "../indicators/SpecialCommentsIndicator";
import ParticipationIndicator from "../indicators/ParticipationIndicator";
import { AgeProfileInfor, IdProfileInfo, PhoneProfileInfo } from "../indicators/ProfileInfo";
import { BiLinkExternal } from "react-icons/bi";
import NotesIndicator from "../indicators/NotesIndicator";

const styles = {
    indicators: {
        display: "flex",
        columnGap: 2,
        rowGap: 2,
        flexDirection: "column"
    },
    miniIndicators: {
        display: "flex",
        columnGap: 2,
        rowGap: 2,
        flexDirection: "row",
        flexWrap: "wrap"
    }
}

const YogiRow = observer(({ trackedEntity, currentRetreat, actions, store }) => {
    const { baseUrl } = useConfig();

    const rowClassNames = [];

    if (trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_MARITAL_STATE] === 'reverend') {
        rowClassNames.push("yogi-row-reverend");
    }

    return (
        <TableRow className={rowClassNames.join(" ")} key={trackedEntity.id}>
            <TableCell className="yogi-row-td">
                <div className="yogi-name-row">
                    {trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME]}
                    <Button
                        small
                        onClick={() => {
                            let tempElement = document.createElement("a");
                            tempElement.href = baseUrl;
                            window.open(
                                new URL(
                                    `dhis-web-tracker-capture/index.html#/dashboard?tei=${trackedEntity.id}&program=${DHIS_PROGRAM}&ou=${DHIS2_ROOT_ORG}`,
                                    tempElement.href
                                ),
                                "_blank"
                            );
                        }}
                        style={styles.actionButton}>
                        <BiLinkExternal />
                    </Button>
                </div>
                <div className="yogi-profile-info">
                    <IdProfileInfo idArray={[trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_NIC], trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_PASSPORT]]} />
                    <PhoneProfileInfo phonesArray={[trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_MOBILE]]} />
                    <AgeProfileInfor birthday={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_DOB]} />
                </div>
                <div>
                    <NotesIndicator trackedEntity={trackedEntity} />
                </div>
            </TableCell>
            <TableCell className="yogi-row-td">
                <div style={styles.miniIndicators}>
                    <GenderIndicator gender={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_GENDER]} />
                    <HasKidsIndicator hasKids={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_HAS_KIDS]}
                        comment={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_HAS_KIDS_COMMENT]} />
                    <HasPermission hasPermission={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_HAS_PERMISSION]}
                        comment={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_HAS_PERMISSION_COMMENT]} />
                    <HasUnattendedDeformities hasUnattendedDeformities={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_HAS_UNATTENDED_DEFORMITIES]}
                        comment={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_HAS_UNATTENDED_DEFORMITIES_COMMENT]} />
                    <HasStress hasStress={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_HAS_STRESS]}
                        comment={trackedEntity.attributes[DHIS2_TEI_ATTRIBUTE_HAS_STRESS_COMMENT]} />
                    <SpecialCommentsIndicator trackedEntity={trackedEntity} />
                </div>
            </TableCell>
            <TableCell className="yogi-row-td">
                <ActiveApplicationIndicator currentRetreat={currentRetreat} trackedEntity={trackedEntity} store={store} />
            </TableCell>
            <TableCell className="yogi-row-td">
                <ParticipationIndicator trackedEntity={trackedEntity} store={store} />
            </TableCell>
            {!currentRetreat.finalized && (
                <TableCell className="yogi-row-td">
                    <div className="yogi-row-actions">
                        {actions}
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
});

export default YogiRow;
