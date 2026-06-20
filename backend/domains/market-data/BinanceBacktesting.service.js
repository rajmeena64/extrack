const FUTURES_BASE_URL = 'https://fapi.binance.com';
const DEFAULT_CHUNK_LIMIT = 1000;
const MAX_CHUNK_LIMIT = 5000;
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
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_CHUNK_LIMIT;
  return Math.min(parsed, MAX_CHUNK_LIMIT);
}

function normalizeTimeframe(timeframe = '1m') {
  const normalized = String(timeframe || '1m').trim();
  const canonical = normalized === '1D' ? '1d' : normalized;

  if (!INTERVAL_MS[canonical]) {
    throw new Error('Invalid Binance timeframe');
  }

  return canonical;
}

function toMillis(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label}`);
  }
  return date.getTime();
}

function mapBinanceKline(symbol, timeframe, kline) {
  const openTime = Number(kline[0]);

  return {
    symbol,
    time: Math.floor(openTime / 1000),
    timestamp: new Date(openTime).toISOString(),
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    volume: Number(kline[5] || 0),
    timeframe,
    source: 'binance',
  };
}

async function fetchBinanceKlines({ symbol, timeframe, startTime, endTime, limit }) {
  const params = new URLSearchParams({
    symbol,
    interval: timeframe,
    limit: String(Math.min(Number(limit || DEFAULT_CHUNK_LIMIT), BINANCE_MAX_LIMIT)),
  });

  if (Number.isFinite(startTime)) params.set('startTime', String(startTime));
  if (Number.isFinite(endTime)) params.set('endTime', String(endTime));

  const response = await fetch(`${FUTURES_BASE_URL}/fapi/v1/klines?${params.toString()}`);
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

async function getBinanceBacktestChunk({ symbol, timeframe = '1m', cursor, direction, limit }) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!isValidSymbol(normalizedSymbol)) {
    throw new Error('Invalid symbol');
  }

  if (direction !== 'past' && direction !== 'future') {
    throw new Error('direction must be past or future');
  }

  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const intervalMs = INTERVAL_MS[normalizedTimeframe];
  const rowLimit = normalizeLimit(limit);
  const cursorMs = toMillis(cursor, 'cursor');
  const rows = [];
  let nextCursor = direction === 'past' ? cursorMs - 1 : cursorMs + intervalMs;

  while (rows.length < rowLimit) {
    const requestLimit = Math.min(rowLimit - rows.length, BINANCE_MAX_LIMIT);
    const batch = await fetchBinanceKlines({
      symbol: normalizedSymbol,
      timeframe: normalizedTimeframe,
      limit: requestLimit,
      startTime: direction === 'future' ? nextCursor : undefined,
      endTime: direction === 'past' ? nextCursor : undefined,
    });

    if (!batch.length) break;

    rows.push(...batch);

    if (batch.length < requestLimit) break;

    if (direction === 'past') {
      nextCursor = Number(batch[0][0]) - 1;
    } else {
      nextCursor = Number(batch[batch.length - 1][0]) + intervalMs;
    }
  }

  return rows
    .filter((kline) => {
      const openTime = Number(kline[0]);
      return direction === 'past' ? openTime < cursorMs : openTime > cursorMs;
    })
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .slice(direction === 'past' ? -rowLimit : 0, direction === 'past' ? undefined : rowLimit)
    .map((kline) => mapBinanceKline(normalizedSymbol, normalizedTimeframe, kline));
}

async function getBinanceBacktestRange(symbol, start, end, timeframe = '1m') {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!isValidSymbol(normalizedSymbol)) {
    throw new Error('Invalid symbol');
  }

  const startMs = toMillis(start, 'start');
  const endMs = toMillis(end, 'end');
  if (startMs > endMs) {
    throw new Error('start must be before end');
  }

  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const intervalMs = INTERVAL_MS[normalizedTimeframe];
  const rows = [];
  let nextStart = startMs;

  while (nextStart <= endMs && rows.length < MAX_CHUNK_LIMIT) {
    const batch = await fetchBinanceKlines({
      symbol: normalizedSymbol,
      timeframe: normalizedTimeframe,
      startTime: nextStart,
      endTime: endMs,
      limit: Math.min(MAX_CHUNK_LIMIT - rows.length, BINANCE_MAX_LIMIT),
    });

    if (!batch.length) break;

    rows.push(...batch);
    nextStart = Number(batch[batch.length - 1][0]) + intervalMs;

    if (batch.length < BINANCE_MAX_LIMIT) break;
  }

  return rows
    .filter((kline) => Number(kline[0]) >= startMs && Number(kline[0]) <= endMs)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map((kline) => mapBinanceKline(normalizedSymbol, normalizedTimeframe, kline));
}

async function getLatestBinanceBacktestCandle(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!isValidSymbol(normalizedSymbol)) {
    throw new Error('Invalid symbol');
  }

  const timeframe = '1m';
  const rows = await fetchBinanceKlines({
    symbol: normalizedSymbol,
    timeframe,
    limit: 1,
  });

  return rows[0] ? mapBinanceKline(normalizedSymbol, timeframe, rows[0]) : null;
}

module.exports = {
  getBinanceBacktestChunk,
  getBinanceBacktestRange,
  getLatestBinanceBacktestCandle,
};
