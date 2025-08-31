/* CP68 EOD demo: fetch normalized and plot candlesticks */
(function(){
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5000';
  const $ = s => document.querySelector(s);
  const scopeEl = $('#scope');
  const symbolsEl = $('#symbols');
  const fromEl = $('#from');
  const toEl = $('#to');
  const btn = $('#load');
  const logEl = $('#log');
  const infoTbody = $('#info');

  function setLog(s){ logEl.textContent = s; }

  async function fetchJSON(url){
    const res = await fetch(url);
    const ct = (res.headers.get('content-type')||'').toLowerCase();
    const text = await res.text();
    if (ct.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
      try { return JSON.parse(text); } catch {}
    }
    throw new Error('Non-JSON response');
  }

  function toCandleRows(arr){
    // expects [{date:'YYYY-MM-DD', open,high,low,close}]
    return arr.map(r => {
      const d = r.date || r.time || r.t;
      const [y,m,da] = String(d).split('-').map(x=>parseInt(x,10));
      return { time: { year: y, month: m, day: da }, open: +r.open, high: +r.high, low: +r.low, close: +r.close };
    }).filter(x => isFinite(x.open) && isFinite(x.high) && isFinite(x.low) && isFinite(x.close));
  }

  function summary(arr){
    if (!arr || !arr.length) return { len: 0, first: '', last: '' };
    const first = arr[0]?.date || '';
    const last = arr[arr.length-1]?.date || '';
    return { len: arr.length, first, last };
  }

  function drawChart(seriesBySymbol){
    const chartEl = document.getElementById('chart');
    chartEl.innerHTML = '';
    const chart = LightweightCharts.createChart(chartEl, {
      layout: { background: { color: '#0b1020' }, textColor: '#dfe8ff' },
      rightPriceScale: { borderVisible: true },
      timeScale: { borderVisible: true },
      grid: { vertLines: { color: '#1c2748' }, horzLines: { color: '#1c2748' } }
    });
    const syms = Object.keys(seriesBySymbol);
    if (!syms.length) return;
    const main = chart.addCandlestickSeries({ upColor:'#4be3a4', downColor:'#ff7a7a', borderDownColor:'#ff7a7a', borderUpColor:'#4be3a4', wickDownColor:'#ff7a7a', wickUpColor:'#4be3a4' });
    main.setData(seriesBySymbol[syms[0]]);
  }

  async function load(){
    try{
      setLog('Đang tải...');
      const scope = (scopeEl.value||'last').toLowerCase();
      const symbols = (symbolsEl.value||'AAA,MWG').trim();
      const params = new URLSearchParams({ scope, symbols, format: 'json', groupBy: '1' });
      if (fromEl.value) params.set('from', fromEl.value);
      if (toEl.value) params.set('to', toEl.value);
      const url = `${base}/api/cp68/eod/normalized?${params.toString()}`;
      let data = await fetchJSON(url);
      // Nếu người dùng đặt from/to không khớp với 'last', data có thể rỗng. Thử fallback bỏ from/to.
      if ((!data || (Array.isArray(data) && data.length===0) || (data && !Array.isArray(data) && Object.keys(data).length===0)) && scope==='last' && (fromEl.value || toEl.value)){
        const p2 = new URLSearchParams({ scope, symbols, format:'json', groupBy:'1' });
        const url2 = `${base}/api/cp68/eod/normalized?${p2.toString()}`;
        data = await fetchJSON(url2);
        if (data && Object.keys(data).length){
          await render(data, symbols);
          setLog('Đang hiển thị (fallback không dùng from/to).');
          return;
        }
      }
      // Nếu vẫn rỗng, thử lấy từ dataset local
      if ((!data || (Array.isArray(data) && data.length===0) || (data && !Array.isArray(data) && Object.keys(data).length===0))){
        const grouped = {};
        for (const s of symbols.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean)){
          const p = new URLSearchParams({ symbol: s });
          if (fromEl.value) p.set('from', fromEl.value);
          if (toEl.value) p.set('to', toEl.value);
          try{
            const arr = await fetchJSON(`${base}/api/dataset/candles?${p.toString()}`);
            grouped[s] = arr || [];
          }catch{}
        }
        await render(grouped, symbols);
        setLog('Hiển thị từ dataset local.');
        return;
      }
      await render(data, symbols);
      setLog('Hoàn tất.');
    }catch(e){
      console.error(e); setLog('Lỗi: '+ (e && e.message || e));
    }
  }

  async function render(data, symCsv){
    let grouped = data;
    if (Array.isArray(data)){
      // chuyển mảng phẳng → groupBy
      grouped = {};
      for (const r of data){
        const s = (r.symbol||'').toUpperCase();
        if (!s) continue;
        (grouped[s] ||= []).push(r);
      }
    }
    const seriesBySym = {};
    infoTbody.innerHTML='';
    const wanted = symCsv.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
    for (const s of Object.keys(grouped)){
      if (wanted.length && !wanted.includes(s)) continue;
      const arr = grouped[s] || [];
      const { len, first, last } = summary(arr);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s}</td><td>${len}</td><td>${first}</td><td>${last}</td>`;
      infoTbody.appendChild(tr);
      seriesBySym[s] = toCandleRows(arr);
    }
    drawChart(seriesBySym);
  }

  btn.addEventListener('click', load);
  window.addEventListener('DOMContentLoaded', () => { setTimeout(load, 50); });
})();
