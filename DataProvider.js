// File: DataProvider.js

console.log("DataProvider.js đã được nạp.");

class DataProvider {
    /**
     * Hàm này gọi API backend để lấy dữ liệu lịch sử.
     * @param {string} symbol Mã cổ phiếu
     * @param {string} timeframe Khung thời gian ('D', 'W', 'M')
     * @param {string} [from] Ngày bắt đầu (YYYY-MM-DD), tùy chọn
     * @param {string} [to] Ngày kết thúc (YYYY-MM-DD), tùy chọn
     * @returns {Promise<Array>} Một Promise sẽ resolve với mảng dữ liệu nến.
     */
    async getHistory(symbol, timeframe, from, to) {
        console.log(`Bắt đầu yêu cầu dữ liệu THẬT cho ${symbol} - Khung ${timeframe}...`);

        const resolutionMap = {
            'D': '1D',
            'W': '1W',
            'M': '1M'
        };
        const resolution = resolutionMap[timeframe] || '1D';

        // ▼▼▼ BẮT ĐẦU THAY ĐỔI ▼▼▼
        // Xây dựng URL cơ bản
        let url = `http://127.0.0.1:5000/api/history?symbol=${symbol}&resolution=${resolution}`;

        // Nếu có tham số ngày tháng, thêm chúng vào URL
        if (from && to) {
            url += `&from=${from}&to=${to}`;
        }
        // ▲▲▲ KẾT THÚC THAY ĐỔI ▲▲▲

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Lỗi mạng hoặc server: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            const formattedData = data.map(item => {
                const date = new Date(item.time);
                return {
                    ...item,
                    time: {
                        year: date.getFullYear(),
                        month: date.getMonth() + 1,
                        day: date.getDate(),
                    }
                };
            });

            console.log(`Đã nhận và xử lý thành công ${formattedData.length} điểm dữ liệu thật.`);
            return formattedData;

        } catch (error) {
            console.error("Không thể lấy dữ liệu từ API:", error);
            return [];
        }
    }
}