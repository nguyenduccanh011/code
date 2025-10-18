// Human-readable formatting

export function formatLargeNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '---';
  const n = Number(num);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' tỉ';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' tr';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' k';
  return n.toLocaleString();
}

