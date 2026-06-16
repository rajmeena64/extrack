const clickhouse = require('../../infra/db/clickhouse/clickhouse');

const SYMBOL_REGEX = /^[A-Z0-9]{3,12}$/;
const TABLE_NAME = 'ohlcv_data';

function isValidSymbol(symbol) {
  return typeof symbol === 'string' && SYMBOL_REGEX.test(symbol);
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
async function getOhlcvRange(symbol, start, end) {
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

  const resultSet = await clickhouse.query({
    query: `
      SELECT symbol, timestamp, open, high, low, close, volume
      FROM ${TABLE_NAME}
      WHERE symbol = {symbol:String}
        AND timestamp BETWEEN {start:DateTime} AND {end:DateTime}
      ORDER BY timestamp ASC
    `,
    query_params: {
      symbol,
      start: toClickhouseDateTime(startDate),
      end: toClickhouseDateTime(endDate),
    },
    format: 'JSONEachRow',
  });

  return resultSet.json();
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
  getOhlcvRange,
  getLatestCandle,
};