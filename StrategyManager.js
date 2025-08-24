// File: StrategyManager.js

class StrategyManager {
    constructor(mainChart, mainSeries) {
        this.mainChart = mainChart;
        this.mainSeries = mainSeries;
        this.activeMarkers = [];
    }

    /**
     * Hàm trợ giúp tính toán SMA.
     * @param {Array} data - Dữ liệu nến.
     * @param {number} period - Chu kỳ tính toán.
     * @returns {Array} - Mảng dữ liệu SMA.
     */
    _calculateSMA(data, period) {
        let smaData = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            smaData.push({
                time: data[i].time,
                value: sum / period,
            });
        }
        return smaData;
    }

    /**
     * Chạy chiến lược giao cắt SMA và trả về các tín hiệu.
     * @param {Array} candlestickData - Dữ liệu nến đầy đủ.
     * @returns {Array} - Mảng các đối tượng marker cho tín hiệu mua/bán.
     */
    runSMACrossoverStrategy(candlestickData, shortPeriod = 9, longPeriod = 20) {
        console.log("--- BẮT ĐẦU CHẠY CHIẾN LƯỢC (LOGIC MỚI) ---");
        if (candlestickData.length < longPeriod) {
            console.warn("Không đủ dữ liệu để chạy chiến lược.");
            return [];
        }

        const shortSMA = this._calculateSMA(candlestickData, shortPeriod);
        const longSMA = this._calculateSMA(candlestickData, longPeriod);

        // Sử dụng Map để tra cứu nhanh giá trị SMA theo thời gian
        const shortSMAMap = new Map(shortSMA.map(item => [JSON.stringify(item.time), item.value]));
        const longSMAMap = new Map(longSMA.map(item => [JSON.stringify(item.time), item.value]));

        const markers = [];

        // Bắt đầu lặp từ thời điểm có đủ dữ liệu cho cả hai đường SMA
        for (let i = longPeriod; i < candlestickData.length; i++) {
            const prevTimeStr = JSON.stringify(candlestickData[i - 1].time);
            const currentTimeStr = JSON.stringify(candlestickData[i].time);

            const prevShort = shortSMAMap.get(prevTimeStr);
            const prevLong = longSMAMap.get(prevTimeStr);
            const currentShort = shortSMAMap.get(currentTimeStr);
            const currentLong = longSMAMap.get(currentTimeStr);

            // Chỉ thực hiện khi có đủ 4 giá trị (quá khứ và hiện tại của cả 2 đường)
            if (prevShort !== undefined && prevLong !== undefined && currentShort !== undefined && currentLong !== undefined) {
                
                // Kiểm tra tín hiệu MUA (cắt lên)
                if (prevShort < prevLong && currentShort > currentLong) {
                    markers.push({
                        time: candlestickData[i].time,
                        position: 'belowBar',
                        color: '#2196F3',
                        shape: 'arrowUp',
                        text: 'Buy @ ' + candlestickData[i].close.toFixed(2),
                    });
                }
                // Kiểm tra tín hiệu BÁN (cắt xuống)
                else if (prevShort > prevLong && currentShort < currentLong) {
                    markers.push({
                        time: candlestickData[i].time,
                        position: 'aboveBar',
                        color: '#e91e63',
                        shape: 'arrowDown',
                        text: 'Sell @ ' + candlestickData[i].close.toFixed(2),
                    });
                }
            }
        }
        
        console.log(`--- KẾT THÚC TÍNH TOÁN ---`);
        console.log(`Tìm thấy tổng cộng ${markers.length} tín hiệu.`);
        
        return markers;
    }
    
    /**
     * Hiển thị các marker trên biểu đồ.
     * @param {Array} markers - Mảng các đối tượng marker.
     */
    displayMarkers(markers) {
        this.activeMarkers = markers;
        this.mainSeries.setMarkers(markers);
    }

    /**
     * Xóa tất cả các marker khỏi biểu đồ.
     */
    clearMarkers() {
        this.activeMarkers = [];
        this.mainSeries.setMarkers([]);
    }
}