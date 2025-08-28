// Screener page logic
(function () {
  const provider = new DataProvider();
  const exchangeEl = document.getElementById('sc-exchange');
  const limitEl = document.getElementById('sc-limit');
  const presetEl = document.getElementById('sc-preset');
  const refreshBtn = document.getElementById('sc-refresh');
  const exportBtn = document.getElementById('sc-export');
  const searchInput = document.getElementById('sc-search');
  const pageSizeEl = document.getElementById('sc-pagesize');
  const prevBtn = document.getElementById('sc-prev');
  const nextBtn = document.getElementById('sc-next');
  const pageInfo = document.getElementById('sc-pageinfo');
  const table = document.getElementById('sc-table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const loading = document.getElementById('sc-loading');

  const PRESETS = {
    basic: ['ticker','organ_name','exchange','close','pe','pb','roe','market_cap'],
    valuation: ['ticker','exchange','close','pe','pb','ps','ev','ev_ebitda','roe','roa','gross_margin','net_margin'],
    ma: ['ticker','exchange','close','percent_price_vs_ma20','percent_price_vs_ma50','percent_price_vs_ma100','percent_price_vs_ma200'],
  };

  function showLoading(v){ if (loading) loading.style.display = v ? 'flex' : 'none'; }

  let lastData = [];
  let currentPage = 1;

  function render(headers, rows){
    thead.innerHTML = '';
    tbody.innerHTML = '';
    const trh = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    const fmt = (v) => {
      if (v === null || v === undefined || v === '') return '—';
      if (typeof v === 'number') return v.toLocaleString();
      return v;
    };
    rows.forEach(r => {
      const tr = document.createElement('tr');
      headers.forEach(h => {
        const td = document.createElement('td');
        td.textContent = fmt(r[h]);
        // Color for percent vs MA columns
        if (/^percent_price_vs_ma\d+$/i.test(h)) {
          const val = r[h];
          if (typeof val === 'number') td.className = val > 0 ? 'pos-green' : (val < 0 ? 'neg-red' : '');
        }
        if (h === 'ticker' || h === 'organ_name' || h === 'exchange') td.style.textAlign = 'left';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function filterRows(rows, q){
    if (!q) return rows;
    const s = q.trim().toUpperCase();
    return rows.filter(r => (
      (r.ticker && String(r.ticker).toUpperCase().includes(s)) ||
      (r.organ_name && String(r.organ_name).toUpperCase().includes(s))
    ));
  }

  function toCSV(headers, rows){
    const esc = v => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g,'""');
      return /[",\n]/.test(s) ? '"'+s+'"' : s;
    };
    const lines = [];
    lines.push(headers.join(','));
    rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(',')));
    return lines.join('\n');
  }

  function paginate(rows){
    const sz = parseInt(pageSizeEl.value, 10) || 50;
    const totalPages = Math.max(1, Math.ceil(rows.length / sz));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * sz;
    const pageRows = rows.slice(start, start + sz);
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    return pageRows;
  }

  async function run(){
    const exchange = exchangeEl.value;
    const limit = parseInt(limitEl.value, 10) || 100;
    const preset = presetEl.value;
    const q = searchInput.value.trim();
    const cols = PRESETS[preset] || PRESETS.basic;
    showLoading(true);
    try {
      const data = await provider.runScreener({ exchange, limit, q });
      lastData = data;
      const trimmed = data.map(row => {
        const o = {}; cols.forEach(c => { if (row.hasOwnProperty(c)) o[c] = row[c]; });
        if (cols.includes('organ_name')) {
          if (!o.organ_name || o.organ_name === '—') {
            const t = row.ticker || o.ticker;
            const name = window.__companiesMap && t ? (window.__companiesMap.get(String(t).toUpperCase()) || null) : null;
            if (name) o.organ_name = name;
          }
        }
        return o;
      });
      const filtered = filterRows(trimmed, q);
      const pageRows = paginate(filtered);
      render(cols, pageRows);
    } catch (e) {
      console.error('Screener error:', e);
      render(['error'], [{ error: 'Lỗi tải dữ liệu' }]);
    } finally {
      showLoading(false);
    }
  }

  refreshBtn.addEventListener('click', run);
  exportBtn.addEventListener('click', () => {
    const preset = presetEl.value; const cols = (PRESETS[preset] || PRESETS.basic).slice();
    const trimmed = lastData.map(row => { const o={}; cols.forEach(c=>{ if (row.hasOwnProperty(c)) o[c]=row[c]; }); return o; });
    const filtered = filterRows(trimmed, searchInput.value);
    const csv = toCSV(cols, filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'screener.csv'; a.click(); URL.revokeObjectURL(url);
  });

  let searchTimer=null; 
  searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer=setTimeout(run, 300); });

  prevBtn.addEventListener('click', () => { if (currentPage>1){ currentPage--; rerenderPage(); } });
  nextBtn.addEventListener('click', () => { currentPage++; rerenderPage(); });
  pageSizeEl.addEventListener('change', () => { currentPage = 1; rerenderPage(); });

  function rerenderPage(){
    const preset = presetEl.value; const cols = (PRESETS[preset] || PRESETS.basic).slice();
    const trimmed = lastData.map(row => { const o={}; cols.forEach(c=>{ if (row.hasOwnProperty(c)) o[c]=row[c]; }); return o; });
    const filtered = filterRows(trimmed, searchInput.value);
    const pageRows = paginate(filtered);
    render(cols, pageRows);
  }

  // Persist settings
  function saveSettings(){
    const s = { exchange: exchangeEl.value, limit: limitEl.value, preset: presetEl.value, pageSize: pageSizeEl.value };
    try { localStorage.setItem('screenerSettings', JSON.stringify(s)); } catch(e) {}
  }
  function loadSettings(){
    try { const s = JSON.parse(localStorage.getItem('screenerSettings')||'null'); if(!s) return; 
      if (s.exchange) exchangeEl.value = s.exchange;
      if (s.limit) limitEl.value = s.limit;
      if (s.preset) presetEl.value = s.preset;
      if (s.pageSize) pageSizeEl.value = s.pageSize;
    } catch(e) {}
  }
  [exchangeEl, limitEl, presetEl, pageSizeEl].forEach(el => el.addEventListener('change', () => { currentPage=1; saveSettings(); }));

  loadSettings();

  // Preload companies map once for name backfill
  (async function preloadCompanies(){
    try {
      const list = await provider.getAllCompanies();
      const m = new Map();
      (list||[]).forEach(it => { if (it && it.symbol) m.set(String(it.symbol).toUpperCase(), it.organ_name || it.organName || it.name || ''); });
      window.__companiesMap = m;
    } catch (e) { console.warn('Load companies failed', e); }
  })();
  document.addEventListener('DOMContentLoaded', run);
  // auto-run on first load
  if (document.readyState !== 'loading') run();
})();
