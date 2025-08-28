// Minimal JS tests without external frameworks
import assert from 'node:assert/strict';
import { calculateSMA, mergeDedupAndSortByTime } from '../src/utils/math.js';
import { toDateKey, areTimesEqual, toEpochMs } from '../src/utils/time.js';
import { ATRIndicator } from '../src/indicators/ATRIndicator.js';

function testCalculateSMA() {
  const candles = [
    { time: { year: 2024, month: 1, day: 1 }, close: 1 },
    { time: { year: 2024, month: 1, day: 2 }, close: 2 },
    { time: { year: 2024, month: 1, day: 3 }, close: 3 },
    { time: { year: 2024, month: 1, day: 4 }, close: 4 },
  ];
  const out = calculateSMA(candles, 2);
  assert.equal(out.length, 3);
  assert.equal(out[0].value, (1 + 2) / 2);
  assert.equal(out[1].value, (2 + 3) / 2);
  assert.equal(out[2].value, (3 + 4) / 2);
  assert.deepEqual(out[2].time, { year: 2024, month: 1, day: 4 });
}

function testMergeDedupAndSortByTime() {
  const existing = [
    { time: { year: 2024, month: 1, day: 2 }, v: 'a' },
    { time: { year: 2024, month: 1, day: 1 }, v: 'b' },
  ];
  const incoming = [
    { time: { year: 2024, month: 1, day: 3 }, v: 'c' },
    { time: { year: 2024, month: 1, day: 1 }, v: 'b2' }, // dedup should replace day 1
  ];
  const out = mergeDedupAndSortByTime(existing, incoming);
  assert.equal(out.length, 3);
  // Sorted ascending by date
  assert.deepEqual(out.map(x => x.time.day), [1, 2, 3]);
  // Day 1 should come from incoming (b2)
  assert.equal(out[0].v, 'b2');
}

function run() {
  testCalculateSMA();
  testMergeDedupAndSortByTime();
  // time.js tests
  (function testTimeUtils() {
    const d = new Date(2024, 0, 5); // Jan 5, 2024
    if (toDateKey(d) !== '2024-01-05') throw new Error('toDateKey(Date)');
    if (toDateKey({ year: 2024, month: 1, day: 5 }) !== '2024-01-05') throw new Error('toDateKey(obj)');
    if (!areTimesEqual({ year: 2024, month: 1, day: 5 }, d)) throw new Error('areTimesEqual');
    const ms = toEpochMs({ year: 2024, month: 1, day: 5 });
    if (Number.isNaN(ms) || new Date(ms).getFullYear() !== 2024) throw new Error('toEpochMs');
  })();
  // ATRIndicator.calculate() tests (pure logic)
  (function testATRCalculate() {
    const data = [
      { time: 1, high: 10, low: 9, close: 9.5 },
      { time: 2, high: 11, low: 9, close: 10 },
      { time: 3, high: 12, low: 10, close: 11 },
      { time: 4, high: 13, low: 11, close: 12 },
      { time: 5, high: 14, low: 12, close: 13 },
    ];
    const atr = new ATRIndicator({ style: {} }, { period: 3 });
    const out = atr.calculate(data);
    assert.equal(out.length, data.length - 3); // period=3 -> 2 outputs
    assert.deepEqual(out.map(x => x.time), [4, 5]);
    // With constant true ranges of 2, ATR should be 2
    assert.ok(out.every(x => Math.abs(x.value - 2) < 1e-9));
  })();
  console.log('JS tests passed');
}

run();
