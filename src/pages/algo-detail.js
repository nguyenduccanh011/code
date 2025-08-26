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

    // Hiển thị tổng quan
    if (selectedAlgo) {
        document.getElementById('overview-winrate').textContent = selectedAlgo.winrate || '--';
        document.getElementById('overview-mdd').textContent = selectedAlgo.mdd || '--';
        document.getElementById('overview-profit').textContent = selectedAlgo.profit || '--';
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

            // Xác định các điểm mua/bán
            const markers = [];
            const minPeriod = strategyEngine.getMinRequiredPeriod(config);
            for (let i = minPeriod; i < data.length; i++) {
                const current = data[i];
                if (strategyEngine.evaluateConditions(config.buyConditions, data, i, 'buy')) {
                    markers.push({
                        time: current.time,
                        position: 'belowBar',
                        color: '#2196F3',
                        shape: 'arrowUp',
                        text: `Buy @ ${current.close.toFixed(2)}`
                    });
                }
                if (strategyEngine.evaluateConditions(config.sellConditions, data, i, 'sell')) {
                    markers.push({
                        time: current.time,
                        position: 'aboveBar',
                        color: '#e91e63',
                        shape: 'arrowDown',
                        text: `Sell @ ${current.close.toFixed(2)}`
                    });
                }
            }
            strategyEngine.displayMarkers(markers);
        }
    } catch (error) {
        console.error('Không thể tải dữ liệu biểu đồ:', error);
    }
});
