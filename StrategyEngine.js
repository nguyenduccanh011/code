// File: StrategyEngine.js

class StrategyEngine {
    constructor(mainChart, mainSeries) {
        this.mainChart = mainChart;
        this.mainSeries = mainSeries;
        this.activeMarkers = [];
    }

    /**
     * Đọc cấu hình chiến lược từ Strategy Builder UI
     * @returns {Object} Cấu hình chiến lược
     */
    readStrategyConfig() {
        const strategyName = document.getElementById('strategy-name').value;
        
        // Đọc điều kiện mua
        const buyConditions = this.readConditions('buy-conditions');
        
        // Đọc điều kiện bán
        const sellConditions = this.readConditions('sell-conditions');

        return {
            name: strategyName,
            buyConditions: buyConditions,
            sellConditions: sellConditions
        };
    }

    /**
     * Đọc các điều kiện từ container
     * @param {string} containerId - ID của container chứa điều kiện
     * @returns {Array} Mảng các điều kiện
     */
    readConditions(containerId) {
        const container = document.getElementById(containerId);
        const conditionItems = container.querySelectorAll('.condition-item');
        const conditions = [];

        conditionItems.forEach(item => {
            const conditionType = item.querySelector('.condition-type').value;
            const params = this.readConditionParams(item, conditionType);
            
            if (params) {
                conditions.push({
                    type: conditionType,
                    params: params
                });
            }
        });

        return conditions;
    }

    /**
     * Đọc tham số của điều kiện dựa trên loại
     * @param {Element} item - Element chứa điều kiện
     * @param {string} type - Loại điều kiện
     * @returns {Object} Tham số điều kiện
     */
    readConditionParams(item, type) {
        const paramInputs = item.querySelectorAll('.param-input');
        
        switch (type) {
            case 'sma-crossover':
                if (paramInputs.length >= 2) {
                    return {
                        shortPeriod: parseInt(paramInputs[0].value) || 9,
                        longPeriod: parseInt(paramInputs[1].value) || 20,
                        direction: item.querySelector('.condition-params span').textContent.trim()
                    };
                }
                break;
                
            case 'rsi':
                if (paramInputs.length >= 2) {
                    return {
                        operator: paramInputs[0].value || '<',
                        value: parseFloat(paramInputs[1].value) || 30
                    };
                }
                break;
                
            case 'price':
                if (paramInputs.length >= 2) {
                    return {
                        operator: paramInputs[0].value || '<',
                        value: parseFloat(paramInputs[1].value) || 1000
                    };
                }
                break;
        }
        
        return null;
    }

    /**
     * Chạy chiến lược với cấu hình từ UI
     * @param {Array} candlestickData - Dữ liệu nến
     * @returns {Array} Mảng các marker tín hiệu
     */
    runStrategy(candlestickData) {
        const config = this.readStrategyConfig();
        console.log('Chạy chiến lược:', config);
        
        if (!config.buyConditions.length && !config.sellConditions.length) {
            console.warn('Không có điều kiện nào được thiết lập');
            return [];
        }

        const markers = [];
        
        // Bắt đầu từ thời điểm có đủ dữ liệu
        const minPeriod = this.getMinRequiredPeriod(config);
        if (candlestickData.length < minPeriod) {
            console.warn(`Không đủ dữ liệu. Cần ít nhất ${minPeriod} nến`);
            return [];
        }

        // Kiểm tra từng nến để tìm tín hiệu
        for (let i = minPeriod; i < candlestickData.length; i++) {
            const currentData = candlestickData[i];
            const previousData = candlestickData[i - 1];
            
            // Kiểm tra điều kiện mua
            if (this.evaluateConditions(config.buyConditions, candlestickData, i, 'buy')) {
                markers.push({
                    time: currentData.time,
                    position: 'belowBar',
                    color: '#2196F3',
                    shape: 'arrowUp',
                    text: `Buy @ ${currentData.close.toFixed(2)}`,
                });
            }
            
            // Kiểm tra điều kiện bán
            if (this.evaluateConditions(config.sellConditions, candlestickData, i, 'sell')) {
                markers.push({
                    time: currentData.time,
                    position: 'aboveBar',
                    color: '#e91e63',
                    shape: 'arrowDown',
                    text: `Sell @ ${currentData.close.toFixed(2)}`,
                });
            }
        }

        console.log(`Tìm thấy ${markers.length} tín hiệu`);
        return markers;
    }

    /**
     * Xác định chu kỳ tối thiểu cần thiết
     * @param {Object} config - Cấu hình chiến lược
     * @returns {number} Chu kỳ tối thiểu
     */
    getMinRequiredPeriod(config) {
        let maxPeriod = 1;
        
        [...config.buyConditions, ...config.sellConditions].forEach(condition => {
            if (condition.type === 'sma-crossover') {
                maxPeriod = Math.max(maxPeriod, condition.params.longPeriod || 20);
            } else if (condition.type === 'rsi') {
                maxPeriod = Math.max(maxPeriod, 14); // RSI mặc định 14
            }
        });
        
        return maxPeriod;
    }

    /**
     * Kiểm tra một nhóm điều kiện
     * @param {Array} conditions - Mảng điều kiện
     * @param {Array} data - Dữ liệu nến
     * @param {number} index - Chỉ số hiện tại
     * @param {string} signalType - Loại tín hiệu (buy/sell)
     * @returns {boolean} True nếu tất cả điều kiện đều thỏa mãn
     */
    evaluateConditions(conditions, data, index, signalType) {
        if (!conditions.length) return false;
        
        // Tất cả điều kiện phải thỏa mãn (AND logic)
        return conditions.every(condition => {
            return this.evaluateSingleCondition(condition, data, index, signalType);
        });
    }

    /**
     * Kiểm tra một điều kiện đơn lẻ
     * @param {Object} condition - Điều kiện cần kiểm tra
     * @param {Array} data - Dữ liệu nến
     * @param {number} index - Chỉ số hiện tại
     * @param {string} signalType - Loại tín hiệu
     * @returns {boolean} True nếu điều kiện thỏa mãn
     */
    evaluateSingleCondition(condition, data, index, signalType) {
        switch (condition.type) {
            case 'sma-crossover':
                return this.evaluateSMACrossover(condition.params, data, index, signalType);
                
            case 'rsi':
                return this.evaluateRSI(condition.params, data, index);
                
            case 'price':
                return this.evaluatePrice(condition.params, data, index);
                
            default:
                console.warn('Loại điều kiện không được hỗ trợ:', condition.type);
                return false;
        }
    }

    /**
     * Kiểm tra điều kiện SMA Crossover
     */
    evaluateSMACrossover(params, data, index, signalType) {
        const { shortPeriod, longPeriod, direction } = params;
        
        if (index < longPeriod) return false;
        
        const shortSMA = this.calculateSMA(data, shortPeriod, index);
        const longSMA = this.calculateSMA(data, longPeriod, index);
        const prevShortSMA = this.calculateSMA(data, shortPeriod, index - 1);
        const prevLongSMA = this.calculateSMA(data, longPeriod, index - 1);
        
        if (signalType === 'buy' && direction.includes('cắt lên')) {
            return prevShortSMA < prevLongSMA && shortSMA > longSMA;
        } else if (signalType === 'sell' && direction.includes('cắt xuống')) {
            return prevShortSMA > prevLongSMA && shortSMA < longSMA;
        }
        
        return false;
    }

    /**
     * Kiểm tra điều kiện RSI
     */
    evaluateRSI(params, data, index) {
        const { operator, value } = params;
        const rsiValue = this.calculateRSI(data, index);
        
        if (rsiValue === null) return false;
        
        switch (operator) {
            case '<':
                return rsiValue < value;
            case '>':
                return rsiValue > value;
            default:
                return false;
        }
    }

    /**
     * Kiểm tra điều kiện giá
     */
    evaluatePrice(params, data, index) {
        const { operator, value } = params;
        const currentPrice = data[index].close;
        
        switch (operator) {
            case '<':
                return currentPrice < value;
            case '>':
                return currentPrice > value;
            default:
                return false;
        }
    }

    /**
     * Tính SMA cho một chu kỳ cụ thể
     */
    calculateSMA(data, period, endIndex) {
        if (endIndex < period - 1) return null;
        
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[endIndex - i].close;
        }
        return sum / period;
    }

    /**
     * Tính RSI cho một điểm cụ thể
     */
    calculateRSI(data, index, period = 14) {
        if (index < period) return null;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 0; i < period; i++) {
            const change = data[index - i].close - data[index - i - 1].close;
            if (change > 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Hiển thị các marker trên biểu đồ
     */
    displayMarkers(markers) {
        this.activeMarkers = markers;
        this.mainSeries.setMarkers(markers);
    }

    /**
     * Xóa tất cả các marker
     */
    clearMarkers() {
        this.activeMarkers = [];
        this.mainSeries.setMarkers([]);
    }
}
