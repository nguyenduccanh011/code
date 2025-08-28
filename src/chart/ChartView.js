// LightweightCharts facade to isolate chart wiring from app logic

export class ChartView {
  constructor({ mainContainer, rsiContainer, LightweightCharts }) {
    this._lib = LightweightCharts;
    this._mainChart = this._lib.createChart(mainContainer, {
      autoSize: true,
      layout: { background: { color: '#ffffff' }, textColor: '#333' },
      grid: { vertLines: { color: '#f0f3f5' }, horzLines: { color: '#f0f3f5' } },
      timeScale: { borderColor: '#ddd', timeVisible: true, secondsVisible: false, rightOffset: 50 },
      watermark: { color: 'rgba(200,200,200,0.4)', visible: true, text: 'VNINDEX', fontSize: 48, horzAlign: 'center', vertAlign: 'center' },
      crosshair: { mode: this._lib.CrosshairMode.Normal },
    });
    this._mainSeries = this._mainChart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' });
    this._volumeSeries = this._mainChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    this._mainChart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
  }

  mainChart() { return this._mainChart; }
  mainSeries() { return this._mainSeries; }
  volumeSeries() { return this._volumeSeries; }

  setWatermark(text) { this._mainChart.applyOptions({ watermark: { text } }); }
  setCandles(candles) { this._mainSeries.setData(candles); }
  setVolumeFromCandles(candles) {
    const volumeData = candles.map(c => ({ time: c.time, value: c.volume, color: c.close > c.open ? 'rgba(38,166,164,0.5)' : 'rgba(239,83,80,0.5)' }));
    this._volumeSeries.setData(volumeData);
  }
  setMarkers(markers) { this._mainSeries.setMarkers(markers || []); }
  timeScale() { return this._mainChart.timeScale(); }
  onCrosshairMove(fn) { this._mainChart.subscribeCrosshairMove(fn); }
}

