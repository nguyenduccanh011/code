// Pure SMA crossover strategy with marker generation
import { calculateSMA } from '../utils/math.js';
import { toDateKey } from '../utils/time.js';

export function computeSMACrossoverMarkers(candles, shortPeriod = 9, longPeriod = 20) {
  if (!Array.isArray(candles) || candles.length < Math.max(shortPeriod, longPeriod)) return [];
  const shortSMA = calculateSMA(candles, shortPeriod);
  const longSMA = calculateSMA(candles, longPeriod);

  const shortMap = new Map(shortSMA.map(p => [toDateKey(p.time), p.value]));
  const longMap = new Map(longSMA.map(p => [toDateKey(p.time), p.value]));

  const markers = [];
  for (let i = 1; i < candles.length; i++) {
    const prevKey = toDateKey(candles[i - 1].time);
    const currKey = toDateKey(candles[i].time);
    const ps = shortMap.get(prevKey), pl = longMap.get(prevKey);
    const cs = shortMap.get(currKey), cl = longMap.get(currKey);
    if (ps === undefined || pl === undefined || cs === undefined || cl === undefined) continue;
    if (ps < pl && cs > cl) {
      markers.push({ time: candles[i].time, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: `Buy @ ${candles[i].close.toFixed(2)}` });
    } else if (ps > pl && cs < cl) {
      markers.push({ time: candles[i].time, position: 'aboveBar', color: '#e91e63', shape: 'arrowDown', text: `Sell @ ${candles[i].close.toFixed(2)}` });
    }
  }
  return markers;
}

