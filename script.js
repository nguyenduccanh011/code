// ===================================================================================
// CÁC HÀM TIỆN ÍCH
// ===================================================================================

function areTimesEqual(time1, time2) {
    if (!time1 || !time2) return false;
    return time1.year === time2.year && time1.month === time2.month && time1.day === time2.day;
}

function calculateSMA(data, period) {
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

function generateData(timeframe) {
    const data = [];
    let startDate = new Date(2025, 0, 1);
    let numPoints = 100;
    let price = 1200;
    let increment = 1;

    if (timeframe === 'W') {
        numPoints = 50;
        increment = 7;
    } else if (timeframe === 'M') {
        numPoints = 30;
        increment = 30;
    }

    for (let i = 0; i < numPoints; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i * increment);
        const open = price + Math.random() * 10 - 5;
        const close = open + Math.random() * 20 - 10;
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;
        const volume = 1e6 + Math.random() * 5e6;
        data.push({
            time: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() },
            open: open, high: high, low: low, close: close, volume: volume,
        });
        price = close;
    }
    return data;
}

// ===================================================================================
// KHAI BÁO BIẾN TOÀN CỤC VÀ TRÌNH QUẢN LÝ
// ===================================================================================

const syncManager = new ChartSyncManager();
const activeIndicators = {};
const dataStore = {};

// --- Biến trạng thái cho việc vẽ Trend Line ---
let drawingState = 'idle'; // 'idle', 'activating_draw_mode', 'placing_point_2', 'moving'

let trendLinePoints = [];
const drawnTrendLines = [];
let previewTrendLine = null;
let trendLineRedrawRequested = false;
let currentDrawingTarget = null;
let selectedTrendLine = null;

let moveState = {
    isMoving: false,
    targetLine: null,
    moveType: null, // 'line', 'p1', 'p2'
    lastTime: null,
    lastPrice: null,
};


// ===================================================================================
// KHỞI TẠO BIỂU ĐỒ CHÍNH
// ===================================================================================

const mainChartContainer = document.getElementById('main-chart-container');
const rsiChartContainer = document.getElementById('rsi-chart-container');

const mainChart = LightweightCharts.createChart(mainChartContainer, {
    autoSize: true,
    layout: { background: { color: '#ffffff' }, textColor: '#333' },
    grid: { vertLines: { color: '#f0f3f5' }, horzLines: { color: '#f0f3f5' } },
    timeScale: { borderColor: '#ddd', timeVisible: true, secondsVisible: false, rightOffset: 50 },
    watermark: { color: 'rgba(200, 200, 200, 0.4)', visible: true, text: 'VNINDEX', fontSize: 48, horzAlign: 'center', vertAlign: 'center' },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
});

const mainSeries = mainChart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' });
const volumeSeries = mainChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
mainChart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
const smaLineSeries = mainChart.addLineSeries({ color: 'rgba(4, 111, 232, 1)', lineWidth: 2, crosshairMarkerVisible: false });

syncManager.addChart(mainChart, mainSeries);

// ===================================================================================
// LOGIC CẬP NHẬT DỮ LIỆU VÀ SỰ KIỆN
// ===================================================================================

function initializeData() {
    dataStore['D'] = generateData('D');
    dataStore['W'] = generateData('W');
    dataStore['M'] = generateData('M');
}

function updateChartData(timeframe) {
    const candlestickData = dataStore[timeframe];
    mainSeries.setData(candlestickData);
    const volumeData = candlestickData.map(item => ({ time: item.time, value: item.volume, color: item.close > item.open ? 'rgba(38, 166, 164, 0.5)' : 'rgba(239, 83, 80, 0.5)' }));
    volumeSeries.setData(volumeData);
    const smaData = calculateSMA(candlestickData, 9);
    smaLineSeries.setData(smaData);
    for (const id in activeIndicators) {
        if (activeIndicators[id] && typeof activeIndicators[id].update === 'function') {
            activeIndicators[id].update(candlestickData);
        }
    }
    mainChart.timeScale().fitContent();
    drawnTrendLines.forEach(line => {
        let targetSeries;
        if (line.targetId === 'main') {
            targetSeries = mainSeries;
        } else if (activeIndicators[line.targetId]) {
            targetSeries = activeIndicators[line.targetId].series;
        }
        if (targetSeries) {
            targetSeries.attachPrimitive(line.primitive);
        }
    });
}

const timeframeButtons = document.querySelectorAll('.timeframe-button');
timeframeButtons.forEach(button => {
    button.addEventListener('click', () => {
        timeframeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const timeframe = button.textContent;
        updateChartData(timeframe);
    });
});

const indicatorMenuBtn = document.getElementById('indicator-menu-btn');
const indicatorDropdown = document.getElementById('indicator-dropdown-content');
indicatorMenuBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    indicatorDropdown.classList.toggle('show');
});
window.addEventListener('click', () => {
    if (indicatorDropdown.classList.contains('show')) {
        indicatorDropdown.classList.remove('show');
    }
});
const indicatorFactory = {
    'rsi': { name: 'RSI (14)', create: (mainChart, data) => new RSIIndicator(rsiChartContainer, mainChart, mainSeries) },
    'macd': { name: 'MACD (12, 26, 9)', create: (mainChart, data) => new MACDIndicator(null, mainChart, mainSeries) },
    'bb': { name: 'Bollinger Bands (20, 2)', create: (mainChart, data) => new BollingerBandsIndicator(mainChart) }
};
indicatorDropdown.addEventListener('click', (event) => {
    event.preventDefault();
    const target = event.target;
    if (target.tagName !== 'A') return;
    const indicatorId = target.getAttribute('data-indicator');
    if (!indicatorId) return;
    const activeTimeframe = document.querySelector('.timeframe-button.active').textContent;
    const candlestickData = dataStore[activeTimeframe];
    if (activeIndicators[indicatorId]) {
        activeIndicators[indicatorId].remove();
        delete activeIndicators[indicatorId];
    } else {
        const indicatorCreator = indicatorFactory[indicatorId];
        if (indicatorCreator) {
            const newIndicator = indicatorCreator.create(mainChart, candlestickData);
            activeIndicators[indicatorId] = newIndicator;
            newIndicator.addToChart(candlestickData);
        }
    }
});

const ohlcContainer = document.querySelector('.ohlc-info');

initializeData();
updateChartData('D');

// ===================================================================================
// LOGIC VẼ VÀ TƯƠNG TÁC VỚI TREND LINE
// ===================================================================================

const drawTrendLineBtn = document.getElementById('draw-trend-line-btn');

function onChartMouseDown(event, target) {
    const container = target.chart.chartElement().parentElement;
    const bounds = container.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    const time = target.chart.timeScale().coordinateToTime(x);
    const price = target.series.coordinateToPrice(y);

    if (!time || price === null) return;

    const point = { time, price };

    switch (drawingState) {
        case 'idle':
            let clickedLineInfo = null;
            for (const line of drawnTrendLines) {
                const hitResult = line.primitive.hitTest(x, y);
                if (hitResult) {
                    clickedLineInfo = { line, hitResult };
                    break;
                }
            }

            if (selectedTrendLine && selectedTrendLine !== (clickedLineInfo ? clickedLineInfo.line : null)) {
                selectedTrendLine.primitive.setSelected(false);
                selectedTrendLine = null;
            }

            if (clickedLineInfo) {
                const { line, hitResult } = clickedLineInfo;
                if (line !== selectedTrendLine) {
                    line.primitive.setSelected(true);
                    selectedTrendLine = line;
                }
                
                target.chart.applyOptions({
                    handleScroll: false,
                    handleScale: false,
                });

                drawingState = 'moving';
                moveState = {
                    isMoving: true,
                    targetLine: line,
                    moveType: hitResult,
                    lastTime: time,
                    lastPrice: price,
                };
            }
            break;
        case 'activating_draw_mode':
            trendLinePoints = [point];
            currentDrawingTarget = target;
            previewTrendLine = new TrendLine(target.chart, target.series, point, point);
            target.series.attachPrimitive(previewTrendLine);
            drawingState = 'placing_point_2';
            break;
        case 'placing_point_2':
            if (target.chart !== currentDrawingTarget.chart) return;
            previewTrendLine._p2 = point;
            target.chart.priceScale('').applyOptions({});
            drawnTrendLines.push({ targetId: target.id, primitive: previewTrendLine });

            drawingState = 'idle';
            drawTrendLineBtn.classList.remove('active');
            trendLinePoints = [];
            previewTrendLine = null;
            currentDrawingTarget = null;
            break;
    }
}

function onCrosshairMoved(param, sourceChart) {
    if (sourceChart === mainChart) {
        const formatPrice = p => p.toFixed(2);
        const formatVolume = v => (v > 1e6 ? (v / 1e6).toFixed(2) + 'tr' : v.toLocaleString());
        if (!param.time || !param.seriesData.has(mainSeries)) {
            ohlcContainer.innerHTML = '';
        } else {
            const candleData = param.seriesData.get(mainSeries);
            const volumeData = param.seriesData.get(volumeSeries);
            if (candleData && volumeData) {
                ohlcContainer.innerHTML = `<span class="label">O:</span> ${formatPrice(candleData.open)} <span class="label">H:</span> ${formatPrice(candleData.high)} <span class="label">L:</span> ${formatPrice(candleData.low)} <span class="label">C:</span> ${formatPrice(candleData.close)} <span class="label">Vol:</span> ${formatVolume(volumeData.value)}`;
            }
        }
    }

    if (drawingState !== 'placing_point_2' || !param.point || !param.time || !currentDrawingTarget) return;
    if (currentDrawingTarget.chart !== sourceChart) return;

    const price = currentDrawingTarget.series.coordinateToPrice(param.point.y);

    if (price === null) return;
    previewTrendLine._p2 = { time: param.time, price: price };

    if (!trendLineRedrawRequested) {
        trendLineRedrawRequested = true;
        requestAnimationFrame(animationLoop);
    }
}

function onChartMouseMove(event, target) {
    if (drawingState !== 'moving' || !moveState.isMoving) return;

    const container = target.chart.chartElement().parentElement;
    const bounds = container.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    const time = target.chart.timeScale().coordinateToTime(x);
    const price = target.series.coordinateToPrice(y);

    if (!time || price === null) return;

    const line = moveState.targetLine.primitive;
    const timeScale = target.chart.timeScale();
    
    const p1Coord = timeScale.timeToCoordinate(line._p1.time);
    const p2Coord = timeScale.timeToCoordinate(line._p2.time);
    const lastTimeCoord = timeScale.timeToCoordinate(moveState.lastTime);
    
    const p1Index = timeScale.coordinateToLogical(p1Coord);
    const p2Index = timeScale.coordinateToLogical(p2Coord);
    const lastTimeIndex = timeScale.coordinateToLogical(lastTimeCoord);
    const currentTimeIndex = timeScale.coordinateToLogical(x);

    if(p1Index === null || p2Index === null || lastTimeIndex === null || currentTimeIndex === null) return;

    const timeDiff = currentTimeIndex - lastTimeIndex;
    const priceDiff = price - moveState.lastPrice;

    switch (moveState.moveType) {
        case 'line':
            const newP1Time = timeScale.logicalToTime(p1Index + timeDiff);
            const newP2Time = timeScale.logicalToTime(p2Index + timeDiff);
            if (newP1Time) line._p1.time = newP1Time;
            if (newP2Time) line._p2.time = newP2Time;
            line._p1.price += priceDiff;
            line._p2.price += priceDiff;
            break;
        case 'p1':
            line._p1.time = time;
            line._p1.price = price;
            break;
        case 'p2':
            line._p2.time = time;
            line._p2.price = price;
            break;
    }

    moveState.lastTime = time;
    moveState.lastPrice = price;
    
    target.chart.priceScale('').applyOptions({});
}

function onChartMouseUp(event, target) {
    if (drawingState === 'moving' && moveState.isMoving) {
        target.chart.applyOptions({
            handleScroll: true,
            handleScale: true,
        });
        
        drawingState = 'idle';
        moveState = { isMoving: false, targetLine: null, moveType: null, lastTime: null, lastPrice: null };
    }
}

function handleKeyDown(event) {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedTrendLine) {
        let targetSeries;
        if (selectedTrendLine.targetId === 'main') {
            targetSeries = mainSeries;
        } else if (activeIndicators[selectedTrendLine.targetId]) {
            targetSeries = activeIndicators[selectedTrendLine.targetId].series;
        }

        if (targetSeries) {
            targetSeries.detachPrimitive(selectedTrendLine.primitive);
            const chart = targetSeries.chart();
            chart.priceScale('').applyOptions({});
        }

        const index = drawnTrendLines.findIndex(line => line.primitive === selectedTrendLine.primitive);
        if (index > -1) {
            drawnTrendLines.splice(index, 1);
        }
        
        selectedTrendLine = null;
    }
}

function animationLoop() {
    if (trendLineRedrawRequested) {
        if (drawingState === 'placing_point_2' && currentDrawingTarget && currentDrawingTarget.chart) {
            currentDrawingTarget.chart.priceScale('').applyOptions({});
        }
        trendLineRedrawRequested = false;
    }
}

drawTrendLineBtn.addEventListener('click', (event) => {
    if (drawingState === 'idle') {
        drawingState = 'activating_draw_mode';
        drawTrendLineBtn.classList.add('active');
        if (selectedTrendLine) {
            selectedTrendLine.primitive.setSelected(false);
            selectedTrendLine = null;
        }
    } else {
        drawingState = 'idle';
        drawTrendLineBtn.classList.remove('active');
        trendLinePoints = [];
        if (previewTrendLine && currentDrawingTarget) {
            currentDrawingTarget.series.detachPrimitive(previewTrendLine);
        }
        previewTrendLine = null;
        currentDrawingTarget = null;
    }
    event.currentTarget.blur();
});

const mainChartTarget = { chart: mainChart, series: mainSeries, id: 'main' };
mainChartContainer.addEventListener('mousedown', (event) => onChartMouseDown(event, mainChartTarget));
mainChartContainer.addEventListener('mousemove', (event) => onChartMouseMove(event, mainChartTarget));
mainChartContainer.addEventListener('mouseup', (event) => onChartMouseUp(event, mainChartTarget));
mainChartContainer.addEventListener('mouseleave', (event) => onChartMouseUp(event, mainChartTarget));
mainChart.subscribeCrosshairMove(param => onCrosshairMoved(param, mainChart));

window.addEventListener('keydown', handleKeyDown);