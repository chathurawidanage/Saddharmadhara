import {
    Button,
    ButtonStrip,
    Checkbox,
    CircularLoader,
    LinearLoader,
    Modal,
    ModalActions,
    ModalContent,
    ModalTitle
} from "@dhis2/ui";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { DHIS2_RETREAT_SELECTION_STATE_SELECTED_CODE } from "../dhis2";
import { useAlert } from "@dhis2/app-runtime";
const classes = {
    checkboxes: {
        display: "flex",
        flexDirection: "column",
        gap: 5
    },
}

const RetreatFinaliseModal = observer(({ store, retreat, onCancel }) => {

    const [check, setChecks] = React.useState([false, false, false, false]);

    const [loading, setLoading] = React.useState(false);

    const [selectedYogiList, setSelectedYogiList] = React.useState([]);

    const [alreadyMarkedCount, setAlreadyMarkedCount] = React.useState(0);

    const [isMarking, setIsMarking] = React.useState(false);
    const [markedCount, setMarkedCount] = React.useState(0);
    const { show } = useAlert('Retreat Finalized', { duration: 3000, success: true });

    useEffect(() => {
        (async () => {
            setLoading(true);
            let yogiList = await store.yogis.fetchExpressionOfInterests(
                retreat.code,
                retreat.name
            );

            const yogiFetchPromises = yogiList.map(yogiId => {
                return store.yogis.fetchYogi(yogiId);
            });

            let alreadyMarkedCount = 0;

            await Promise.all(yogiFetchPromises).then((yogis) => {
                const selectedYogis = yogis.filter(yogi => {
                    if (yogi.participation[retreat.code]?.attendance) {
                        alreadyMarkedCount++;
                    }
                    return yogi.expressionOfInterests[retreat.code] && yogi.expressionOfInterests[retreat.code].state === DHIS2_RETREAT_SELECTION_STATE_SELECTED_CODE;
                });

                setSelectedYogiList(selectedYogis);
                setAlreadyMarkedCount(alreadyMarkedCount);
            });

            setLoading(false);
        })();
    }, [retreat]);

    const onFinaliseClicked = async () => {
        setIsMarking(true);
        let markedCount = 0;
        for (const yogi of selectedYogiList) {
            if (!(yogi.participation[retreat.code]?.attendance)) {
                await store.yogis.markAttendance(yogi.id, retreat, "attended");
                setMarkedCount(++markedCount);
            }
        }
        await store.metadata.markRetreatAsFinalized(retreat);
        setIsMarking(false);
        show();
        onCancel();
    };

    const onCheckChange = (index) => {
        const newChecks = [...check];
        newChecks[index] = !newChecks[index];
        setChecks(newChecks);
    };

    return (
        <Modal>
            <ModalTitle>Finalise Retreat</ModalTitle>
            {loading && <CircularLoader />}
            {!loading && (
                <>
                    <ModalContent>
                        <h6>
                            Please confirm the checklist below to finalize the retreat?
                        </h6>
                        <div style={classes.checkboxes}>
                            <Checkbox
                                label={`This retreat had only ${selectedYogiList.length} selected Yogis`}
                                checked={check[0]} onChange={() => onCheckChange(0)} />
                            <Checkbox
                                label={`I've already entered the attendance of the ${alreadyMarkedCount} yogis who require special comments or have a status other than 'attended'`}
                                checked={check[1]} onChange={() => onCheckChange(1)}
                            />
                            <Checkbox
                                label={`I understand all remaining ${selectedYogiList.length - alreadyMarkedCount} yogis will be marked as attended upon the completion of this action.`}
                                checked={check[2]} onChange={() => onCheckChange(2)}
                            />
                            <Checkbox
                                label="I understand this action will be very difficult to undo."
                                checked={check[3]} onChange={() => onCheckChange(3)} />
                        </div>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button destructive disabled={check.some(check => !check)} onClick={onFinaliseClicked} loading={isMarking}>
                                Finalise
                            </Button>
                        </ButtonStrip>
                        {
                            isMarking && selectedYogiList.length > 0
                            && <LinearLoader width="100%" amount={markedCount * 100 / selectedYogiList.length} />
                        }

                    </ModalActions>
                </>
            )}
        </Modal>
    )
});

export default RetreatFinaliseModal