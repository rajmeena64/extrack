const SYMBOL_REGEX = /^[A-Z0-9._-]{2,20}$/i;
const TIMEFRAME_REGEX = /^([1-9][0-9]*)(m|h|d)$/i;
const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 10000;

const TINYBIRD_URL = process.env.TINYBIRD_URL;
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN;

function isValidSymbol(symbol) {
  return typeof symbol === 'string' && SYMBOL_REGEX.test(symbol.trim());
}

function normalizeLimit(limit) {
  if (limit === undefined || limit === null) return undefined;
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function normalizeTimeframe(timeframe = '1m') {
  const normalized = String(timeframe || '1m').trim().toLowerCase();
  const match = normalized.match(TIMEFRAME_REGEX);

  if (!match) {
    throw new Error('Invalid timeframe');
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const intervalUnit = unit === 'm' ? 'MINUTE' : unit === 'h' ? 'HOUR' : 'DAY';

  const seconds = unit === 'm' ? amount * 60 : unit === 'h' ? amount * 3600 : amount * 86400;

  return {
    value: `${amount}${unit}`,
    isBaseM1: amount === 1 && unit === 'm',
    intervalSql: `INTERVAL ${amount} ${intervalUnit}`,
    intervalSeconds: seconds,
  };
}

function toUnixSeconds(dateVal, label = 'timestamp') {
  if (dateVal === undefined || dateVal === null || dateVal === '' || dateVal === 'undefined' || dateVal === 'null') {
    return undefined;
  }
  const num = Number(dateVal);
  if (Number.isFinite(num) && num > 0) {
    return num > 10_000_000_000 ? Math.floor(num / 1000) : Math.floor(num);
  }
  const date = new Date(dateVal);
  if (!Number.isNaN(date.getTime())) {
    return Math.floor(date.getTime() / 1000);
  }
  throw new Error(`Invalid ${label}`);
}

async function queryTinybird(sql) {
  if (!TINYBIRD_TOKEN) {
    throw new Error('TINYBIRD_TOKEN is missing in environment');
  }

  const response = await fetch(`${TINYBIRD_URL}/v0/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TINYBIRD_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: `q=${encodeURIComponent(sql.trim() + ' FORMAT JSON')}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tinybird SQL error (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  return payload.data || [];
}

/**
 * Universal Candlestick Fetcher for Database Provider.
 * Supports:
 * - startTime & endTime (Range)
 * - endTime & limit (History backfill up to endTime)
 * - startTime & limit (Forward playback from startTime)
 * - limit only / no timestamps (Latest candles)
 */
async function fetchCandles({ symbol, timeframe = '1m', startTime, endTime, limit }) {
  if (!isValidSymbol(symbol)) {
    throw new Error('Invalid symbol');
  }

  const cleanSymbol = symbol.trim().toUpperCase();
  const startSec = toUnixSeconds(startTime, 'startTime');
  const endSec = toUnixSeconds(endTime, 'endTime');
  const rowLimit = normalizeLimit(limit);
  const tf = normalizeTimeframe(timeframe);

  // 1. Both startTime and endTime provided (Date Range)
  if (startSec !== undefined && endSec !== undefined) {
    if (startSec > endSec) {
      throw new Error('startTime must be before endTime');
    }

    const limitClause = rowLimit ? `LIMIT ${rowLimit}` : '';

    if (tf.isBaseM1) {
      const sql = `
        SELECT
          timestamp AS time,
          open,
          high,
          low,
          close,
          volume
        FROM candles
        WHERE symbol = '${cleanSymbol}'
          AND timestamp >= ${startSec}
          AND timestamp <= ${endSec}
        ORDER BY timestamp ASC
        LIMIT 1 BY timestamp
        ${limitClause}
      `;
      const rows = await queryTinybird(sql);
      return rows.map(mapRow);
    }

    const sql = `
      SELECT
        toUnixTimestamp(bucket) AS time,
        argMin(open, timestamp) AS open,
        max(high) AS high,
        min(low) AS low,
        argMax(close, timestamp) AS close,
        sum(volume) AS volume
      FROM (
        SELECT
          timestamp,
          toStartOfInterval(toDateTime(timestamp), ${tf.intervalSql}) AS bucket,
          open,
          high,
          low,
          close,
          volume
        FROM candles
        WHERE symbol = '${cleanSymbol}'
          AND timestamp >= ${startSec}
          AND timestamp <= ${endSec}
        LIMIT 1 BY timestamp
      )
      GROUP BY bucket
      ORDER BY bucket ASC
      ${limitClause}
    `;
    const rows = await queryTinybird(sql);
    return rows.map(mapRow);
  }

  // 2. Only endTime provided (Search backwards from endTime)
  if (endSec !== undefined) {
    const effectiveLimit = rowLimit || DEFAULT_LIMIT;

    if (tf.isBaseM1) {
      const sql = `
        SELECT
          timestamp AS time,
          open,
          high,
          low,
          close,
          volume
        FROM candles
        WHERE symbol = '${cleanSymbol}'
          AND timestamp <= ${endSec}
        ORDER BY timestamp DESC
        LIMIT 1 BY timestamp
        LIMIT ${effectiveLimit}
      `;
      const rows = await queryTinybird(sql);
      return rows.sort((a, b) => Number(a.time) - Number(b.time)).map(mapRow);
    }

    const minAggTime = endSec - Math.max(effectiveLimit * tf.intervalSeconds * 3, 14 * 86400);
    const getQuery = (useTimeBound) => `
      WITH toStartOfInterval(toDateTime(${endSec}), ${tf.intervalSql}) AS end_bucket
      SELECT
        toUnixTimestamp(bucket) AS time,
        argMin(open, timestamp) AS open,
        max(high) AS high,
        min(low) AS low,
        argMax(close, timestamp) AS close,
        sum(volume) AS volume
      FROM (
        SELECT
          timestamp,
          toStartOfInterval(toDateTime(timestamp), ${tf.intervalSql}) AS bucket,
          open,
          high,
          low,
          close,
          volume
        FROM candles
        WHERE symbol = '${cleanSymbol}'
          AND timestamp <= ${endSec}
          ${useTimeBound ? `AND timestamp >= ${minAggTime}` : ''}
        LIMIT 1 BY timestamp
      )
      GROUP BY bucket
      HAVING bucket <= end_bucket
      ORDER BY bucket DESC
      LIMIT ${effectiveLimit}
    `;
    const rows = await queryTinybird(getQuery(true));
    if (rows && rows.length >= Math.min(effectiveLimit, 30)) {
      return rows.sort((a, b) => Number(a.time) - Number(b.time)).map(mapRow);
    }
    const fallbackRows = await queryTinybird(getQuery(false));
    return fallbackRows.sort((a, b) => Number(a.time) - Number(b.time)).map(mapRow);
  }

  // 3. Only startTime provided (Search forwards from startTime)
  if (startSec !== undefined) {
    const effectiveLimit = rowLimit || DEFAULT_LIMIT;

    if (tf.isBaseM1) {
      const sql = `
        SELECT
          timestamp AS time,
          open,
          high,
          low,
          close,
          volume
        FROM candles
        WHERE symbol = '${cleanSymbol}'
          AND timestamp >= ${startSec}
        ORDER BY timestamp ASC
        LIMIT 1 BY timestamp
        LIMIT ${effectiveLimit}
      `;
      const rows = await queryTinybird(sql);
      return rows.map(mapRow);
    }

    const sql = `
      WITH toStartOfInterval(toDateTime(${startSec}), ${tf.intervalSql}) AS start_bucket
      SELECT
        toUnixTimestamp(bucket) AS time,
        argMin(open, timestamp) AS open,
        max(high) AS high,
        min(low) AS low,
        argMax(close, timestamp) AS close,
        sum(volume) AS volume
      FROM (
        SELECT
          timestamp,
          toStartOfInterval(toDateTime(timestamp), ${tf.intervalSql}) AS bucket,
          open,
          high,
          low,
          close,
          volume
        FROM candles
        WHERE symbol = '${cleanSymbol}'
          AND timestamp >= ${startSec}
        LIMIT 1 BY timestamp
      )
      GROUP BY bucket
      HAVING bucket >= start_bucket
      ORDER BY bucket ASC
      LIMIT ${effectiveLimit}
    `;
    const rows = await queryTinybird(sql);
    return rows.map(mapRow);
  }

  // 4. Latest candles (Neither start nor end provided)
  const effectiveLimit = rowLimit || DEFAULT_LIMIT;
  const nowSec = Math.floor(Date.now() / 1000);

  if (tf.isBaseM1) {
    const minTime = nowSec - Math.max(effectiveLimit * 60 * 4, 7 * 86400);
    const sql = `
      SELECT
        timestamp AS time,
        open,
        high,
        low,
        close,
        volume
      FROM candles
      WHERE symbol = '${cleanSymbol}'
        AND timestamp >= ${minTime}
      ORDER BY timestamp DESC
      LIMIT 1 BY timestamp
      LIMIT ${effectiveLimit}
    `;
    const rows = await queryTinybird(sql);
    if (rows && rows.length >= Math.min(effectiveLimit, 60)) {
      return rows.sort((a, b) => Number(a.time) - Number(b.time)).map(mapRow);
    }
    const fallbackSql = `
      SELECT
        timestamp AS time,
        open,
        high,
        low,
        close,
        volume
      FROM candles
      WHERE symbol = '${cleanSymbol}'
      ORDER BY timestamp DESC
      LIMIT 1 BY timestamp
      LIMIT ${effectiveLimit}
    `;
    const fallbackRows = await queryTinybird(fallbackSql);
    return fallbackRows.sort((a, b) => Number(a.time) - Number(b.time)).map(mapRow);
  }

  const minAggTime = nowSec - Math.max(effectiveLimit * tf.intervalSeconds * 3, 14 * 86400);
  const sql = `
    SELECT
      toUnixTimestamp(bucket) AS time,
      argMin(open, timestamp) AS open,
      max(high) AS high,
      min(low) AS low,
      argMax(close, timestamp) AS close,
      sum(volume) AS volume
    FROM (
      SELECT
        timestamp,
        toStartOfInterval(toDateTime(timestamp), ${tf.intervalSql}) AS bucket,
        open,
        high,
        low,
        close,
        volume
      FROM candles
      WHERE symbol = '${cleanSymbol}'
        AND timestamp >= ${minAggTime}
      LIMIT 1 BY timestamp
    )
    GROUP BY bucket
    ORDER BY bucket DESC
    LIMIT ${effectiveLimit}
  `;
  const rows = await queryTinybird(sql);
  if (rows && rows.length >= Math.min(effectiveLimit, 30)) {
    return rows.sort((a, b) => Number(a.time) - Number(b.time)).map(mapRow);
  }

  const fallbackSql = `
    SELECT
      toUnixTimestamp(bucket) AS time,
      argMin(open, timestamp) AS open,
      max(high) AS high,
      min(low) AS low,
      argMax(close, timestamp) AS close,
      sum(volume) AS volume
    FROM (
      SELECT
        timestamp,
        toStartOfInterval(toDateTime(timestamp), ${tf.intervalSql}) AS bucket,
        open,
        high,
        low,
        close,
        volume
      FROM candles
      WHERE symbol = '${cleanSymbol}'
      LIMIT 1 BY timestamp
    )
    GROUP BY bucket
    ORDER BY bucket DESC
    LIMIT ${effectiveLimit}
  `;
  const fallbackRows = await queryTinybird(fallbackSql);
  return fallbackRows.sort((a, b) => Number(a.time) - Number(b.time)).map(mapRow);
}

function mapRow(row) {
  return {
    time: Number(row.time),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume || 0),
  };
}

module.exports = {
  fetchCandles,
};
