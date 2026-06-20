const clickhouse = require('../../infra/db/clickhouse/clickhouse');

const SYMBOL_REGEX = /^[A-Z0-9]{3,12}$/;
const TIMEFRAME_REGEX = /^([1-9][0-9]*)(m|h|d)$/i;
const TABLE_NAME = 'ohlcv_data';
const DEFAULT_CHUNK_LIMIT = 1000;
const MAX_CHUNK_LIMIT = 5000;

function isValidSymbol(symbol) {
  return typeof symbol === 'string' && SYMBOL_REGEX.test(symbol);
}

function normalizeLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_CHUNK_LIMIT;
  }
  return Math.min(parsed, MAX_CHUNK_LIMIT);
}

function normalizeTimeframe(timeframe = '1m') {
  const normalized = String(timeframe).trim().toLowerCase();
  const match = normalized.match(TIMEFRAME_REGEX);

  if (!match) {
    throw new Error('Invalid timeframe');
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const intervalUnit = unit === 'm' ? 'minute' : unit === 'h' ? 'hour' : 'day';

  return {
    value: `${amount}${unit}`,
    intervalSql: `INTERVAL ${amount} ${intervalUnit}`,
  };
}

// ClickHouse DateTime format: 'YYYY-MM-DD HH:MM:SS' (UTC)
function toClickhouseDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/**
 * Fetch OHLCV candles for a symbol within a date range, oldest first.
 * Used for chart load / historical view.
 */
async function getOhlcvRange(symbol, start, end, timeframe = '1m') {
  if (!isValidSymbol(symbol)) {
    throw new Error('Invalid symbol');
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid date range');
  }

  if (startDate > endDate) {
    throw new Error('start must be before end');
  }

  const normalizedTimeframe = normalizeTimeframe(timeframe);

  const resultSet = await clickhouse.query({
    query: `
      SELECT
        symbol,
        toUnixTimestamp(bucket) AS time,
        bucket AS timestamp,
        argMin(open, timestamp) AS open,
        max(greatest(high, open, close)) AS high,
        min(least(low, open, close)) AS low,
        argMax(close, timestamp) AS close,
        sum(volume) AS volume
      FROM (
        SELECT
          symbol,
          timestamp,
          toStartOfInterval(timestamp, ${normalizedTimeframe.intervalSql}) AS bucket,
          open,
          high,
          low,
          close,
          volume
        FROM ${TABLE_NAME}
        WHERE symbol = {symbol:String}
          AND timestamp BETWEEN {start:DateTime} AND {end:DateTime}
      )
      GROUP BY symbol, bucket
      ORDER BY bucket ASC
    `,
    query_params: {
      symbol,
      start: toClickhouseDateTime(startDate),
      end: toClickhouseDateTime(endDate),
    },
    format: 'JSONEachRow',
  });

  const rows = await resultSet.json();
  return rows.map((row) => ({
    ...row,
    time: Number(row.time),
    timeframe: normalizedTimeframe.value,
  }));
}

/**
 * Fetch a bounded cursor page of OHLCV data, oldest first.
 * Past queries read descending with LIMIT for index efficiency, then re-sort.
 */
async function getOhlcvChunk({ symbol, timeframe = '1m', cursor, direction, limit }) {
  if (!isValidSymbol(symbol)) {
    throw new Error('Invalid symbol');
  }

  if (direction !== 'past' && direction !== 'future') {
    throw new Error('direction must be past or future');
  }

  const cursorDate = new Date(cursor);
  if (Number.isNaN(cursorDate.getTime())) {
    throw new Error('Invalid cursor');
  }

  const rowLimit = normalizeLimit(limit);
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const operator = direction === 'past' ? '<' : '>';
  const order = direction === 'past' ? 'DESC' : 'ASC';

  const resultSet = await clickhouse.query({
    query: `
      WITH toStartOfInterval({cursor:DateTime}, ${normalizedTimeframe.intervalSql}) AS cursor_bucket
      SELECT
        symbol,
        toUnixTimestamp(timestamp) AS time,
        timestamp,
        open,
        greatest(raw_high, open, close) AS high,
        least(raw_low, open, close) AS low,
        close,
        volume
      FROM (
        SELECT
          symbol,
          bucket AS timestamp,
          argMin(base_open, timestamp) AS open,
          max(high) AS raw_high,
          min(low) AS raw_low,
          argMax(base_close, timestamp) AS close,
          sum(volume) AS volume
        FROM (
          SELECT
            symbol,
            timestamp,
            toStartOfInterval(timestamp, ${normalizedTimeframe.intervalSql}) AS bucket,
            argMin(open, timestamp) AS base_open,
            max(greatest(high, open, close)) AS high,
            min(least(low, open, close)) AS low,
            argMax(close, timestamp) AS base_close,
            sum(volume) AS volume
          FROM (
            SELECT symbol, timestamp, open, high, low, close, volume
            FROM ${TABLE_NAME}
            WHERE symbol = {symbol:String}
              AND timestamp ${operator} {cursor:DateTime}
          )
          GROUP BY symbol, timestamp
        )
        GROUP BY symbol, bucket
        HAVING bucket ${operator} cursor_bucket
        ORDER BY bucket ${order}
        LIMIT {limit:UInt32}
      )
    `,
    query_params: {
      symbol,
      cursor: toClickhouseDateTime(cursorDate),
      limit: rowLimit,
    },
    format: 'JSONEachRow',
  });

  const rows = await resultSet.json();
  return rows
    .sort((a, b) => Number(a.time) - Number(b.time))
    .map((row) => ({
      ...row,
      time: Number(row.time),
      timeframe: normalizedTimeframe.value,
    }));
}

/**
 * Fetch the single most recent candle for a symbol.
 * Used for live/latest price updates.
 */
async function getLatestCandle(symbol) {
  if (!isValidSymbol(symbol)) {
    throw new Error('Invalid symbol');
  }

  const resultSet = await clickhouse.query({
    query: `
      SELECT symbol, timestamp, open, high, low, close, volume
      FROM ${TABLE_NAME}
      WHERE symbol = {symbol:String}
      ORDER BY timestamp DESC
      LIMIT 1
    `,
    query_params: { symbol },
    format: 'JSONEachRow',
  });

  const rows = await resultSet.json();
  return rows[0] || null;
}

module.exports = {
  DEFAULT_CHUNK_LIMIT,
  MAX_CHUNK_LIMIT,
  getOhlcvChunk,
  getOhlcvRange,
  getLatestCandle,
};
