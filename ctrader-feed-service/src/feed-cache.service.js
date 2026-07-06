const { ctraderConfig } = require('./ctrader/state');

const DEFAULT_RETENTION_MS = 15 * 60 * 1000;

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

const RETENTION_MS = boundedNumber(
  process.env.FEED_RETENTION_MS,
  DEFAULT_RETENTION_MS,
  60 * 1000,
  4 * 60 * 60 * 1000
);
const MAX_TICKS_PER_SYMBOL = boundedNumber(process.env.FEED_MAX_TICKS_PER_SYMBOL, 500, 1, 20000);

const INTERVAL_SECONDS = {
  '1m': 60,
  '3m': 3 * 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '30m': 30 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
};

const tickCache = new Map();
const candleSeedCache = new Map();

function normalizeSymbolName(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function getSymbolByName(symbolName) {
  const normalized = normalizeSymbolName(symbolName);
  for (const symbol of ctraderConfig.symbols.values()) {
    if (symbol.normalizedName === normalized) return symbol;
  }
  return null;
}

function tickTimeMs(tick) {
  const raw = Number(tick?.timestamp || tick?.serverTime || 0);
  if (Number.isFinite(raw) && raw > 0) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  return Date.now();
}

function getQuotePrice(tick) {
  const bid = Number(tick?.bid);
  const ask = Number(tick?.ask);
  const validBid = Number.isFinite(bid) && bid > 0;
  const validAsk = Number.isFinite(ask) && ask > 0;
  if (validBid && validAsk) return (bid + ask) / 2;
  if (validBid) return bid;
  if (validAsk) return ask;
  return null;
}

function pruneSymbolTicks(symbolId) {
  const key = Number(symbolId);
  const arr = tickCache.get(key);
  if (!arr) return [];

  const cutoff = Date.now() - RETENTION_MS;
  let start = 0;
  while (start < arr.length && Number(arr[start].timeMs) < cutoff) {
    start += 1;
  }

  let next = start > 0 ? arr.slice(start) : arr;
  if (next.length > MAX_TICKS_PER_SYMBOL) {
    next = next.slice(next.length - MAX_TICKS_PER_SYMBOL);
  }

  tickCache.set(key, next);
  return next;
}

function pruneAll() {
  for (const symbolId of tickCache.keys()) {
    pruneSymbolTicks(symbolId);
  }

  const cutoffSeconds = Math.floor((Date.now() - RETENTION_MS) / 1000);
  for (const [seedKey, candles] of candleSeedCache.entries()) {
    const filtered = candles.filter((candle) => Number(candle.time) >= cutoffSeconds);
    candleSeedCache.set(seedKey, filtered);
  }
}

function recordTick(tick) {
  if (!tick || !Number.isFinite(Number(tick.symbolId))) return;

  const symbolId = Number(tick.symbolId);
  const timeMs = tickTimeMs(tick);
  const price = getQuotePrice(tick);

  const item = {
    symbolId,
    symbolName: tick.symbolName || null,
    time: Math.floor(timeMs / 1000),
    timeMs,
    bid: Number.isFinite(Number(tick.bid)) && Number(tick.bid) > 0 ? Number(tick.bid) : null,
    ask: Number.isFinite(Number(tick.ask)) && Number(tick.ask) > 0 ? Number(tick.ask) : null,
    last: Number.isFinite(Number(price)) ? Number(price) : null,
    receivedAt: tick.receivedAt || new Date().toISOString(),
  };

  const arr = tickCache.get(symbolId) || [];
  arr.push(item);
  tickCache.set(symbolId, arr);
  pruneSymbolTicks(symbolId);
}

function seedCandles(symbolId, interval, candles = []) {
  const id = Number(symbolId);
  if (!Number.isFinite(id) || !interval) return;

  const cutoffSeconds = Math.floor((Date.now() - RETENTION_MS) / 1000);
  const valid = candles
    .filter((candle) => Number(candle?.time) >= cutoffSeconds)
    .map((candle) => ({
      time: Math.floor(Number(candle.time)),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    }))
    .filter((candle) => (
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ));

  candleSeedCache.set(`${id}:${interval}`, valid);
}

function buildCandlesFromTicks(ticks, interval = '1m') {
  const bucketSize = INTERVAL_SECONDS[interval] || INTERVAL_SECONDS['1m'];
  const byTime = new Map();

  for (const tick of ticks || []) {
    const price = Number(tick.last);
    const time = Number(tick.time);
    if (!Number.isFinite(price) || !Number.isFinite(time)) continue;

    const bucket = Math.floor(time / bucketSize) * bucketSize;
    const existing = byTime.get(bucket);

    if (!existing) {
      byTime.set(bucket, { time: bucket, open: price, high: price, low: price, close: price });
      continue;
    }

    existing.high = Math.max(existing.high, price);
    existing.low = Math.min(existing.low, price);
    existing.close = price;
  }

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

function mergeCandles(seed = [], live = []) {
  const byTime = new Map();
  for (const candle of seed) byTime.set(Number(candle.time), candle);
  for (const candle of live) byTime.set(Number(candle.time), candle);
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

function getData(symbolName, { interval = '1m', limitTicks = 2000, limitCandles = 500 } = {}) {
  const symbol = getSymbolByName(symbolName);
  if (!symbol) {
    return { found: false };
  }

  const symbolId = Number(symbol.id);
  const ticks = pruneSymbolTicks(symbolId);
  const latestTick = ctraderConfig.latestTicks.get(symbolId) || null;
  const seed = candleSeedCache.get(`${symbolId}:${interval}`) || [];
  const liveCandles = buildCandlesFromTicks(ticks, interval);
  const candles = mergeCandles(seed, liveCandles);

  return {
    found: true,
    symbol,
    quote: latestTick,
    ticks: ticks.slice(-Math.min(Math.max(Number(limitTicks) || 1, 1), MAX_TICKS_PER_SYMBOL)),
    candles: candles.slice(-Math.min(Math.max(Number(limitCandles) || 1, 1), 2000)),
    retentionMs: RETENTION_MS,
    retainedHours: RETENTION_MS / (60 * 60 * 1000),
    maxTicksPerSymbol: MAX_TICKS_PER_SYMBOL,
    cacheOnly: true,
  };
}

function getQuoteSnapshot(symbolName) {
  const symbol = getSymbolByName(symbolName);
  if (!symbol) return { found: false };
  return {
    found: true,
    symbol,
    quote: ctraderConfig.latestTicks.get(Number(symbol.id)) || null,
  };
}

function getStatus() {
  pruneAll();

  return {
    retentionMs: RETENTION_MS,
    retainedHours: RETENTION_MS / (60 * 60 * 1000),
    maxTicksPerSymbol: MAX_TICKS_PER_SYMBOL,
    symbolCacheCount: tickCache.size,
    cachedSymbols: Array.from(tickCache.entries()).map(([symbolId, ticks]) => ({
      symbolId: Number(symbolId),
      symbolName: ctraderConfig.symbols.get(Number(symbolId))?.name || null,
      tickCount: ticks.length,
      firstTime: ticks[0]?.time || null,
      lastTime: ticks[ticks.length - 1]?.time || null,
    })),
  };
}

module.exports = {
  getData,
  getQuoteSnapshot,
  getStatus,
  pruneAll,
  recordTick,
  seedCandles,
};
