import api from '../../../utils/serve';

export const DEFAULT_OHLCV_CHUNK_LIMIT = 1000;
export const OHLCV_CHUNK_GC_TIME = 30 * 60 * 1000;
const OHLCV_CHUNK_CACHE_VERSION = 5;
const SOURCE_TIMEFRAME = '1m';
const MAX_SOURCE_CHUNK_LIMIT = 5000;

export const TIMEFRAME_SECONDS = {
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '30m': 30 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1D': 24 * 60 * 60,
  '1d': 24 * 60 * 60,
};

export function normalizeBacktestTimeframe(timeframe) {
  return timeframe === '1D' ? '1d' : timeframe;
}

export function normalizeTimeToSeconds(time) {
  if (typeof time === 'number') {
    return time > 10_000_000_000 ? Math.floor(time / 1000) : time;
  }

  return Math.floor(new Date(time).getTime() / 1000);
}

export function ohlcvChunkQueryKey({ symbol, timeframe, direction, cursor, limit }) {
  return [
    'ohlcv-chunk',
    OHLCV_CHUNK_CACHE_VERSION,
    String(symbol || '').toUpperCase(),
    normalizeBacktestTimeframe(timeframe),
    direction,
    cursor,
    Number(limit || DEFAULT_OHLCV_CHUNK_LIMIT),
  ];
}

export function candleCursor(candle) {
  if (!candle?.time) return null;
  return new Date(Number(candle.time) * 1000).toISOString();
}

export function normalizeOhlcvRow(item) {
  const open = Number(item.open);
  const high = Number(item.high);
  const low = Number(item.low);
  const close = Number(item.close);
  const time = normalizeTimeToSeconds(item.time ?? item.timestamp);

  return {
    time,
    open,
    high: Math.max(open, high, low, close),
    low: Math.min(open, high, low, close),
    close,
    volume: Number(item.volume || 0),
  };
}

export function resampleCandles(rawCandles, timeframe) {
  const bucketSize = TIMEFRAME_SECONDS[timeframe];

  if (!bucketSize) {
    throw new Error(`Invalid timeframe: ${timeframe}`);
  }

  const sorted = [...(rawCandles || [])]
    .map((candle) => ({
      time: normalizeTimeToSeconds(candle.time ?? candle.timestamp),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume || 0),
    }))
    .filter((candle) => (
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ))
    .sort((a, b) => a.time - b.time);

  if (normalizeBacktestTimeframe(timeframe) === SOURCE_TIMEFRAME) {
    return sorted;
  }

  const buckets = new Map();

  for (const candle of sorted) {
    const bucketStart = Math.floor(candle.time / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketStart);

    if (!bucket) {
      buckets.set(bucketStart, {
        time: bucketStart,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
      continue;
    }

    bucket.high = Math.max(bucket.high, candle.high);
    bucket.low = Math.min(bucket.low, candle.low);
    bucket.close = candle.close;
    bucket.volume += candle.volume;
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

export function backtestSessionKey({ symbol, timeframe, sessionStartTime, sessionEndTime }) {
  return [
    String(symbol || '').toUpperCase(),
    normalizeBacktestTimeframe(timeframe || '1m'),
    sessionStartTime || '',
    sessionEndTime || '',
  ].join(':');
}

export function mergeCandles(existingCandles = [], newCandles = []) {
  const byTime = new Map();

  for (const candle of existingCandles) {
    if (Number.isFinite(candle?.time)) {
      byTime.set(candle.time, candle);
    }
  }

  for (const candle of newCandles) {
    if (Number.isFinite(candle?.time)) {
      byTime.set(candle.time, candle);
    }
  }

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

function getSourceLimit(timeframe, limit) {
  const bucketSize = TIMEFRAME_SECONDS[timeframe] || TIMEFRAME_SECONDS[SOURCE_TIMEFRAME];
  const multiplier = Math.max(Math.ceil(bucketSize / TIMEFRAME_SECONDS[SOURCE_TIMEFRAME]), 1);
  return Math.min(Number(limit || DEFAULT_OHLCV_CHUNK_LIMIT) * multiplier, MAX_SOURCE_CHUNK_LIMIT);
}

function getSourceCursor(request) {
  const timeframe = request.timeframe;
  const bucketSize = TIMEFRAME_SECONDS[timeframe] || TIMEFRAME_SECONDS[SOURCE_TIMEFRAME];

  if (request.direction !== 'future' || bucketSize <= TIMEFRAME_SECONDS[SOURCE_TIMEFRAME]) {
    return request.cursor;
  }

  const cursorSeconds = normalizeTimeToSeconds(request.cursor);
  if (!Number.isFinite(cursorSeconds)) {
    return request.cursor;
  }

  const bucketStart = Math.floor(cursorSeconds / bucketSize) * bucketSize;
  return new Date((bucketStart + bucketSize - TIMEFRAME_SECONDS[SOURCE_TIMEFRAME]) * 1000).toISOString();
}

export async function fetchOhlcvChunk(queryClient, request) {
  const normalizedRequest = {
    ...request,
    symbol: String(request.symbol || '').toUpperCase(),
    timeframe: normalizeBacktestTimeframe(request.timeframe),
    limit: Number(request.limit || DEFAULT_OHLCV_CHUNK_LIMIT),
  };
  const queryKey = ohlcvChunkQueryKey(normalizedRequest);
  const cached = queryClient.getQueryData(queryKey);

  if (cached) {
    return cached;
  }

  const sourceRequest = {
    ...normalizedRequest,
    timeframe: SOURCE_TIMEFRAME,
    cursor: getSourceCursor(normalizedRequest),
    limit: getSourceLimit(normalizedRequest.timeframe, normalizedRequest.limit),
  };

  return queryClient.fetchQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get('/ohlcv/chunk', {
        params: {
          symbol: sourceRequest.symbol,
          timeframe: sourceRequest.timeframe,
          cursor: sourceRequest.cursor,
          direction: normalizedRequest.direction,
          limit: sourceRequest.limit,
        },
      });

      const rawCandles = Array.isArray(data?.data)
        ? data.data
          .map(normalizeOhlcvRow)
          .filter((candle) => Number.isFinite(candle.time))
        : [];
      const candles = resampleCandles(rawCandles, normalizedRequest.timeframe)
        .map((candle) => ({
          ...candle,
          timeframe: normalizedRequest.timeframe,
        }));

      console.log('ohlcv.resample', {
        rawCount: rawCandles.length,
        timeframe: normalizedRequest.timeframe,
        resampledCount: candles.length,
        firstRaw: rawCandles[0],
        lastRaw: rawCandles[rawCandles.length - 1],
        firstResampled: candles[0],
        lastResampled: candles[candles.length - 1],
      });

      return {
        candles,
        total: data?.total || candles.length,
        rawTotal: rawCandles.length,
        request: normalizedRequest,
      };
    },
    staleTime: Infinity,
    gcTime: OHLCV_CHUNK_GC_TIME,
    retry: false,
  });
}
