class MAIndicator {
    constructor(mainChart, options = { period: 9, color: 'rgba(41, 98, 255, 1)' }) {
        this.mainChart = mainChart;
        this.options = options;
        this.series = null;
    }

    calculate(data) {
        const period = this.options.period;
        const maData = [];
        if (data.length < period) return maData;
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            maData.push({ time: data[i].time, value: sum / period });
        }
        return maData;
    }

    addToChart(data) {
        this.series = this.mainChart.addLineSeries({
            color: this.options.color,
            lineWidth: 2,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        this.update(data);
    }

    update(data) {
        if (!this.series) return;
        const maData = this.calculate(data);
        this.series.setData(maData);
    }

    setOptions(options = {}, data = []) {
        if (options.period !== undefined) {
            this.options.period = options.period;
        }
        if (options.color !== undefined) {
            this.options.color = options.color;
            if (this.series) {
                this.series.applyOptions({ color: this.options.color });
            }
        }
        if (data.length > 0) {
            this.update(data);
        }
    }

    remove() {
        if (this.series) {
            this.mainChart.removeSeries(this.series);
            this.series = null;
        }
    }
}
