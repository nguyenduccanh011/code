// File: ATRIndicator.js
// Simple Average True Range indicator for volatility measurement

class ATRIndicator {
    constructor(atrChartElement, options = { period: 14, color: 'rgba(200, 150, 0, 1)' }) {
        this.container = atrChartElement;
        this.chart = null;
        this.series = null;
        this.period = options.period;
        this.color = options.color;
    }

    calculate(data) {
        const period = this.period;
        const atrData = [];
        if (data.length < period + 1) return atrData;

        const trueRanges = [];
        for (let i = 1; i < data.length; i++) {
            const high = data[i].high;
            const low = data[i].low;
            const prevClose = data[i - 1].close;
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }

        // initial ATR
        let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
        atrData.push({ time: data[period].time, value: atr });

        for (let i = period + 1; i < data.length; i++) {
            atr = ((atr * (period - 1)) + trueRanges[i - 1]) / period;
            atrData.push({ time: data[i].time, value: atr });
        }
        return atrData;
    }

    addToChart(data) {
        this.container.style.display = 'block';
        this.chart = LightweightCharts.createChart(this.container, {
            height: 100,
            timeScale: { visible: false },
            priceScale: { position: 'right' },
            layout: { background: { color: '#ffffff' }, textColor: '#333' }
        });
        this.series = this.chart.addLineSeries({ color: this.color, lineWidth: 2 });
        this.update(data);
    }

    update(data) {
        if (!this.series) return;
        const calculated = this.calculate(data);
        const finalData = [];
        let idx = 0;
        for (let i = 0; i < data.length; i++) {
            if (idx < calculated.length && data[i].time === calculated[idx].time) {
                finalData.push(calculated[idx]);
                idx++;
            } else {
                finalData.push({ time: data[i].time, value: undefined });
            }
        }
        this.series.setData(finalData);
    }

    setOptions(options = {}, data = []) {
        if (options.period !== undefined) {
            this.period = options.period;
        }
        if (options.color !== undefined) {
            this.color = options.color;
            if (this.series) {
                this.series.applyOptions({ color: this.color });
            }
        }
        if (data.length > 0) {
            this.update(data);
        }
    }

    remove() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
        this.container.style.display = 'none';
    }
}

export { ATRIndicator };
