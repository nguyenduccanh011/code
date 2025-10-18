// Numeric and series utilities

export function calculateSMA(candles, period) {
  if (!Array.isArray(candles) || period <= 0) return [];
  const out = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: sum / period });
    }
  }
  return out;
}

export function mergeDedupAndSortByTime(existing, incoming, toKey) {
  const map = new Map();
  const keyFn = toKey || (c => `${c.time.year}-${c.time.month}-${c.time.day}`);
  for (const c of existing) map.set(keyFn(c), c);
  for (const c of incoming) map.set(keyFn(c), c);
  const arr = Array.from(map.values());
  arr.sort((a, b) => new Date(a.time.year, a.time.month - 1, a.time.day) - new Date(b.time.year, b.time.month - 1, b.time.day));
  return arr;
}

