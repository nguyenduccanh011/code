(() => {
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5050';

  const sel = document.getElementById('ind-select');
  const btnLoad = document.getElementById('btn-load');
  const btnLast = document.getElementById('btn-lastest');
  const kwEl = document.getElementById('kw');
  const tbody = document.querySelector('#tbl tbody');
  const sumEl = document.getElementById('sum');

  let list = [];
  let lastest = {};
  let allCache = [];

  const fmt = (v, d = 2) => typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: d }) : (v ?? '');
  const norm = (s) => {
    if (s == null) return '';
    try {
      return Array.from(String(s).normalize('NFKD'))
        .filter(c => (c.charCodeAt(0) < 0x300 || c.charCodeAt(0) > 0x36F))
        .join('')
        .toLowerCase()
        .trim();
    } catch { return String(s).toLowerCase().trim(); }
  };

  async function fetchJSON(url) {
    const res = await fetch(url);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  }

  async function loadIndustries() {
    let arr = [];
    try {
      const data = await fetchJSON(`${base}/api/industry/list`);
      arr = Array.isArray(data?.industries) ? data.industries : [];
    } catch (e) { console.warn('industry/list failed', e); }
    if (!arr.length) {
      try {
        const d = await fetchJSON(`${base}/api/proxy/vndirect/stocks?q=${encodeURIComponent('type:IFC,ETF,STOCK~status:LISTED')}&size=3000`);
        const items = Array.isArray(d?.data) ? d.data : [];
        allCache = items;
        const set = new Set();
        for (const x of items) {
          const v = x.industryName || x.industry || x.icbName || x.sectorName || x.industryEnName;
          if (v) set.add(String(v));
        }
        arr = Array.from(set).sort();
      } catch (e) { console.warn('fallback VNDirect fetch failed', e); }
    }
    sel.innerHTML = arr.map(x => `<option value="${x}">${x}</option>`).join('');
    if (!allCache.length) {
      try {
        const d = await fetchJSON(`${base}/api/proxy/vndirect/stocks?q=${encodeURIComponent('type:IFC,ETF,STOCK~status:LISTED')}&size=3000`);
        allCache = Array.isArray(d?.data) ? d.data : [];
      } catch {}
    }
  }

  async function loadStocks() {
    const ind = sel.value;
    let ok = false;
    try {
      const data = await fetchJSON(`${base}/api/industry/stocks?industry=${encodeURIComponent(ind)}`);
      const arr = Array.isArray(data?.data) ? data.data : [];
      if (arr.length) { list = arr; ok = true; }
    } catch (e) { console.warn('industry/stocks failed', e); }
    if (!ok && allCache.length) {
      const indN = norm(ind);
      list = allCache.filter(x => {
        const v = x.industryName || x.industry || x.icbName || x.sectorName || x.industryEnName;
        const vn = norm(v);
        return vn === indN || vn.includes(indN) || indN.includes(vn);
      });
    }
    lastest = {};
    render();
  }

  async function loadLastest() {
    const ind = sel.value;
    const data = await fetchJSON(`${base}/api/industry/lastest?industry=${encodeURIComponent(ind)}`);
    lastest = data?.data || {};
    render();
  }

  function applyFilter(src) {
    const kw = (kwEl.value || '').trim().toLowerCase();
    if (!kw) return src;
    return src.filter(x => String(x.code || '').toLowerCase().includes(kw) || String(x.companyName || '').toLowerCase().includes(kw));
  }

  function render() {
    const arr = applyFilter(list).sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
    const frag = document.createDocumentFragment();
    let up = 0, down = 0, flat = 0;
    for (const x of arr) {
      const sym = String(x.code || '').toUpperCase();
      const lt = lastest[sym] || {};
      const price = lt.matchPrice ?? lt.priceMatch ?? lt.lastPrice;
      const chg = lt.priceChange ?? lt.change;
      const pct = lt.priceChangePercent ?? lt.pctChange ?? lt.changeRate;
      const vol = lt.matchQtty ?? lt.matchVolume ?? lt.volume;
      const cls = chg > 0 ? 'up' : (chg < 0 ? 'down' : '');
      if (chg > 0) up++; else if (chg < 0) down++; else flat++;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sym}</td>
        <td>${x.companyName || ''}</td>
        <td>${x.floor || ''}</td>
        <td class="mono ${cls}">${fmt(price)}</td>
        <td class="mono ${cls}">${fmt(chg)}</td>
        <td class="mono ${cls}">${pct !== undefined && pct !== null ? (Math.abs(pct) <= 2 ? pct : (pct * 100)).toFixed(2) + '%' : ''}</td>
        <td class="mono">${fmt(vol, 0)}</td>
      `;
      frag.appendChild(tr);
    }
    tbody.innerHTML = '';
    tbody.appendChild(frag);
    sumEl.textContent = `${arr.length} mã · ↑ ${up} · ↓ ${down} · = ${flat}`;
  }

  btnLoad.addEventListener('click', loadStocks);
  btnLast.addEventListener('click', loadLastest);
  kwEl.addEventListener('input', render);

  loadIndustries().then(loadStocks);
})();

