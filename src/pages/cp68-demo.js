/* CP68 EOD demo v2: Ä‘á»c nhanh tá»« dataset vÃ  táº£i thÃªm khi cuá»™n trÃ¡i */
(function(){
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5000';
  const $ = s => document.querySelector(s);
  const symbolEl = $('#symbol');
  const btnDraw = $('#btn-draw');
  const logEl = $('#log');
  const infoTbody = $('#info');
  const optMA = $('#opt-ma');
  const maPeriodEl = $('#ma-period');
  const optMA2 = $('#opt-ma2');
  const ma2PeriodEl = $('#ma2-period');
  const optMA3 = $('#opt-ma3');
  const ma3PeriodEl = $('#ma3-period');
  const optBB = $('#opt-bb');
  const bbPeriodEl = $('#bb-period');
  const bbDevEl = $('#bb-dev');
  const optMACD = $('#opt-macd');
  const macdFastEl = $('#macd-fast');
  const macdSlowEl = $('#macd-slow');
  const macdSignalEl = $('#macd-signal');
  const optRSI = $('#opt-rsi');
  const rsiPeriodEl = $('#rsi-period');

  function setLog(s){ logEl.textContent = s; }
  async function fetchJSON(url){ const r = await fetch(url); return await r.json(); }

  function toCandleRows(arr){
    return arr.map(r => {
      const t = Math.floor(new Date(String(r.date)).getTime()/1000);
      return { time:t, open:+r.open, high:+r.high, low:+r.low, close:+r.close };
    }).filter(x => isFinite(x.open) && isFinite(x.high) && isFinite(x.low) && isFinite(x.close));
  }
  // Convert CP68 epoch-seconds candles to index-style time objects used by indicator classes
  function toIndexTimeRows(rows){
    return (rows||[]).map(r => {
      const d = new Date((r.time||0) * 1000);
      return {
        time: { year: d.getFullYear(), month: d.getMonth()+1, day: d.getDate() },
        open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume
      };
    });
  }
  function summary(arr){ if(!arr||!arr.length) return {len:0,first:'',last:''}; return { len:arr.length, first:arr[0].date, last:arr[arr.length-1].date } }

  let chart, series, maSeries, ma2Series, ma3Series, bbUpper, bbMiddle, bbLower;
  let macdChart, macdLine, signalLine, histSeries;
  let rsiChart, rsiLine, rsi30, rsi70;
  let currentSym='', earliestDate=null, loadingOlder=false, dataCache=[];
  const indDropdown = document.getElementById('ind-dropdown');
  const btnIndicators = document.getElementById('btn-indicators');
  const indActive = document.getElementById('ind-active');
  const palette = ['#ffd166','#06d6a0','#118ab2','#ef476f','#ffb703','#8ecae6','#e07a5f'];
  let indCount=0;
  const indicators = []; // {id,type,params,series:[], scale: 'left'|'right'}
  // Initialize real sync manager if available; else fallback to no-op
  try {
    if (typeof window !== 'undefined'){
      window.syncManager = (window.ChartSyncManager) ? new window.ChartSyncManager() : { addChart: ()=>{}, removeChart: ()=>{} };
      if (!window.onChartMouseDown) window.onChartMouseDown = ()=>{};
      if (!window.onCrosshairMoved) window.onCrosshairMoved = ()=>{};
    }
  } catch(_){}
  function createChart(){
    const chartEl = document.getElementById('chart'); chartEl.innerHTML='';
    chart = LightweightCharts.createChart(chartEl, { layout:{ background:{color:'#0b1020'}, textColor:'#dfe8ff' }, rightPriceScale:{ borderVisible:true }, leftPriceScale:{ visible:false, borderVisible:true }, timeScale:{ borderVisible:true }, grid:{ vertLines:{color:'#1c2748'}, horzLines:{color:'#1c2748'} } });
    series = chart.addCandlestickSeries({ upColor:'#4be3a4', downColor:'#ff7a7a', borderDownColor:'#ff7a7a', borderUpColor:'#4be3a4', wickDownColor:'#ff7a7a', wickUpColor:'#4be3a4' });
    try { if (window.syncManager) window.syncManager.addChart(chart, series); } catch(_) {}
    maSeries = chart.addLineSeries({ color:'#ffd166', lineWidth:2 });
    ma2Series = chart.addLineSeries({ color:'#06d6a0', lineWidth:2 });
    ma3Series = chart.addLineSeries({ color:'#118ab2', lineWidth:2 });
    bbUpper = chart.addLineSeries({ color:'#a8dadc', lineWidth:1 });
    bbMiddle = chart.addLineSeries({ color:'#457b9d', lineWidth:1 });
    bbLower = chart.addLineSeries({ color:'#a8dadc', lineWidth:1 });
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
    drawMA(); drawMA2(); drawMA3(); drawBB();
    setupMACD(); setupRSI();
    recomputeCustomIndicators();
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
    drawMA(); drawMA2(); drawMA3(); drawBB();
    updateMACD(); updateRSI();
    recomputeCustomIndicators();
    earliestDate = arr[0].date || earliestDate;
  }

  btnDraw.addEventListener('click', async ()=>{
    const sym = (symbolEl.value||'').toUpperCase().trim(); if(!sym) return setLog('Nháº­p mÃ£.');
    setLog('Äang táº£i Ä‘oáº¡n cuá»‘i tá»« dataset...');
    createChart(); await loadLatest(sym); setLog('HoÃ n táº¥t. Cuá»™n trÃ¡i Ä‘á»ƒ táº£i thÃªm.');
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

  function drawMA2(){
    if (!optMA2.checked){ ma2Series.setData([]); return; }
    const period = Math.max(1, parseInt(ma2PeriodEl.value||'50',10));
    const out = []; let sum=0; const q=[];
    for(const c of dataCache){ q.push(c.close); sum+=c.close; if(q.length>period){ sum-=q.shift(); } if(q.length===period){ out.push({ time:c.time, value: sum/period }); } }
    ma2Series.setData(out);
  }
  ma2PeriodEl.addEventListener('change', drawMA2);
  optMA2.addEventListener('change', drawMA2);

  function drawMA3(){
    if (!optMA3.checked){ ma3Series.setData([]); return; }
    const period = Math.max(1, parseInt(ma3PeriodEl.value||'200',10));
    const out = []; let sum=0; const q=[];
    for(const c of dataCache){ q.push(c.close); sum+=c.close; if(q.length>period){ sum-=q.shift(); } if(q.length===period){ out.push({ time:c.time, value: sum/period }); } }
    ma3Series.setData(out);
  }
  ma3PeriodEl.addEventListener('change', drawMA3);
  optMA3.addEventListener('change', drawMA3);

  function drawBB(){
    if (!optBB.checked){ bbUpper.setData([]); bbMiddle.setData([]); bbLower.setData([]); return; }
    const period = Math.max(1, parseInt(bbPeriodEl.value||'20',10));
    const dev = Math.max(0.1, parseFloat(bbDevEl.value||'2'));
    const outMid=[], outUp=[], outDn=[];
    let sum=0; const win=[];
    for(const c of dataCache){
      win.push(c.close); sum+=c.close; if(win.length>period){ sum-=win.shift(); }
      if(win.length===period){
        const mean = sum/period; const variance = win.reduce((acc,v)=>acc+(v-mean)*(v-mean),0)/period; const sd = Math.sqrt(variance);
        outMid.push({ time:c.time, value: mean });
        outUp.push({ time:c.time, value: mean + dev*sd });
        outDn.push({ time:c.time, value: mean - dev*sd });
      }
    }
    bbMiddle.setData(outMid); bbUpper.setData(outUp); bbLower.setData(outDn);
  }
  bbPeriodEl.addEventListener('change', drawBB);
  bbDevEl.addEventListener('change', drawBB);
  optBB.addEventListener('change', drawBB);

  function setupMACD(){
    const panel = document.getElementById('macd-panel');
    if (!panel) return;
    panel.style.display = 'block';
    const el = document.getElementById('chart-macd');
    if (!el) return;
    el.innerHTML = '';
    macdChart = LightweightCharts.createChart(el, { layout:{ background:{color:'#0b1020'}, textColor:'#dfe8ff' }, rightPriceScale:{ borderVisible:true }, timeScale:{ borderVisible:true }, grid:{ vertLines:{ color:'#1c2748' }, horzLines:{ color:'#1c2748' } } });
    macdLine = macdChart.addLineSeries({ color:'#00d1ff' });
    signalLine = macdChart.addLineSeries({ color:'#ffb703' });
    histSeries = macdChart.addHistogramSeries({ base:0 });
    updateMACD();
  }
  function ema(arr, period){ const k=2/(period+1); let ema=null; const out=[]; for(const x of arr){ if(ema===null){ ema=x; } else { ema = x*k + ema*(1-k); } out.push(ema); } return out; }
  function updateMACD(){
    if (!dataCache.length) return;
    if (!macdLine || !signalLine || !histSeries) return; // chart not initialized yet
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
    try { macdLine.setData(macdData); signalLine.setData(sigData); histSeries.setData(histData); } catch(_) {}
  }
  optMACD.addEventListener('change', setupMACD);
  macdFastEl.addEventListener('change', updateMACD);
  macdSlowEl.addEventListener('change', updateMACD);
  macdSignalEl.addEventListener('change', updateMACD);

  // RSI
  function setupRSI(){
    const panel = document.getElementById('rsi-panel');
    if (!panel) return;
    panel.style.display='block';
    const el = document.getElementById('chart-rsi');
    if (!el) return;
    el.innerHTML='';
    rsiChart = LightweightCharts.createChart(el, { layout:{ background:{color:'#0b1020'}, textColor:'#dfe8ff' }, rightPriceScale:{ borderVisible:true }, timeScale:{ borderVisible:true }, grid:{ vertLines:{ color:'#1c2748' }, horzLines:{ color:'#1c2748' } } });
    rsiLine = rsiChart.addLineSeries({ color:'#8ecae6' });
    rsi30 = rsiChart.addLineSeries({ color:'#555' });
    rsi70 = rsiChart.addLineSeries({ color:'#555' });
    updateRSI();
  }
  function updateRSI(){
    if (!dataCache.length) return;
    if (!rsiLine || !rsi30 || !rsi70) return; // chart not initialized yet
    const period = Math.max(1, parseInt(rsiPeriodEl.value||'14',10));
    const closes = dataCache.map(c=>c.close);
    const times = dataCache.map(c=>c.time);
    // Wilder RSI
    const rsiVals=[]; let gain=0, loss=0;
    for(let i=1;i<closes.length;i++){
      const ch = closes[i]-closes[i-1];
      const g = ch>0?ch:0; const l = ch<0?(-ch):0;
      if(i<=period){ gain+=g; loss+=l; if(i===period){ const ag=gain/period, al=loss/period; const rs = al===0?100:(ag/(al||1)); rsiVals.push({i, val: al===0?100:100-(100/(1+rs))}); } }
      else{
        const prev = rsiVals[rsiVals.length-1]; // not used for Wilder directly but kept
        gain = (gain*(period-1)+g)/period; loss = (loss*(period-1)+l)/period; const rs = loss===0?100:(gain/(loss||1)); rsiVals.push({i, val: loss===0?100:100-(100/(1+rs))});
      }
    }
    const rsiData = rsiVals.map(o=> ({ time: times[o.i], value: o.val }));
    try { rsiLine.setData(rsiData); } catch(_) {}
    const lvl30 = rsiData.map(d=> ({ time:d.time, value:30 }));
    const lvl70 = rsiData.map(d=> ({ time:d.time, value:70 }));
    try { rsi30.setData(lvl30); rsi70.setData(lvl70); } catch(_) {}
  }
  optRSI.addEventListener('change', setupRSI);
  rsiPeriodEl.addEventListener('change', updateRSI);

  // ======= Indicator dropdown (add/remove unlimited MA etc.) =======
  btnIndicators.addEventListener('click', ()=>{
    indDropdown.style.display = indDropdown.style.display==='none' || !indDropdown.style.display ? 'block' : 'none';
  });
  document.addEventListener('click',(e)=>{ if(!e.target.closest('#btn-indicators') && !e.target.closest('#ind-dropdown')) indDropdown.style.display='none'; });
  indDropdown.addEventListener('click',(e)=>{
    const btn = e.target.closest('.ind-item'); if(!btn) return; const type = btn.dataset.type;
    if(type==='ma') addCustomMA();
    if(type==='bb') addCustomBB();
    if(type==='rsi') addCustomRSI();
    if(type==='macd') addCustomMACD();
    indDropdown.style.display='none';
  });

  function addBadge(ind){
  const el = document.createElement('span');
  el.style.cssText='background:#20304f;color:#cfe6ff;padding:2px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;position:relative;';
  const label = document.createElement('span');
  const pretty = (t)=> (t==='rsi-panel' ? 'RSI' : (t==='macd-panel' ? 'MACD' : t.toUpperCase()));
  label.textContent = `${pretty(ind.type)}${ind.params && ind.params.period? '('+ind.params.period+')':''}`;
  const gear = document.createElement('button'); gear.textContent='⚙'; gear.title='Sửa'; gear.style.cssText='background:transparent;border:0;color:#9fc1ff;cursor:pointer;';
  const rm = document.createElement('button'); rm.textContent='×'; rm.style.cssText='background:transparent;border:0;color:#ff7a7a;cursor:pointer;';
  const dialog = document.createElement('div');
  dialog.style.cssText='position:absolute;top:26px;left:0;display:none;flex-direction:column;gap:6px;background:#0f1633;border:1px solid #26304f;border-radius:8px;padding:8px;z-index:40;';

  if (ind.type==='ma'){
    dialog.innerHTML = `
      <label style="display:flex;gap:6px;align-items:center">Chu kỳ:<input type="number" min="1" value="${ind.params.period||9}" style="width:80px"></label>
      <label style="display:flex;gap:6px;align-items:center">Màu:<input type="color" value="${ind.params.color||'#2962FF'}"></label>
      <div style="display:flex;gap:6px;justify-content:flex-end"><button class="ok">OK</button><button class="cancel">Hủy</button></div>`;
    gear.addEventListener('click',(e)=>{ e.stopPropagation(); dialog.style.display = dialog.style.display==='flex'?'none':'flex'; });
    dialog.querySelector('.ok').addEventListener('click',()=>{
      const p = parseInt(dialog.querySelector('input[type="number"]').value||'9',10);
      const color = dialog.querySelector('input[type="color"]').value;
      ind.params.period = Math.max(1,p);
      ind.params.color = color || ind.params.color;
      if (ind.instance && typeof ind.instance.setOptions === 'function'){
        try { ind.instance.setOptions({ period: ind.params.period, color: ind.params.color }, toIndexTimeRows(dataCache)); } catch(_) {}
      } else if (ind.series && ind.series[0] && color){
        try{ ind.series[0].applyOptions({ color }); }catch{}
        try{ recomputeIndicator(ind); }catch{}
      } else {
        try{ recomputeIndicator(ind); }catch{}
      }
      label.textContent = `${pretty(ind.type)}(${ind.params.period})`;
      dialog.style.display='none';
    });
    dialog.querySelector('.cancel').addEventListener('click',()=> dialog.style.display='none');
  } else if (ind.type==='rsi-panel'){
    dialog.innerHTML = `
      <label style="display:flex;gap:6px;align-items:center">Period:<input type="number" min="1" value="${ind.params.period||14}" style="width:80px"></label>
      <div style="display:flex;gap:6px;justify-content:flex-end"><button class="ok">OK</button><button class="cancel">Hủy</button></div>`;
    gear.addEventListener('click',(e)=>{ e.stopPropagation(); dialog.style.display = dialog.style.display==='flex'?'none':'flex'; });
    dialog.querySelector('.ok').addEventListener('click',()=>{
      const p = parseInt(dialog.querySelector('input[type="number"]').value||'14',10);
      ind.params.period = Math.max(1,p);
      label.textContent = `RSI(${ind.params.period})`;
      try{ if (rsiPeriodEl) rsiPeriodEl.value = ind.params.period; updateRSI(); }catch{}
      dialog.style.display='none';
    });
    dialog.querySelector('.cancel').addEventListener('click',()=> dialog.style.display='none');
  } else if (ind.type==='macd-panel'){
    dialog.innerHTML = `
      <label style="display:flex;gap:6px;align-items:center">Fast:<input type="number" min="1" value="${(ind.params.fast||12)}" style="width:70px"></label>
      <label style="display:flex;gap:6px;align-items:center">Slow:<input type="number" min="1" value="${(ind.params.slow||26)}" style="width:70px"></label>
      <label style="display:flex;gap:6px;align-items:center">Signal:<input type="number" min="1" value="${(ind.params.signal||9)}" style="width:70px"></label>
      <div style="display:flex;gap:6px;justify-content:flex-end"><button class="ok">OK</button><button class="cancel">Hủy</button></div>`;
    gear.addEventListener('click',(e)=>{ e.stopPropagation(); dialog.style.display = dialog.style.display==='flex'?'none':'flex'; });
    dialog.querySelector('.ok').addEventListener('click',()=>{
      const fast = parseInt(dialog.querySelectorAll('input')[0].value||'12',10);
      const slow = parseInt(dialog.querySelectorAll('input')[1].value||'26',10);
      const sig  = parseInt(dialog.querySelectorAll('input')[2].value||'9',10);
      ind.params.fast=fast; ind.params.slow=slow; ind.params.signal=sig;
      label.textContent = 'MACD';
      try{ if (macdFastEl){ macdFastEl.value = fast; macdSlowEl.value = slow; macdSignalEl.value = sig; updateMACD(); } }catch{}
      dialog.style.display='none';
    });
    dialog.querySelector('.cancel').addEventListener('click',()=> dialog.style.display='none');
  } else {
    gear.style.display='none';
  }

  rm.addEventListener('click',()=>{ removeIndicator(ind.id); });
  el.append(label, gear, rm);
  el.appendChild(dialog);
  ind.badge = el; indActive.appendChild(el);
}
  function removeIndicator(id){
    const idx = indicators.findIndex(x=>x.id===id); if(idx<0) return; const ind=indicators[idx];
    // Prefer class-backed cleanup
    if (ind.instance && typeof ind.instance.remove === 'function'){
      try { ind.instance.remove(); } catch(_) {}
    } else {
      (ind.series||[]).forEach(s=>{ try{ chart.removeSeries(s);}catch{} });
    if(ind.type==='rsi-panel'){
      try{ if (optRSI) optRSI.checked=false; }catch{}
      try{ const panel = document.getElementById('rsi-panel'); if (panel) panel.style.display='none'; }catch{}
    }
    if(ind.type==='macd-panel'){
      try{ if (optMACD) optMACD.checked=false; }catch{}
      try{ const panel = document.getElementById('macd-panel'); if (panel) panel.style.display='none'; }catch{}
    }
    }
    if(ind.badge) ind.badge.remove(); indicators.splice(idx,1);
    toggleLeftScale(); if (typeof updateIndicatorButtonCount==='function') try{ updateIndicatorButtonCount(); }catch{}
  }
  function toggleLeftScale(){
    const anyLeft = indicators.some(x=>x.scale==='left');
    chart.applyOptions({ leftPriceScale: { visible: anyLeft } });
  }
  function addCustomMA(){
    const period = parseInt(prompt('Kỳ MA?', '20')||'20',10); if(!period||period<1) return;
    const color = palette[indCount++ % palette.length];
    const idxData = toIndexTimeRows(dataCache);
    const inst = new MAIndicator(chart, { period, color });
    try { inst.addToChart(idxData); } catch(_) {}
    const ind = { id: 'ma_'+Date.now(), type:'ma', params:{period,color}, series:[inst.series], scale:'right', instance: inst };
    indicators.push(ind); addBadge(ind);
  }
  function addCustomBB(){
    const period = parseInt(prompt('Period BB?', '20')||'20',10); if(!period||period<1) return;
    const dev = parseFloat(prompt('Std dev?', '2')||'2');
    const idxData = toIndexTimeRows(dataCache);
    const inst = new BollingerBandsIndicator(chart, { period, stdDev: dev });
    try { inst.addToChart(idxData); } catch(_) {}
    const ind = { id: 'bb_'+Date.now(), type:'bb', params:{period,dev}, series:[inst.upperBandSeries, inst.middleBandSeries, inst.lowerBandSeries].filter(Boolean), scale:'right', instance: inst };
    indicators.push(ind); addBadge(ind);
  }
  function addCustomRSI(){
    try{ if (optRSI) optRSI.checked = true; }catch{}
    const panel = document.getElementById('rsi-panel'); if (panel) panel.style.display='block';
    const host = document.getElementById('chart-rsi');
    const period = parseInt((rsiPeriodEl && rsiPeriodEl.value) || '14', 10);
    const inst = new RSIIndicator(host, chart, series, { period });
    try { inst.addToChart(toIndexTimeRows(dataCache)); } catch(_) {}
    const ind = { id:'rsi_panel', type:'rsi-panel', params:{ period }, series:[], scale:'left', instance: inst };
    if(!indicators.find(x=>x.id===ind.id)){ indicators.push(ind); addBadge(ind); }
  }
function addCustomMACD(){
  try{ if (optMACD) optMACD.checked = true; }catch{}
  const panel = document.getElementById('macd-panel'); if (panel) panel.style.display='block';
  const host = document.getElementById('chart-macd');
  const fast = parseInt((macdFastEl && macdFastEl.value) || '12', 10);
  const slow = parseInt((macdSlowEl && macdSlowEl.value) || '26', 10);
  const signal = parseInt((macdSignalEl && macdSignalEl.value) || '9', 10);
  const inst = new MACDIndicator(host, chart, series, { fastPeriod: fast, slowPeriod: slow, signalPeriod: signal });
  try { inst.addToChart(toIndexTimeRows(dataCache)); } catch(_) {}
  const ind = { id:'macd_panel', type:'macd-panel', params:{ fast, slow, signal }, series:[], scale:'left', instance: inst };
  if(!indicators.find(x=>x.id===ind.id)){ indicators.push(ind); addBadge(ind); }
}
  function recomputeCustomIndicators(){ indicators.forEach(recomputeIndicator); }
  function recomputeIndicator(ind){
    if (!dataCache.length) return;
    // If backed by shared class, let it update using index-format data
    if (ind.instance && typeof ind.instance.update === 'function'){
      try { ind.instance.update(toIndexTimeRows(dataCache)); return; } catch(_) {}
    }
    if(ind.type==='rsi'){
      const p = Math.max(1, ind.params.period); const closes=dataCache.map(c=>c.close); const times=dataCache.map(c=>c.time); const r=[]; let gain=0,loss=0;
      for(let i=1;i<closes.length;i++){ const ch=closes[i]-closes[i-1]; const g=ch>0?ch:0; const l=ch<0?(-ch):0; if(i<=p){ gain+=g; loss+=l; if(i===p){ const ag=gain/p, al=loss/p; const rs=al===0?100:(ag/(al||1)); r.push({i,val: al===0?100:100-(100/(1+rs))}); } } else { gain=(gain*(p-1)+g)/p; loss=(loss*(p-1)+l)/p; const rs=loss===0?100:(gain/(loss||1)); r.push({i,val: loss===0?100:100-(100/(1+rs))}); } }
      const data = r.map(o=>({ time:times[o.i], value:o.val }));
      const lvl30 = data.map(d=>({ time:d.time, value:30 })); const lvl70 = data.map(d=>({ time:d.time, value:70 }));
      ind.series[0].setData(data); ind.series[1].setData(lvl30); ind.series[2].setData(lvl70);
     } else if(ind.type==='macd'){
      const f=Math.max(1, ind.params.fast), s=Math.max(1, ind.params.slow), sig=Math.max(1, ind.params.signal);
      const closes=dataCache.map(c=>c.close); const times=dataCache.map(c=>c.time);
      const emaF = ema(closes, f); const emaS = ema(closes, s); const macd=emaF.map((v,i)=> v-(emaS[i]||v)); const signal=ema(macd, sig); const hist=macd.map((v,i)=> v-(signal[i]||v));
      ind.series[0].setData(macd.map((v,i)=>({ time:times[i], value:v })));
      ind.series[1].setData(signal.map((v,i)=>({ time:times[i], value:v })));
     ind.series[2].setData(hist.map((v,i)=>({ time:times[i], value:v, color:v>=0?'#4be3a4':'#ff7a7a' })));
    }
  }
})();

// ==== Enhancements: MA dialog, indicator count, and search suggestions ====
(function(){
  if (!window.__cp68Enhanced) window.__cp68Enhanced = true; else return;
  const btnIndicators = document.getElementById('btn-indicators');
  const indActive = document.getElementById('ind-active');
  const suggestionsEl = document.getElementById('cp68-search-suggestions');
  const symbolEl = document.getElementById('symbol');
  const btnDraw = document.getElementById('btn-draw');
  const dataProvider = new (window.DataProvider || function(){})();
  let allCompanies = [];

  function updateIndicatorButtonCount(){
    try{ const n = (typeof indicators!=='undefined' && indicators) ? indicators.length : 0; btnIndicators.textContent = n>0 ? `Chá»‰ bÃ¡o (${n}) â–¼` : 'Chá»‰ bÃ¡o â–¼'; }catch{}
  }
  // Override removeIndicator to keep count
  const _removeIndicator = (typeof removeIndicator==='function') ? removeIndicator : null;
  window.removeIndicator = function(id){
    try{
      const idx = indicators.findIndex(x=>x.id===id); if(idx<0) return; const ind=indicators[idx];
      (ind.series||[]).forEach(s=>{ try{ chart.removeSeries(s);}catch{} });
      if(ind.badge) ind.badge.remove(); indicators.splice(idx,1);
      try{ toggleLeftScale && toggleLeftScale(); if (typeof updateIndicatorButtonCount==='function') try{ updateIndicatorButtonCount(); }catch{} }catch{}
      updateIndicatorButtonCount();
    }catch(e){ if(_removeIndicator) _removeIndicator(id); }
  }
  // Override addBadge to include edit dialog for MA
  window.addBadge = function(ind){
    const el = document.createElement('span');
    el.style.cssText='background:#20304f;color:#cfe6ff;padding:2px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;';
    const label = document.createElement('span');
    label.textContent = `${ind.type.toUpperCase()}${ind.params&&ind.params.period?`(${ind.params.period})`:''}`;
    const edit = document.createElement('button'); edit.textContent='âš™'; edit.title='Sá»­a'; edit.style.cssText='background:transparent;border:0;color:#9fc1ff;cursor:pointer;';
    const rm = document.createElement('button'); rm.textContent='Ã—'; rm.style.cssText='background:transparent;border:0;color:#ff7a7a;cursor:pointer;';

    const wrapper = document.createElement('span'); wrapper.style.position='relative';
    const dialog = document.createElement('div');
    dialog.style.cssText='position:absolute;display:none;flex-direction:column;gap:6px;background:#0f1633;border:1px solid #26304f;border-radius:8px;padding:8px;z-index:40;top:26px;left:0;';

    if(ind.type==='ma'){
      dialog.innerHTML = `
        <label style="display:flex;gap:6px;align-items:center">Chu ká»³:<input type="number" min="1" value="${ind.params.period||9}" style="width:80px"></label>
        <label style="display:flex;gap:6px;align-items:center">MÃ u:<input type="color" value="${ind.params.color||'#2962FF'}"></label>
        <div style="display:flex;gap:6px;justify-content:flex-end"><button class="ok">OK</button><button class="cancel">Há»§y</button></div>`;
      edit.addEventListener('click',(e)=>{ e.stopPropagation(); dialog.style.display = dialog.style.display==='flex'?'none':'flex'; dialog.style.display==='flex' && dialog.focus && dialog.focus(); });
      dialog.querySelector('.ok').addEventListener('click',()=>{
        const p = parseInt(dialog.querySelector('input[type="number"]').value||'9',10);
        const color = dialog.querySelector('input[type="color"]').value;
        ind.params.period = Math.max(1,p);
        ind.params.color = color || ind.params.color;
        if (ind.instance && typeof ind.instance.setOptions === 'function'){
          try { ind.instance.setOptions({ period: ind.params.period, color: ind.params.color }, toIndexTimeRows(dataCache)); } catch(_) {}
        } else if (ind.series && ind.series[0] && color){
          try{ ind.series[0].applyOptions({ color }); }catch{}
          try{ recomputeIndicator(ind); }catch{}
        } else {
          try{ recomputeIndicator(ind); }catch{}
        }
        label.textContent = `${ind.type.toUpperCase()}(${ind.params.period})`;
        dialog.style.display='none';
      });
      dialog.querySelector('.cancel').addEventListener('click',()=> dialog.style.display='none');
    } else {
      edit.style.display='none';
    }
    rm.addEventListener('click',()=> window.removeIndicator(ind.id));

    el.append(label, edit, rm);
    wrapper.append(el, dialog);
    ind.badge = wrapper; indActive.appendChild(wrapper);
    updateIndicatorButtonCount();
  }

  // Update count when adding via helper functions
  try {
    const fns = ['addCustomMA','addCustomBB','addCustomRSI','addCustomMACD'];
    fns.forEach(fn => {
      if (typeof window[fn] === 'function') {
        const orig = window[fn];
        window[fn] = function(){ const r = orig.apply(this, arguments); try{ updateIndicatorButtonCount(); }catch(_){} return r; };
      }
    });
  } catch(_){ }

  // --- Search suggestions like index ---
  if (dataProvider && dataProvider.getAllCompanies){
    dataProvider.getAllCompanies().then(list=>{ allCompanies = list||[]; });
  }
  function renderSuggestions(list){
    suggestionsEl.innerHTML='';
    list.slice(0,50).forEach(company=>{
      const item = document.createElement('div');
      item.className='suggestion-item';
      item.style.cssText='display:flex;justify-content:space-between;padding:6px 8px;cursor:pointer;border-bottom:1px solid #26304f';
      item.innerHTML = `<span class="suggestion-symbol">${company.symbol}</span><span class="suggestion-name">${company.organ_name||''}</span>`;
      item.addEventListener('mousedown',(e)=>{ e.preventDefault(); symbolEl.value = company.symbol; suggestionsEl.style.display='none'; btnDraw.click(); });
      suggestionsEl.appendChild(item);
    });
    suggestionsEl.style.display = list.length ? 'block' : 'none';
  }
  symbolEl.addEventListener('input', ()=>{
    const q = (symbolEl.value||'').trim().toUpperCase();
    if (!q){ suggestionsEl.style.display='none'; return; }
    const filtered = (allCompanies||[]).filter(c=>{
      const sym = (c.symbol||'').toUpperCase();
      if (q.length<=2) return sym.startsWith(q);
      const name = (c.organ_name||'').toUpperCase();
      return sym.startsWith(q) || name.includes(q);
    });
    renderSuggestions(filtered);
  });
  symbolEl.addEventListener('focus', ()=>{ if(suggestionsEl.children.length>0) suggestionsEl.style.display='block'; });
  symbolEl.addEventListener('blur', ()=> setTimeout(()=> suggestionsEl.style.display='none', 150));
})();






// --- Overlay wiring for top checkboxes so users can toggle without menu ---
function ensureOverlay(type){
  const exists = indicators.some(x=>x.type===type);
  if (exists) return;
  if (type==='rsi'){
    const period = Math.max(1, parseInt((rsiPeriodEl && rsiPeriodEl.value)||'14',10));
    const s = chart.addLineSeries({ color:'#8ecae6', lineWidth:2, priceScaleId:'left' });
    const l30 = chart.addLineSeries({ color:'#555', lineWidth:1, priceScaleId:'left' });
    const l70 = chart.addLineSeries({ color:'#555', lineWidth:1, priceScaleId:'left' });
    const ind = { id:'rsi_'+Date.now(), type:'rsi', params:{ period }, series:[s,l30,l70], scale:'left' };
    indicators.push(ind); addBadge(ind); toggleLeftScale(); recomputeIndicator(ind);
  } else if (type==='macd'){
    const fast = Math.max(1, parseInt((macdFastEl && macdFastEl.value)||'12',10));
    const slow = Math.max(1, parseInt((macdSlowEl && macdSlowEl.value)||'26',10));
    const signal = Math.max(1, parseInt((macdSignalEl && macdSignalEl.value)||'9',10));
    const macdL = chart.addLineSeries({ color:'#00d1ff', priceScaleId:'left' });
    const sigL = chart.addLineSeries({ color:'#ffb703', priceScaleId:'left' });
    const histL = chart.addHistogramSeries({ color:'#888', priceScaleId:'left', base:0 });
    const ind = { id:'macd_'+Date.now(), type:'macd', params:{fast,slow,signal}, series:[macdL,sigL,histL], scale:'left' };
    indicators.push(ind); addBadge(ind); toggleLeftScale(); recomputeIndicator(ind);
  }
}
function removeOverlay(type){
  const toRemove = indicators.filter(x=>x.type===type).map(x=>x.id);
  toRemove.forEach(id=> removeIndicator(id));
}
if (typeof optRSI !== 'undefined' && optRSI){
  optRSI.addEventListener('change', function(){ if (optRSI.checked){ ensureOverlay('rsi'); } else { removeOverlay('rsi'); } });
  if (typeof rsiPeriodEl !== 'undefined' && rsiPeriodEl){ rsiPeriodEl.addEventListener('change', function(){ indicators.filter(x=>x.type==='rsi').forEach(recomputeIndicator); }); }
}
if (typeof optMACD !== 'undefined' && optMACD){
  optMACD.addEventListener('change', function(){ if (optMACD.checked){ ensureOverlay('macd'); } else { removeOverlay('macd'); } });
  if (macdFastEl) macdFastEl.addEventListener('change', function(){ indicators.filter(x=>x.type==='macd').forEach(recomputeIndicator); });
  if (macdSlowEl) macdSlowEl.addEventListener('change', function(){ indicators.filter(x=>x.type==='macd').forEach(recomputeIndicator); });
  if (macdSignalEl) macdSignalEl.addEventListener('change', function(){ indicators.filter(x=>x.type==='macd').forEach(recomputeIndicator); });
}
