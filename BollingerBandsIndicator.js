// File: BollingerBandsIndicator.js

class BollingerBandsIndicator {
    constructor(mainChart, options = { period: 20, stdDev: 2 }) {
        this.mainChart = mainChart;
        this.options = options;

        // Bollinger Bands không có chart riêng, nó vẽ trên mainChart
        // Nó cũng không có 1 series chính, mà có 3 series
        this.upperBandSeries = null;
        this.middleBandSeries = null;
        this.lowerBandSeries = null;
    }

    calculate(data) {
        const period = this.options.period;
        const stdDevMultiplier = this.options.stdDev;
        const result = { upper: [], middle: [], lower: [] };

        if (data.length < period) return result;

        for (let i = period - 1; i < data.length; i++) {
            const slice = data.slice(i - period + 1, i + 1);
            const closes = slice.map(d => d.close);
            
            // 1. Tính Middle Band (SMA)
            const sma = closes.reduce((sum, val) => sum + val, 0) / period;

            // 2. Tính độ lệch chuẩn (Standard Deviation)
            const mean = sma;
            const sqDiffs = closes.map(val => Math.pow(val - mean, 2));
            const avgSqDiff = sqDiffs.reduce((sum, val) => sum + val, 0) / period;
            const stdDev = Math.sqrt(avgSqDiff);

            // 3. Tính Upper và Lower Bands
            const upper = sma + (stdDev * stdDevMultiplier);
            const lower = sma - (stdDev * stdDevMultiplier);

            result.middle.push({ time: data[i].time, value: sma });
            result.upper.push({ time: data[i].time, value: upper });
            result.lower.push({ time: data[i].time, value: lower });
        }
        return result;
    }

    addToChart(data) {
        // Tạo 3 series đường line trên biểu đồ chính
        this.middleBandSeries = this.mainChart.addLineSeries({
            color: 'rgba(255, 109, 0, 0.8)',
            lineWidth: 2,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        this.upperBandSeries = this.mainChart.addLineSeries({
            color: 'rgba(41, 98, 255, 0.8)',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        this.lowerBandSeries = this.mainChart.addLineSeries({
            color: 'rgba(41, 98, 255, 0.8)',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        this.update(data);
    }

    update(data) {
        if (!this.middleBandSeries) return;

        const bbData = this.calculate(data);
        
        // Dữ liệu BB ngắn hơn dữ liệu gốc, cần "đệm" để căn chỉnh
        const padArray = (arr, length) => {
            const padding = Array(length - arr.length).fill({ value: undefined });
            return padding.concat(arr);
        };
        
        const paddedMiddle = padArray(bbData.middle, data.length).map((d, i) => ({ ...d, time: data[i].time }));
        const paddedUpper = padArray(bbData.upper, data.length).map((d, i) => ({ ...d, time: data[i].time }));
        const paddedLower = padArray(bbData.lower, data.length).map((d, i) => ({ ...d, time: data[i].time }));

        this.middleBandSeries.setData(paddedMiddle);
        this.upperBandSeries.setData(paddedUpper);
        this.lowerBandSeries.setData(paddedLower);
    }

    remove() {
        if (this.middleBandSeries) this.mainChart.removeSeries(this.middleBandSeries);
        if (this.upperBandSeries) this.mainChart.removeSeries(this.upperBandSeries);
        if (this.lowerBandSeries) this.mainChart.removeSeries(this.lowerBandSeries);
    }
} 