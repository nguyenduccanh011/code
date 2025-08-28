// Price board page logic (auto-refresh, filter, CSV export)
(function(){
  const provider = new DataProvider();
  const exchangeEl = document.getElementById('pb-exchange');
  const limitEl = document.getElementById('pb-limit');
  const refreshBtn = document.getElementById('pb-refresh');
  const exportBtn = document.getElementById('pb-export');
  const searchInput = document.getElementById('pb-search');
  const intervalEl = document.getElementById('pb-interval');
  const themeBtn = document.getElementById('pb-theme-toggle');
  const table = document.getElementById('pb-table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const loading = document.getElementById('pb-loading');

  let lastData = [];
  let timer = null;

  // Theme toggle with localStorage persistence
  function applyTheme(){
    const t = (localStorage.getItem('theme') || 'light').toLowerCase();
    document.body.classList.toggle('theme-dark', t === 'dark');
    if (themeBtn) themeBtn.textContent = t === 'dark' ? 'Light' : 'Dark';
  }
  function toggleTheme(){
    const curr = (localStorage.getItem('theme') || 'light').toLowerCase();
    localStorage.setItem('theme', curr === 'dark' ? 'light' : 'dark');
    applyTheme();
  }

  function showLoading(v){ if (loading) loading.style.display = v ? 'flex' : 'none'; }

  function fmtNumber(v, digits = 2){
    if (v === null || v === undefined || v === '') return '';
    if (typeof v !== 'number' || Number.isNaN(v)) return String(v);
    return v.toLocaleString('vi-VN', { maximumFractionDigits: digits });
  }

  function fmtCompact(v){
    if (v === null || v === undefined || v === '') return '';
    if (typeof v !== 'number' || Number.isNaN(v)) return String(v);
    const abs = Math.abs(v);
    if (abs >= 1e9) return (v/1e9).toFixed(2).replace(/\.00$/,'') + 'B';
    if (abs >= 1e6) return (v/1e6).toFixed(2).replace(/\.00$/,'') + 'M';
    if (abs >= 1e3) return (v/1e3).toFixed(2).replace(/\.00$/,'') + 'K';
    return fmtNumber(v, 2);
  }

  function pick(o, arr){ for (const k of arr){ if (o[k] !== undefined && o[k] !== null) return o[k]; } return undefined; }
  function pickSymbol(o){
    const cands = ['symbol','listing_symbol','listing_mapping_symbol','ticker'];
    for (const k of cands){
      if (o[k] === undefined || o[k] === null) continue;
      const s = String(o[k]).trim().toUpperCase();
      if (!s || s === '0' || s === 'NAN') continue;
      if (/^[A-Z0-9]+$/.test(s)) return s;
    }
    return '';
  }

function toDisplayRows(raw){
    return raw.map(r => {
      const symbol = pickSymbol(r);
      const exch = pick(r, ['listing_exchange','exchange']);
      const name = pick(r, ['listing_organ_name','organ_name','company','organName']);
      const ref = pick(r, ['reference','match_reference_price','listing_ref_price','reference_price']);
      const ceil = pick(r, ['ceiling','listing_ceiling','match_ceiling_price','price_ceiling']);
      const floor = pick(r, ['floor','listing_floor','match_floor_price','price_floor']);
      const price = pick(r, ['close','match_match_price']);
      const open = pick(r, ['open','match_open_price']);
      const high = pick(r, ['high','match_highest']);
      const low  = pick(r, ['low','match_lowest']);
      const vol  = pick(r, ['volume','match_accumulated_volume']);
      const tick = pick(r, ['tick_size','price_step']);
      // orderbook 1..3
      function lvl(side, i){
        const p = pick(r, [
          `${side}_price_${i}`, `${side}_${i}_price`,
          `bid_ask_${side}_${i}_price`
        ]);
        const v = pick(r, [
          `${side}_volume_${i}`, `${side}_${i}_volume`,
          `bid_ask_${side}_${i}_volume`
        ]);
        return [p, v];
      }
      const [b3,bv3] = lvl('bid',3); const [b2,bv2] = lvl('bid',2); const [b1,bv1] = lvl('bid',1);
      const [a1,av1] = lvl('ask',1); const [a2,av2] = lvl('ask',2); const [a3,av3] = lvl('ask',3);

      let chg = pick(r, ['change']);
      if (chg === undefined && price != null && ref != null) chg = price - ref;
      let chgp = pick(r, ['change_pct','pct_change']);
      if (chgp === undefined && chg != null && ref) chgp = (chg/ref)*100;
      if (typeof chgp === 'string') chgp = Number(chgp);
      if (typeof chgp === 'number' && Number.isFinite(chgp)) chgp = Math.round(chgp * 10) / 10;

      return {
        'Mã': symbol,
        'Sàn': exch,
        'Tên': name,
        'TC': ref,
        'Trần': ceil,
        'Sàn giá': floor,
        'Giá': price,
        '±': chg,
        '±%': chgp,
        'KL': vol,
        'Mở': open,
        'Cao': high,
        'Thấp': low,
        'B3': b3, 'KL3': bv3,
        'B2': b2, 'KL2': bv2,
        'B1': b1, 'KL1': bv1,
        'A1': a1, 'KLA1': av1,
        'A2': a2, 'KLA2': av2,
        'A3': a3, 'KLA3': av3,
        'Bước': tick,
      };
    });
  }

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

    rows.forEach(r => {
      const tr = document.createElement('tr');
      headers.forEach(h => {
        const td = document.createElement('td');
        const v = r[h];
        // compact format for volumes and big numbers
        const compactCols = new Set(['KL','KL3','KL2','KL1','KLA1','KLA2','KLA3']);
        const priceCols = new Set(['Giá','TC','Trần','Sàn giá','Mở','Cao','Thấp','Bước','B1','B2','B3','A1','A2','A3']);
        if (compactCols.has(h)) td.textContent = fmtCompact(typeof v==='string'?Number(v):v);
        else if (priceCols.has(h)) td.textContent = fmtNumber(typeof v==='string'?Number(v):v, 2);
        else td.textContent = v == null ? '' : String(v);
        if (h === '±' || h === '±%') {
          td.className = v > 0 ? 'pos-green' : (v < 0 ? 'neg-red' : '');
        }
        if (h === 'Mã' || h === 'Tên' || h === 'Sàn') td.style.textAlign = 'left';
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
      (r.symbol && String(r.symbol).toUpperCase().includes(s)) ||
      (r.organ_name && String(r.organ_name).toUpperCase().includes(s))
    ));
  }

  function toCSV(headers, rows){
    const esc = v => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g,'""');
      return /[",\n]/.test(s) ? '"'+s+'"' : s;
    };
    const lines = [headers.join(',')];
    rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(',')));
    return lines.join('\n');
  }

  async function loadBoard(){
    const exchange = exchangeEl.value;
    const limit = parseInt(limitEl.value, 10) || 100;
    showLoading(true);
    try {
      const params = new URLSearchParams({ exchange, limit: String(limit) });
      const res = await fetch(`${window.API_BASE_URL || 'http://127.0.0.1:5000'}/api/price_board?${params.toString()}`);
      let data;
      if (!res.ok) {
        try { const err = await res.json(); console.error('API error:', err); }
        catch(_) {}
        throw new Error(`HTTP ${res.status}`);
      }
      data = await res.json();
      lastData = Array.isArray(data) ? data : [];
      if (lastData.length === 0) { thead.innerHTML=''; tbody.innerHTML=''; return; }
      // Transform to compact board rows
      const displayRows = toDisplayRows(lastData);
      const headers = ['Mã','Tên','Sàn','TC','Trần','Sàn giá','Giá','±','±%','KL','Mở','Cao','Thấp','B3','KL3','B2','KL2','B1','KL1','A1','KLA1','A2','KLA2','A3','KLA3','Bước'];
      const filtered = filterRows(displayRows.map(r => ({...r, ticker: r['Mã'], symbol: r['Mã'], organ_name: r['Tên'] || ''})), searchInput.value)
        .map(r => r); // keep structure
      render(headers, filtered);
    } catch (e) {
      console.error('Price board error:', e);
      render(['error'], [{ error: 'Lỗi tải dữ liệu bảng giá' }]);
    } finally {
      showLoading(false);
    }
  }

  function setTimer(){
    if (timer) { clearInterval(timer); timer = null; }
    const sec = parseInt(intervalEl.value, 10) || 0;
    if (sec > 0) {
      timer = setInterval(loadBoard, sec * 1000);
    }
  }

  refreshBtn.addEventListener('click', loadBoard);
  exportBtn.addEventListener('click', () => {
    if (!lastData.length) return;
    const headers = Object.keys(lastData[0]);
    const filtered = filterRows(lastData, searchInput.value);
    const csv = toCSV(headers, filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'price_board.csv'; a.click(); URL.revokeObjectURL(url);
  });
  searchInput.addEventListener('input', () => { loadBoard(); });
  intervalEl.addEventListener('change', () => { setTimer(); });

  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  document.addEventListener('DOMContentLoaded', () => { applyTheme(); loadBoard(); setTimer(); });
  if (document.readyState !== 'loading') { applyTheme(); loadBoard(); setTimer(); }
})();
