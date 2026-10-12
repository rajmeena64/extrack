#!/usr/bin/env node

/**
 * Universal Tinybird Archival Worker
 * 
 * Logic:
 * 1. Checks Tinybird ClickHouse for the MAX(timestamp) of each tracked symbol.
 * 2. Determines the exact missing gap: `startTime = (last_ts + 60s)` to `endTime = Start of Today (00:00:00 UTC)`.
 * 3. Fetches missing historical 1m candles from cTrader feed microservice.
 * 4. Gzips and bulk-appends them to the Tinybird `candles` datasource.
 * 5. Automatically handles weekends, multi-day server downtime, and holidays without duplicate data.
 * 
 * Usage:
 *   node scripts/daily-tinybird-archival-worker.js
 *   node scripts/daily-tinybird-archival-worker.js --symbol=EURUSD
 *   node scripts/daily-tinybird-archival-worker.js --to=2026-08-24
 */

const path = require('path');
const zlib = require('zlib');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { listHistoricalSyncSymbols } = require('../instruments/instrumentRegistry');
const microClient = require('../integrations/datafeed/providers/entrackmicro');

const TINYBIRD_URL = String(process.env.TINYBIRD_URL || 'https://api.ap-east-1.aws.tinybird.co').replace(/\/$/, '');
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN;
const DATASOURCE_NAME = 'candles';

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=');
      params[k] = v || true;
    }
  }
  return params;
}

function getStartOfTodayUtc(overrideDate) {
  const target = overrideDate ? new Date(overrideDate) : new Date();
  return Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
    0, 0, 0, 0
  );
}

async function queryTinybirdLastTimestamps() {
  if (!TINYBIRD_TOKEN) {
    throw new Error('TINYBIRD_TOKEN is missing in backend/.env!');
  }

  const sql = `SELECT symbol, max(timestamp) AS last_ts FROM ${DATASOURCE_NAME} GROUP BY symbol FORMAT JSON`;
  const url = `${TINYBIRD_URL}/v0/sql`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TINYBIRD_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `q=${encodeURIComponent(sql)}`,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[TINYBIRD_QUERY] Warning: Could not query max timestamps (${response.status}): ${errText}`);
      return new Map();
    }

    const json = await response.json();
    const map = new Map();
    for (const row of json.data || []) {
      if (row.symbol && Number.isFinite(Number(row.last_ts))) {
        map.set(String(row.symbol).toUpperCase(), Number(row.last_ts));
      }
    }
    return map;
  } catch (error) {
    console.warn(`[TINYBIRD_QUERY] Could not reach Tinybird: ${error.message}`);
    return new Map();
  }
}

async function pushToTinybird(symbol, csvString, rowCount) {
  if (!TINYBIRD_TOKEN) {
    throw new Error('TINYBIRD_TOKEN is missing in environment!');
  }

  const gzipped = zlib.gzipSync(Buffer.from(csvString, 'utf-8'));
  const url = `${TINYBIRD_URL}/v0/datasources/${DATASOURCE_NAME}/append`;

  const startTime = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TINYBIRD_TOKEN}`,
      'Content-Encoding': 'gzip',
      'Content-Type': 'text/csv',
    },
    body: gzipped,
  });

  const durationMs = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tinybird append error (${response.status}): ${errorText}`);
  }

  return { success: true, durationMs, rowCount };
}

async function syncSymbolGap(instrument, lastStoredTimestampSec, targetEndTimeUtc) {
  const symbol = instrument.symbol;
  const requestSymbol = instrument.sourceSymbol;

  // Start from the next minute after the last stored candle, or default to 24h back if new symbol
  let startTimeMs;
  if (Number.isFinite(lastStoredTimestampSec) && lastStoredTimestampSec > 0) {
    startTimeMs = (lastStoredTimestampSec + 60) * 1000;
  } else {
    // If symbol has no existing data in Tinybird, initialize from 24h ago
    startTimeMs = targetEndTimeUtc - (24 * 60 * 60 * 1000);
  }

  const endTimeMs = targetEndTimeUtc;

  // Already up to date
  if (startTimeMs >= endTimeMs) {
    const lastIso = new Date(lastStoredTimestampSec * 1000).toISOString();
    return {
      symbol,
      count: 0,
      status: 'UP_TO_DATE',
      message: `Already up-to-date (Last candle: ${lastIso})`,
    };
  }

  const startIso = new Date(startTimeMs).toISOString();
  const endIso = new Date(endTimeMs).toISOString();

  try {
    const response = await microClient.getKlines(requestSymbol, {
      interval: '1m',
      startTime: startTimeMs,
      endTime: endTimeMs,
      limit: 10000,
    });

    const candles = Array.isArray(response?.candles) ? response.candles : [];
    if (!candles.length) {
      return {
        symbol,
        count: 0,
        status: 'SKIPPED_EMPTY',
        message: `0 new candles between ${startIso} and ${endIso} (Market Closed/Weekend)`,
      };
    }

    // Convert to CSV: symbol,timestamp,open,high,low,close,volume
    const lines = ['symbol,timestamp,open,high,low,close,volume'];
    for (const candle of candles) {
      const isArr = Array.isArray(candle);
      const time = Number(isArr ? candle[0] : candle?.time);
      const open = Number(isArr ? candle[1] : candle?.open);
      const high = Number(isArr ? candle[2] : candle?.high);
      const low = Number(isArr ? candle[3] : candle?.low);
      const close = Number(isArr ? candle[4] : candle?.close);
      const volume = Number(isArr ? candle[5] || 0 : candle?.volume || 0);

      // Guard: strictly ensure time is after lastStoredTimestampSec
      if (
        Number.isFinite(time) &&
        time > (lastStoredTimestampSec || 0) &&
        Number.isFinite(open) &&
        Number.isFinite(high) &&
        Number.isFinite(low) &&
        Number.isFinite(close)
      ) {
        lines.push(`${symbol},${time},${open},${high},${low},${close},${volume}`);
      }
    }

    const rowCount = lines.length - 1;
    if (rowCount <= 0) {
      return {
        symbol,
        count: 0,
        status: 'SKIPPED_NO_NEW_DATA',
        message: 'No new timestamped candles to append',
      };
    }

    const pushResult = await pushToTinybird(symbol, lines.join('\n'), rowCount);
    return {
      symbol,
      count: rowCount,
      status: 'SUCCESS',
      durationMs: pushResult.durationMs,
      message: `Appended ${rowCount} candles (${startIso} -> ${endIso}) in ${pushResult.durationMs}ms`,
    };
  } catch (error) {
    return {
      symbol,
      count: 0,
      status: 'FAILED',
      error: error.message,
    };
  }
}

async function runUniversalArchivalWorker() {
  const args = parseArgs();
  const targetEndTimeUtc = getStartOfTodayUtc(args.to);
  const targetEndIso = new Date(targetEndTimeUtc).toISOString();

  console.log('========================================================================');
  console.log(`🚀 [UNIVERSAL ARCHIVAL WORKER] Starting Gap-Aware Tinybird Archival Sync`);
  console.log(`🎯 Target Bound (Start of Day): ${targetEndIso}`);
  console.log('========================================================================\n');

  console.log('1. Querying current MAX(timestamp) for symbols in Tinybird...');
  const lastTimestamps = await queryTinybirdLastTimestamps();
  console.log(`   Found ${lastTimestamps.size} existing symbol timestamps in Tinybird.\n`);

  console.log('2. Fetching configured sync symbols from Supabase Catalog (is_historical_sync = true)...');
  const allSyncInstruments = await listHistoricalSyncSymbols();
  let targetInstruments = allSyncInstruments;

  if (args.symbol) {
    const filterSym = String(args.symbol).trim().toUpperCase();
    targetInstruments = allSyncInstruments.filter((i) => i.symbol === filterSym || i.sourceSymbol === filterSym);
    if (!targetInstruments.length) {
      targetInstruments = [{ symbol: filterSym, sourceSymbol: filterSym }];
    }
  }

  console.log(`   Processing ${targetInstruments.length} symbols...\n`);

  const results = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < targetInstruments.length; i += BATCH_SIZE) {
    const batch = targetInstruments.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((inst) => {
        const lastTs = lastTimestamps.get(String(inst.symbol).toUpperCase());
        return syncSymbolGap(inst, lastTs, targetEndTimeUtc);
      })
    );

    for (const res of batchResults) {
      results.push(res);
      if (res.status === 'SUCCESS') {
        console.log(`  ✓ [${res.symbol.padEnd(8)}] SUCCESS: ${res.message}`);
      } else if (res.status === 'UP_TO_DATE') {
        console.log(`  ✓ [${res.symbol.padEnd(8)}] ${res.message}`);
      } else if (res.status.startsWith('SKIPPED')) {
        console.log(`  - [${res.symbol.padEnd(8)}] ${res.message}`);
      } else {
        console.error(`  ✗ [${res.symbol.padEnd(8)}] FAILED: ${res.error}`);
      }
    }

    if (i + BATCH_SIZE < targetInstruments.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  const upToDateCount = results.filter((r) => r.status === 'UP_TO_DATE').length;
  const skippedCount = results.filter((r) => r.status.startsWith('SKIPPED')).length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  const totalCandlesAppended = results.reduce((sum, r) => sum + (r.count || 0), 0);

  console.log('\n========================================================================');
  console.log(`📊 [SUMMARY] Target: ${targetEndIso}`);
  console.log(`   - Appended:   ${successCount} symbols (${totalCandlesAppended.toLocaleString()} total 1m candles)`);
  console.log(`   - Up to date: ${upToDateCount} symbols`);
  console.log(`   - Skipped:    ${skippedCount} symbols (Market closed/no new data)`);
  console.log(`   - Failed:     ${failedCount} symbols`);
  console.log('========================================================================');

  return {
    success: failedCount === 0,
    targetEndIso,
    totalCandlesAppended,
    results,
  };
}

if (require.main === module) {
  runUniversalArchivalWorker()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal worker error:', err);
      process.exit(1);
    });
}

module.exports = { runUniversalArchivalWorker };
