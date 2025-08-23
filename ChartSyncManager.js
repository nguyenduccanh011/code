// File: ChartSyncManager.js

class ChartSyncManager {
    constructor() {
        this.charts = [];
        this.isSyncing = false;
    }

    addChart(chart, series) {
        const chartRecord = { chart, series };
        this.charts.push(chartRecord);

        // Manager sẽ quản lý cả hai loại đồng bộ
        chart.subscribeCrosshairMove(param => this._syncCrosshair(param, chart));
        chart.timeScale().subscribeVisibleLogicalRangeChange(range => this._syncTimeScale(range, chart));
    }
    
    _syncCrosshair(param, sourceChart) {
        if (!param.point || !param.time) {
            this.charts.forEach(rec => { if (rec.chart !== sourceChart) rec.chart.clearCrosshairPosition(); });
            return;
        }
        this.charts.forEach(rec => {
            if (rec.chart !== sourceChart) rec.chart.setCrosshairPosition(0, param.time, rec.series);
        });
    }

    _syncTimeScale(range, sourceChart) {
        if (this.isSyncing) return;

        this.isSyncing = true;
        this.charts.forEach(rec => {
            if (rec.chart !== sourceChart) {
                rec.chart.timeScale().setVisibleLogicalRange(range);
            }
        });

        // Kỹ thuật chống lặp hiệu quả hơn
        // Đặt isSyncing về false sau một khoảng thời gian cực ngắn
        // để tất cả các sự kiện "dội lại" được bỏ qua.
        setTimeout(() => {
            this.isSyncing = false;
        }, 0);
    }

    removeChart(chartToRemove) {
        this.charts = this.charts.filter(record => record.chart !== chartToRemove);
    }
}