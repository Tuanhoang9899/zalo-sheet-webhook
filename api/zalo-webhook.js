// Tên file: zalo-webhook.js
const { google } = require('googleapis');

// Tải credentials từ biến môi trường
const credentials = JSON.parse(process.env.GOOGLE_SHEET_CREDENTIALS || '{}');
// Sheet ID của bạn - PHẢI THAY THẾ GIÁ TRỊ NÀY HOẶC ĐỂ LẬP TRÌNH VIÊN THAY SAU
const SHEET_ID = '1FbzQ_RbLAIwjLfdItPzia9f5DKEgKH78uVrk4F3bahE';

module.exports = async (req, res) => {
    // Thêm dòng này để kiểm tra xem request có tới được đây không
    console.log('Webhook received:', req.method);
    // 1. Chỉ xử lý yêu cầu POST
    if (req.method !== 'POST') {
        return res.status(200).send('Webhook server is running.');
    }

    try {
        const data = req.body;
        const event = data.event_name;

        // 2. Lọc sự kiện "follow" và kiểm tra data
        if (event === 'follow' && data.ref_code) {

            // Xử lý xác thực Google API
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const sheets = google.sheets({ version: 'v4', auth });

            // Chuẩn bị dữ liệu để ghi
            const rowData = [
                new Date().toLocaleString('vi-VN'),
                data.follower.id,
                data.follower.display_name || 'Khách hàng mới',
                data.ref_code,
                'Đã Follow'
            ];

            // Ghi vào Google Sheet
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: 'SHEET1!A:E', // THAY 'Sheet1' BẰNG TÊN SHEET CỦA BẠN NẾU KHÁC
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [rowData],
                },
            });

            // 3. Trả về thành công cho Zalo
            return res.status(200).json({ error: 0, message: 'Data logged successfully' });
        }

        // Bỏ qua các sự kiện khác
        return res.status(200).json({ error: 0, message: 'Event ignored' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(200).json({ error: 1, message: 'Error processing request' });
    }
};