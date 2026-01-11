import {
  Button,
  ButtonStrip,
  Checkbox,
  CircularLoader,
  LinearLoader,
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
  CalendarInput,
} from "@dhis2/ui";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { useAlert, useDataEngine } from "@dhis2/app-runtime";
import {
  DHIS2_TEI_ATTRIBUTE_FULL_NAME,
  DHIS2_TEI_ATTRIBUTE_MOBILE,
} from "../dhis2";

const classes = {
  checkboxes: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
};

const tokenCreateMutation = {
  type: "create",
  resource: "apiToken",
  data: ({ expire }) => ({
    expire,
    attributes: [{ type: "MethodAllowedList", allowedMethods: ["GET"] }],
  }),
};

function getMessage(
  teiId,
  teiFullName,
  retreatCode,
  retreatFrom,
  retreatTo,
  deadLine,
  retreatType,
) {
  // todo send in English for english retreats
  const plusDateTo = new Date(retreatTo);
  plusDateTo.setDate(plusDateTo.getDate() + 1);

  const retreatPrefix = retreatType === "silent" ? "ස්වයං " : "";

  return `ඔබ ${retreatFrom.toLocaleDateString("si-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} සිට ${plusDateTo.toLocaleDateString("si-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} දක්වා පැවැත්වෙන සද්ධර්මධාරා ${retreatPrefix}භාවනා වැඩසටහන හා සම්බන්ධවීමට තේරී පත් ව ඇත. ${new Date(
    deadLine,
  ).toLocaleDateString("si-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} දිනට පෙර පහත යොමුව (Link එක) මගින් ඔබගේ සහභාගි වීම/නොවීම තහවුරු කරන්න.

https://application.srisambuddhamission.org/confirm/${retreatCode}/${teiId}

එසේ අපහසු නම් පමණක් ඔබගේ සහභාගිත්වය පහත පරිදි 0743208734 අංකයට SMS හෝ Whatsapp පණිවිඩයක් මගින් තහවුරු කරන්න.

වැඩසටහන් අංකය: ${retreatCode}
නම: ${teiFullName}
ජා.හැ.අ./ගමන් බ.ප.අ:
පැමිණීම / නොපැමිණීම:`;
}

async function sendSms(message, teiMobile, token) {
  let formattedTeiMobile = teiMobile.replace(/^\+94/, "0");
  return await fetch(`https://application.srisambuddhamission.org/api/sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiToken ${token}`,
    },
    body: JSON.stringify({
      to: [formattedTeiMobile],
      message,
    }),
  });
}

const RetreatInvitationModal = observer(({ store, retreat, onCancel }) => {
  const dataEngine = useDataEngine();

  // uninvited, failed, sent
  const [check, setChecks] = React.useState([true, true, false]);
  const [confirmationDeadline, setConfirmationDeadline] = React.useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );

  const [loading, setLoading] = React.useState(false);

  const [isSending, setIsSending] = React.useState(false);

  const [sentYogis, setSentYogis] = React.useState([]);
  const [failedYogis, setFailedYogis] = React.useState([]);
  const [toSendYogis, setToSendYogis] = React.useState([]);

  const [sentCount, setSentCount] = React.useState(0);
  const [totalToSend, setTotalToSend] = React.useState(0);

  const { show } = useAlert("Invitations Sent", {
    duration: 3000,
    success: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      let yogiList = await store.yogis.fetchExpressionOfInterests(
        retreat.code,
        retreat.name,
      );

      const yogiFetchPromises = yogiList.map((yogiId) => {
        return store.yogis.fetchYogi(yogiId);
      });

      const sentYogisArr = [];
      const failedYogisArr = [];
      const toSendYogisArr = [];

      await Promise.all(yogiFetchPromises).then((yogis) => {
        yogis.forEach((yogi) => {
          if (yogi.expressionOfInterests[retreat.code].state !== "pending") {
            return;
          }

          if (
            yogi.expressionOfInterests[retreat.code].invitationSent ===
            "sent" ||
            yogi.expressionOfInterests[retreat.code].invitationSent ===
            "delivered"
          ) {
            sentYogisArr.push(yogi);
          } else if (
            yogi.expressionOfInterests[retreat.code].invitationSent === "failed"
          ) {
            failedYogisArr.push(yogi);
          } else {
            toSendYogisArr.push(yogi);
          }
        });
        setSentYogis(sentYogisArr);
        setFailedYogis(failedYogisArr);
        setToSendYogis(toSendYogisArr);
        setLoading(false);
      });
    })();
  }, [retreat]);

  const onFinaliseClicked = async () => {
    setIsSending(true);

    await store.metadata.setRetreatAttendanceConfirmationDate(
      retreat,
      confirmationDeadline,
    );

    // create a temporary token
    const tokenResponse = await dataEngine.mutate(tokenCreateMutation, {
      variables: {
        expire: Date.now() + 60 * 60 * 1000,
      },
    });

    const token = tokenResponse?.response.key;
    const tokenId = tokenResponse?.response.uid;

    // send invites to yogis

    const finalYogisList = [];

    if (check[0]) {
      finalYogisList.push(...toSendYogis);
    }

    if (check[1]) {
      finalYogisList.push(...failedYogis);
    }

    if (check[2]) {
      finalYogisList.push(...sentYogis);
    }

    setTotalToSend(toSendYogis.length);
    setIsSending(true);

    for (let i = 0; i < finalYogisList.length; i++) {
      let sentResponse = await sendSms(
        getMessage(
          finalYogisList[i].id,
          finalYogisList[i].attributes[DHIS2_TEI_ATTRIBUTE_FULL_NAME],
          retreat.retreatCode,
          retreat.date,
          retreat.endDate,
          confirmationDeadline,
          retreat.retreatType
        ),
        finalYogisList[i].attributes[DHIS2_TEI_ATTRIBUTE_MOBILE],
        token,
      );

      let sent = sentResponse?.ok;

      await store.yogis.changeInvitationSentState(
        finalYogisList[i].id,
        retreat.code,
        sent ? "sent" : "failed",
      );

      // set the campaign id into the datastore to handel delivery report
      if (sent) {
        const sentResponseJson = await sentResponse.json();
        const expressionOInterestEvent =
          finalYogisList[i].expressionOfInterests[retreat.code];
        // write to datastore
        await dataEngine.mutate({
          type: "create",
          resource: "dataStore/invitation-sms/" + sentResponseJson.campaignId,
          data: {
            eventId: expressionOInterestEvent.eventId,
          },
        });
      }

      setSentCount(i + 1);
    }

    // delete the token
    await dataEngine.mutate({
      type: "delete",
      resource: "apiToken",
      id: tokenId,
    });

    setIsSending(false);
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
      <ModalTitle>Send Invitations</ModalTitle>
      {loading && <CircularLoader />}
      {!loading && (
        <>
          <ModalContent>
            <h6>Please confirm the recipients of the invitations</h6>
            <div style={classes.checkboxes}>
              <Checkbox
                label={`Send to the ${toSendYogis.length} uninvited yogis`}
                checked={check[0]}
                onChange={() => onCheckChange(0)}
              />
              <Checkbox
                label={`Send to the ${failedYogis.length} yogis with previous invite SMS sending failures`}
                checked={check[1]}
                onChange={() => onCheckChange(1)}
              />
              <Checkbox
                label={`ReSend to the ${sentYogis.length} yogis already invited`}
                checked={check[2]}
                onChange={() => onCheckChange(2)}
              />
            </div>
            <div>
              <h6 style={{ marginTop: 20 }}>Set the confirmation deadline</h6>
              <CalendarInput
                label="Confirmation Deadline"
                calendar="gregory"
                locale="en-LK"
                date={confirmationDeadline}
                onDateSelect={(date) => {
                  setConfirmationDeadline(date.calendarDateString);
                }}
              />
            </div>
            <div>
              <h6 style={{ marginTop: 20 }}>
                Check the correctness of the message below
              </h6>
              <textarea
                disabled={true}
                style={{ width: "100%", height: 350 }}
                value={getMessage(
                  "yogi-id",
                  "yogi-full-name",
                  retreat.retreatCode,
                  retreat.date,
                  retreat.endDate,
                  confirmationDeadline,
                  retreat.retreatType,
                )}
              />
            </div>
          </ModalContent>
          <ModalActions>
            {isSending && totalToSend > 0 && (
              <LinearLoader amount={(sentCount * 100) / totalToSend} />
            )}
            <ButtonStrip>
              <Button onClick={onCancel}>Cancel</Button>
              <Button
                destructive
                onClick={onFinaliseClicked}
                loading={isSending}
              >
                Send
              </Button>
            </ButtonStrip>
          </ModalActions>
        </>
      )}
    </Modal>
  );
});

export default RetreatInvitationModal;
