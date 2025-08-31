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
  function createChart(){
    const chartEl = document.getElementById('chart'); chartEl.innerHTML='';
    chart = LightweightCharts.createChart(chartEl, { layout:{ background:{color:'#0b1020'}, textColor:'#dfe8ff' }, rightPriceScale:{ borderVisible:true }, leftPriceScale:{ visible:false, borderVisible:true }, timeScale:{ borderVisible:true }, grid:{ vertLines:{color:'#1c2748'}, horzLines:{color:'#1c2748'} } });
    series = chart.addCandlestickSeries({ upColor:'#4be3a4', downColor:'#ff7a7a', borderDownColor:'#ff7a7a', borderUpColor:'#4be3a4', wickDownColor:'#ff7a7a', wickUpColor:'#4be3a4' });
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

  // RSI
  function setupRSI(){
    const panel = document.getElementById('rsi-panel');
    if (!optRSI.checked){ panel.style.display='none'; return; }
    panel.style.display='block';
    const el = document.getElementById('chart-rsi'); el.innerHTML='';
    rsiChart = LightweightCharts.createChart(el, { layout:{ background:{color:'#0b1020'}, textColor:'#dfe8ff' }, rightPriceScale:{ borderVisible:true }, timeScale:{ borderVisible:true }, grid:{ vertLines:{ color:'#1c2748' }, horzLines:{ color:'#1c2748' } } });
    rsiLine = rsiChart.addLineSeries({ color:'#8ecae6' });
    rsi30 = rsiChart.addLineSeries({ color:'#555' });
    rsi70 = rsiChart.addLineSeries({ color:'#555' });
    updateRSI();
  }
  function updateRSI(){
    if (!optRSI.checked || !dataCache.length) return;
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
    rsiLine.setData(rsiData);
    const lvl30 = rsiData.map(d=> ({ time:d.time, value:30 }));
    const lvl70 = rsiData.map(d=> ({ time:d.time, value:70 }));
    rsi30.setData(lvl30); rsi70.setData(lvl70);
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
    el.style.cssText='background:#20304f;color:#cfe6ff;padding:2px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;';
    el.textContent = `${ind.type.toUpperCase()}${ind.params && ind.params.period? '('+ind.params.period+')':''}`;
    const rm = document.createElement('button'); rm.textContent='×'; rm.style.cssText='background:transparent;border:0;color:#ff7a7a;cursor:pointer;';
    rm.addEventListener('click',()=>{ removeIndicator(ind.id); });
    el.appendChild(rm);
    ind.badge = el; indActive.appendChild(el);
  }
  function removeIndicator(id){
    const idx = indicators.findIndex(x=>x.id===id); if(idx<0) return; const ind=indicators[idx];
    // remove series
    (ind.series||[]).forEach(s=>{ try{ chart.removeSeries(s);}catch{} });
    if(ind.badge) ind.badge.remove(); indicators.splice(idx,1);
    toggleLeftScale();
  }
  function toggleLeftScale(){
    const anyLeft = indicators.some(x=>x.scale==='left');
    chart.applyOptions({ leftPriceScale: { visible: anyLeft } });
  }
  function addCustomMA(){
    const period = parseInt(prompt('Kỳ MA?', '20')||'20',10); if(!period||period<1) return;
    const color = palette[indCount++ % palette.length];
    const s = chart.addLineSeries({ color, lineWidth:2, priceScaleId: 'right' });
    const ind = { id: 'ma_'+Date.now(), type:'ma', params:{period,color}, series:[s], scale:'right' };
    indicators.push(ind); addBadge(ind); recomputeIndicator(ind);
  }
  function addCustomBB(){
    const period = parseInt(prompt('Period BB?', '20')||'20',10); if(!period||period<1) return;
    const dev = parseFloat(prompt('Std dev?', '2')||'2');
    const up = chart.addLineSeries({ color:'#a8dadc', lineWidth:1, priceScaleId:'right' });
    const mid = chart.addLineSeries({ color:'#457b9d', lineWidth:1, priceScaleId:'right' });
    const dn = chart.addLineSeries({ color:'#a8dadc', lineWidth:1, priceScaleId:'right' });
    const ind = { id: 'bb_'+Date.now(), type:'bb', params:{period,dev}, series:[up,mid,dn], scale:'right' };
    indicators.push(ind); addBadge(ind); recomputeIndicator(ind);
  }
  function addCustomRSI(){
    const period = parseInt(prompt('Period RSI?', '14')||'14',10); if(!period||period<1) return;
    const s = chart.addLineSeries({ color:'#8ecae6', lineWidth:2, priceScaleId:'left' });
    const l30 = chart.addLineSeries({ color:'#555', lineWidth:1, priceScaleId:'left' });
    const l70 = chart.addLineSeries({ color:'#555', lineWidth:1, priceScaleId:'left' });
    const ind = { id:'rsi_'+Date.now(), type:'rsi', params:{period}, series:[s,l30,l70], scale:'left' };
    indicators.push(ind); addBadge(ind); toggleLeftScale(); recomputeIndicator(ind);
  }
  function addCustomMACD(){
    const fast = parseInt(prompt('MACD Fast?', '12')||'12',10);
    const slow = parseInt(prompt('MACD Slow?', '26')||'26',10);
    const signal = parseInt(prompt('MACD Signal?', '9')||'9',10);
    // overlay MACD (left scale)
    const macdL = chart.addLineSeries({ color:'#00d1ff', priceScaleId:'left' });
    const sigL = chart.addLineSeries({ color:'#ffb703', priceScaleId:'left' });
    const histL = chart.addHistogramSeries({ color:'#888', priceScaleId:'left', base:0 });
    const ind = { id:'macd_'+Date.now(), type:'macd', params:{fast,slow,signal}, series:[macdL,sigL,histL], scale:'left' };
    indicators.push(ind); addBadge(ind); toggleLeftScale(); recomputeIndicator(ind);
  }
  function recomputeCustomIndicators(){ indicators.forEach(recomputeIndicator); }
  function recomputeIndicator(ind){
    if (!dataCache.length) return;
    if(ind.type==='ma'){
      const p = Math.max(1, ind.params.period); const out=[]; let sum=0; const q=[];
      for(const c of dataCache){ q.push(c.close); sum+=c.close; if(q.length>p){ sum-=q.shift(); } if(q.length===p){ out.push({ time:c.time, value: sum/p }); } }
      ind.series[0].setData(out);
    } else if(ind.type==='bb'){
      const p = Math.max(1, ind.params.period); const dev = Math.max(0.1, ind.params.dev);
      const up=[], mid=[], dn=[]; let sum=0; const win=[];
      for(const c of dataCache){ win.push(c.close); sum+=c.close; if(win.length>p){ sum-=win.shift(); } if(win.length===p){ const mean=sum/p; const variance = win.reduce((a,v)=>a+(v-mean)*(v-mean),0)/p; const sd=Math.sqrt(variance); mid.push({time:c.time,value:mean}); up.push({time:c.time,value:mean+dev*sd}); dn.push({time:c.time,value:mean-dev*sd}); } }
      ind.series[0].setData(up); ind.series[1].setData(mid); ind.series[2].setData(dn);
    } else if(ind.type==='rsi'){
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
