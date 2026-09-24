import CryptoJS from "crypto-js";

// --- Environment Variable Checks ---
const esmsEndpoint = process.env.ESMS_ENDPOINT;
const esmsTokenEncryptionKey = process.env.ESMS_TOKEN_ENCRYPTION_KEY;
const dhis2Endpoint = process.env.DHIS2_ENDPOINT;
const dhis2Token = process.env.DHIS2_TOKEN;
const esmsUsername = process.env.ESMS_USERNAME;
const esmsPassword = process.env.ESMS_PASSWORD;
const esmsPushNotificationUrl = process.env.ESMS_PUSH_NOTIFICATION_URL;
const esmsUrlMessageKey = process.env.ESMS_URL_MESSAGE_KEY;

if (
    !esmsEndpoint ||
    !esmsTokenEncryptionKey ||
    !dhis2Endpoint ||
    !dhis2Token ||
    !esmsUsername ||
    !esmsPassword ||
    !esmsPushNotificationUrl
) {
    throw new Error("One or more required environment variables are not set.");
}

const dhis2AuthHeader = `ApiToken ${dhis2Token}`;
const smsTokenStoreUrl = new URL(
    "dataStore/saddharmadhara/sms-token",
    dhis2Endpoint,
);

// --- Core Functions ---

export async function getNewSmsToken() {
    const response = await fetch(`${esmsEndpoint}/v2/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: esmsUsername,
            password: esmsPassword,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to get new SMS token:", errorText);
        throw new Error(`Failed to get new SMS token: ${errorText}`);
    }

    const { token, expiration } = await response.json();
    const expiresAt = Date.now() + expiration * 1000;
    return { token, expiresAt };
}

export async function saveTokenToDhis2(token: string, expiresAt: number) {
    const encryptedToken = CryptoJS.AES.encrypt(
        token,
        esmsTokenEncryptionKey!,
    ).toString();

    let response = await fetch(smsTokenStoreUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: dhis2AuthHeader,
        },
        body: JSON.stringify({ token: encryptedToken, expiresAt }),
    });

    // If key does not exist yet in DataStore, create it with POST
    if (response.status === 404) {
        response = await fetch(smsTokenStoreUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: dhis2AuthHeader,
            },
            body: JSON.stringify({ token: encryptedToken, expiresAt }),
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to save token to DHIS2:", errorText, response.status);
        throw new Error(`Failed to save token to DHIS2: ${errorText}`);
    }
}

export async function getSmsToken(): Promise<string> {
    const tokenGetResponse = await fetch(smsTokenStoreUrl, {
        headers: {
            Authorization: dhis2AuthHeader,
        },
    });

    if (tokenGetResponse.ok) {
        const tokenData = await tokenGetResponse.json();
        if (tokenData.expiresAt > Date.now() + 10 * 60 * 1000) {
            try {
                return CryptoJS.AES.decrypt(
                    tokenData.token,
                    esmsTokenEncryptionKey!,
                ).toString(CryptoJS.enc.Utf8);
            } catch (e) {
                // possible the encryption key has changed
                console.error("Error decrypting token:", e);
                // fall back to requesting a new token
            }
        }
    }

    console.log("Existing token is invalid or missing. Fetching a new one.");
    const { token, expiresAt } = await getNewSmsToken();
    await saveTokenToDhis2(token, expiresAt);
    return token;
}

export async function sendSms(
    to: string[],
    message: string,
    token: string,
): Promise<Response> {
    return await fetch(`${esmsEndpoint}/v2/sms`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            msisdn: to.map((mobile) => {
                return { mobile };
            }),
            message,
            transaction_id: Date.now(),
            push_notification_url: esmsPushNotificationUrl,
            sourceAddress: "SADDHARMA",
        }),
    });
}

export async function getSmsBalance() {
    const token = await getSmsToken();
    const response = await fetch(`${esmsEndpoint}/v1/message-via-url/check/balance?esmsqk=${esmsUrlMessageKey}`, {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error("Failed to fetch balance " + response.status);
    }

    const balance = await response.text();
    const code = balance.split("|")[0];
    const message = balance.split("|")[1];
    if (code !== "1") {
        throw new Error("Failed to fetch balance " + message);
    }
    return message;
}
