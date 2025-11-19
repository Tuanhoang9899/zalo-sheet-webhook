// File: /api/zalo-webhook.js
const { google } = require("googleapis");

module.exports = async (req, res) => {
    console.log("Webhook received:", req.method);

    // Zalo always sends POST
    if (req.method !== "POST") {
        return res.status(200).send("Webhook OK");
    }

    try {
        // =======================
        // 1. Parse RAW BODY (Vercel bắt buộc)
        // =======================
        let rawBody = "";
        await new Promise(resolve => {
            req.on("data", chunk => (rawBody += chunk));
            req.on("end", resolve);
        });

        const data = JSON.parse(rawBody || "{}");
        console.log("Parsed data:", data);

        // =======================
        // 2. Lấy event và follower
    =======================
        const event = data.event_name || "";
        const followerId = data.follower?.id || "";
        const displayName = data.follower?.name || "";
        const refCode = data.ref_code || "";   // Nếu OA hỗ trợ -> Zalo sẽ gửi
        const source = data.source || "";

        // =======================
        // 3. Ghi vào Google Sheet
        // =======================
        const credentials = JSON.parse(process.env.GOOGLE_SHEET_CREDENTIALS || "{}");

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key?.replace(/\\n/g, "\n")
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets"]
        });

        const sheets = google.sheets({ version: "v4", auth });

        const SHEET_ID = "1FbzQ_RbLAIwjLfdItPzia9f5DKEgKH78uVrk4F3bahE";

        // Chuẩn bị dòng ghi
        const row = [
            new Date().toLocaleString("vi-VN"),  // Timestamp
            event,
            followerId,
            displayName,
            source,
            refCode || "(không có)",             // Luôn ghi rõ ràng
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: "Sheet2!A:F",
            valueInputOption: "USER_ENTERED",
            resource: { values: [row] }
        });

        console.log("Saved to sheet:", row);

        return res.status(200).json({
            error: 0,
            message: "Webhook saved successfully",
            received_ref: refCode || null
        });

    } catch (err) {
        console.error("Webhook error:", err);
        return res.status(500).json({ error: 1, message: "Server error", detail: err.toString() });
    }
};
