// Tên file: zalo-webhook.js
const { google } = require('googleapis');

// Khung code cơ bản, lập trình viên sẽ hoàn thiện phần kết nối Google API
module.exports = async (req, res) => {
    // Chỉ xử lý yêu cầu POST (Webhook)
    if (req.method !== 'POST') {
        return res.status(200).send('Webhook server is running.');
    }

    try {
        const data = req.body;
        const event = data.event_name;

        // Log dữ liệu nhận được để dễ debug
        console.log('Received Zalo Webhook:', data);

        // Lọc sự kiện "follow" (quan tâm OA)
        if (event === 'follow' && data.ref_code) {
            const refCode = data.ref_code || 'N/A';
            const userId = data.follower.id;
            const userName = data.follower.display_name || 'Khách hàng mới';

            // Chuẩn bị dữ liệu để ghi vào Sheet
            const rowData = [
                new Date().toLocaleString('vi-VN'),
                userId,
                userName,
                refCode,
                'Đã Follow'
            ];

            // ----------------------------------------------------
            // PHẦN NÀY LÀ NƠI LẬP TRÌNH VIÊN SẼ VIẾT CODE GHI VÀO SHEET
            // BẰNG CÁCH DÙNG biến môi trường GOOGLE_SHEET_CREDENTIALS
            // VÀ thư viện googleapis
            // ----------------------------------------------------

            // Trả về thành công cho Zalo (BẮT BUỘC)
            return res.status(200).json({ error: 0, message: 'Follow event logged successfully' });
        }

        // Bỏ qua các sự kiện khác nếu không cần ghi nhận
        return res.status(200).json({ error: 0, message: 'Event ignored' });

    } catch (error) {
        console.error('Webhook Error:', error);
        // Trả về 200 (OK) để Zalo không liên tục gửi lại yêu cầu lỗi,
        // nhưng log lỗi để kiểm tra.
        return res.status(200).json({ error: 1, message: 'Error processing request' });
    }
};
