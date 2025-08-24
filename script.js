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

// ===================================================================================
// KHAI BÁO BIẾN TOÀN CỤC VÀ TRÌNH QUẢN LÝ
// ===================================================================================

const syncManager = new ChartSyncManager();
const activeIndicators = {};
const dataProvider = new DataProvider();

// --- Biến quản lý dữ liệu và trạng thái tải ---
let currentSymbol = 'VNINDEX';
let currentCandlestickData = [];
let isLoadingMoreData = false;
let initialLoadCompleted = false;

// --- Biến trạng thái cho việc vẽ Trend Line ---
let drawingState = 'idle';
let trendLinePoints = [];
const drawnTrendLines = [];
let previewTrendLine = null;
let trendLineRedrawRequested = false;
let currentDrawingTarget = null;
let selectedTrendLine = null;

let moveState = {
    isMoving: false,
    targetLine: null,
    moveType: null,
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

function applyDataToChart(candlestickData) {
    mainSeries.setData(candlestickData);

    const volumeData = candlestickData.map(item => ({
        time: item.time,
        value: item.volume,
        color: item.close > item.open ? 'rgba(38, 166, 164, 0.5)' : 'rgba(239, 83, 80, 0.5)'
    }));
    volumeSeries.setData(volumeData);

    const smaData = calculateSMA(candlestickData, 9);
    smaLineSeries.setData(smaData);

    for (const id in activeIndicators) {
        if (activeIndicators[id] && typeof activeIndicators[id].update === 'function') {
            activeIndicators[id].update(candlestickData);
        }
    }
}

async function initialLoad(symbol, timeframe) {
    initialLoadCompleted = false; 
    const data = await dataProvider.getHistory(symbol, timeframe);
    if (!data || data.length === 0) {
        console.error("Không nhận được dữ liệu ban đầu.");
        currentCandlestickData = [];
    } else {
        currentCandlestickData = data;
    }
    applyDataToChart(currentCandlestickData);
    mainChart.timeScale().fitContent();
    
    setTimeout(() => {
        initialLoadCompleted = true; 
    }, 500);
}

const timeframeButtons = document.querySelectorAll('.timeframe-button');
timeframeButtons.forEach(button => {
    button.addEventListener('click', () => {
        timeframeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const timeframe = button.textContent;
        initialLoad(currentSymbol, timeframe);
    });
});

const indicatorMenuBtn = document.getElementById('indicator-menu-btn');
const indicatorDropdown = document.getElementById('indicator-dropdown-content');
indicatorDropdown.addEventListener('click', async (event) => {
    event.preventDefault();
    const target = event.target;
    if (target.tagName !== 'A') return;
    const indicatorId = target.getAttribute('data-indicator');
    if (!indicatorId) return;

    if (activeIndicators[indicatorId]) {
        activeIndicators[indicatorId].remove();
        delete activeIndicators[indicatorId];
    } else {
        const indicatorCreator = indicatorFactory[indicatorId];
        if (indicatorCreator) {
            const newIndicator = indicatorCreator.create(mainChart, currentCandlestickData);
            activeIndicators[indicatorId] = newIndicator;
            newIndicator.addToChart(currentCandlestickData);
        }
    }
});
const indicatorFactory = {
    'rsi': { name: 'RSI (14)', create: (mainChart, data) => new RSIIndicator(rsiChartContainer, mainChart, mainSeries) },
    'macd': { name: 'MACD (12, 26, 9)', create: (mainChart, data) => new MACDIndicator(null, mainChart, mainSeries) },
    'bb': { name: 'Bollinger Bands (20, 2)', create: (mainChart, data) => new BollingerBandsIndicator(mainChart) }
};
const ohlcContainer = document.querySelector('.ohlc-info');

async function loadMoreHistory() {
    if (isLoadingMoreData || !initialLoadCompleted || currentCandlestickData.length === 0) {
        return;
    }
    
    isLoadingMoreData = true;
    console.log("Đang tải thêm dữ liệu cũ hơn...");

    const oldestDataPoint = currentCandlestickData[0];
    const toDate = new Date(oldestDataPoint.time.year, oldestDataPoint.time.month - 1, oldestDataPoint.time.day);
    toDate.setDate(toDate.getDate() - 1);

    const fromDate = new Date(toDate);
    fromDate.setMonth(fromDate.getMonth() - 6);

    const toDateStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;
    const fromDateStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
    
    const activeTimeframe = document.querySelector('.timeframe-button.active').textContent;
    const olderData = await dataProvider.getHistory(currentSymbol, activeTimeframe, fromDateStr, toDateStr);

    if (olderData && olderData.length > 0) {
        
        const combinedData = [...olderData, ...currentCandlestickData];

        const uniqueDataMap = new Map();
        combinedData.forEach(item => {
            const timeKey = `${item.time.year}-${item.time.month}-${item.time.day}`;
            uniqueDataMap.set(timeKey, item);
        });

        const uniqueDataArray = Array.from(uniqueDataMap.values());
        uniqueDataArray.sort((a, b) => {
            const dateA = new Date(a.time.year, a.time.month - 1, a.time.day);
            const dateB = new Date(b.time.year, b.time.month - 1, b.time.day);
            return dateA - dateB;
        });

        // ▼▼▼ BẮT ĐẦU SỬA LỖI THEO MẪU ▼▼▼
        setTimeout(() => {
            currentCandlestickData = uniqueDataArray;
            applyDataToChart(currentCandlestickData);
            console.log(`Đã tải và gộp thành công, tổng số nến: ${currentCandlestickData.length}.`);
            isLoadingMoreData = false;
        }, 250);
        // ▲▲▲ KẾT THÚC SỬA LỖI THEO MẪU ▲▲▲
        
        return;
    } else {
        console.log("Không còn dữ liệu cũ hơn để tải.");
    }

    isLoadingMoreData = false;
}

mainChart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
    if (logicalRange === null) {
        return;
    }
    if (logicalRange.from < 10) {
        loadMoreHistory();
    }
});

initialLoad(currentSymbol, 'D');


// ===================================================================================
// LOGIC VẼ VÀ TƯƠNG TÁC VỚI TREND LINE (Không thay đổi)
// ===================================================================================
// ... (Toàn bộ phần code vẽ, di chuyển, xóa trend line giữ nguyên) ...
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
            line._p1.time = time;
            line._p1.price = price;
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