// File: TrendLinePrimitive.js

// Phần 1: Renderer - Chịu trách nhiệm vẽ lên canvas
class TrendLinePaneRenderer {
    constructor(source) {
        this._source = source;
        this._p1 = { x: null, y: null };
        this._p2 = { x: null, y: null };
    }

    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null) {
                return;
            }
            const ctx = scope.context;
            const x1 = Math.round(this._p1.x * scope.horizontalPixelRatio);
            const y1 = Math.round(this._p1.y * scope.verticalPixelRatio);
            const x2 = Math.round(this._p2.x * scope.horizontalPixelRatio);
            const y2 = Math.round(this._p2.y * scope.verticalPixelRatio);

            const isSelected = this._source._selected;
            const options = this._source._options;

            ctx.lineWidth = isSelected ? options.selectedWidth : options.width;
            ctx.strokeStyle = isSelected ? options.selectedLineColor : options.lineColor;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
    }

    updatePoints(p1, p2) {
        this._p1 = p1;
        this._p2 = p2;
    }
}

// Phần 2: PaneView - Chuyển đổi tọa độ (giá, thời gian) thành tọa độ pixel
class TrendLinePaneView {
    constructor(source) {
        this._source = source;
        this._p1 = { x: null, y: null };
        this._p2 = { x: null, y: null };
        this._renderer = new TrendLinePaneRenderer(this._source);
    }

    update() {
        const series = this._source._series;
        const timeScale = this._source._chart.timeScale();

        this._p1.y = series.priceToCoordinate(this._source._p1.price);
        this._p2.y = series.priceToCoordinate(this._source._p2.price);
        this._p1.x = timeScale.timeToCoordinate(this._source._p1.time);
        this._p2.x = timeScale.timeToCoordinate(this._source._p2.time);

        this._renderer.updatePoints(this._p1, this._p2);
    }

    renderer() {
        return this._renderer;
    }

    hitTest(x, y) {
        if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null) {
            return false;
        }

        const options = this._source._options;
        const x1 = this._p1.x;
        const y1 = this._p1.y;
        const x2 = this._p2.x;
        const y2 = this._p2.y;

        const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (L2 === 0) return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2) < options.hitTestThreshold;

        let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / L2;
        t = Math.max(0, Math.min(1, t));

        const dx = x - (x1 + t * (x2 - x1));
        const dy = y - (y1 + t * (y2 - y1));
        const distance = Math.sqrt(dx ** 2 + dy ** 2);

        return distance < options.hitTestThreshold;
    }
}

// Phần 3: Primitive - Đối tượng chính, chứa dữ liệu và logic
class TrendLine {
    constructor(chart, series, p1, p2, options) {
        this._chart = chart;
        this._series = series;
        this._p1 = p1;
        this._p2 = p2;
        this._selected = false;
        this._options = {
            lineColor: 'rgb(0, 0, 0)',
            width: 2,
            selectedLineColor: 'rgb(0, 0, 255)',
            selectedWidth: 3,
            hitTestThreshold: 5,
            ...options,
        };
        this._paneViews = [new TrendLinePaneView(this)];
    }

    updateAllViews() {
        this._paneViews.forEach(pw => pw.update());
    }

    paneViews() {
        return this._paneViews;
    }

    setSelected(selected) {
        this._selected = selected;
        // ▼▼▼ DÒNG SỬA LỖI NẰM Ở ĐÂY ▼▼▼
        // Yêu cầu biểu đồ vẽ lại để hiển thị thay đổi trạng thái
        this._chart.priceScale('').applyOptions({});
        // ▲▲▲ KẾT THÚC SỬA LỖI ▲▲▲
    }

    isSelected() {
        return this._selected;
    }

    hitTest(x, y) {
        return this._paneViews[0].hitTest(x, y);
    }

    autoscaleInfo(startTimePoint, endTimePoint) {
        const p1Coord = this._chart.timeScale().timeToCoordinate(this._p1.time);
        const p2Coord = this._chart.timeScale().timeToCoordinate(this._p2.time);
        if (p1Coord === null || p2Coord === null) return null;

        const p1Index = this._chart.timeScale().coordinateToLogical(p1Coord);
        const p2Index = this._chart.timeScale().coordinateToLogical(p2Coord);
        if (p1Index === null || p2Index === null) return null;

        const firstIndex = Math.min(p1Index, p2Index);
        const lastIndex = Math.max(p1Index, p2Index);
        if (endTimePoint < firstIndex || startTimePoint > lastIndex) return null;

        const minPrice = Math.min(this._p1.price, this._p2.price);
        const maxPrice = Math.max(this._p1.price, this._p2.price);

        return {
            priceRange: {
                minValue: minPrice,
                maxValue: maxPrice,
            },
        };
    }
}