// File: src/pages/algo-detail.js

document.addEventListener('DOMContentLoaded', async function () {
    const chartArea = document.getElementById('chart-area');
    const chart = LightweightCharts.createChart(chartArea, {
        width: chartArea.clientWidth,
        height: chartArea.clientHeight,
        timeScale: { timeVisible: true, secondsVisible: false }

    });

    const candleSeries = chart.addCandlestickSeries({

        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
    });

    const dataProvider = new DataProvider();

    const strategyEngine = new StrategyEngine(chart, candleSeries);

    // --- Lấy thông tin algo từ URL hoặc localStorage ---
    const params = new URLSearchParams(window.location.search);
    let algoName = params.get('name');
    let algo = null;


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
        const tradingValue = latestData.close * latestData.volume;

        priceEl.textContent = close.toFixed(2);
        changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;
        percentChangeEl.textContent = `${percentChange.toFixed(2)}%`;
        highEl.textContent = latestData.high.toFixed(2);
        lowEl.textContent = latestData.low.toFixed(2);
        openEl.textContent = latestData.open.toFixed(2);
        refEl.textContent = refPrice.toFixed(2);
        volumeEl.textContent = formatLargeNumber(latestData.volume);
        valueEl.textContent = formatLargeNumber(tradingValue);

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

    try {
        const stored = localStorage.getItem('selectedAlgo');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (!algoName || parsed.name === algoName) {
                algo = parsed;
                algoName = parsed.name;
            }
        }
        if (!algo && algoName) {
            const list = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
            algo = list.find(a => a.name === algoName) || null;

        }
    } catch (err) {
        console.error('Không thể đọc thông tin algo:', err);
    }

    if (!algo) {
        console.error('Không tìm thấy cấu hình algo.');
        return;
    }

    // Cập nhật thông tin tổng quan
    document.getElementById('overview-winrate').textContent = algo.winrate || '--%';
    document.getElementById('overview-mdd').textContent = algo.mdd || '--%';
    document.getElementById('overview-profit').textContent = algo.profit || '--';

    // --- Tải dữ liệu lịch sử ---
    const history = await dataProvider.getHistory(algo.code, 'D');
    candleSeries.setData(history);

    // --- Tính và vẽ các chỉ báo ---
    const indicatorPeriods = new Set();
    [...(algo.buyConditions || []), ...(algo.sellConditions || [])].forEach(cond => {
        if (cond.type === 'sma-crossover') {
            indicatorPeriods.add(cond.params.shortPeriod);
            indicatorPeriods.add(cond.params.longPeriod);
        }
    });

    let colorIdx = 0;
    const smaColors = ['rgba(41, 98, 255, 1)', 'rgba(255, 109, 0, 1)', 'rgba(0, 200, 83, 1)'];
    indicatorPeriods.forEach(period => {
        const smaData = [];
        for (let i = period - 1; i < history.length; i++) {
            const value = strategyEngine.calculateSMA(history, period, i);
            if (value !== null) {
                smaData.push({ time: history[i].time, value: value });
            }
        }
        const series = chart.addLineSeries({
            color: smaColors[colorIdx % smaColors.length],
            lineWidth: 2,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false
        });
        series.setData(smaData);
        colorIdx++;
    });

    const hasRSI = [...(algo.buyConditions || []), ...(algo.sellConditions || [])]
        .some(cond => cond.type === 'rsi');
    if (hasRSI) {
        const rsiData = [];
        for (let i = 0; i < history.length; i++) {
            const rsi = strategyEngine.calculateRSI(history, i);
            if (rsi !== null) {
                rsiData.push({ time: history[i].time, value: rsi });
            }
        }
        const rsiSeries = chart.addLineSeries({
            priceScaleId: 'rsi',
            color: '#8884d8',
            lineWidth: 1,
            crosshairMarkerVisible: false,
            lastValueVisible: false
        });
        chart.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 }
        });
        rsiSeries.setData(rsiData);
        rsiSeries.createPriceLine({ price: 70, color: '#787B86', lineStyle: LightweightCharts.LineStyle.Dashed });
        rsiSeries.createPriceLine({ price: 30, color: '#787B86', lineStyle: LightweightCharts.LineStyle.Dashed });
    }

    // --- Xác định điểm mua/bán ---
    function generateMarkers() {
        const markers = [];
        const config = {
            buyConditions: algo.buyConditions || [],
            sellConditions: algo.sellConditions || []
        };
        const minPeriod = strategyEngine.getMinRequiredPeriod(config);
        for (let i = minPeriod; i < history.length; i++) {
            if (strategyEngine.evaluateConditions(config.buyConditions, history, i, 'buy')) {
                markers.push({
                    time: history[i].time,
                    position: 'belowBar',
                    color: 'green',
                    shape: 'arrowUp',
                    text: 'Buy'
                });
            }
            if (strategyEngine.evaluateConditions(config.sellConditions, history, i, 'sell')) {
                markers.push({
                    time: history[i].time,
                    position: 'aboveBar',
                    color: 'red',
                    shape: 'arrowDown',
                    text: 'Sell'
                });
            }
        }
        return markers;
    }

    const markers = generateMarkers();
    candleSeries.setMarkers(markers);


});

