// File: TrendLinePrimitive.js

// Phần 1: Renderer - Chịu trách nhiệm vẽ lên canvas
class TrendLinePaneRenderer {
    constructor(p1, p2, options) {
        this._p1 = p1;
        this._p2 = p2;
        this._options = options;
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

            ctx.lineWidth = this._options.width;
            ctx.strokeStyle = this._options.lineColor;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
    }
}

// Phần 2: PaneView - Chuyển đổi tọa độ (giá, thời gian) thành tọa độ pixel
class TrendLinePaneView {
    constructor(source) {
        this._source = source;
        this._p1 = { x: null, y: null };
        this._p2 = { x: null, y: null };
    }

    update() {
        const series = this._source._series;
        const timeScale = this._source._chart.timeScale();

        this._p1.y = series.priceToCoordinate(this._source._p1.price);
        this._p2.y = series.priceToCoordinate(this._source._p2.price);
        this._p1.x = timeScale.timeToCoordinate(this._source._p1.time);
        this._p2.x = timeScale.timeToCoordinate(this._source._p2.time);
    }

    renderer() {
        return new TrendLinePaneRenderer(this._p1, this._p2, this._source._options);
    }
}

// Phần 3: Primitive - Đối tượng chính, chứa dữ liệu và logic
class TrendLine {
    constructor(chart, series, p1, p2, options) {
        this._chart = chart;
        this._series = series;
        this._p1 = p1;
        this._p2 = p2;
        this._options = {
            lineColor: 'rgb(0, 0, 0)',
            width: 2,
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
    
    autoscaleInfo(startTimePoint, endTimePoint) {
        // Tự động điều chỉnh trục giá để đường vẽ luôn hiển thị
        const p1Index = this._chart.timeScale().timeToLogical(this._p1.time);
        const p2Index = this._chart.timeScale().timeToLogical(this._p2.time);

        if (p1Index === null || p2Index === null) return null;
        if (endTimePoint < p1Index || startTimePoint > p2Index) return null;

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