(() => {
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5050';
  const tbody = document.getElementById('cd-tbody');
  const loading = document.getElementById('cd-loading');
  const countEl = document.getElementById('cd-count');
  const searchEl = document.getElementById('cd-search');
  const exchangeEl = document.getElementById('cd-exchange');
  const industryEl = document.getElementById('cd-industry');
  const btnRefresh = document.getElementById('cd-refresh');

  let all = [];
  const MAIN_BASE = (window.API_MAIN_BASE || localStorage.getItem('API_MAIN_BASE') || '').trim();

  async function fetchVNDirect() {
    const url = `${base}/api/proxy/vndirect/stocks?q=${encodeURIComponent('type:IFC,ETF,STOCK~status:LISTED')}&size=3000`;
    const res = await fetch(url);
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  }

  async function enrichIndustryViaBackend(symbols) {
    if (!MAIN_BASE) return {};
    try {
      const p = new URL('/api/screener?exchange=HOSE,HNX,UPCOM&limit=3000', MAIN_BASE).toString();
      const res = await fetch(p);
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      const map = {};
      for (const it of list) {
        const sym = String(it.ticker || it.symbol || '').toUpperCase();
        const ind = it.industry || it.sector || it.industryName || it.industry_vnd || '';
        if (sym && ind) map[sym] = ind;
      }
      return map;
    } catch (e) {
      console.warn('enrichIndustryViaBackend failed', e);
      return {};
    }
  }

  function getIndustry(x) {
    return (
      x.industryEnriched || x.industryName || x.industry || x.icbName || x.sectorName || x.industryEnName ||
      x.industryNameLevel2 || x.industryLevel2Name || ''
    );
  }

  function buildIndustryOptions(data) {
    const set = new Set();
    data.forEach(x => { const v = getIndustry(x); if (v) set.add(String(v)); });
    const opts = [''];
    for (const v of Array.from(set).sort()) opts.push(v);
    industryEl.innerHTML = opts.map(v => `<option value="${v}">${v || 'Ngành (tất cả)'}</option>`).join('');
  }

  function render(list) {
    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach(x => {
      const tr = document.createElement('tr');
      const industry = getIndustry(x);
      tr.innerHTML = `
        <td class="w-s">${x.code || ''}</td>
        <td>${x.companyName || ''}</td>
        <td class="w-m">${x.floor || ''}</td>
        <td class="w-l">${industry || ''}</td>
        <td class="w-m">${x.listedDate || ''}</td>
        <td class="w-m">${x.type || ''}</td>
        <td class="w-m">${x.status || ''}</td>
        <td class="w-m">${x.taxCode || ''}</td>
      `;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    countEl.textContent = `${list.length} mục`;
  }

  function applyFilter() {
    const kw = (searchEl.value || '').trim().toLowerCase();
    const ex = (exchangeEl.value || '').trim();
    const ind = (industryEl.value || '').trim();
    let list = all;
    if (kw) {
      list = list.filter(x => String(x.code||'').toLowerCase().includes(kw) || String(x.companyName||'').toLowerCase().includes(kw));
    }
    if (ex) list = list.filter(x => (x.floor||'') === ex);
    if (ind) list = list.filter(x => (getIndustry(x)||'') === ind);
    list = list.sort((a,b) => String(a.code||'').localeCompare(String(b.code||'')));
    render(list);
  }

  async function load() {
    loading.style.display = 'grid';
    try {
      all = await fetchVNDirect();
      // Try to enrich industry using backend (optional)
      const map = await enrichIndustryViaBackend(all.map(x => x.code));
      if (Object.keys(map).length) {
        all.forEach(x => {
          const sym = String(x.code || '').toUpperCase();
          if (map[sym] && !x.industryName && !x.industry) x.industryEnriched = map[sym];
        });
      }
      buildIndustryOptions(all);
      applyFilter();
    } catch (e) {
      console.error(e);
      render([]);
    } finally {
      loading.style.display = 'none';
    }
  }

  // Events
  btnRefresh.addEventListener('click', load);
  searchEl.addEventListener('input', () => applyFilter());
  exchangeEl.addEventListener('change', () => applyFilter());
  industryEl.addEventListener('change', () => applyFilter());

  load();
})();
