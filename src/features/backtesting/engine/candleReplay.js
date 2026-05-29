export function getVisibleCandles(candles, currentIndex, strictReplay = true) {
  if (!Array.isArray(candles)) return [];
  if (!strictReplay) return candles;
  return candles.slice(0, Math.min(Math.max(currentIndex + 1, 1), candles.length));
}

export function nextIndex(currentIndex, candles) {
  return Math.min(currentIndex + 1, Math.max((candles?.length || 1) - 1, 0));
}

export function previousIndex(currentIndex) {
  return Math.max(currentIndex - 1, 0);
}

export function getCurrentCandle(candles, currentIndex) {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  return candles[Math.min(Math.max(currentIndex, 0), candles.length - 1)];
}
