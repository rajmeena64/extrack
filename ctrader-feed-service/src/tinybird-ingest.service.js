const zlib = require('zlib');
const logger = require('./logger.service');

const TINYBIRD_URL = String(process.env.TINYBIRD_URL || 'https://api.ap-east-1.aws.tinybird.co').replace(/\/$/, '');
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN;
const DATASOURCE = 'candles';

const pendingCandles = new Map();
let flushTimer = null;
const recentInsertions = [];

function recordCandlesInserted(count) {
  const now = Date.now();
  recentInsertions.push({ time: now, count });
  const cutoff = now - 3600000;
  while (recentInsertions.length > 0 && recentInsertions[0].time < cutoff) {
    recentInsertions.shift();
  }
}

function getCandlesInsertedLastHour() {
  const cutoff = Date.now() - 3600000;
  while (recentInsertions.length > 0 && recentInsertions[0].time < cutoff) {
    recentInsertions.shift();
  }
  return recentInsertions.reduce((acc, cur) => acc + cur.count, 0);
}

async function queryTinybird(sql) {
  if (!TINYBIRD_TOKEN) throw new Error('TINYBIRD_TOKEN missing');
  const response = await fetch(`${TINYBIRD_URL}/v0/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TINYBIRD_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `q=${encodeURIComponent(sql.trim())}`,
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tinybird error (${response.status}): ${err}`);
  }
  const payload = await response.json();
  return payload.data || [];
}

async function getLastTimestamps() {
  const map = new Map();
  try {
    const rows = await queryTinybird(`SELECT symbol, max(timestamp) AS last_ts FROM ${DATASOURCE} GROUP BY symbol FORMAT JSON`);
    for (const row of rows) {
      if (row.symbol && Number.isFinite(Number(row.last_ts))) {
        map.set(String(row.symbol).trim().toUpperCase(), Number(row.last_ts));
      }
    }
  } catch (err) {
    logger.error('Failed to query Tinybird max timestamps', { error: err.message });
  }
  return map;
}

async function appendCandles(candles = [], retries = 3) {
  if (!Array.isArray(candles) || candles.length === 0 || !TINYBIRD_TOKEN) return false;
  const lines = ['symbol,timestamp,open,high,low,close,volume'];
  for (const c of candles) {
    if (!c.symbol || !Number.isFinite(c.timestamp) || !Number.isFinite(c.open) || !Number.isFinite(c.high) || !Number.isFinite(c.low) || !Number.isFinite(c.close) || !Number.isFinite(c.volume) || c.volume <= 0) continue;
    lines.push(`${c.symbol},${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume}`);
  }
  if (lines.length <= 1) return false;

  const gzipped = zlib.gzipSync(Buffer.from(lines.join('\n'), 'utf-8'));

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${TINYBIRD_URL}/v0/datasources?name=${DATASOURCE}&mode=append`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TINYBIRD_TOKEN}`,
          'Content-Encoding': 'gzip',
          'Content-Type': 'text/csv',
        },
        body: gzipped,
      });

      if (response.ok) {
        recordCandlesInserted(lines.length - 1);
        return true;
      }

      const err = await response.text();
      if (response.status === 429 && attempt < retries) {
        let waitSec = 2;
        try {
          const parsed = JSON.parse(err);
          const match = parsed.error?.match(/retry after (\d+) seconds/i);
          if (match && match[1]) waitSec = Math.max(Number(match[1]), 1);
        } catch {}
        logger.warn('TINYBIRD', `Rate limit 429 from Tinybird. Retrying after ${waitSec}s...`);
        await new Promise((r) => setTimeout(r, (waitSec + 1) * 1000));
        continue;
      }

      logger.error('TINYBIRD', `Tinybird append error (${response.status}): ${err}`);
      return false;
    } catch (netErr) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      logger.error('TINYBIRD', `Tinybird network error: ${netErr.message}`);
      return false;
    }
  }
  return false;
}

function queueCandle(candle) {
  if (!candle || !candle.symbol || !Number.isFinite(candle.timestamp)) return;
  pendingCandles.set(`${candle.symbol}:${candle.timestamp}`, candle);
}

async function flushPending() {
  if (pendingCandles.size === 0) return;
  const batch = Array.from(pendingCandles.values());
  pendingCandles.clear();
  const ok = await appendCandles(batch);
  if (ok) {
    console.log(`\x1b[32m[TINYBIRD REALTIME]\x1b[0m Ingested ${batch.length} closed 1m candles into Tinybird (${batch.map((c) => c.symbol).join(', ')})`);
  } else {
    for (const c of batch.slice(-500)) {
      pendingCandles.set(`${c.symbol}:${c.timestamp}`, c);
    }
  }
}

function startBatchFlusher(intervalMs = 30000) {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushPending().catch(() => {});
  }, intervalMs);
  flushTimer.unref?.();
}

let isReconciling = false;

async function reconcileGapsOnStartup(symbols = [], fetchCtraderKlinesFn) {
  if (isReconciling || typeof fetchCtraderKlinesFn !== 'function') return;
  isReconciling = true;
  const targetSymbols = Array.isArray(symbols)
    ? symbols.map((s) => String(typeof s === 'string' ? s : s?.symbol || s?.name || '').trim().toUpperCase()).filter(Boolean)
    : [];
  if (targetSymbols.length === 0) {
    isReconciling = false;
    return;
  }
  try {
    const lastTimestamps = await getLastTimestamps();
    const nowSec = Math.floor(Date.now() / 1000);
    const collectedCandles = [];

    for (const norm of targetSymbols) {
      const lastTs = lastTimestamps.get(norm);
      const nowClosedSec = Math.floor(Date.now() / 60000) * 60 - 60;
      let cursorSec = Number.isFinite(lastTs) && lastTs > 0 ? lastTs + 60 : nowClosedSec - 86400;
      const endSec = nowClosedSec;

      if (cursorSec > endSec) {
        logger.info('TINYBIRD', `[${norm}] 100% up-to-date in Tinybird (0m gap)`);
        continue;
      }

      const missingMins = Math.max(1, Math.floor((endSec - cursorSec) / 60) + 1);
      logger.info('TINYBIRD', `[${norm}] Gap detected: ${missingMins}m missing. Fetching from cTrader...`);

      let symbolBackfilled = 0;
      while (cursorSec <= endSec) {
        const remainingMins = Math.floor((endSec - cursorSec) / 60) + 1;
        const chunkSize = Math.min(remainingMins, 2000);
        const chunkEndSec = cursorSec + (chunkSize - 1) * 60;
        try {
          const res = await fetchCtraderKlinesFn({
            symbol: norm,
            interval: '1m',
            startTime: cursorSec * 1000,
            endTime: chunkEndSec * 1000,
            limit: chunkSize,
          });
          const klines = Array.isArray(res) ? res : res?.candles || [];
          if (Array.isArray(klines) && klines.length > 0) {
            const formatted = klines.map((k) => {
              const isArr = Array.isArray(k);
              const time = Number(isArr ? k[0] : k?.time);
              const timeSec = time > 1e11 ? Math.floor(time / 1000) : Math.floor(time);
              return {
                symbol: norm,
                timestamp: timeSec,
                open: Number(isArr ? k[1] : k?.open),
                high: Number(isArr ? k[2] : k?.high),
                low: Number(isArr ? k[3] : k?.low),
                close: Number(isArr ? k[4] : k?.close),
                volume: Number(isArr ? k[5] || 0 : k?.volume || 0),
              };
            }).filter((c) => Number.isFinite(c.timestamp) && Number.isFinite(c.open) && c.open > 0 && c.timestamp >= cursorSec && c.timestamp <= chunkEndSec && (!Number.isFinite(lastTs) || c.timestamp > lastTs));

            if (formatted.length > 0) {
              collectedCandles.push(...formatted);
              symbolBackfilled += formatted.length;
            }
          }
          cursorSec = chunkEndSec + 60;
          await new Promise((r) => setTimeout(r, 400));
        } catch (err) {
          if (err.message && err.message.includes('rate limited')) {
            logger.warn('TINYBIRD', `cTrader rate limited for ${norm}. Waiting 3s...`);
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          logger.warn('TINYBIRD', `Gap fill error for ${norm}: ${err.message}`);
          break;
        }
      }
      if (symbolBackfilled > 0) {
        logger.info('TINYBIRD', `[${norm}] Prepared ${symbolBackfilled} gap candles for Tinybird`);
      }
    }

    if (collectedCandles.length > 0) {
      const dedupMap = new Map();
      for (const c of collectedCandles) {
        dedupMap.set(`${c.symbol}:${c.timestamp}`, c);
      }
      const uniqueToAppend = Array.from(dedupMap.values());
      for (let i = 0; i < uniqueToAppend.length; i += 20000) {
        const batch = uniqueToAppend.slice(i, i + 20000);
        await appendCandles(batch);
        await new Promise((r) => setTimeout(r, 500));
      }
      logger.info('TINYBIRD', `\x1b[32m[TINYBIRD GAP BACKFILL COMPLETE]\x1b[0m Ingested ${uniqueToAppend.length} unique candles into Tinybird.`);
    } else {
      logger.info('TINYBIRD', `\x1b[32m[TINYBIRD RECONCILED]\x1b[0m All ${targetSymbols.length} symbols are 100% up-to-date in Tinybird.`);
    }
  } finally {
    isReconciling = false;
  }
}

module.exports = {
  appendCandles,
  getLastTimestamps,
  queueCandle,
  flushPending,
  startBatchFlusher,
  reconcileGapsOnStartup,
  getCandlesInsertedLastHour,
};
