// /api/zalo-webhook.js
const { google } = require("googleapis");

module.exports = async (req, res) => {
    console.log("Webhook received:", req.method);

    if (req.method !== "POST") {
        return res.status(200).send("Webhook server is running.");
    }

    try {
        let rawBody = "";
        await new Promise(resolve => {
            req.on("data", chunk => (rawBody += chunk));
            req.on("end", resolve);
        });

        const data = JSON.parse(rawBody);
        console.log("Parsed data:", data);

        const event = data.event_name;
        const SHEET_ID = "1FbzQ_RbLAIwjLfdItPzia9f5DKEgKH78uVrk4F3bahE";
        const credentials = JSON.parse(process.env.GOOGLE_SHEET_CREDENTIALS);

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key.replace(/\\n/g, "\n")
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets"]
        });
        const sheets = google.sheets({ version: "v4", auth });

        // === XỬ LÝ SỰ KIỆN FOLLOW ===
        if (event === "follow") {
            // Ghi dữ liệu cơ bản (Ref Code sẽ trống)
            const row = [
                new Date().toLocaleString("vi-VN"),
                data.follower?.id || "",
                data.user_id_by_app || "",
                "", // Bỏ trống Ref Code vì nó không có trong Webhook follow
                "Follow OA"
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: "Sheet2!A:E", // Đảm bảo đúng tên Sheet
                valueInputOption: "USER_ENTERED",
                resource: { values: [row] }
            });

            return res.status(200).json({ error: 0, message: "Saved follow event, Ref Code pending" });
        }

        // === XỬ LÝ SỰ KIỆN TIN NHẮN (MESSAGE) ===
        if (event === "user_send_text") {
            const messageText = data.message?.text || "";
            let refCode = "";

            // Kiểm tra xem tin nhắn có chứa mã đại lý không
            // Mã đại lý thường được Zalo gửi dưới dạng một URL hoặc một chuỗi cụ thể
            // Ví dụ: Zalo gửi "Bạn đã follow từ link: https://zalo.me/oa?ref=DL001"

            // Dùng biểu thức chính quy (regex) để tìm mã Ref:
            const refMatch = messageText.match(/ref=([a-zA-Z0-9_-]+)/);
            if (refMatch && refMatch[1]) {
                refCode = refMatch[1];
            } else {
                // Nếu không phải là tin nhắn hệ thống chứa ref code, bỏ qua
                return res.status(200).json({ error: 0, message: "Non-ref message ignored" });
            }

            // Nếu tìm thấy Ref Code, chúng ta sẽ cập nhật lại dòng cuối cùng trong Sheet
            if (refCode) {
                // Lấy ra user ID để đảm bảo chỉ cập nhật dòng của người đó
                const userId = data.user_id_by_app || "";

                // *** LƯU Ý: VIỆC NÀY RẤT PHỨC TẠP VÀ KHÔNG ĐÁNG TIN CẬY TRÊN GOOGLE SHEETS API ***
                // Thay vì cập nhật, chúng ta sẽ ghi thêm một dòng mới để đơn giản hóa.

                // Nếu bạn muốn GHI DÒNG MỚI với Ref Code (dòng cũ vẫn còn)
                const updateRow = [
                    new Date().toLocaleString("vi-VN"),
                    data.follower?.id || "",
                    data.user_id_by_app || "",
                    refCode, // Ghi Ref Code đã tìm thấy
                    "Ref Code via Message"
                ];

                await sheets.spreadsheets.values.append({
                    spreadsheetId: SHEET_ID,
                    range: "Sheet2!A:E",
                    valueInputOption: "USER_ENTERED",
                    resource: { values: [updateRow] }
                });

                return res.status(200).json({ error: 0, message: "Saved Ref Code via message" });
            }

        }

        // ignore other events
        return res.status(200).json({ error: 0, message: "Event ignored" });

    } catch (err) {
        console.error("Webhook error:", err);
        return res.status(500).json({ error: 1, message: "Webhook error" });
    }
};