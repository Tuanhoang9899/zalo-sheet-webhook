// /api/zalo-webhook.js
const { google } = require("googleapis");
const axios = require("axios"); // Cần cài đặt bằng npm install axios

// Khai báo hằng số
const SHEET_ID = "1FbzQ_RbLAIwjLfdItPzia9f5DKEgKH78uVrk4F3bahE"; // ID Sheet của bạn
const ZALO_APP_ID = process.env.ZALO_APP_ID;
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET;

// Hàm lấy Official Account Access Token
async function getAccessToken() {
    try {
        const tokenResponse = await axios.post(
            'https://oauth.zaloapp.com/v4/oa/access_token',
            new URLSearchParams({
                app_id: ZALO_APP_ID,
                app_secret: ZALO_APP_SECRET,
                grant_type: 'client_credentials'
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return tokenResponse.data.access_token;
    } catch (error) {
        console.error("Error getting Zalo Access Token:", error.message);
        return null;
    }
}

// Hàm lấy thông tin profile (bao gồm ref_code và display_name)
async function getZaloProfile(accessToken, userId) {
    try {
        const profileResponse = await axios.get(
            `https://openapi.zalo.me/v2.0/oa/getprofile?access_token=${accessToken}&user_id=${userId}`
        );
        return profileResponse.data.data;
    } catch (error) {
        console.error("Error getting Zalo Profile:", error.message);
        return null;
    }
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(200).send("Webhook server is running.");
    }

    try {
        // Parse Webhook Data
        let rawBody = "";
        await new Promise(resolve => {
            req.on("data", chunk => (rawBody += chunk));
            req.on("end", resolve);
        });
        const data = JSON.parse(rawBody);
        const event = data.event_name;

        // Chỉ xử lý sự kiện FOLLOW
        if (event !== "follow") {
            return res.status(200).json({ error: 0, message: "Event ignored" });
        }

        const followerId = data.follower?.id;

        if (!followerId) {
            return res.status(200).json({ error: 0, message: "Missing follower ID" });
        }

        // --- BƯỚC 1 & 2: GỌI ZALO API LẤY PROFILE ---
        const accessToken = await getAccessToken();
        if (!accessToken) {
            // Nếu không lấy được Token, ghi lỗi 500 để dễ debug
            return res.status(500).json({ error: 1, message: "Failed to get Zalo Access Token" });
        }

        const profileData = await getZaloProfile(accessToken, followerId);

        let refCode = "";
        let displayName = "";

        if (profileData) {
            refCode = profileData.ref_code || "";
            displayName = profileData.display_name || "";
        }

        // --- BƯỚC 3: KẾT NỐI VÀ GHI GOOGLE SHEET ---
        const credentials = JSON.parse(process.env.GOOGLE_SHEET_CREDENTIALS);
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key.replace(/\\n/g, "\n")
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets"]
        });
        const sheets = google.sheets({ version: "v4", auth });

        // Tạo mảng dữ liệu (row) với 6 cột A đến F
        const row = [
            new Date().toLocaleString("vi-VN"),
            followerId,
            displayName,
            refCode,
            "Follow OA",
            profileData ? "Completed (API)" : "API Error"
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            // Sử dụng Sheet2!A:F theo cấu trúc sheet mới
            range: "Sheet2!A:F",
            valueInputOption: "USER_ENTERED",
            resource: { values: [row] }
        });

        return res.status(200).json({ error: 0, message: "Saved data via Zalo API" });

    } catch (err) {
        console.error("Final Webhook error:", err);
        return res.status(500).json({ error: 1, message: "Webhook error" });
    }
};