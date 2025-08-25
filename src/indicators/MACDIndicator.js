// File: MACDIndicator.js

// Hàm trợ giúp để tính toán đường EMA (Exponential Moving Average)
function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    const emaData = [];
    if (data.length < period) return emaData;
    let sum = 0;
    for (let i = 0; i < period; i++) { sum += data[i].close; }
    emaData.push({ time: data[period - 1].time, value: sum / period });
    for (let i = period; i < data.length; i++) {
        const prevEma = emaData[emaData.length - 1].value;
        const newEma = (data[i].close * k) + (prevEma * (1 - k));
        emaData.push({ time: data[i].time, value: newEma });
    }
    return emaData;
}

class MACDIndicator {
    // Thêm mainSeries vào constructor
    constructor(containerElement, mainChart, mainSeries, options = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }) {
        this.container = containerElement; 
        this.mainChart = mainChart;
        this.mainSeries = mainSeries; // Lưu lại mainSeries
        this.options = options;
        
        this.chartContainer = null;
        this.chart = null;
        this.macdSeries = null;
        this.signalSeries = null;
        this.histogramSeries = null;
        this.series = null; // Thêm dòng này để tham chiếu chung
    }

    // Hàm calculate không đổi...
    calculate(data) {
        if (data.length < this.options.slowPeriod) return { macdLine: [], signalLine: [], histogramData: [] };
        const fastEMA = calculateEMA(data, this.options.fastPeriod);
        const slowEMA = calculateEMA(data, this.options.slowPeriod);
        let macdLineRaw = [];
        let slowIndex = 0;
        for (let i = 0; i < fastEMA.length; i++) {
            while (slowIndex < slowEMA.length && (slowEMA[slowIndex].time.day < fastEMA[i].time.day || slowEMA[slowIndex].time.month < fastEMA[i].time.month)) { slowIndex++; }
            if (slowIndex < slowEMA.length && slowEMA[slowIndex].time.day === fastEMA[i].time.day && slowEMA[slowIndex].time.month === fastEMA[i].time.month) {
                macdLineRaw.push({ time: fastEMA[i].time, value: fastEMA[i].value - slowEMA[slowIndex].value });
            }
        }
        if (macdLineRaw.length < this.options.signalPeriod) return { macdLine: [], signalLine: [], histogramData: [] };
        const signalLineRaw = calculateEMA(macdLineRaw.map(d => ({...d, close: d.value})), this.options.signalPeriod);
        const finalMacdLine = [], finalSignalLine = [], finalHistogram = [];
        let macdIndex = 0, signalIndex = 0;
        for (let i = 0; i < data.length; i++) {
            const currentTime = data[i].time;
            let macdPoint, signalPoint;
            if (macdIndex < macdLineRaw.length && macdLineRaw[macdIndex].time.day === currentTime.day && macdLineRaw[macdIndex].time.month === currentTime.month) { macdPoint = macdLineRaw[macdIndex]; macdIndex++; }
            if (signalIndex < signalLineRaw.length && signalLineRaw[signalIndex].time.day === currentTime.day && signalLineRaw[signalIndex].time.month === currentTime.month) { signalPoint = signalLineRaw[signalIndex]; signalIndex++; }
            finalMacdLine.push({ time: currentTime, value: macdPoint ? macdPoint.value : undefined });
            finalSignalLine.push({ time: currentTime, value: signalPoint ? signalPoint.value : undefined });
            if (macdPoint && signalPoint) {
                const histValue = macdPoint.value - signalPoint.value;
                finalHistogram.push({ time: currentTime, value: histValue, color: histValue >= 0 ? 'rgba(38, 166, 154, 0.6)' : 'rgba(239, 83, 80, 0.6)' });
            } else {
                finalHistogram.push({ time: currentTime, value: undefined });
            }
        }
        return { macdLine: finalMacdLine, signalLine: finalSignalLine, histogramData: finalHistogram };
    }

    // Thay thế toàn bộ hàm addToChart
    addToChart(data) {
    this.chartContainer = document.createElement('div');
    this.chartContainer.style.height = '180px';
    const rsiContainer = document.getElementById('rsi-chart-container');
    rsiContainer.parentNode.insertBefore(this.chartContainer, rsiContainer.nextSibling);

    this.chart = LightweightCharts.createChart(this.chartContainer, {
        /*...các tùy chọn...*/
        // Thêm tùy chọn này để vô hiệu hóa trình xử lý cuộn chuột mặc định
        handleScroll: false,
        handleScale: false,
    });
    this.histogramSeries = this.chart.addHistogramSeries({ /*...*/ });
    this.macdSeries = this.chart.addLineSeries({ color: '#2962FF', lineWidth: 2 });
    this.signalSeries = this.chart.addLineSeries({ color: '#FF6D00', lineWidth: 2 });
    this.series = this.macdSeries;
    syncManager.addChart(this.chart, this.series);

    // BƯỚC 1: Gắn listener mousedown đáng tin cậy cho việc click
    const target = { chart: this.chart, series: this.series, id: 'macd' };
    this.chartContainer.addEventListener('mousedown', (event) => onChartMouseDown(event, target));

    // BƯỚC 2: Giữ lại listener crosshair move cho đường xem trước mượt mà
    this.chart.subscribeCrosshairMove(param => onCrosshairMoved(param, this.chart));

    this.update(data);
}

    update(data) {
        if (!this.chart) return;
        const { macdLine, signalLine, histogramData } = this.calculate(data);
        this.macdSeries.setData(macdLine);
        this.signalSeries.setData(signalLine);
        this.histogramSeries.setData(histogramData);
    }

    remove() {
    if (this.chart) {
        syncManager.removeChart(this.chart); // Báo cho manager biết để xóa
        this.chart.remove();
        this.chart = null;
    }
    if (this.chartContainer) {
        this.chartContainer.remove();
        this.chartContainer = null;
    }
}
}