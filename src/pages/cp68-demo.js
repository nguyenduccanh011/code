/* CP68 EOD demo v2: đọc nhanh từ dataset và tải thêm khi cuộn trái */
(function(){
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5000';
  const $ = s => document.querySelector(s);
  const symbolEl = $('#symbol');
  const btnDraw = $('#btn-draw');
  const logEl = $('#log');
  const infoTbody = $('#info');
  const optMA = $('#opt-ma');
  const maPeriodEl = $('#ma-period');
  const optMACD = $('#opt-macd');
  const macdFastEl = $('#macd-fast');
  const macdSlowEl = $('#macd-slow');
  const macdSignalEl = $('#macd-signal');

  function setLog(s){ logEl.textContent = s; }
  async function fetchJSON(url){ const r = await fetch(url); return await r.json(); }

  function toCandleRows(arr){
    return arr.map(r => {
      const t = Math.floor(new Date(String(r.date)).getTime()/1000);
      return { time:t, open:+r.open, high:+r.high, low:+r.low, close:+r.close };
    }).filter(x => isFinite(x.open) && isFinite(x.high) && isFinite(x.low) && isFinite(x.close));
  }
  function summary(arr){ if(!arr||!arr.length) return {len:0,first:'',last:''}; return { len:arr.length, first:arr[0].date, last:arr[arr.length-1].date } }

  let chart, series, maSeries, macdChart, macdLine, signalLine, histSeries;
  let currentSym='', earliestDate=null, loadingOlder=false, dataCache=[];
  function createChart(){
    const chartEl = document.getElementById('chart'); chartEl.innerHTML='';
    chart = LightweightCharts.createChart(chartEl, { layout:{ background:{color:'#0b1020'}, textColor:'#dfe8ff' }, rightPriceScale:{ borderVisible:true }, timeScale:{ borderVisible:true }, grid:{ vertLines:{color:'#1c2748'}, horzLines:{color:'#1c2748'} } });
    series = chart.addCandlestickSeries({ upColor:'#4be3a4', downColor:'#ff7a7a', borderDownColor:'#ff7a7a', borderUpColor:'#4be3a4', wickDownColor:'#ff7a7a', wickUpColor:'#4be3a4' });
    maSeries = chart.addLineSeries({ color:'#ffd166', lineWidth:2 });
    chart.timeScale().subscribeVisibleLogicalRangeChange(async (r)=>{ if(!r||loadingOlder) return; if(r.from<5){ loadingOlder=true; try{ await loadOlderChunk(); } finally{ loadingOlder=false; } } });
  }

  const CHUNK=300;
  async function loadLatest(sym){
    const p = new URLSearchParams({ symbol:sym, limit:String(CHUNK) });
    const arr = await fetchJSON(`${base}/api/dataset/candles?${p.toString()}`);
    infoTbody.innerHTML='';
    const {len,first,last} = summary(arr);
    infoTbody.innerHTML = `<tr><td>${sym}</td><td>${len}</td><td>${first}</td><td>${last}</td></tr>`;
    dataCache = toCandleRows(arr);
    series.setData(dataCache);
    drawMA();
    setupMACD();
    chart.timeScale().scrollToRealTime();
    currentSym = sym; earliestDate = first || null;
  }
  async function loadOlderChunk(){
    if(!currentSym||!earliestDate) return;
    const d=new Date(earliestDate); d.setDate(d.getDate()-1); const to=d.toISOString().slice(0,10);
    const p=new URLSearchParams({ symbol:currentSym, to, limit:String(CHUNK) });
    const arr = await fetchJSON(`${base}/api/dataset/candles?${p.toString()}`);
    if(!arr||!arr.length) return;
    const older = toCandleRows(arr);
    dataCache = older.concat(dataCache);
    series.setData(dataCache);
    drawMA();
    updateMACD();
    earliestDate = arr[0].date || earliestDate;
  }

  btnDraw.addEventListener('click', async ()=>{
    const sym = (symbolEl.value||'').toUpperCase().trim(); if(!sym) return setLog('Nhập mã.');
    setLog('Đang tải đoạn cuối từ dataset...');
    createChart(); await loadLatest(sym); setLog('Hoàn tất. Cuộn trái để tải thêm.');
  });
  symbolEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ btnDraw.click(); }});

  window.addEventListener('DOMContentLoaded', ()=>{ createChart(); const s=(symbolEl.value||'').toUpperCase().trim(); if(s) btnDraw.click(); });

  // ========== Indicators (MA + MACD) ==========
  function drawMA(){
    if (!optMA.checked){ maSeries.setData([]); return; }
    const period = Math.max(1, parseInt(maPeriodEl.value||'20',10));
    const out = [];
    let sum = 0; const q=[];
    for (const c of dataCache){
      q.push(c.close); sum += c.close; if(q.length>period){ sum -= q.shift(); }
      if(q.length===period){ out.push({ time:c.time, value: sum/period }); }
    }
    maSeries.setData(out);
  }
  maPeriodEl.addEventListener('change', drawMA);
  optMA.addEventListener('change', drawMA);

  function setupMACD(){
    const panel = document.getElementById('macd-panel');
    if (!optMACD.checked){ panel.style.display='none'; return; }
    panel.style.display='block';
    const el = document.getElementById('chart-macd'); el.innerHTML='';
    macdChart = LightweightCharts.createChart(el, { layout:{ background:{color:'#0b1020'}, textColor:'#dfe8ff' }, rightPriceScale:{ borderVisible:true }, timeScale:{ borderVisible:true }, grid:{ vertLines:{ color:'#1c2748' }, horzLines:{ color:'#1c2748' } } });
    macdLine = macdChart.addLineSeries({ color:'#00d1ff' });
    signalLine = macdChart.addLineSeries({ color:'#ffb703' });
    histSeries = macdChart.addHistogramSeries({ color:'#888', base:0 });
    updateMACD();
  }
  function ema(arr, period){ const k=2/(period+1); let ema=null; const out=[]; for(const x of arr){ if(ema===null){ ema=x; } else { ema = x*k + ema*(1-k); } out.push(ema); } return out; }
  function updateMACD(){
    if (!optMACD.checked || !dataCache.length) return;
    const fast = Math.max(1, parseInt(macdFastEl.value||'12',10));
    const slow = Math.max(1, parseInt(macdSlowEl.value||'26',10));
    const signalP = Math.max(1, parseInt(macdSignalEl.value||'9',10));
    const closes = dataCache.map(c=>c.close);
    const times = dataCache.map(c=>c.time);
    const emaFast = ema(closes, fast);
    const emaSlow = ema(closes, slow);
    const macd = emaFast.map((v,i)=> v - (emaSlow[i]||v));
    const signal = ema(macd, signalP);
    const hist = macd.map((v,i)=> v - (signal[i]||v));
    const macdData = macd.map((v,i)=> ({ time: times[i], value: v }));
    const sigData = signal.map((v,i)=> ({ time: times[i], value: v }));
    const histData = hist.map((v,i)=> ({ time: times[i], value: v, color: v>=0 ? '#4be3a4' : '#ff7a7a' }));
    macdLine.setData(macdData); signalLine.setData(sigData); histSeries.setData(histData);
  }
  optMACD.addEventListener('change', setupMACD);
  macdFastEl.addEventListener('change', updateMACD);
  macdSlowEl.addEventListener('change', updateMACD);
  macdSignalEl.addEventListener('change', updateMACD);
})();
