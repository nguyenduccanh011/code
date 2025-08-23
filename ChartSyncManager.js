// File: ChartSyncManager.js

class ChartSyncManager {
    constructor() {
        this.charts = [];
        this.isSyncing = false; // Flag to prevent infinite loops
    }

    addChart(chart, series) {
        const chartRecord = { chart, series };
        this.charts.push(chartRecord);

        // --- Attach Listeners ---

        // 1. Crosshair Sync
        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time) {
                // When mouse leaves, clear all other charts
                this.charts.forEach(otherRecord => {
                    if (otherRecord.chart !== chart) {
                        otherRecord.chart.clearCrosshairPosition();
                    }
                });
                return;
            }

            // When mouse moves, update all other charts
            this.charts.forEach(otherRecord => {
                if (otherRecord.chart !== chart) {
                    otherRecord.chart.setCrosshairPosition(0, param.time, otherRecord.series);
                }
            });
        });

        // 2. Zoom/Pan Sync
        chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (this.isSyncing) return; // Exit if this event was triggered by the manager itself

            this.isSyncing = true; // Set the flag
            this.charts.forEach(otherRecord => {
                if (otherRecord.chart !== chart) {
                    otherRecord.chart.timeScale().setVisibleLogicalRange(range);
                }
            });
            this.isSyncing = false; // Unset the flag
        });
    }

    removeChart(chartToRemove) {
        this.charts = this.charts.filter(record => record.chart !== chartToRemove);
    }
}