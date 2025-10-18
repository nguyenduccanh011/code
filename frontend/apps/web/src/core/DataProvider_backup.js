// File: DataProvider.js

console.log("DataProvider.js Ä‘Ã£ Ä‘Æ°á»£c náº¡p.");

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
        console.log(`Báº¯t Ä‘áº§u yÃªu cáº§u dá»¯ liá»‡u THáº¬T cho ${symbol} - Khung ${timeframe}...`);

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
                throw new Error(`Lá»—i máº¡ng hoáº·c server: ${response.status} ${response.statusText}`);
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

            console.log(`ÄÃ£ nháº­n vÃ  xá»­ lÃ½ thÃ nh cÃ´ng ${formattedData.length} Ä‘iá»ƒm dá»¯ liá»‡u tháº­t.`);
            return formattedData;

        } catch (error) {
            console.error("KhÃ´ng thá»ƒ láº¥y dá»¯ liá»‡u tá»« API:", error);
            return [];
        }
    }

    // Screener: danh sÃ¡ch cá»• phiáº¿u theo tiÃªu chÃ­ cÆ¡ báº£n (Ä‘Æ¡n giáº£n theo sÃ n)
    async runScreener({ exchange = 'HOSE,HNX,UPCOM', limit = 500, q = '' } = {}) {
        const url = `${API_BASE_URL}/api/screener?exchange=${encodeURIComponent(exchange)}&limit=${limit}&q=${encodeURIComponent(q)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('Lá»—i gá»i API screener:', e);
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
            console.error('Lá»—i gá»i API financials:', e);
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
            console.error('Lá»—i gá»i API ratios:', e);
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
            console.error('Lá»—i gá»i API news:', e);
            return [];
        }
    }

    async getCompanyInfo(symbol) {
        console.log(`YÃªu cáº§u thÃ´ng tin cÃ´ng ty cho ${symbol}...`);
        const url = `${API_BASE_URL}/api/company_info?symbol=${symbol}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Lá»—i server khi láº¥y thÃ´ng tin cÃ´ng ty: ${response.status}`);
            }
            const data = await response.json();
            return data.fullName || `KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin cho ${symbol}`;
        } catch (error) {
            console.error("Lá»—i khi gá»i API láº¥y thÃ´ng tin cÃ´ng ty:", error);
            return `Lá»—i khi táº£i thÃ´ng tin cho ${symbol}`;
        }
    }
    
    async getAllCompanies() {
        console.log("Äang táº£i danh sÃ¡ch cÃ´ng ty cho viá»‡c tÃ¬m kiáº¿m...");
        const url = `${API_BASE_URL}/api/all_companies`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Lá»—i server khi táº£i danh sÃ¡ch cÃ´ng ty: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Táº£i thÃ nh cÃ´ng ${data.length} cÃ´ng ty.`);
            return data;
        } catch (error) {
            console.error("Lá»—i khi táº£i danh sÃ¡ch cÃ´ng ty:", error);
            return []; 
        }
    }

    // â–¼â–¼â–¼ THÃŠM Má»šI HÃ€M NÃ€Y â–¼â–¼â–¼
    /**
     * Láº¥y dá»¯ liá»‡u thá»‹ trÆ°á»ng cho má»™t mÃ£ chá»©ng khoÃ¡n.
     * @param {string} symbol MÃ£ chá»©ng khoÃ¡n.
     * @returns {Promise<Object|null>} Dá»¯ liá»‡u thá»‹ trÆ°á»ng hoáº·c null náº¿u lá»—i.
     */
    async getMarketData(symbol) {
        const url = `${API_BASE_URL}/api/market_data?symbol=${symbol}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Lá»—i server khi láº¥y dá»¯ liá»‡u thá»‹ trÆ°á»ng: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Lá»—i khi gá»i API láº¥y dá»¯ liá»‡u thá»‹ trÆ°á»ng cho ${symbol}:`, error);
            return null;
        }
    }
    // â–²â–²â–² Káº¾T THÃšC THÃŠM Má»šI â–²â–²â–²

    // â–¼â–¼â–¼ THÃŠM Má»šI HÃ€M NÃ€Y â–¼â–¼â–¼
    /**
     * Láº¥y bÃ¡o cÃ¡o tÃ i chÃ­nh hoáº·c chá»‰ sá»‘ cÆ¡ báº£n.
     * @param {string} symbol MÃ£ chá»©ng khoÃ¡n.
     * @param {string} statement Loáº¡i bÃ¡o cÃ¡o: balance_sheet, income_statement, cash_flow, ratio.
     * @param {string} period Ká»³ dá»¯ liá»‡u: 'quarter' hoáº·c 'year'.
     * @returns {Promise<Object|null>} Dá»¯ liá»‡u bÃ¡o cÃ¡o tÃ i chÃ­nh hoáº·c null náº¿u lá»—i.
     */
    async getFinancials(symbol, statement = 'ratio', period = 'year') {
        const url = `${API_BASE_URL}/api/financials?symbol=${symbol}&statement=${statement}&period=${period}&industry=true`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Lá»—i server khi láº¥y bÃ¡o cÃ¡o tÃ i chÃ­nh: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Lá»—i khi gá»i API bÃ¡o cÃ¡o tÃ i chÃ­nh cho ${symbol}:`, error);
            return null;
        }
    }
    // â–²â–²â–² Káº¾T THÃšC THÃŠM Má»šI â–²â–²â–²

    // â–¼â–¼â–¼ THÃŠM Má»šI HÃ€M NÃ€Y â–¼â–¼â–¼
    /**
     * Gá»i API backtest á»Ÿ backend.
     * @param {Object} config Cáº¥u hÃ¬nh chiáº¿n lÆ°á»£c vÃ  dá»¯ liá»‡u giÃ¡.
     * @returns {Promise<Object|null>} Káº¿t quáº£ backtest hoáº·c null náº¿u lá»—i.
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
                throw new Error(`Lá»—i server khi backtest: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Lá»—i khi gá»i API backtest:', error);
            return null;
        }
    }
    // â–²â–²â–² Káº¾T THÃšC THÃŠM Má»šI â–²â–²â–²
}
