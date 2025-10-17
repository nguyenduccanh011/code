/* src/pages/cafef-realtime.js */
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
      try { return JSON.parse(text); } catch { /* fallthrough */ }
    }
    throw new Error('Non-JSON response');
  }

  function pick(obj, keys, def = 0) {
    for (const k of keys) {
      if (obj && obj[k] != null) return obj[k];
    }
    return def;
  }

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function normalize(items) {
    // Map theo schema dạng chữ cái của CafeF (ví dụ a,b,c,...)
    // a: mã, b: TC, c: Trần, d: Sàn, e: Mở, l: Giá khớp, k: +/- (thường = l - b),
    // n|totalvolume: KL, g/h: Bid1/Vol1, o/p: Ask1/Vol1
    const out = [];
    for (const it of items || []) {
      const sym = String(it.a || it.s || it.symbol || '').toUpperCase();
      if (!sym) continue;
      const tc = toNum(it.b);
      const tran = toNum(it.c);
      const san = toNum(it.d);
      const open = toNum(it.e);
      const last = toNum(it.l != null ? it.l : it.last);
      const chgAbs = (it.k != null) ? toNum(it.k) : (tc ? last - tc : 0);
      const pct = tc ? (chgAbs / tc) * 100 : 0;
      const vol = toNum(it.totalvolume != null ? it.totalvolume : it.n);
      const bid1 = toNum(it.g);
      const bid1Vol = toNum(it.h);
      const bid2 = toNum(it.i);
      const bid2Vol = toNum(it.j);
      const ask1 = toNum(it.o);
      const ask1Vol = toNum(it.p);
      const ask2 = toNum(it.q);
      const ask2Vol = toNum(it.r);
      const ask3 = toNum(it.s);
      const ask3Vol = toNum(it.t);
      const avg = toNum(it.u);
      const high = toNum(it.v);
      const low = toNum(it.w);
      const lastVol = toNum(it.m);
      const fBuy = toNum(it.x);
      const fSell = toNum(it.y);
      const time = String(it.Time || it.time || '');
      const val = last * vol * 1000;
      out.push({ symbol: sym, tc, tran, san, open, last, chgAbs, pct, vol, val, bid1, bid1Vol, bid2, bid2Vol, ask1, ask1Vol, ask2, ask2Vol, ask3, ask3Vol, avg, high, low, lastVol, fBuy, fSell, time });
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
        td(r.tc ? nf2.format(r.tc) : ''),
        td(r.tran ? nf2.format(r.tran) : ''),
        td(r.san ? nf2.format(r.san) : ''),
        td(r.open ? nf2.format(r.open) : ''),
        td(r.last ? nf2.format(r.last) : ''),
        td((r.chgAbs>0?'+':'') + nf2.format(r.chgAbs), sign),
        td((r.pct>0?'+':'') + nf2.format(r.pct) + '%', sign),
        td(r.vol ? nf0.format(r.vol) : ''),
        td(r.val ? nf0.format(Math.round(r.val)) : ''),
        td(r.bid1 ? nf2.format(r.bid1) : ''),
        td(r.bid1Vol ? nf0.format(r.bid1Vol) : ''),
        td(r.bid2 ? nf2.format(r.bid2) : ''),
        td(r.bid2Vol ? nf0.format(r.bid2Vol) : ''),
        td(r.ask1 ? nf2.format(r.ask1) : ''),
        td(r.ask1Vol ? nf0.format(r.ask1Vol) : ''),
        td(r.ask2 ? nf2.format(r.ask2) : ''),
        td(r.ask2Vol ? nf0.format(r.ask2Vol) : ''),
        td(r.ask3 ? nf2.format(r.ask3) : ''),
        td(r.ask3Vol ? nf0.format(r.ask3Vol) : ''),
        td(r.avg ? nf2.format(r.avg) : ''),
        td(r.high ? nf2.format(r.high) : ''),
        td(r.low ? nf2.format(r.low) : ''),
        td(r.lastVol ? nf0.format(r.lastVol) : ''),
        td(r.fBuy ? nf0.format(r.fBuy) : ''),
        td(r.fSell ? nf0.format(r.fSell) : ''),
        td(r.time || '')
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
      const center = $('#center').value;
      const url = `${base}/api/proxy/cafef/realtime?center=${encodeURIComponent(center)}`;
      const data = await fetchJSON(url);
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const rows = normalize(arr);
      render(rows);
    } catch (e) {
      console.error(e);
      alert('Lỗi tải CafeF: ' + (e && e.message ? e.message : e));
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
    $('#center').addEventListener('change', load);
    $('#autoref').addEventListener('change', schedule);
    load();
    schedule();
  });
})();
