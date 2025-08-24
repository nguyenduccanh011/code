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
let allCompanies = []; // Lưu danh sách tất cả công ty

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


// ▼▼▼ KHỐI CODE MỚI ĐỂ CẬP NHẬT SIDEBAR ▼▼▼
// ===================================================================================
// LOGIC CẬP NHẬT SIDEBAR
// ===================================================================================
function formatLargeNumber(num) {
    if (!num || isNaN(num)) return '---';
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + ' tỷ';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(1) + ' tr';
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(0) + ' k';
    }
    return num.toLocaleString();
}

function updateSidebar(latestData, previousData) {
    const priceEl = document.getElementById('sidebar-price');
    const changeEl = document.getElementById('sidebar-change');
    const percentChangeEl = document.getElementById('sidebar-percent-change');
    const highEl = document.getElementById('sidebar-high');
    const lowEl = document.getElementById('sidebar-low');
    const openEl = document.getElementById('sidebar-open');
    const refEl = document.getElementById('sidebar-ref');
    const volumeEl = document.getElementById('sidebar-volume');
    const valueEl = document.getElementById('sidebar-value');

    if (!latestData) {
        [priceEl, changeEl, percentChangeEl, highEl, lowEl, openEl, refEl, volumeEl, valueEl].forEach(el => {
            if (el) el.textContent = '---';
        });
        return;
    }

    const close = latestData.close;
    const refPrice = previousData ? previousData.close : latestData.open;
    const change = close - refPrice;
    const percentChange = refPrice === 0 ? 0 : (change / refPrice) * 100;

    // ▼▼▼ THÊM TÍNH TOÁN VÀ HIỂN THỊ GTGD ▼▼▼
    const tradingValue = latestData.close * latestData.volume;
    valueEl.textContent = formatLargeNumber(tradingValue);
    // ▲▲▲ KẾT THÚC THÊM MỚI ▲▲▲
    
    priceEl.textContent = close.toFixed(2);
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;
    percentChangeEl.textContent = `${percentChange.toFixed(2)}%`;

    highEl.textContent = latestData.high.toFixed(2);
    lowEl.textContent = latestData.low.toFixed(2);
    openEl.textContent = latestData.open.toFixed(2);
    refEl.textContent = refPrice.toFixed(2);
    volumeEl.textContent = formatLargeNumber(latestData.volume);
    
    // Cập nhật màu sắc
    const elementsToColor = [priceEl, changeEl, percentChangeEl, highEl, lowEl, openEl];
    elementsToColor.forEach(el => el.classList.remove('color-red', 'color-green', 'color-yellow'));
    
    let colorClass = 'color-yellow';
    if (change > 0) colorClass = 'color-green';
    else if (change < 0) colorClass = 'color-red';

    [priceEl, changeEl, percentChangeEl].forEach(el => el.classList.add(colorClass));

    const priceFields = [
        { el: highEl, value: latestData.high },
        { el: lowEl, value: latestData.low },
        { el: openEl, value: latestData.open },
    ];
    priceFields.forEach(field => {
        if (field.value > refPrice) field.el.classList.add('color-green');
        else if (field.value < refPrice) field.el.classList.add('color-red');
        else field.el.classList.add('color-yellow');
    });
}
// ▲▲▲ KẾT THÚC KHỐI CODE MỚI ▲▲▲


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

    // ▼▼▼ THÊM LOGIC GỌI `updateSidebar` TẠI ĐÂY ▼▼▼
    if (candlestickData && candlestickData.length > 0) {
        const lastDataPoint = candlestickData[candlestickData.length - 1];
        const previousDataPoint = candlestickData.length > 1 ? candlestickData[candlestickData.length - 2] : null;
        updateSidebar(lastDataPoint, previousDataPoint);
    }
    // ▲▲▲ KẾT THÚC THÊM ▲▲▲
}

async function initialLoad(symbol, timeframe) {
    document.getElementById('symbol-display').textContent = symbol.toUpperCase();
    document.getElementById('symbol-description').textContent = "Đang tải tên công ty...";
    mainChart.applyOptions({ watermark: { text: symbol.toUpperCase() } });

    // Dòng updateSidebar(symbol) cũ đã bị xóa khỏi đây.

    const historyPromise = dataProvider.getHistory(symbol, timeframe);
    const companyInfoPromise = dataProvider.getCompanyInfo(symbol);

    const [data, companyName] = await Promise.all([historyPromise, companyInfoPromise]);
    
    document.getElementById('symbol-description').textContent = companyName;

    initialLoadCompleted = false;
    if (!data || data.length === 0) {
        console.error("Không nhận được dữ liệu ban đầu.");
        currentCandlestickData = [];
    } else {
        currentCandlestickData = data;
    }
    applyDataToChart(currentCandlestickData);

    if (currentCandlestickData.length > 0) {
        const dataLength = currentCandlestickData.length;
        const visibleBars = 150;
        const logicalFrom = Math.max(0, dataLength - visibleBars);
        const logicalTo = dataLength;
        mainChart.timeScale().setVisibleLogicalRange({ from: logicalFrom, to: logicalTo });
    } else {
        mainChart.timeScale().fitContent();
    }

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

indicatorMenuBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    indicatorDropdown.classList.toggle('show');
});

window.addEventListener('click', (event) => {
    if (!indicatorMenuBtn.contains(event.target)) {
        indicatorDropdown.classList.remove('show');
    }
});

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
    indicatorDropdown.classList.remove('show');
});

const indicatorFactory = {
    'rsi': { name: 'RSI (14)', create: (mainChart, data) => new RSIIndicator(rsiChartContainer, mainChart, mainSeries) },
    'macd': { name: 'MACD (12, 26, 9)', create: (mainChart, data) => new MACDIndicator(null, mainChart, mainSeries) },
    'bb': { name: 'Bollinger Bands (20, 2)', create: (mainChart, data) => new BollingerBandsIndicator(mainChart) }
};
const ohlcContainer = document.querySelector('.ohlc-info');

function initializeSearch() {
    const searchInput = document.getElementById('symbol-search-input');
    const suggestionsContainer = document.getElementById('search-suggestions');
    let activeIndex = -1;

    dataProvider.getAllCompanies().then(data => {
        allCompanies = data;
    });
    
    const updateHighlight = () => {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            if (index === activeIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    };

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toUpperCase();
        activeIndex = -1;
        if (query.length < 1) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        let filtered = allCompanies.filter(c => {
            const symbolMatch = c.symbol.toUpperCase().startsWith(query);
            if (query.length <= 2) {
                return symbolMatch;
            }
            const nameMatch = c.organ_name && c.organ_name.toUpperCase().includes(query);
            return symbolMatch || nameMatch;
        });

        filtered.sort((a, b) => {
            const aSymbol = a.symbol.toUpperCase();
            const bSymbol = b.symbol.toUpperCase();
            if (aSymbol === query) return -1;
            if (bSymbol === query) return 1;
            const aStartsWith = aSymbol.startsWith(query);
            const bStartsWith = bSymbol.startsWith(query);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return aSymbol.localeCompare(bSymbol);
        });

        suggestionsContainer.innerHTML = '';
        if (filtered.length > 0) {
            const topResults = filtered.slice(0, 50);

            topResults.forEach(company => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `<span class="suggestion-symbol">${company.symbol}</span><span class="suggestion-name">${company.organ_name || 'N/A'}</span>`;
                
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    currentSymbol = company.symbol;
                    const activeTimeframe = document.querySelector('.timeframe-button.active').textContent;
                    initialLoad(currentSymbol, activeTimeframe);
                    
                    searchInput.value = '';
                    suggestionsContainer.style.display = 'none';
                    searchInput.blur();
                });
                suggestionsContainer.appendChild(item);
            });
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        if (suggestionsContainer.style.display === 'none') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex > -1) {
                items[activeIndex].dispatchEvent(new MouseEvent('mousedown'));
            } else if (items.length > 0) {
                items[0].dispatchEvent(new MouseEvent('mousedown'));
            }
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length > 0 && suggestionsContainer.children.length > 0) {
             suggestionsContainer.style.display = 'block';
        }
    });

    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            suggestionsContainer.style.display = 'none';
        }, 200); 
    });
}

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

        setTimeout(() => {
            currentCandlestickData = uniqueDataArray;
            applyDataToChart(currentCandlestickData);
            console.log(`Đã tải và gộp thành công, tổng số nến: ${currentCandlestickData.length}.`);
            isLoadingMoreData = false;
        }, 250);
        
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
initializeSearch();


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