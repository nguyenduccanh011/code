/* CP68 EOD demo v2: đọc nhanh từ dataset và tải thêm khi cuộn trái */
(function(){
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5000';
  const $ = s => document.querySelector(s);
  const symbolEl = $('#symbol');
  const btnDraw = $('#btn-draw');
  const logEl = $('#log');
  const infoTbody = $('#info');

  function setLog(s){ logEl.textContent = s; }
  async function fetchJSON(url){ const r = await fetch(url); return await r.json(); }

  function toCandleRows(arr){
    return arr.map(r => {
      const t = Math.floor(new Date(String(r.date)).getTime()/1000);
      return { time:t, open:+r.open, high:+r.high, low:+r.low, close:+r.close };
    }).filter(x => isFinite(x.open) && isFinite(x.high) && isFinite(x.low) && isFinite(x.close));
  }
  function summary(arr){ if(!arr||!arr.length) return {len:0,first:'',last:''}; return { len:arr.length, first:arr[0].date, last:arr[arr.length-1].date } }

  let chart, series, currentSym='', earliestDate=null, loadingOlder=false, dataCache=[];
  function createChart(){
    const chartEl = document.getElementById('chart'); chartEl.innerHTML='';
    chart = LightweightCharts.createChart(chartEl, { layout:{ background:{color:'#0b1020'}, textColor:'#dfe8ff' }, rightPriceScale:{ borderVisible:true }, timeScale:{ borderVisible:true }, grid:{ vertLines:{color:'#1c2748'}, horzLines:{color:'#1c2748'} } });
    series = chart.addCandlestickSeries({ upColor:'#4be3a4', downColor:'#ff7a7a', borderDownColor:'#ff7a7a', borderUpColor:'#4be3a4', wickDownColor:'#ff7a7a', wickUpColor:'#4be3a4' });
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
    earliestDate = arr[0].date || earliestDate;
  }

  btnDraw.addEventListener('click', async ()=>{
    const sym = (symbolEl.value||'').toUpperCase().trim(); if(!sym) return setLog('Nhập mã.');
    setLog('Đang tải đoạn cuối từ dataset...');
    createChart(); await loadLatest(sym); setLog('Hoàn tất. Cuộn trái để tải thêm.');
  });

  window.addEventListener('DOMContentLoaded', ()=>{ createChart(); const s=(symbolEl.value||'').toUpperCase().trim(); if(s) btnDraw.click(); });
})();
