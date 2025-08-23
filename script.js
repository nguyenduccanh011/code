// ===================================================================================
// CÁC HÀM TIỆN ÍCH
// ===================================================================================

/**
 * Tính toán Đường trung bình động đơn giản (SMA).
 */
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

/**
 * Hàm tạo dữ liệu giả lập.
 */
function generateData(timeframe) {
    const data = [];
    let startDate = new Date(2025, 0, 1); // Bắt đầu từ 1/1/2025
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
            time: {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
            },
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

// ===================================================================================
// KHỞI TẠO BIỂU ĐỒ CHÍNH
// ===================================================================================

const mainChartContainer = document.getElementById('main-chart-container');
const rsiChartContainer = document.getElementById('rsi-chart-container');

const mainChart = LightweightCharts.createChart(mainChartContainer, {
    autoSize: true,
    layout: { background: { color: '#ffffff' }, textColor: '#333' },
    grid: { vertLines: { color: '#f0f3f5' }, horzLines: { color: '#f0f3f5' } },
    timeScale: { borderColor: '#ddd', timeVisible: true, secondsVisible: false, rightOffset: 12 },
    watermark: { color: 'rgba(200, 200, 200, 0.4)', visible: true, text: 'VNINDEX', fontSize: 48, horzAlign: 'center', vertAlign: 'center' },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
});

// Tạo các series trước
const mainSeries = mainChart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' });
const volumeSeries = mainChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
mainChart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
const smaLineSeries = mainChart.addLineSeries({ color: 'rgba(4, 111, 232, 1)', lineWidth: 2, crosshairMarkerVisible: false });

// Đăng ký chart chính vào trình quản lý đồng bộ
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

    const volumeData = candlestickData.map(item => ({ time: item.time, value: item.volume, color: item.close > item.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)' }));
    volumeSeries.setData(volumeData);

    const smaData = calculateSMA(candlestickData, 9);
    smaLineSeries.setData(smaData);

    // Cập nhật lại dữ liệu cho các chỉ báo đang hoạt động
    for (const id in activeIndicators) {
        activeIndicators[id].update(candlestickData);
    }

    mainChart.timeScale().fitContent();
}

// --- Lắng nghe sự kiện cho các nút Timeframe ---
const timeframeButtons = document.querySelectorAll('.timeframe-button');
timeframeButtons.forEach(button => {
    button.addEventListener('click', () => {
        timeframeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const timeframe = button.textContent;
        updateChartData(timeframe);
    });
});

// --- Lắng nghe sự kiện cho Menu chỉ báo ---
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

// "Nhà máy" sản xuất các chỉ báo
const indicatorFactory = {
    'rsi': {
        name: 'RSI (14)',
        create: (mainChart, data) => new RSIIndicator(rsiChartContainer, mainChart, mainSeries)
    },
    'macd': {
        name: 'MACD (12, 26, 9)',
        create: (mainChart, data) => new MACDIndicator(null, mainChart, mainSeries)
    },
    'bb': {
        name: 'Bollinger Bands (20, 2)',
        create: (mainChart, data) => new BollingerBandsIndicator(mainChart)
    }
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

// ===================================================================================
// HIỂN THỊ THÔNG TIN OHLC
// ===================================================================================

const ohlcContainer = document.querySelector('.ohlc-info');
mainChart.subscribeCrosshairMove(param => {
    const formatPrice = p => p.toFixed(2);
    const formatVolume = v => (v > 1e6 ? (v / 1e6).toFixed(2) + 'tr' : v.toLocaleString());
    
    if (!param.time || !param.seriesData.has(mainSeries)) {
        ohlcContainer.innerHTML = '';
        return;
    }
    
    const candleData = param.seriesData.get(mainSeries);
    const volumeData = param.seriesData.get(volumeSeries);
    
    if (!candleData || !volumeData) return;
    
    ohlcContainer.innerHTML = `
        <span class="label">O:</span> ${formatPrice(candleData.open)}
        <span class="label">H:</span> ${formatPrice(candleData.high)}
        <span class="label">L:</span> ${formatPrice(candleData.low)}
        <span class="label">C:</span> ${formatPrice(candleData.close)}
        <span class="label">Vol:</span> ${formatVolume(volumeData.value)}
    `;
});

// ===================================================================================
// KHỞI CHẠY ỨNG DỤNG
// ===================================================================================
initializeData();
updateChartData('D');