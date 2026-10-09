import { normalizeStoredSymbol } from "@/utils/trading/symbols";

const candleMemoryCache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const CACHE_VERSION = 2;

function getCacheKey(symbol, interval) {
  if (!symbol || !interval) return "";
  const normalizedSym = normalizeStoredSymbol(symbol) || String(symbol).trim().toUpperCase();
  const normalizedInterval = String(interval).trim().toLowerCase();
  return `v${CACHE_VERSION}:${normalizedSym}:${normalizedInterval}`;
}

export function getCachedCandles(symbol, interval, maxAgeMs = DEFAULT_TTL_MS) {
  const cacheKey = getCacheKey(symbol, interval);
  if (!cacheKey) return null;
  const entry = candleMemoryCache.get(cacheKey);
  if (!entry || !Array.isArray(entry.candles) || entry.candles.length === 0) {
    return null;
  }
  if (Date.now() - entry.timestamp >= maxAgeMs) {
    return null;
  }
  return entry.candles;
}

export function setCachedCandles(symbol, interval, candles) {
  const cacheKey = getCacheKey(symbol, interval);
  if (!cacheKey || !Array.isArray(candles) || candles.length === 0) return;
  candleMemoryCache.set(cacheKey, {
    candles,
    timestamp: Date.now(),
  });
}

export function hasFreshCandleCache(symbol, interval, maxAgeMs = DEFAULT_TTL_MS) {
  return getCachedCandles(symbol, interval, maxAgeMs) !== null;
}

export function clearCandleCache(symbol, interval) {
  if (symbol && interval) {
    const cacheKey = getCacheKey(symbol, interval);
    if (cacheKey) candleMemoryCache.delete(cacheKey);
  } else {
    candleMemoryCache.clear();
  }
}
