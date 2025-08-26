document.addEventListener('DOMContentLoaded', function () {
    const chartArea = document.getElementById('chart-area');
    const chart = LightweightCharts.createChart(chartArea, {
        width: chartArea.clientWidth,
        height: chartArea.clientHeight,
    });

    const dataProvider = new DataProvider();
    const strategyEngine = new StrategyEngine(chart, dataProvider);
});
