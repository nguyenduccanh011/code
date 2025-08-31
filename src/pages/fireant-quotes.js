/* src/pages/fireant-quotes.js */
(function () {
  const base = window.API_PROXY_BASE || 'http://127.0.0.1:5050';
  const $ = (s) => document.querySelector(s);
  const nf0 = new Intl.NumberFormat('vi-VN');
  const nf2 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

  async function fetchJSON(url) {
    const res = await fetch(url);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();
    if (ct.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
      try { return JSON.parse(text); } catch {}
    }
    throw new Error('Non-JSON response');
  }

  function pick(o, arr, def = 0) {
    for (const k of arr) { if (o && o[k] != null) return o[k]; }
    return def;
  }
  function toNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

  function normalize(items) {
    // FireAnt schema (thông dụng):
    // symbol, refPrice|ref, ceiling|ce, floor|fl, openPrice|open,
    // lastPrice|matchedPrice|price, change|priceChange, changePercent|priceChangePercent,
    // nmTotalTradedQty|accumulatedVol|volume, totalTradedValue|value,
    // best1Bid, best1BidVol, best1Offer, best1OfferVol,
    // highest|high, lowest|low, avgPrice|averagePrice,
    // buyForeignQtty|buyForeign, sellForeignQtty|sellForeign
    const out = [];
    for (const it of items || []) {
      const sym = String(pick(it, ['symbol','Symbol','code','s'], '')).toUpperCase();
      if (!sym) continue;
      const ref = toNum(pick(it, ['refPrice','ref','refprice','PriceBasic']));
      const ceil = toNum(pick(it, ['ceiling','ceilingPrice','ce','PriceCeiling']));
      const floor = toNum(pick(it, ['floor','floorPrice','fl','PriceFloor']));
      const open = toNum(pick(it, ['openPrice','open','PriceOpen']));
      const last = toNum(pick(it, ['lastPrice','matchedPrice','matchPrice','price','PriceCurrent','PriceLast']));
      let chgAbs = toNum(pick(it, ['change','priceChange','chg']));
      if (!chgAbs && ref) chgAbs = last - ref;
      let pct = toNum(pick(it, ['changePercent','priceChangePercent','pct']));
      if (!pct) {
        const ppc = pick(it, ['PricePercentChange']);
        if (ppc != null) pct = toNum(ppc) * 100; // PricePercentChange là số thập phân
        else if (ref) pct = ref ? ((last - ref) / ref) * 100 : 0;
      }
      const vol = toNum(pick(it, ['nmTotalTradedQty','accumulatedVol','volume','TotalVolume','Volume']));
      const value = toNum(pick(it, ['totalTradedValue','value','TotalValue']));
      const bid1 = toNum(pick(it, ['best1Bid','b1','PriceBid1']));
      const bid1Vol = toNum(pick(it, ['best1BidVol','b1Vol','QuantityBid1']));
      const ask1 = toNum(pick(it, ['best1Offer','a1','PriceAsk1']));
      const ask1Vol = toNum(pick(it, ['best1OfferVol','a1Vol','QuantityAsk1']));
      const high = toNum(pick(it, ['highest','high','PriceHigh']));
      const low = toNum(pick(it, ['lowest','low','PriceLow']));
      const avg = toNum(pick(it, ['avgPrice','averagePrice','PriceAverage']));
      const fBuy = toNum(pick(it, ['buyForeignQtty','buyForeign','BuyForeignQuantity']));
      const fSell = toNum(pick(it, ['sellForeignQtty','sellForeign','SellForeignQuantity']));
      const val = value || (last * vol * 1000);
      out.push({ symbol: sym, ref, ceil, floor, open, last, chgAbs, pct, vol, val, bid1, bid1Vol, ask1, ask1Vol, high, low, avg, fBuy, fSell });
    }
    return out;
  }

  function render(rows) {
    const tbody = $('#rows');
    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const r of rows) {
      const tr = document.createElement('tr');
      const td = (t, cls = '', align = 'right') => { const c = document.createElement('td'); c.textContent = t; if (cls) c.className = cls; c.style.textAlign = align; return c; };
      const sign = r.chgAbs > 0 ? 'up' : (r.chgAbs < 0 ? 'down' : 'eq');
      tr.append(
        td(r.symbol, '', 'left'),
        td(r.ref ? nf2.format(r.ref) : ''),
        td(r.ceil ? nf2.format(r.ceil) : ''),
        td(r.floor ? nf2.format(r.floor) : ''),
        td(r.open ? nf2.format(r.open) : ''),
        td(r.last ? nf2.format(r.last) : ''),
        td((r.chgAbs>0?'+':'') + nf2.format(r.chgAbs), sign),
        td((r.pct>0?'+':'') + nf2.format(r.pct) + '%', sign),
        td(r.vol ? nf0.format(r.vol) : ''),
        td(r.val ? nf0.format(Math.round(r.val)) : ''),
        td(r.bid1 ? nf2.format(r.bid1) : ''),
        td(r.bid1Vol ? nf0.format(r.bid1Vol) : ''),
        td(r.ask1 ? nf2.format(r.ask1) : ''),
        td(r.ask1Vol ? nf0.format(r.ask1Vol) : ''),
        td(r.high ? nf2.format(r.high) : ''),
        td(r.low ? nf2.format(r.low) : ''),
        td(r.avg ? nf2.format(r.avg) : ''),
        td(r.fBuy ? nf0.format(r.fBuy) : ''),
        td(r.fSell ? nf0.format(r.fSell) : '')
      );
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
    $('#stamp').textContent = new Date().toLocaleTimeString('vi-VN');
  }

  let timer = null;
  async function load() {
    $('#reload').disabled = true;
    try {
      const symbols = $('#fa-symbols').value.trim();
      const url = `${base}/api/proxy/fireant/quotes?symbols=${encodeURIComponent(symbols)}`;
      const data = await fetchJSON(url);
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const rows = normalize(arr);
      render(rows);
    } catch (e) {
      console.error(e);
      alert('Lỗi tải FireAnt: ' + (e && e.message ? e.message : e));
    } finally {
      $('#reload').disabled = false;
    }
  }

  function schedule() {
    if (timer) clearInterval(timer);
    if ($('#autoref').checked) timer = setInterval(load, 15000);
  }

  window.addEventListener('DOMContentLoaded', () => {
    $('#reload').addEventListener('click', load);
    $('#autoref').addEventListener('change', schedule);
    load();
    schedule();
  });
})();
