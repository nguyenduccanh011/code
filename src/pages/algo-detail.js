document.addEventListener('DOMContentLoaded', async function () {
    const params = new URLSearchParams(window.location.search);
    const algoName = params.get('name');

    let selectedAlgo = null;
    try {
        if (algoName) {
            const saved = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
            selectedAlgo = saved.find(s => s.name === algoName) || null;
        }
        if (!selectedAlgo) {
            selectedAlgo = JSON.parse(localStorage.getItem('selectedAlgo')) || null;
        }
    } catch (err) {
        console.error('Không thể đọc dữ liệu algo đã chọn:', err);
    }

    const backBtn = document.getElementById('back-to-list');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'algo-list.html';
        });
    }

    const dataProvider = new DataProvider();
    const symbol = (selectedAlgo && selectedAlgo.code) ? selectedAlgo.code : 'VNINDEX';
    document.getElementById('symbol-display').textContent = symbol;
    document.getElementById('symbol-description').textContent = await dataProvider.getCompanyInfo(symbol);

    const ohlcContainer = document.querySelector('.ohlc-info');
    const chartContainer = document.getElementById('main-chart-container');
    const chart = LightweightCharts.createChart(chartContainer, {
        autoSize: true,
        layout: { background: { color: '#ffffff' }, textColor: '#333' },
        grid: { vertLines: { color: '#f0f3f5' }, horzLines: { color: '#f0f3f5' } },
        timeScale: { borderColor: '#ddd', timeVisible: true, secondsVisible: false, rightOffset: 50 }
    });

    const mainSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
    });

    function onCrosshairMoved(param) {
        if (!param.time || !param.seriesData.has(mainSeries)) {
            ohlcContainer.textContent = '';
            return;
        }
        const d = param.seriesData.get(mainSeries);
        ohlcContainer.innerHTML = `<span class="label">O:</span> ${d.open.toFixed(2)} <span class="label">H:</span> ${d.high.toFixed(2)} <span class="label">L:</span> ${d.low.toFixed(2)} <span class="label">C:</span> ${d.close.toFixed(2)}`;
    }
    chart.subscribeCrosshairMove(onCrosshairMoved);

    const strategyEngine = new StrategyEngine(chart, mainSeries);

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
        const data = await dataProvider.getHistory(symbol, 'D');
        if (data && data.length) {
            mainSeries.setData(data);
            const last = data[data.length - 1];
            const prev = data[data.length - 2];
            updateSidebar(last, prev);

            const config = {
                buyConditions: selectedAlgo?.buyConditions || [],
                sellConditions: selectedAlgo?.sellConditions || []
            };

            const smaPeriods = new Set();
            [...config.buyConditions, ...config.sellConditions].forEach(c => {
                if (c.type === 'sma-crossover') {
                    smaPeriods.add(c.params.shortPeriod);
                    smaPeriods.add(c.params.longPeriod);
                }
            });

            const smaColors = ['#2962FF', '#FF6D00', '#D81B60', '#43A047', '#6D4C41'];
            Array.from(smaPeriods).forEach((period, idx) => {
                const smaData = [];
                for (let i = 0; i < data.length; i++) {
                    const value = strategyEngine.calculateSMA(data, period, i);
                    smaData.push({
                        time: data[i].time,
                        value: value !== null ? value : undefined
                    });
                }
                const line = chart.addLineSeries({
                    color: smaColors[idx % smaColors.length],
                    lineWidth: 2,
                    crosshairMarkerVisible: false,
                    lastValueVisible: false,
                    priceLineVisible: false
                });
                line.setData(smaData);
            });

            const hasRSI = [...config.buyConditions, ...config.sellConditions].some(c => c.type === 'rsi');
            if (hasRSI) {
                const rsiSeries = chart.addLineSeries({
                    color: '#8884d8',
                    lineWidth: 1,
                    priceScaleId: 'rsi',
                    crosshairMarkerVisible: false,
                    lastValueVisible: false,
                    priceLineVisible: false
                });
                chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
                const rsiData = data.map((d, idx) => {
                    const value = strategyEngine.calculateRSI(data, idx);
                    return { time: d.time, value: value !== null ? value : undefined };
                });
                rsiSeries.setData(rsiData);
            }

            try {
                const result = await dataProvider.runBacktest({
                    prices: data,
                    buyConditions: config.buyConditions,
                    sellConditions: config.sellConditions
                });
                const metrics = result?.metrics || {};
                document.getElementById('overview-winrate').textContent =
                    metrics.winrate != null ? (metrics.winrate * 100).toFixed(2) + '%' : '--%';
                document.getElementById('overview-mdd').textContent =
                    metrics.max_drawdown != null ? (metrics.max_drawdown * 100).toFixed(2) + '%' : '--%';
                document.getElementById('overview-profit').textContent =
                    metrics.total_return != null ? (metrics.total_return * 100).toFixed(2) + '%' : '--';
                document.getElementById('overview-trades').textContent =
                    metrics.num_trades != null ? metrics.num_trades : '--';
                document.getElementById('overview-profit-factor').textContent =
                    metrics.profit_factor != null ? metrics.profit_factor.toFixed(2) : '--';

                const markers = [];
                if (Array.isArray(result?.trades)) {
                    result.trades.forEach(trade => {
                        markers.push({
                            time: trade.buy_time,
                            position: 'belowBar',
                            color: '#2196F3',
                            shape: 'arrowUp',
                            text: `Buy @ ${trade.buy_price.toFixed(2)}`
                        });
                        markers.push({
                            time: trade.sell_time,
                            position: 'aboveBar',
                            color: '#e91e63',
                            shape: 'arrowDown',
                            text: `Sell @ ${trade.sell_price.toFixed(2)}`
                        });
                    });
                }
                strategyEngine.displayMarkers(markers);
            } catch (err) {
                console.error('Không thể backtest:', err);
            }
        }
    } catch (error) {
        console.error('Không thể tải dữ liệu biểu đồ:', error);
    }

    // Drawing tool
    const drawBtn = document.getElementById('draw-trend-line-btn');
    let drawing = false;
    let firstPoint = null;
    drawBtn.addEventListener('click', () => {
        drawing = !drawing;
        drawBtn.classList.toggle('active', drawing);
        if (!drawing) firstPoint = null;
    });
    chartContainer.addEventListener('click', (event) => {
        if (!drawing) return;
        const rect = chartContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const time = chart.timeScale().coordinateToTime(x);
        const price = mainSeries.coordinateToPrice(y);
        if (!time || price === null) return;
        if (!firstPoint) {
            firstPoint = { time, price };
        } else {
            const line = new TrendLine(chart, mainSeries, firstPoint, { time, price });
            mainSeries.attachPrimitive(line);
            line.updateAllViews();
            drawing = false;
            firstPoint = null;
            drawBtn.classList.remove('active');
        }
    });
});
