// Time utilities: canonical keys and conversions

export function toDateKey(time) {
  // Accepts {year, month, day} or Date
  if (!time) return '';
  if (time instanceof Date) {
    const y = time.getFullYear();
    const m = String(time.getMonth() + 1).padStart(2, '0');
    const d = String(time.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const y = time.year;
  const m = String(time.month).padStart(2, '0');
  const d = String(time.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function areTimesEqual(a, b) {
  if (!a || !b) return false;
  return toDateKey(a) === toDateKey(b);
}

export function toEpochMs(time) {
  if (!time) return NaN;
  if (time instanceof Date) return time.getTime();
  return new Date(time.year, (time.month || 1) - 1, time.day || 1).getTime();
}

