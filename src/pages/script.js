// ===================================================================================
// CÁC HÀM TIỆN ÍCH
// ===================================================================================

function areTimesEqual(time1, time2) {
    if (!time1 || !time2) return false;
    if (window.AppUtils && window.AppUtils.time && typeof window.AppUtils.time.areTimesEqual === "function") {
        return window.AppUtils.time.areTimesEqual(time1, time2);
    }
    return JSON.stringify(time1) === JSON.stringify(time2);
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
const maSettingsPanel = document.getElementById('ma-settings-panel');
let maCounter = 0;
const defaultMaColors = ['#2962FF', '#FF6D00', '#D81B60', '#43A047', '#6D4C41'];


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
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const chartLoadingEl = document.getElementById('chart-loading');

// Khởi tạo chart qua ChartView nếu sẵn sàng; nếu chưa, fallback sang tạo trực tiếp
let chartView;
let mainChart;
let mainSeries;
let volumeSeries;
if (window.ChartView && typeof window.ChartView === 'function') {
    chartView = new window.ChartView({ mainContainer: mainChartContainer, rsiContainer: rsiChartContainer, LightweightCharts });
    mainChart = chartView.mainChart();
    mainSeries = chartView.mainSeries();
    volumeSeries = chartView.volumeSeries();
} else {
    mainChart = LightweightCharts.createChart(mainChartContainer, {
        autoSize: true,
        layout: { background: { color: '#ffffff' }, textColor: '#333' },
        grid: { vertLines: { color: '#f0f3f5' }, horzLines: { color: '#f0f3f5' } },
        timeScale: { borderColor: '#ddd', timeVisible: true, secondsVisible: false, rightOffset: 50 },
        watermark: { color: 'rgba(200, 200, 200, 0.4)', visible: true, text: 'VNINDEX', fontSize: 48, horzAlign: 'center', vertAlign: 'center' },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    });
    mainSeries = mainChart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' });
    volumeSeries = mainChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    mainChart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chartView = {
        mainChart: () => mainChart,
        mainSeries: () => mainSeries,
        volumeSeries: () => volumeSeries,
        setCandles: (candles) => mainSeries.setData(candles),
        setVolumeFromCandles: (candles) => {
            const volumeData = candles.map(item => ({
                time: item.time,
                value: item.volume,
                color: item.close > item.open ? 'rgba(38, 166, 164, 0.5)' : 'rgba(239, 83, 80, 0.5)'
            }));
            volumeSeries.setData(volumeData);
        },
        setMarkers: (markers) => mainSeries.setMarkers(markers || []),
        timeScale: () => mainChart.timeScale(),
    };
}
const smaLineSeries = mainChart.addLineSeries({ color: 'rgba(4, 111, 232, 1)', lineWidth: 2, crosshairMarkerVisible: false });

// ▼▼▼ THÊM DÒNG NÀY ĐỂ TẠO SERIES CHO SMA 20 ▼▼▼
const sma20LineSeries = mainChart.addLineSeries({ color: 'rgba(255, 109, 0, 1)', lineWidth: 2, crosshairMarkerVisible: false });

function applyThemeToChart(theme) {
    const isDark = theme === 'dark' || document.body.classList.contains('theme-dark');
    mainChart.applyOptions({
        layout: { background: { color: isDark ? '#0f1419' : '#ffffff' }, textColor: isDark ? '#d0d4d8' : '#333' },
        grid: { vertLines: { color: isDark ? '#1f2a35' : '#f0f3f5' }, horzLines: { color: isDark ? '#1f2a35' : '#f0f3f5' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        watermark: { color: isDark ? 'rgba(200,200,200,0.15)' : 'rgba(200,200,200,0.4)' },
    });
}

// Init theme from localStorage
try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
        document.body.classList.add('theme-dark');
    }
    applyThemeToChart(stored === 'dark' ? 'dark' : 'light');
} catch (e) {}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('theme-dark');
        applyThemeToChart(isDark ? 'dark' : 'light');
        try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
        themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    });
}


syncManager.addChart(mainChart, mainSeries);
// --- KHỞI TẠO TRÌNH QUẢN LÝ CHIẾN LƯỢC ---
const strategyManager = new StrategyManager(mainChart, mainSeries);
const strategyEngine = new StrategyEngine(mainChart, mainSeries);
let isStrategyActive = false; // Biến trạng thái để bật/tắt chiến lược


// ▼▼▼ KHỐI CODE MỚI ĐỂ CẬP NHẬT SIDEBAR ▼▼▼
// ===================================================================================
// LOGIC CẬP NHẬT SIDEBAR
// ===================================================================================
function formatLargeNumber(num) {
    if (window.AppUtils && window.AppUtils.format && typeof window.AppUtils.format.formatLargeNumber === "function") {
        return window.AppUtils.format.formatLargeNumber(num);
    }
    if (num === null || num === undefined || isNaN(num)) return "---";
    const n = Number(num);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + " t?";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + " tr";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + " k";
    return n.toLocaleString();
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
    valueEl.textContent = (window.AppUtils && window.AppUtils.format)
        ? window.AppUtils.format.formatLargeNumber(tradingValue)
        : formatLargeNumber(tradingValue);
    // ▲▲▲ KẾT THÚC THÊM MỚI ▲▲▲
    
    priceEl.textContent = close.toFixed(2);
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;
    percentChangeEl.textContent = `${percentChange.toFixed(2)}%`;

    highEl.textContent = latestData.high.toFixed(2);
    lowEl.textContent = latestData.low.toFixed(2);
    openEl.textContent = latestData.open.toFixed(2);
    refEl.textContent = refPrice.toFixed(2);
    volumeEl.textContent = (window.AppUtils && window.AppUtils.format)
        ? window.AppUtils.format.formatLargeNumber(latestData.volume)
        : formatLargeNumber(latestData.volume);
    
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

function setCandlesAndVolume(candlestickData) {
    chartView.setCandles(candlestickData);
    chartView.setVolumeFromCandles(candlestickData);
}

function updateIndicatorsAndStrategy(candlestickData) {
    const smaData = calculateSMA(candlestickData, 9);
    smaLineSeries.setData(smaData);
    const sma20Data = calculateSMA(candlestickData, 20);
    sma20LineSeries.setData(sma20Data);

    for (const id in activeIndicators) {
        if (activeIndicators[id] && typeof activeIndicators[id].update === 'function') {
            activeIndicators[id].update(candlestickData);
        }
    }

    if (isStrategyActive) {
        const markers = strategyManager.runSMACrossoverStrategy(candlestickData);
        strategyManager.displayMarkers(markers);
    } else {
        strategyManager.clearMarkers();
    }
}

function applyDataToChart(candlestickData) {
    setCandlesAndVolume(candlestickData);
    updateIndicatorsAndStrategy(candlestickData);
    if (candlestickData && candlestickData.length > 0) {
        const lastDataPoint = candlestickData[candlestickData.length - 1];
        const previousDataPoint = candlestickData.length > 1 ? candlestickData[candlestickData.length - 2] : null;
        updateSidebar(lastDataPoint, previousDataPoint);
    }
}
async function initialLoad(symbol, timeframe) {
    if (chartLoadingEl) chartLoadingEl.style.display = 'flex';
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

    if (currentCandlestickData.length > 0 && !isStrategyActive) { // Chỉ tự động zoom khi không chạy strategy
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
        if (chartLoadingEl) chartLoadingEl.style.display = 'none';
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

// --- THÊM TRÌNH XỬ LÝ SỰ KIỆN CHO NÚT CHIẾN LƯỢC ---
const strategyBtn = document.getElementById('strategy-sma-cross-btn');

strategyBtn.addEventListener('click', () => {
    isStrategyActive = !isStrategyActive;

    if (isStrategyActive) {
        strategyBtn.classList.add('active');
        const markers = strategyManager.runSMACrossoverStrategy(currentCandlestickData);
        strategyManager.displayMarkers(markers);
        
        if (markers.length > 0) {
            const firstMarkerTime = markers[0].time;
            const dataWithTime = currentCandlestickData.map((d, index) => ({...d, originalIndex: index}));
            
            const dataPoint = dataWithTime.find(d => areTimesEqual(d.time, firstMarkerTime));
            
            if (dataPoint) {
                 mainChart.timeScale().scrollToPosition(dataPoint.originalIndex, true);
            }
        }

    } else {
        strategyBtn.classList.remove('active');
        strategyManager.clearMarkers();
    }
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

function createMAConfigItem(id, indicator) {
    const item = document.createElement('div');
    item.className = 'ma-config';
    item.dataset.id = id;

    const colorBox = document.createElement('div');
    colorBox.className = 'ma-color-box';
    colorBox.style.background = indicator.options.color;

    const label = document.createElement('span');
    label.textContent = `MA ${indicator.options.period}`;

    const editBtn = document.createElement('button');
    editBtn.textContent = '⚙';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';

    const dialog = document.createElement('div');
    dialog.className = 'ma-config-dialog';
    dialog.innerHTML = `
        <label>Chu kỳ: <input type="number" min="1" value="${indicator.options.period}"></label>
        <label>Màu: <input type="color" value="${indicator.options.color}"></label>
        <div class="ma-dialog-actions">
            <button class="ma-dialog-ok">OK</button>
            <button class="ma-dialog-cancel">Hủy</button>
        </div>
    `;

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dialog.style.display = dialog.style.display === 'flex' ? 'none' : 'flex';
    });

    dialog.querySelector('.ma-dialog-ok').addEventListener('click', () => {
        const periodInput = dialog.querySelector('input[type="number"]');
        const colorInput = dialog.querySelector('input[type="color"]');
        const newPeriod = parseInt(periodInput.value, 10);
        const newColor = colorInput.value;
        indicator.setOptions({ period: newPeriod, color: newColor }, currentCandlestickData);
        label.textContent = `MA ${indicator.options.period}`;
        colorBox.style.background = indicator.options.color;
        dialog.style.display = 'none';
    });

    dialog.querySelector('.ma-dialog-cancel').addEventListener('click', () => {
        dialog.style.display = 'none';
    });

    removeBtn.addEventListener('click', () => {
        indicator.remove();
        delete activeIndicators[id];
        item.remove();
    });

    item.append(colorBox, label, editBtn, removeBtn, dialog);
    maSettingsPanel.appendChild(item);
}

indicatorDropdown.addEventListener('click', async (event) => {
    event.preventDefault();
    const target = event.target;
    if (target.tagName !== 'A') return;
    const indicatorId = target.getAttribute('data-indicator');
    if (!indicatorId) return;

    if (indicatorId === 'ma') {
        maCounter++;
        const color = defaultMaColors[(maCounter - 1) % defaultMaColors.length];
        const newIndicator = indicatorFactory['ma'].create(mainChart, currentCandlestickData, { period: 9, color });
        const id = `ma-${maCounter}`;
        activeIndicators[id] = newIndicator;
        newIndicator.addToChart(currentCandlestickData);
        createMAConfigItem(id, newIndicator);
    } else {
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
    }
    indicatorDropdown.classList.remove('show');
});

const indicatorFactory = {
    'ma': {
        name: 'Moving Average',
        create: (mainChart, data, options = { period: 9, color: '#2962FF' }) => new MAIndicator(mainChart, options)
    },
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

function mergeCandles(existing, incoming) {
    const map = new Map();
    existing.forEach(item => map.set(`${item.time.year}-${item.time.month}-${item.time.day}`, item));
    incoming.forEach(item => map.set(`${item.time.year}-${item.time.month}-${item.time.day}`, item));
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
        const da = new Date(a.time.year, a.time.month - 1, a.time.day);
        const db = new Date(b.time.year, b.time.month - 1, b.time.day);
        return da - db;
    });
    return arr;
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
        
        const uniqueDataArray = mergeCandles(currentCandlestickData, olderData);

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
