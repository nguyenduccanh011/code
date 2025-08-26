document.addEventListener('DOMContentLoaded', async function () {
    // Lấy tên algo từ URL hoặc localStorage
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

    const symbol = (selectedAlgo && selectedAlgo.code) ? selectedAlgo.code : 'VNINDEX';

    const chartArea = document.getElementById('chart-area');
    const chart = LightweightCharts.createChart(chartArea, {
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

    const dataProvider = new DataProvider();
    const strategyEngine = new StrategyEngine(chart, mainSeries);

    try {
        const data = await dataProvider.getHistory(symbol, 'D');
        if (data && data.length) {
            mainSeries.setData(data);

            const config = {
                buyConditions: selectedAlgo?.buyConditions || [],
                sellConditions: selectedAlgo?.sellConditions || []
            };

            // Tính và overlay các chỉ báo SMA từ cấu hình
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

            // Nếu có điều kiện RSI thì overlay RSI
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
                const resp = await fetch('/api/backtest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prices: data,
                        buyConditions: config.buyConditions,
                        sellConditions: config.sellConditions
                    })
                });
                const result = await resp.json();
                const metrics = result.metrics || {};
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
                if (Array.isArray(result.trades)) {
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
});
