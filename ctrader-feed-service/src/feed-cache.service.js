const { ctraderConfig } = require('./ctrader/state');
const { findExactSymbolMatch } = require('./ctrader/symbols.service');
const tinybirdIngest = require('./tinybird-ingest.service');

tinybirdIngest.startBatchFlusher(30000);

const MAX_ROLLING_CANDLES = 1440;
const rollingCandles = new Map();
const activeCandles = new Map();
const lastQueuedTimestamps = new Map();
let totalTicksCount = 0;
let recentTicksCount = 0;
let lastTickRateWindowMs = Date.now();
let lastCalculatedTicksPerSec = 0;
let isCandleAppendReady = false;
let tinybirdSymbolsSet = new Set();

function toSeconds(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return num > 10_000_000_000 ? Math.floor(num / 1000) : Math.floor(num);
}

function getSymbolByName(symbolName) {
  return findExactSymbolMatch(symbolName);
}

function tickTimeMs(tick) {
  const raw = Number(tick?.timestamp || tick?.serverTime || 0);
  if (Number.isFinite(raw) && raw > 0) return raw > 1e12 ? raw : raw * 1000;
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

async function seedCandles(symbolIdOrName, candles = []) {
  if (!symbolIdOrName || !Array.isArray(candles) || candles.length === 0) return;
  const symInfo = Number.isFinite(Number(symbolIdOrName)) ? ctraderConfig.symbols.get(Number(symbolIdOrName)) : null;
  const symbolName = symInfo?.name || String(symbolIdOrName);
  const valid = candles
    .map((candle) => {
      const isArr = Array.isArray(candle);
      return [
        toSeconds(isArr ? candle[0] : candle?.time),
        Number(isArr ? candle[1] : candle?.open),
        Number(isArr ? candle[2] : candle?.high),
        Number(isArr ? candle[3] : candle?.low),
        Number(isArr ? candle[4] : candle?.close),
        Number(isArr ? candle[5] || 0 : candle?.volume || 0),
      ];
    })
    .filter((c) => Number.isFinite(c[0]) && c[0] > 0 && Number.isFinite(c[1]) && Number.isFinite(c[2]) && Number.isFinite(c[3]) && Number.isFinite(c[4]))
    .sort((a, b) => a[0] - b[0]);
  if (valid.length === 0) return;
  const minTimeSec = Math.floor(Date.now() / 1000) - (MAX_ROLLING_CANDLES * 60);
  const existing = rollingCandles.get(symbolName) || [];
  const byTime = new Map();
  for (const c of existing) if (c[0] >= minTimeSec) byTime.set(c[0], c);
  for (const c of valid) if (c[0] >= minTimeSec && !byTime.has(c[0])) byTime.set(c[0], c);
  const merged = Array.from(byTime.values()).sort((a, b) => a[0] - b[0]).slice(-MAX_ROLLING_CANDLES);
  rollingCandles.set(symbolName, merged);
}

function setCandleAppendReady(ready) {
  isCandleAppendReady = Boolean(ready);
}

function setTinybirdSymbols(symbols = []) {
  tinybirdSymbolsSet = new Set(
    (Array.isArray(symbols) ? symbols : []).map((s) => String(s || '').trim().toUpperCase()).filter(Boolean)
  );
}

function getTinybirdSymbols() {
  return Array.from(tinybirdSymbolsSet);
}

function closeActiveCandle(symbolName, active) {
  if (!isCandleAppendReady || !active || !Number.isFinite(active.volume) || active.volume <= 0) return;
  const prevTs = lastQueuedTimestamps.get(symbolName) || 0;
  if (active.time <= prevTs) return;
  lastQueuedTimestamps.set(symbolName, active.time);
  const closedCandle = [active.time, active.open, active.high, active.low, active.close, active.volume];
  const list = rollingCandles.get(symbolName) || [];
  list.push(closedCandle);
  if (list.length > MAX_ROLLING_CANDLES) list.splice(0, list.length - MAX_ROLLING_CANDLES);
  rollingCandles.set(symbolName, list);
  if (tinybirdSymbolsSet.has(String(symbolName || '').trim().toUpperCase())) {
    tinybirdIngest.queueCandle({
      symbol: symbolName,
      timestamp: active.time,
      open: active.open,
      high: active.high,
      low: active.low,
      close: active.close,
      volume: active.volume,
    });
  }
}

setInterval(() => {
  const nowBucket = Math.floor(Date.now() / 60000) * 60;
  for (const [symbolName, active] of activeCandles.entries()) {
    if (active && active.time < nowBucket) {
      closeActiveCandle(symbolName, active);
      activeCandles.delete(symbolName);
    }
  }
}, 1000);

function recordTick(tick) {
  if (!tick || !Number.isFinite(Number(tick.symbolId))) return null;
  totalTicksCount += 1;
  recentTicksCount += 1;
  const now = Date.now();
  if (now - lastTickRateWindowMs >= 5000) {
    const elapsedSec = (now - lastTickRateWindowMs) / 1000;
    lastCalculatedTicksPerSec = Number((recentTicksCount / elapsedSec).toFixed(1));
    recentTicksCount = 0;
    lastTickRateWindowMs = now;
  }
  const symbolId = Number(tick.symbolId);
  const symInfo = ctraderConfig.symbols.get(symbolId);
  const symbolName = symInfo?.name;
  if (!symbolName) return null;
  const timeMs = tickTimeMs(tick);
  const price = getQuotePrice(tick);
  if (!Number.isFinite(price) || price <= 0) return null;
  const timeSec = Math.floor(timeMs / 1000);
  const bucketSec = Math.floor(timeSec / 60) * 60;
  let active = activeCandles.get(symbolName);
  if (!active) {
    active = { time: bucketSec, open: price, high: price, low: price, close: price, volume: 1 };
    activeCandles.set(symbolName, active);
    return active;
  }
  if (active.time === bucketSec) {
    active.high = Math.max(active.high, price);
    active.low = Math.min(active.low, price);
    active.close = price;
    active.volume = (active.volume || 0) + 1;
  } else if (bucketSec > active.time) {
    closeActiveCandle(symbolName, active);
    active = { time: bucketSec, open: price, high: price, low: price, close: price, volume: 1 };
    activeCandles.set(symbolName, active);
  }
  return active;
}

async function getData(symbolName, { limitCandles = 500 } = {}) {
  const symbol = getSymbolByName(symbolName);
  if (!symbol) return { found: false };
  const requestedLimit = Math.min(Math.max(Number(limitCandles) || 1, 1), MAX_ROLLING_CANDLES);
  const list = (rollingCandles.get(symbol.name) || []).slice(-requestedLimit);
  const candles = list.map((c) => [...c]);
  const active = activeCandles.get(symbol.name);
  if (active) {
    const last = candles[candles.length - 1];
    if (!last || last[0] < active.time) {
      candles.push([active.time, active.open, active.high, active.low, active.close, active.volume]);
    } else if (last && last[0] === active.time) {
      last[2] = Math.max(last[2], active.high);
      last[3] = Math.min(last[3], active.low);
      last[4] = active.close;
      last[5] = (last[5] || 0) + active.volume;
    }
  }
  const latestTick = ctraderConfig.latestTicks.get(Number(symbol.id)) || null;
  const sliced = candles.slice(-requestedLimit);
  return {
    found: true,
    symbol,
    quote: latestTick,
    candles: sliced,
    retentionCount: sliced.length,
    maxCandles: MAX_ROLLING_CANDLES,
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

async function getStatus() {
  const symbols = Array.from(rollingCandles.entries()).map(([sym, list]) => {
    const first = list[0] || null;
    const last = list[list.length - 1] || null;
    return {
      symbol: sym,
      interval: '1m',
      candleCount: list.length,
      firstCandleTime: first ? first[0] : null,
      firstCandleTimeIso: first ? new Date(first[0] * 1000).toISOString() : null,
      lastCandleTime: last ? last[0] : null,
      lastCandleTimeIso: last ? new Date(last[0] * 1000).toISOString() : null,
      lastPrice: last ? last[4] : null,
    };
  });
  return {
    storage: 'memory',
    usedMemory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    maxRollingCandlesPerSymbol: MAX_ROLLING_CANDLES,
    cachedKeysCount: symbols.length,
    activeFormingCandlesInRam: activeCandles.size,
    symbols,
    throughput: {
      totalTicksReceived: totalTicksCount,
      ticksPerSecond: lastCalculatedTicksPerSec,
    },
  };
}

async function removeSymbolCache(symbolName) {
  if (!symbolName) return;
  rollingCandles.delete(symbolName);
}

function pruneAll() {
  rollingCandles.clear();
}

module.exports = {
  getData,
  getQuoteSnapshot,
  getStatus,
  getSymbolByName,
  pruneAll,
  recordTick,
  removeSymbolCache,
  seedCandles,
  setCandleAppendReady,
  setTinybirdSymbols,
  getTinybirdSymbols,
};
