// File: RSIIndicator.js (hoặc trong script.js)

class RSIIndicator {
    // Thêm mainSeries vào constructor
    constructor(rsiChartElement, mainChart, mainSeries, options = { period: 14 }) {
        this.container = rsiChartElement;
        this.mainChart = mainChart;
        this.mainSeries = mainSeries; // Lưu lại mainSeries
        this.chart = null;
        this.series = null;
        this.period = options.period;
    }

    // Các hàm calculate và update không thay đổi...
    calculate(data) {
        const rsiData = [];
        let gains = [];
        let losses = [];
        for (let i = 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        if (data.length <= this.period) { return []; }
        let avgGain = gains.slice(0, this.period).reduce((a, b) => a + b, 0) / this.period;
        let avgLoss = losses.slice(0, this.period).reduce((a, b) => a + b, 0) / this.period;
        let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        let rsi = 100 - (100 / (1 + rs));
        rsiData.push({ time: data[this.period].time, value: rsi });
        for (let i = this.period; i < gains.length; i++) {
            avgGain = (avgGain * (this.period - 1) + gains[i]) / this.period;
            avgLoss = (avgLoss * (this.period - 1) + losses[i]) / this.period;
            rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi = 100 - (100 / (1 + rs));
            if (data[i + 1]) {
                rsiData.push({ time: data[i + 1].time, value: rsi });
            }
        }
        return rsiData;
    }
    update(data) {
        if (!this.series) return;
        const calculatedPoints = this.calculate(data);
        const finalRsiData = [];
        let pointIndex = 0;
        for (let i = 0; i < data.length; i++) {
            if (pointIndex < calculatedPoints.length && data[i].time.day === calculatedPoints[pointIndex].time.day && data[i].time.month === calculatedPoints[pointIndex].time.month) {
                finalRsiData.push(calculatedPoints[pointIndex]);
                pointIndex++;
            } else {
                finalRsiData.push({ time: data[i].time, value: undefined });
            }
        }
        this.series.setData(finalRsiData);
    }

    // Thay thế toàn bộ hàm addToChart
addToChart(data) {
    this.container.style.display = 'block';
    this.chart = LightweightCharts.createChart(this.container, { /* ...options... */ });
    this.series = this.chart.addLineSeries({ color: '#8884d8', lineWidth: 2 });
    syncManager.addChart(this.chart, this.series); // Chỉ đồng bộ crosshair
    
    // Gắn listener vẽ
    this.chart.subscribeClick(param => onChartClicked(param, { chart: this.chart, series: this.series, id: 'rsi'}));
    this.chart.subscribeCrosshairMove(param => onCrosshairMoved(param, this.chart));

    this.series.createPriceLine({ price: 70, /*...*/ });
    this.series.createPriceLine({ price: 30, /*...*/ });
    this.update(data);
}

// Thay thế hàm remove
remove() {
    if (this.chart) {
        syncManager.removeChart(this.chart); // Báo cho manager biết để xóa
        this.chart.remove();
        this.chart = null;
    }
    this.container.style.display = 'none';
}
}