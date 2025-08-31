(() => {
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5050';

  const thead = document.getElementById('pb-thead');
  const tbody = document.getElementById('pb-tbody');
  const updatedEl = document.getElementById('pb-updated');
  const loading = document.getElementById('pb-loading');

  const chkRealtime = document.getElementById('pb-realtime');
  const inputInterval = document.getElementById('pb-interval');
  const btnTheme = document.getElementById('pb-theme-toggle');
  const unitVolEl = document.getElementById('pb-unit-vol');
  const unitValEl = document.getElementById('pb-unit-val');

  let timer = null;

  const groupHeader = [
    { title: '', span: 7 },
    { title: 'Dư mua', span: 6 },
    { title: 'Khớp lệnh', span: 4 },
    { title: 'Dư bán', span: 6 },
    { title: 'Giá', span: 4 },
    { title: 'ĐTNN', span: 3 },
  ];

  const cols = [
    { key: 'SB', label: 'Mã', cls: 'sym w-s' },
    { key: 'San', label: 'Sàn', cls: 'floor w-s' },
    { key: 'CL', label: 'Trần', cls: 'num w-s', fmt: fmtPrice, tone: 'up' },
    { key: 'FL', label: 'Sàn', cls: 'num w-s', fmt: fmtPrice, tone: 'down' },
    { key: 'RE', label: 'TC', cls: 'num w-s', fmt: fmtPrice, tone: 'ref' },
    { key: 'TT', label: 'Tổng KL', cls: 'num w-m', fmt: fmtVolume },
    { key: 'TB', label: 'Giá trị', cls: 'num w-m', fmt: fmtValue },

    { key: 'B3', label: 'Giá 3', cls: 'num w-s', fmt: fmtPrice },
    { key: 'V3', label: 'KL3', cls: 'num w-s', fmt: fmtVolume },
    { key: 'B2', label: 'Giá 2', cls: 'num w-s', fmt: fmtPrice },
    { key: 'V2', label: 'KL2', cls: 'num w-s', fmt: fmtVolume },
    { key: 'B1', label: 'Giá 1', cls: 'num w-s', fmt: fmtPrice },
    { key: 'V1', label: 'KL1', cls: 'num w-s', fmt: fmtVolume },

    { key: 'CP', label: 'Giá khớp', cls: 'num w-s', fmt: fmtPrice },
    { key: 'CV', label: 'KL khớp', cls: 'num w-s', fmt: fmtVolume },
    { key: 'CH', label: '+/-', cls: 'num w-s', fmt: fmtChange },
    { key: 'CHpercent', label: '+/-(%)', cls: 'num w-s', fmt: v => (isFiniteNum(parseNum(v)) ? parseNum(v).toFixed(2) + '%' : '') },

    { key: 'S1', label: 'Giá 1', cls: 'num w-s', fmt: fmtPrice },
    { key: 'U1', label: 'KL1', cls: 'num w-s', fmt: fmtVolume },
    { key: 'S2', label: 'Giá 2', cls: 'num w-s', fmt: fmtPrice },
    { key: 'U2', label: 'KL2', cls: 'num w-s', fmt: fmtVolume },
    { key: 'S3', label: 'Giá 3', cls: 'num w-s', fmt: fmtPrice },
    { key: 'U3', label: 'KL3', cls: 'num w-s', fmt: fmtVolume },

    { key: 'OP', label: 'Mở cửa', cls: 'num w-s', fmt: fmtPrice },
    { key: 'HI', label: 'Cao nhất', cls: 'num w-s', fmt: fmtPrice },
    { key: 'LO', label: 'Thấp nhất', cls: 'num w-s', fmt: fmtPrice },
    { key: 'AP', label: 'TB', cls: 'num w-s', fmt: fmtPrice },

    { key: 'FB', label: 'Mua', cls: 'num w-m', fmt: fmtVolume },
    { key: 'FS', label: 'Bán', cls: 'num w-m', fmt: fmtVolume },
    { key: 'FR', label: 'NN Room', cls: 'num w-m', fmt: fmtVolume },
  ];

  // Build header
  const row1 = document.createElement('tr');
  for (const g of groupHeader) {
    const th = document.createElement('th');
    th.colSpan = g.span;
    th.textContent = g.title;
    th.className = 'group';
    row1.appendChild(th);
  }
  const row2 = document.createElement('tr');
  for (const c of cols) {
    const th = document.createElement('th');
    th.textContent = c.label;
    row2.appendChild(th);
  }
  thead.appendChild(row1);
  thead.appendChild(row2);

  function isFiniteNum(n) { return typeof n === 'number' && Number.isFinite(n); }
  function parseNum(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const s = v.replace(/,/g, '').trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  function nf(v) { return (v || v === 0) ? v.toLocaleString('en-US') : ''; }
  function fmtPrice(v) { const n = parseNum(v); return isFiniteNum(n) ? n.toFixed(2) : ''; }
  function fmtChange(v) { const n = parseNum(v); if (!isFiniteNum(n)) return ''; return (n > 0 ? '+' : n < 0 ? '' : '') + n.toFixed(2); }

  function unitVol() { return parseInt(unitVolEl.value || '1', 10) || 1; }
  function unitVal() { return parseInt(unitValEl.value || '1', 10) || 1; }
  function fmtVolume(v) { const n = parseNum(v); if (!isFiniteNum(n)) return ''; return nf(Math.round(n / unitVol())); }
  function fmtValue(v) { const n = parseNum(v); if (!isFiniteNum(n)) return ''; return nf(Math.round(n / unitVal())); }

  function toneClass(key, val, row) {
    const n = parseNum(val);
    if (!isFiniteNum(n)) return '';
    const re = parseNum(row.RE);
    if (key === 'CL') return 'up';
    if (key === 'FL') return 'down';
    if (key === 'RE') return 'ref';
    if (isFiniteNum(re)) {
      if (n > re) return 'up';
      if (n < re) return 'down';
      return 'ref';
    }
    return '';
  }

  function renderRows(rows) {
    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const r of rows) {
      const tr = document.createElement('tr');
      for (const c of cols) {
        const td = document.createElement('td');
        td.className = (c.cls || '') + ' ' + (c.tone ? c.tone : toneClass(c.key, r[c.key], r));
        const raw = r[c.key];
        const val = c.fmt ? c.fmt(raw) : (raw ?? '');
        td.textContent = val;
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  }

  async function fetchVCBS(criteriaId) {
    const url = `${base}/api/proxy/vcbs/priceboard?criteriaId=${encodeURIComponent(criteriaId)}`;
    const res = await fetch(url);
    const data = await res.json().catch(async () => ({ rows: [] }));
    return data;
  }

  function normalizeVCBS(data, marketLabel) {
    if (!data) return [];
    const rows = Array.isArray(data.rows) ? data.rows : [];
    return rows.map(x => ({ ...x, San: x.San || marketLabel }));
  }

  async function loadAll() {
    try {
      loading.style.display = 'grid';
      const [hose, hnx, upcom] = await Promise.all([
        fetchVCBS('-11'),
        fetchVCBS('-12'),
        fetchVCBS('-13'),
      ]);
      const rows = [
        ...normalizeVCBS(hose, 'HOSE'),
        ...normalizeVCBS(hnx, 'HNX'),
        ...normalizeVCBS(upcom, 'UPCOM'),
      ];
      rows.sort((a, b) => String(a.SB || '').localeCompare(String(b.SB || '')) || String(a.San||'').localeCompare(String(b.San||'')));
      renderRows(rows);
      updatedEl.textContent = new Date().toLocaleTimeString('vi-VN');
    } catch (e) {
      console.error(e);
    } finally {
      loading.style.display = 'none';
    }
  }

  function startRealtime() {
    stopRealtime();
    if (!chkRealtime.checked) return;
    const sec = Math.max(1, parseInt(inputInterval.value || '6', 10));
    timer = setInterval(loadAll, sec * 1000);
  }
  function stopRealtime() { if (timer) { clearInterval(timer); timer = null; } }

  chkRealtime.addEventListener('change', () => { if (chkRealtime.checked) startRealtime(); else stopRealtime(); });
  inputInterval.addEventListener('change', () => { startRealtime(); });
  unitVolEl.addEventListener('change', () => loadAll());
  unitValEl.addEventListener('change', () => loadAll());
  btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('light');
    btnTheme.textContent = document.body.classList.contains('light') ? 'Màu tối' : 'Màu sáng';
  });

  loadAll().then(startRealtime);
})();

