document.addEventListener('DOMContentLoaded', async function () {
    // Lấy thông tin algo đã chọn từ localStorage
    let selectedAlgo = null;
    try {
        selectedAlgo = JSON.parse(localStorage.getItem('selectedAlgo')) || null;
    } catch (err) {
        console.error('Không thể đọc dữ liệu algo đã chọn:', err);
    }

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
        }
    } catch (error) {
        console.error('Không thể tải dữ liệu biểu đồ:', error);
    }

});
