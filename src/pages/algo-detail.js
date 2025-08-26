// File: src/pages/algo-detail.js

document.addEventListener('DOMContentLoaded', async function () {
    const chartArea = document.getElementById('main-chart-container');
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

    const drawTrendLineBtn = document.getElementById('draw-trend-line-btn');
    const indicatorMenuBtn = document.getElementById('indicator-menu-btn');
    const indicatorDropdown = document.getElementById('indicator-dropdown-content');
    const activeIndicators = {};

    let drawingState = 'idle';
    let trendLinePoints = [];
    const drawnTrendLines = [];
    let previewTrendLine = null;
    let trendLineRedrawRequested = false;
    let currentDrawingTarget = null;
    let selectedTrendLine = null;
    const moveState = { isMoving: false, targetLine: null, moveType: null, lastTime: null, lastPrice: null };

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

    // Hiển thị mã cổ phiếu và thông tin mô tả
    const symbolEl = document.getElementById('symbol-display');
    const descEl = document.getElementById('symbol-description');
    if (symbolEl) symbolEl.textContent = (algo.code || '').toUpperCase();
    if (descEl) descEl.textContent = 'Đang tải tên công ty...';

    // Cập nhật thông tin tổng quan
    document.getElementById('overview-winrate').textContent = algo.winrate || '--%';
    document.getElementById('overview-mdd').textContent = algo.mdd || '--%';
    document.getElementById('overview-profit').textContent = algo.profit || '--';

    let history = [];
    // --- Tải dữ liệu lịch sử và thông tin công ty ---
    const [historyData, companyName] = await Promise.all([
        dataProvider.getHistory(algo.code, 'D'),
        dataProvider.getCompanyInfo(algo.code)
    ]);

    history = historyData;

    if (descEl) descEl.textContent = companyName || '';

    candleSeries.setData(history);

    if (history && history.length > 0) {
        const latest = history[history.length - 1];
        const prev = history.length > 1 ? history[history.length - 2] : null;
        updateSidebar(latest, prev);
    }

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

    // --- Indicator menu ---
    if (indicatorMenuBtn && indicatorDropdown) {
        indicatorMenuBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            indicatorDropdown.classList.toggle('show');
        });
        document.addEventListener('click', (event) => {
            if (!indicatorMenuBtn.contains(event.target)) {
                indicatorDropdown.classList.remove('show');
            }
        });
        indicatorDropdown.addEventListener('click', (event) => {
            event.preventDefault();
            const indicatorId = event.target.getAttribute('data-indicator');
            if (!indicatorId) return;
            if (indicatorId === 'ma') {
                if (activeIndicators['ma']) {
                    activeIndicators['ma'].remove();
                    delete activeIndicators['ma'];
                } else {
                    const ma = new MAIndicator(chart, { period: 20, color: '#2962FF' });
                    ma.addToChart(history);
                    activeIndicators['ma'] = ma;
                }
            } else if (indicatorId === 'rsi') {
                if (activeIndicators['rsi']) {
                    chart.removeSeries(activeIndicators['rsi'].series);
                    delete activeIndicators['rsi'];
                } else {
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
                    chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
                    rsiSeries.setData(rsiData);
                    rsiSeries.createPriceLine({ price: 70, color: '#787B86', lineStyle: LightweightCharts.LineStyle.Dashed });
                    rsiSeries.createPriceLine({ price: 30, color: '#787B86', lineStyle: LightweightCharts.LineStyle.Dashed });
                    activeIndicators['rsi'] = { series: rsiSeries };
                }
            }
            indicatorDropdown.classList.remove('show');
        });
    }

    // --- Trend line drawing ---
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
                    const { line } = clickedLineInfo;
                    if (line !== selectedTrendLine) {
                        line.primitive.setSelected(true);
                        selectedTrendLine = line;
                    }
                    target.chart.applyOptions({ handleScroll: false, handleScale: false });
                    drawingState = 'moving';
                    moveState.isMoving = true;
                    moveState.targetLine = line;
                    moveState.moveType = clickedLineInfo.hitResult;
                    moveState.lastTime = time;
                    moveState.lastPrice = price;
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

    function onCrosshairMoved(param) {
        if (drawingState !== 'placing_point_2' || !param.point || !param.time || !currentDrawingTarget) return;
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
        if (p1Index === null || p2Index === null || lastTimeIndex === null || currentTimeIndex === null) return;
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
            target.chart.applyOptions({ handleScroll: true, handleScale: true });
            drawingState = 'idle';
            moveState.isMoving = false;
            moveState.targetLine = null;
            moveState.moveType = null;
            moveState.lastTime = null;
            moveState.lastPrice = null;
        }
    }

    function handleKeyDown(event) {
        if ((event.key === 'Delete' || event.key === 'Backspace') && selectedTrendLine) {
            candleSeries.detachPrimitive(selectedTrendLine.primitive);
            const index = drawnTrendLines.findIndex(line => line.primitive === selectedTrendLine.primitive);
            if (index > -1) drawnTrendLines.splice(index, 1);
            selectedTrendLine = null;
            chart.priceScale('').applyOptions({});
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
            if (previewTrendLine && currentDrawingTarget) {
                currentDrawingTarget.series.detachPrimitive(previewTrendLine);
            }
            previewTrendLine = null;
            currentDrawingTarget = null;
        }
        event.currentTarget.blur();
    });

    const chartContainer = document.getElementById('main-chart-container');
    const mainChartTarget = { chart, series: candleSeries, id: 'main' };
    chartContainer.addEventListener('mousedown', (e) => onChartMouseDown(e, mainChartTarget));
    chartContainer.addEventListener('mousemove', (e) => onChartMouseMove(e, mainChartTarget));
    chartContainer.addEventListener('mouseup', (e) => onChartMouseUp(e, mainChartTarget));
    chartContainer.addEventListener('mouseleave', (e) => onChartMouseUp(e, mainChartTarget));
    chart.subscribeCrosshairMove(onCrosshairMoved);
    window.addEventListener('keydown', handleKeyDown);

});

