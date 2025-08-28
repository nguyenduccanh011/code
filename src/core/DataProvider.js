// File: DataProvider.js

console.log("DataProvider.js đã được nạp.");

let API_BASE_URL =
    (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL)
        || (typeof window !== 'undefined' && window.API_BASE_URL)
        || 'http://127.0.0.1:5000';

class DataProvider {
    constructor(apiBaseUrl) {
        if (apiBaseUrl) {
            API_BASE_URL = apiBaseUrl;
        }
    }

    async getHistory(symbol, timeframe, from, to) {
        console.log(`Bắt đầu yêu cầu dữ liệu THẬT cho ${symbol} - Khung ${timeframe}...`);

        const resolutionMap = {
            'D': '1D',
            'W': '1W',
            'M': '1M'
        };
        const resolution = resolutionMap[timeframe] || '1D';

        let url = `${API_BASE_URL}/api/history?symbol=${symbol}&resolution=${resolution}`;

        if (from && to) {
            url += `&from=${from}&to=${to}`;
        }

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

    // Screener: danh sách cổ phiếu theo tiêu chí cơ bản (đơn giản theo sàn)
    async runScreener({ exchange = 'HOSE,HNX,UPCOM', limit = 500, q = '' } = {}) {
        const url = `${API_BASE_URL}/api/screener?exchange=${encodeURIComponent(exchange)}&limit=${limit}&q=${encodeURIComponent(q)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('Lỗi gọi API screener:', e);
            return [];
        }
    }

    // Financial statements
    async getFinancials(symbol, { type = 'income', period = 'quarter', limit = 8 } = {}) {
        const url = `${API_BASE_URL}/api/financials?symbol=${symbol}&type=${type}&period=${period}&limit=${limit}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('Lỗi gọi API financials:', e);
            return [];
        }
    }

    // Ratios
    async getRatios(symbol) {
        const url = `${API_BASE_URL}/api/ratios?symbol=${symbol}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('Lỗi gọi API ratios:', e);
            return [];
        }
    }

    // News
    async getNews(symbol, limit = 20) {
        const url = `${API_BASE_URL}/api/news?symbol=${symbol}&limit=${limit}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('Lỗi gọi API news:', e);
            return [];
        }
    }

    async getCompanyInfo(symbol) {
        console.log(`Yêu cầu thông tin công ty cho ${symbol}...`);
        const url = `${API_BASE_URL}/api/company_info?symbol=${symbol}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Lỗi server khi lấy thông tin công ty: ${response.status}`);
            }
            const data = await response.json();
            return data.fullName || `Không tìm thấy thông tin cho ${symbol}`;
        } catch (error) {
            console.error("Lỗi khi gọi API lấy thông tin công ty:", error);
            return `Lỗi khi tải thông tin cho ${symbol}`;
        }
    }
    
    async getAllCompanies() {
        console.log("Đang tải danh sách công ty cho việc tìm kiếm...");
        const url = `${API_BASE_URL}/api/all_companies`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Lỗi server khi tải danh sách công ty: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Tải thành công ${data.length} công ty.`);
            return data;
        } catch (error) {
            console.error("Lỗi khi tải danh sách công ty:", error);
            return []; 
        }
    }

    // ▼▼▼ THÊM MỚI HÀM NÀY ▼▼▼
    /**
     * Lấy dữ liệu thị trường cho một mã chứng khoán.
     * @param {string} symbol Mã chứng khoán.
     * @returns {Promise<Object|null>} Dữ liệu thị trường hoặc null nếu lỗi.
     */
    async getMarketData(symbol) {
        const url = `${API_BASE_URL}/api/market_data?symbol=${symbol}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Lỗi server khi lấy dữ liệu thị trường: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Lỗi khi gọi API lấy dữ liệu thị trường cho ${symbol}:`, error);
            return null;
        }
    }
    // ▲▲▲ KẾT THÚC THÊM MỚI ▲▲▲

    // ▼▼▼ THÊM MỚI HÀM NÀY ▼▼▼
    /**
     * Lấy báo cáo tài chính hoặc chỉ số cơ bản.
     * @param {string} symbol Mã chứng khoán.
     * @param {string} statement Loại báo cáo: balance_sheet, income_statement, cash_flow, ratio.
     * @param {string} period Kỳ dữ liệu: 'quarter' hoặc 'year'.
     * @returns {Promise<Object|null>} Dữ liệu báo cáo tài chính hoặc null nếu lỗi.
     */
    async getFinancials(symbol, statement = 'ratio', period = 'year') {
        const url = `${API_BASE_URL}/api/financials?symbol=${symbol}&statement=${statement}&period=${period}&industry=true`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Lỗi server khi lấy báo cáo tài chính: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Lỗi khi gọi API báo cáo tài chính cho ${symbol}:`, error);
            return null;
        }
    }
    // ▲▲▲ KẾT THÚC THÊM MỚI ▲▲▲

    // ▼▼▼ THÊM MỚI HÀM NÀY ▼▼▼
    /**
     * Gọi API backtest ở backend.
     * @param {Object} config Cấu hình chiến lược và dữ liệu giá.
     * @returns {Promise<Object|null>} Kết quả backtest hoặc null nếu lỗi.
     */
    async runBacktest(config) {
        const url = `${API_BASE_URL}/api/backtest`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            if (!response.ok) {
                throw new Error(`Lỗi server khi backtest: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Lỗi khi gọi API backtest:', error);
            return null;
        }
    }
    // ▲▲▲ KẾT THÚC THÊM MỚI ▲▲▲
}
