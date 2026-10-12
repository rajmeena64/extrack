const FUTURES_BASE_URL = 'https://fapi.binance.com';
const SPOT_BASE_URL = 'https://api.binance.com';
const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 10000;
const BINANCE_MAX_LIMIT = 1500;
const SYMBOL_REGEX = /^[A-Z0-9]{3,32}$/;

const INTERVAL_MS = {
  '1m': 60 * 1000,
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

function normalizeSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function isValidSymbol(symbol) {
  return SYMBOL_REGEX.test(normalizeSymbol(symbol));
}

function normalizeLimit(limit) {
  if (limit === undefined || limit === null) return undefined;
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function normalizeTimeframe(timeframe = '1m') {
  const normalized = String(timeframe || '1m').trim().toLowerCase();
  const canonical = normalized === '1d' ? '1d' : normalized;

  if (!INTERVAL_MS[canonical]) {
    throw new Error('Invalid Binance timeframe');
  }

  return canonical;
}

function toMillis(value, label = 'timestamp') {
  if (value === undefined || value === null || value === '' || value === 'undefined' || value === 'null') {
    return undefined;
  }
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    return num < 10_000_000_000 ? num * 1000 : num;
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.getTime();
  }
  throw new Error(`Invalid ${label}`);
}

function toBinanceSymbol(symbol) {
  const clean = normalizeSymbol(symbol);
  if (/^.+(USDT|USDC|BUSD)$/.test(clean)) return clean;
  if (clean.endsWith('USD')) return `${clean}T`;
  return `${clean}USDT`;
}

function mapBinanceKline(kline) {
  const openTime = Number(kline[0]);

  return {
    time: Math.floor(openTime / 1000),
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    volume: Number(kline[5] || 0),
  };
}

async function fetchBinanceKlines({ symbol, timeframe, startTime, endTime, limit, market = 'spot' }) {
  const binanceSymbol = toBinanceSymbol(symbol);
  const params = new URLSearchParams({
    symbol: binanceSymbol,
    interval: timeframe,
    limit: String(Math.min(Number(limit || DEFAULT_LIMIT), BINANCE_MAX_LIMIT)),
  });

  if (Number.isFinite(startTime)) params.set('startTime', String(startTime));
  if (Number.isFinite(endTime)) params.set('endTime', String(endTime));

  const isFutures = market === 'usdmFutures' || market === 'futures' || market === 'perpetual';
  const baseUrl = isFutures ? FUTURES_BASE_URL : SPOT_BASE_URL;
  const path = isFutures ? '/fapi/v1/klines' : '/api/v3/klines';

  const response = await fetch(`${baseUrl}${path}?${params.toString()}`);
  const text = await response.text();

  if (!response.ok) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { msg: text };
    }

    const error = new Error(payload?.msg || `Binance API error (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [];
}

/**
 * Universal Candlestick Fetcher for Binance Provider.
 */
async function fetchCandles({ symbol, timeframe = '1m', startTime, endTime, limit }) {
  const cleanSymbol = normalizeSymbol(symbol);
  if (!isValidSymbol(cleanSymbol)) {
    throw new Error('Invalid symbol');
  }

  const startMs = toMillis(startTime, 'startTime');
  const endMs = toMillis(endTime, 'endTime');
  const rowLimit = normalizeLimit(limit) || DEFAULT_LIMIT;
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const intervalMs = INTERVAL_MS[normalizedTimeframe];

  // 1. Both startTime and endTime provided (Range)
  if (startMs !== undefined && endMs !== undefined) {
    if (startMs > endMs) {
      throw new Error('startTime must be before endTime');
    }

    const rangeLimit = limit !== undefined ? (normalizeLimit(limit) || DEFAULT_LIMIT) : 50000;
    const rows = [];
    let nextStart = startMs;

    while (nextStart <= endMs && rows.length < rangeLimit) {
      const batch = await fetchBinanceKlines({
        symbol: cleanSymbol,
        timeframe: normalizedTimeframe,
        startTime: nextStart,
        endTime: endMs,
        limit: Math.min(rangeLimit - rows.length, BINANCE_MAX_LIMIT),
      });

      if (!batch.length) break;
      rows.push(...batch);
      const lastKlineTime = Number(batch[batch.length - 1][0]);
      nextStart = lastKlineTime + intervalMs;
      if (lastKlineTime >= endMs) break;
    }

    return rows
      .filter((kline) => Number(kline[0]) >= startMs && Number(kline[0]) <= endMs)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .slice(0, rangeLimit)
      .map(mapBinanceKline);
  }

  // 2. Only endTime provided (Search backwards from endTime)
  if (endMs !== undefined) {
    const batch = await fetchBinanceKlines({
      symbol: cleanSymbol,
      timeframe: normalizedTimeframe,
      endTime: endMs,
      limit: Math.min(rowLimit, BINANCE_MAX_LIMIT),
    });

    return batch.map(mapBinanceKline);
  }

  // 3. Only startTime provided (Search forwards from startTime)
  if (startMs !== undefined) {
    const batch = await fetchBinanceKlines({
      symbol: cleanSymbol,
      timeframe: normalizedTimeframe,
      startTime: startMs,
      limit: Math.min(rowLimit, BINANCE_MAX_LIMIT),
    });

    return batch.map(mapBinanceKline);
  }

  // 4. Latest candles
  const batch = await fetchBinanceKlines({
    symbol: cleanSymbol,
    timeframe: normalizedTimeframe,
    limit: Math.min(rowLimit, BINANCE_MAX_LIMIT),
  });

  return batch.map(mapBinanceKline);
}

async function fetchBinanceMarketKlines({ symbol, interval = '1m', startTime, endTime, limit = 1000, market = 'spot' }) {
  const rows = await fetchBinanceKlines({
    symbol,
    timeframe: interval,
    startTime: startTime ? Number(startTime) : undefined,
    endTime: endTime ? Number(endTime) : undefined,
    limit,
    market,
  });
  return rows.map((kline) => mapBinanceKline(kline));
}

function formatKlinesToCandles(klines = []) {
  return klines.map((kline) => mapBinanceKline(kline));
}

module.exports = {
  fetchCandles,
  fetchBinanceMarketKlines,
  formatKlinesToCandles,
};
