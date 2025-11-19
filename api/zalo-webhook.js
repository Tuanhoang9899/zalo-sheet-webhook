// /api/zalo-webhook.js
const { google } = require("googleapis");

module.exports = async (req, res) => {
    console.log("Webhook received:", req.method);

    if (req.method !== "POST") {
        return res.status(200).send("Webhook server is running.");
    }

    try {
        // ====== PARSE RAW JSON BODY (bắt buộc trên Vercel) ======
        let rawBody = "";
        await new Promise(resolve => {
            req.on("data", chunk => (rawBody += chunk));
            req.on("end", resolve);
        });

        const data = JSON.parse(rawBody);
        console.log("Parsed data:", data);

        const event = data.event_name;

        // ====== ONLY HANDLE FOLLOW EVENT ======
        if (event === "follow") {

            // Load Google credentials
            const credentials = JSON.parse(process.env.GOOGLE_SHEET_CREDENTIALS);

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key.replace(/\\n/g, "\n")
                },
                scopes: ["https://www.googleapis.com/auth/spreadsheets"]
            });

            const sheets = google.sheets({ version: "v4", auth });

            // ====== Ghi vào Sheet ======
            const SHEET_ID = "1FbzQ_RbLAIwjLfdItPzia9f5DKEgKH78uVrk4F3bahE";

            const row = [
                new Date().toLocaleString("vi-VN"),
                data.follower?.id || "",
                data.user_id_by_app || "",
                data.ref_code || "",       // nếu có thì ghi, không có để trống
                "Follow OA"
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: "Sheet2!A:E",
                valueInputOption: "USER_ENTERED",
                resource: { values: [row] }
            });

            return res.status(200).json({ error: 0, message: "Saved follow event" });
        }

        // ignore other events
        return res.status(200).json({ error: 0, message: "Event ignored" });

    } catch (err) {
        console.error("Webhook error:", err);
        return res.status(500).json({ error: 1, message: "Webhook error" });
    }
};
