// Price board page logic (auto-refresh, filter, CSV export)
(function(){
  const provider = new DataProvider();
  const exchangeEl = document.getElementById('pb-exchange');
  const limitEl = document.getElementById('pb-limit');
  const refreshBtn = document.getElementById('pb-refresh');
  const exportBtn = document.getElementById('pb-export');
  const searchInput = document.getElementById('pb-search');
  const intervalEl = document.getElementById('pb-interval');
  const table = document.getElementById('pb-table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const loading = document.getElementById('pb-loading');

  let lastData = [];
  let timer = null;

  function showLoading(v){ if (loading) loading.style.display = v ? 'flex' : 'none'; }

  function fmt(v){
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return v.toLocaleString();
    return v;
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
        td.textContent = fmt(v);
        if (/pct|change/i.test(h) && typeof v === 'number') {
          td.className = v > 0 ? 'pos-green' : (v < 0 ? 'neg-red' : '');
        }
        if (/ticker|symbol|organ|exchange/i.test(h)) td.style.textAlign = 'left';
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
      // Direct call to backend API to avoid editing DataProvider encoding
      const params = new URLSearchParams({ exchange, limit: String(limit) });
      const res = await fetch(`${window.API_BASE_URL || 'http://127.0.0.1:5000'}/api/price_board?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      lastData = Array.isArray(data) ? data : [];
      if (lastData.length === 0) { thead.innerHTML=''; tbody.innerHTML=''; return; }
      // Derive headers, placing ticker first if present
      const keys = Object.keys(lastData[0]);
      const headers = [...keys.filter(k => /^(ticker|symbol)$/i.test(k)), ...keys.filter(k => !/^(ticker|symbol)$/i.test(k))];
      const filtered = filterRows(lastData, searchInput.value);
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

  document.addEventListener('DOMContentLoaded', () => { loadBoard(); setTimer(); });
  if (document.readyState !== 'loading') { loadBoard(); setTimer(); }
})();

