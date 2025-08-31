(() => {
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5050';

  function fmt(v, digits = 2) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number(v).toLocaleString('en-US', { maximumFractionDigits: digits });
    return String(v);
  }

  function pctSmart(v) {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (!isFinite(n)) return '';
    // Heuristic: some TVSI fields are already percent units (e.g. 0.91 -> 0.91%)
    // others are ratios (e.g. -0.3616 -> -36.16%). If abs <= 2, treat as percent value.
    const val = Math.abs(n) <= 2 ? n : n * 100;
    return val.toFixed(2) + '%';
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  }

  function setDateDefaults() {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 20);
    document.getElementById('cp-to').value = to.toISOString().slice(0, 10);
    document.getElementById('cp-from').value = from.toISOString().slice(0, 10);
  }

  async function loadAll() {
    const symbol = document.getElementById('cp-symbol').value.trim().toUpperCase();
    const dateFrom = document.getElementById('cp-from').value;
    const dateTo = document.getElementById('cp-to').value;

    const [overview, lastestRaw, price, stat] = await Promise.all([
      fetchJSON(`${base}/api/proxy/tvsi/overview?symbol=${encodeURIComponent(symbol)}`),
      fetchJSON(`${base}/api/proxy/tvsi/lastest?symbols=${encodeURIComponent(symbol)}`),
      fetchJSON(`${base}/api/proxy/tvsi/pricehistory?symbol=${encodeURIComponent(symbol)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&pageSize=20&pageIndex=1&filter=day`),
      fetchJSON(`${base}/api/proxy/tvsi/statistic?symbol=${encodeURIComponent(symbol)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&pageSize=20&pageIndex=1&filter=day`),
    ]);

    const lastest = normalizeLastest(lastestRaw);
    renderCurrent(lastest);
    renderOverview(overview);
    renderPrice(price?.data || []);
    renderStat(stat?.data || []);
  }

  function pick(o, keys) {
    if (!o) return undefined;
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null) return o[k];
    }
    return undefined;
  }

  function normalizeLastest(raw) {
    // Accept object, {data: {...}}, or array
    let d = raw;
    if (d && typeof d === 'object' && d.data && typeof d.data === 'object') d = d.data;
    if (Array.isArray(d)) d = d[0];
    if (!d || typeof d !== 'object') return {};
    return {
      matchPrice: pick(d, ['matchPrice', 'priceMatch', 'lastPrice']),
      priceChange: pick(d, ['priceChange', 'change']),
      priceChangePercent: pick(d, ['priceChangePercent', 'pctChange', 'changeRate']),
      basicPrice: pick(d, ['basicPrice', 'referencePrice']),
      ceilingPrice: pick(d, ['ceilingPrice', 'ceiling']),
      floorPrice: pick(d, ['floorPrice', 'floor']),
      lowestPrice: pick(d, ['lowestPrice', 'lowPrice', 'low']),
      highestPrice: pick(d, ['highestPrice', 'highPrice', 'high']),
      matchQtty: pick(d, ['matchQtty', 'matchVolume', 'volume']),
      totalTradingValue: pick(d, ['totalTradingValue', 'matchValue', 'value']),
      marketId: pick(d, ['marketId', 'market']),
      indexCode: pick(d, ['indexCode']),
      index30Code: pick(d, ['index30Code']),
    };
  }

  function marketName(id) {
    const m = String(id || '').toUpperCase();
    if (m === 'O' || m === 'HOSE' || m === '10') return 'HOSE';
    if (m === 'H' || m === 'HNX' || m === '02') return 'HNX';
    if (m === 'U' || m === 'UPCOM' || m === '04') return 'UPCOM';
    return id ?? '';
  }

  function renderCurrent(d) {
    const el = document.getElementById('kpi-current');
    if (!d || typeof d !== 'object') { el.innerHTML = '<div class="box">Không có dữ liệu</div>'; return; }
    const items = [
      { name: 'Giá hiện tại', val: d.matchPrice },
      { name: 'Thay đổi', val: d.priceChange },
      { name: '% Thay đổi', val: pctSmart(d.priceChangePercent) },
      { name: 'Giá tham chiếu', val: d.basicPrice },
      { name: 'Giá trần', val: d.ceilingPrice },
      { name: 'Giá sàn', val: d.floorPrice },
      { name: 'Biên độ ngày', val: `${fmt(d.lowestPrice)} - ${fmt(d.highestPrice)}` },
      { name: 'Khối lượng', val: d.matchQtty },
      { name: 'Giá trị', val: d.totalTradingValue },
      { name: 'Sàn', val: marketName(d.marketId) },
      { name: 'Index', val: d.indexCode },
      { name: 'Index30', val: d.index30Code },
    ];
    el.innerHTML = items.map(it => `
      <div class="box">
        <div class="name">${it.name}</div>
        <div class="val mono">${fmt(it.val)}</div>
      </div>`).join('');
  }

  function renderOverview(o) {
    const tb = document.querySelector('#tbl-overview tbody');
    if (!o || typeof o !== 'object') { tb.innerHTML = '<tr><td>Không có dữ liệu</td></tr>'; return; }
    const rows = [
      ['Thị giá vốn', fmt(o.marketCapital)],
      ['Giá mở cửa', fmt(o.firstPrice)],
      ['Giao động giá 52 tuần', o.priceChange52Week],
      ['KLGD TB (10 ngày)', fmt(o.averageVolume10Day, 0)],
      ['% biến động 5 phiên', pctSmart(o.percentPriceChange1Week)],
      ['% biến động giá 1 tháng', pctSmart(o.percentPriceChange1Month)],
      ['% biến động giá 3 tháng', pctSmart(o.percentPriceChange3Month)],
      ['% biến động giá 6 tháng', pctSmart(o.percentPriceChange6Month)],
      ['% biến động giá 1 năm', pctSmart(o.percentPriceChange1Year)],
      ['% biến động giá từ đầu năm', pctSmart(o.percentPriceChangeYTD)],
      ['% biến động giá từ khi niêm yết', pctSmart(o.percentPriceChangeFTD)],
      ['Số CP đang lưu hành', fmt(o.outstandingShare, 0)],
      ['SLCP giao dịch tự do', fmt(o.freeFloat, 0)],
      ['Room còn lại NĐTNN', fmt(o.roomForeign, 0)],
      ['P/E cơ bản', fmt(o.pe)],
      ['P/E pha loãng', fmt(o.dilutionPE)],
      ['P/B', fmt(o.pb)],
      ['EPS cơ bản (12 tháng)', fmt(o.eps)],
      ['EPS pha loãng (12 tháng)', fmt(o.dilutionEps)],
      ['Giá trị sổ sách', fmt(o.bookValue)],
      ['Lợi tức gần nhất', fmt(o.lastDividend)],
      ['ROE (trailing 4 quý) %', fmt(o.roe)],
    ];
    tb.innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join('');
  }

  function renderPrice(arr) {
    const tb = document.querySelector('#tbl-price tbody');
    tb.innerHTML = arr.map(x => `
      <tr>
        <td class="mono">${x.tradingDate?.slice(0,10) || ''}</td>
        <td class="mono">${fmt(x.matchPrice)}</td>
        <td class="mono">${fmt(x.priceChange)}</td>
        <td class="mono">${pctSmart(x.percentPriceChange)}</td>
        <td class="mono">${fmt(x.totalVolume, 0)}</td>
        <td class="mono">${fmt(x.totalValue, 0)}</td>
      </tr>`).join('');
  }

  function renderStat(arr) {
    const tb = document.querySelector('#tbl-stat tbody');
    tb.innerHTML = arr.map(x => `
      <tr>
        <td class="mono">${x.tradingDate?.slice(0,10) || ''}</td>
        <td class="mono">${fmt(x.matchPrice)}</td>
        <td class="mono">${pctSmart(x.percentPriceChange)}</td>
        <td class="mono">${fmt(x.totalBuyTrade, 0)}</td>
        <td class="mono">${fmt(x.totalBuyTradeVolume, 0)}</td>
        <td class="mono">${fmt(x.averageVolume1Buy)}</td>
        <td class="mono">${fmt(x.totalSellTrade, 0)}</td>
        <td class="mono">${fmt(x.totalSellTradeVolume, 0)}</td>
        <td class="mono">${fmt(x.averageVolume1Sell)}</td>
        <td class="mono">${fmt(x.netVolume, 0)}</td>
      </tr>`).join('');
  }

  document.getElementById('cp-load')?.addEventListener('click', loadAll);
  setDateDefaults();
  loadAll();
})();
