(() => {
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5050';

  async function fetchJSON(url) {
    const res = await fetch(url);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  }

  function pretty(data) {
    if (typeof data === 'string') return data;
    try { return JSON.stringify(data, null, 2); } catch { return String(data); }
  }

  // VCBS
  document.getElementById('btn-vcbs')?.addEventListener('click', async () => {
    const criteriaId = document.getElementById('vcbs-market').value;
    const out = document.getElementById('out-vcbs');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/vcbs/priceboard?criteriaId=${encodeURIComponent(criteriaId)}`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // VNDirect
  document.getElementById('btn-vnd')?.addEventListener('click', async () => {
    const q = document.getElementById('vnd-q').value;
    const out = document.getElementById('out-vnd');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/vndirect/stocks?q=${encodeURIComponent(q)}`;
      const data = await fetchJSON(url);
      // Quick summary if JSON envelope detected
      if (data && data.data && Array.isArray(data.data)) {
        const head = data.data.slice(0, 10).map(x => ({ code: x.code, name: x.companyName, floor: x.floor }));
        out.textContent = pretty({ total: data.data.length, preview: head });
      } else {
        out.textContent = pretty(data);
      }
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // VNDirect Company Profiles
  document.getElementById('btn-vnd-prof')?.addEventListener('click', async () => {
    const code = document.getElementById('vnd-prof-code').value.trim();
    const out = document.getElementById('out-vnd-prof');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/vnd/company_profiles?code=${encodeURIComponent(code)}`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // VNDirect Ratios Latest
  document.getElementById('btn-vnd-ratio')?.addEventListener('click', async () => {
    const code = document.getElementById('vnd-ratio-code').value.trim();
    const since = document.getElementById('vnd-ratio-from').value.trim();
    const out = document.getElementById('out-vnd-ratio');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/vnd/ratios_latest?code=${encodeURIComponent(code)}&from=${encodeURIComponent(since)}`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // VNDirect Candles
  document.getElementById('btn-vnd-cdl')?.addEventListener('click', async () => {
    const sym = document.getElementById('vnd-cdl-symbol').value.trim();
    const reso = document.getElementById('vnd-cdl-res').value.trim() || 'D';
    const f = document.getElementById('vnd-cdl-from').value.trim();
    const t = document.getElementById('vnd-cdl-to').value.trim();
    const out = document.getElementById('out-vnd-cdl');
    out.textContent = 'Đang tải...';
    try {
      const qs = new URLSearchParams({ symbol: sym, resolution: reso });
      if (f) qs.set('from', f); if (t) qs.set('to', t);
      const url = `${base}/api/proxy/vnd/candles?${qs.toString()}`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // Vietstock TradingInfo
  document.getElementById('btn-vs-ti')?.addEventListener('click', async () => {
    const sym = document.getElementById('vs-ti-symbol').value.trim();
    const out = document.getElementById('out-vs-ti');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/vietstock/tradinginfo?symbol=${encodeURIComponent(sym)}`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // CafeF realtime
  document.getElementById('btn-cafef')?.addEventListener('click', async () => {
    const center = document.getElementById('cafef-center').value;
    const out = document.getElementById('out-cafef');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/cafef/realtime?center=${encodeURIComponent(center)}`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // VCBS normalized priceboard
  document.getElementById('btn-vcbs-norm')?.addEventListener('click', async () => {
    const criteria = document.getElementById('vcbs-norm-criteria').value;
    const out = document.getElementById('out-vcbs-norm');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/vcbs/priceboard/normalized?criteriaId=${encodeURIComponent(criteria)}`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // FPTS
  document.getElementById('btn-fpts')?.addEventListener('click', async () => {
    const out = document.getElementById('out-fpts');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/fpts/company_name`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // Vietstock stocklist
  document.getElementById('btn-vietstock')?.addEventListener('click', async () => {
    const catID = document.getElementById('vs-cat').value;
    const out = document.getElementById('out-vietstock');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/vietstock/stocklist?catID=${encodeURIComponent(catID)}`;
      const data = await fetchJSON(url);
      if (Array.isArray(data)) {
        out.textContent = pretty({ total: data.length, preview: data.slice(0, 10) });
      } else {
        out.textContent = pretty(data);
      }
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // FireAnt quotes
  document.getElementById('btn-fireant')?.addEventListener('click', async () => {
    const symbols = document.getElementById('fa-symbols').value;
    const out = document.getElementById('out-fireant');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/fireant/quotes?symbols=${encodeURIComponent(symbols)}`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // MBS stocklist
  document.getElementById('btn-mbs')?.addEventListener('click', async () => {
    const out = document.getElementById('out-mbs');
    out.textContent = 'Đang tải...';
    try {
      const url = `${base}/api/proxy/mbs/stocklist`;
      const data = await fetchJSON(url);
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // SSI GraphQL
  document.getElementById('btn-ssi')?.addEventListener('click', async () => {
    const query = document.getElementById('ssi-query').value;
    const out = document.getElementById('out-ssi');
    out.textContent = 'Đang tải...';
    try {
      const res = await fetch(`${base}/api/proxy/ssi/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      out.textContent = pretty(data);
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // VCBS CCQM HTML
  document.getElementById('btn-ccqm')?.addEventListener('click', async () => {
    const out = document.getElementById('out-ccqm');
    out.textContent = 'Đang tải...';
    try {
      const res = await fetch(`${base}/api/proxy/vcbs/ccqm`);
      const text = await res.text();
      out.textContent = text.slice(0, 2000) + (text.length > 2000 ? '\n... (truncated)' : '');
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });

  // VCBS Company Profile HTML
  document.getElementById('btn-vcbs-company')?.addEventListener('click', async () => {
    const symbol = document.getElementById('vcbs-symbol').value;
    const out = document.getElementById('out-vcbs-company');
    out.textContent = 'Đang tải...';
    try {
      const res = await fetch(`${base}/api/proxy/vcbs/company?stocksymbol=${encodeURIComponent(symbol)}`);
      const text = await res.text();
      out.textContent = text.slice(0, 2000) + (text.length > 2000 ? '\n... (truncated)' : '');
    } catch (e) {
      out.textContent = 'Lỗi: ' + e;
    }
  });
})();
