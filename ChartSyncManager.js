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

    // ▼▼▼ THAY ĐỔI HÀM NÀY ▼▼▼
    _syncCrosshair(param, sourceChart) {
        // Nếu cờ isSyncing đang bật, có nghĩa là hành động này là do chính manager
        // gây ra, nên chúng ta sẽ bỏ qua để tránh vòng lặp.
        if (this.isSyncing) return;

        this.isSyncing = true; // Bật cờ lên

        if (!param.point || !param.time) {
            this.charts.forEach(rec => { if (rec.chart !== sourceChart) rec.chart.clearCrosshairPosition(); });
        } else {
            this.charts.forEach(rec => {
                if (rec.chart !== sourceChart) {
                    // Ra lệnh cho các biểu đồ khác cập nhật
                    rec.chart.setCrosshairPosition(0, param.time, rec.series);
                }
            });
        }

        this.isSyncing = false; // Tắt cờ đi
    }
    // ▲▲▲ KẾT THÚC THAY ĐỔI ▲▲▲

    _syncTimeScale(range, sourceChart) {
        if (this.isSyncing) return;

        this.isSyncing = true;
        this.charts.forEach(rec => {
            if (rec.chart !== sourceChart) {
                rec.chart.timeScale().setVisibleLogicalRange(range);
            }
        });

        setTimeout(() => {
            this.isSyncing = false;
        }, 0);
    }

    removeChart(chartToRemove) {
        this.charts = this.charts.filter(record => record.chart !== chartToRemove);
    }
}