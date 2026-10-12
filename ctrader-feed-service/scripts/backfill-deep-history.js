const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectSocket, ensureCtraderReady, fetchCtraderKlines } = require('../src/ctrader/socket.client');
const { loadCtraderTokensFromStore, getCtraderCatalogFromDb } = require('../src/ctrader/token.service');
const { appendCandles } = require('../src/tinybird-ingest.service');

const STATE_FILE = path.resolve(__dirname, '..', 'logs', 'backfill_state.json');
const QUEUE_FILE = path.resolve(__dirname, '..', 'logs', 'backfill_queue.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {}
}

function loadQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    }
  } catch {}
  return { pending: [], in_progress: null, completed: [] };
}

function saveQueue(queue) {
  try {
    const dir = path.dirname(QUEUE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch {}
}

async function notifyTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch {}
}

async function deleteSymbolFromTinybird(symbol) {
  const url = process.env.TINYBIRD_URL;
  const token = process.env.TINYBIRD_TOKEN;
  if (!url || !token) return;
  try {
    const res = await fetch(`${url}/v0/datasources/candles/delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `delete_condition=${encodeURIComponent(`symbol = '${symbol}'`)}`,
    });
    const json = await res.json();
    const jobId = json.job_id || json.id;
    if (jobId) {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const jRes = await fetch(`${url}/v0/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const jStatus = await jRes.json();
        if (jStatus.status === 'done') break;
      }
    }
  } catch (err) {
    console.error(`[Tinybird Delete Error for ${symbol}]`, err.message);
  }
}

async function getSymbolStats(symbol) {
  const url = process.env.TINYBIRD_URL;
  const token = process.env.TINYBIRD_TOKEN;
  if (!url || !token) return { maxTs: null, minTs: null, totalCount: 0 };
  try {
    const q = `SELECT toUnixTimestamp(max(timestamp)) as max_ts, toUnixTimestamp(min(timestamp)) as min_ts, count() as total_count FROM candles WHERE symbol = '${symbol}' FORMAT JSON`;
    const res = await fetch(`${url}/v0/sql?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const maxTs = json.data?.[0]?.max_ts;
    const minTs = json.data?.[0]?.min_ts;
    const totalCount = Number(json.data?.[0]?.total_count || 0);
    return {
      maxTs: Number.isFinite(maxTs) && maxTs > 0 ? Number(maxTs) : null,
      minTs: Number.isFinite(minTs) && minTs > 0 ? Number(minTs) : null,
      totalCount,
    };
  } catch {
    return { maxTs: null, minTs: null, totalCount: 0 };
  }
}

async function getTotalDatabaseRows() {
  const url = process.env.TINYBIRD_URL;
  const token = process.env.TINYBIRD_TOKEN;
  if (!url || !token) return 0;
  try {
    const q = `SELECT count() as total FROM candles FORMAT JSON`;
    const res = await fetch(`${url}/v0/sql?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return Number(json.data?.[0]?.total || 0);
  } catch {
    return 0;
  }
}

async function syncQueueWithDatabase() {
  const url = process.env.TINYBIRD_URL;
  const token = process.env.TINYBIRD_TOKEN;
  if (!url || !token) return;
  try {
    const q = `SELECT symbol, count() as total_count, min(toDateTime(timestamp)) as min_d, max(toDateTime(timestamp)) as max_d, toUnixTimestamp(max(timestamp)) as max_ts, toUnixTimestamp(min(timestamp)) as min_ts FROM candles GROUP BY symbol FORMAT JSON`;
    const res = await fetch(`${url}/v0/sql?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const rows = json.data || [];
    const queue = loadQueue();
    const nowSec = Math.floor(Date.now() / 1000);

    for (const row of rows) {
      const isComplete = Number(row.total_count) > 1000000 &&
                         row.min_ts && row.min_ts <= 1451606400 &&
                         row.max_ts && (nowSec - row.max_ts) < (72 * 3600);

      if (isComplete) {
        queue.pending = queue.pending.filter((s) => s !== row.symbol);
        if (!queue.completed.some((c) => c.symbol === row.symbol)) {
          queue.completed.push({
            symbol: row.symbol,
            totalCandles: Number(row.total_count),
            from: String(row.min_d).slice(0, 10),
            to: String(row.max_d).slice(0, 10),
            completedAt: new Date().toISOString(),
          });
        }
      }
    }
    saveQueue(queue);
  } catch {}
}

async function parseArgs() {
  await syncQueueWithDatabase();
  const args = process.argv.slice(2);
  let symbols = [];
  let fromDate = '2015-01-01T00:00:00Z';
  let toDate = new Date().toISOString();
  let force = false;

  if (args.includes('--all')) {
    const catalog = await getCtraderCatalogFromDb();
    symbols = catalog.map((c) => c.symbol).filter(Boolean);
    if (symbols.length === 0) {
      console.error('\x1b[31m[ERROR] No active cTrader instruments found in database catalog.\x1b[0m');
      process.exit(1);
    }
  } else {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--symbol' && args[i + 1]) {
        symbols.push(...args[i + 1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
        i++;
      } else if (arg.startsWith('--symbol=')) {
        symbols.push(...arg.slice(9).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
      } else if (arg === '--from' && args[i + 1]) {
        fromDate = args[i + 1].includes('T') ? args[i + 1] : `${args[i + 1]}T00:00:00Z`;
        i++;
      } else if (arg === '--to' && args[i + 1]) {
        toDate = args[i + 1].includes('T') ? args[i + 1] : `${args[i + 1]}T00:00:00Z`;
        i++;
      } else if (arg === '--force') {
        force = true;
      } else if (arg && !arg.startsWith('--')) {
        symbols.push(...arg.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
      } else if (arg.startsWith('--') && arg.length > 2) {
        const clean = arg.replace(/^--?/, '').toUpperCase();
        if (clean !== 'FORCE' && clean !== 'QUEUE') {
          symbols.push(...clean.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
        }
      }
    }
  }

  if (symbols.length === 0) {
    const queue = loadQueue();
    symbols = queue.pending || [];
    if (symbols.length === 0) {
      console.log('\x1b[32m✔ All symbols in backfill_queue.json are already completed!\x1b[0m');
      process.exit(0);
    }
  }

  const unique = Array.from(new Set(symbols));
  return { symbols: unique, fromDate, toDate, force };
}

function renderProgress(symbol, currentSec, fromSec, toSec, totalIngested, startTimeMs) {
  const totalSec = Math.max(toSec - fromSec, 1);
  const progressSec = Math.min(Math.max(currentSec - fromSec, 0), totalSec);
  const pct = ((progressSec / totalSec) * 100).toFixed(1);
  const filled = Math.floor(Number(pct) / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  const elapsedSec = Math.max((Date.now() - startTimeMs) / 1000, 0.1);
  const speed = Math.round(totalIngested / elapsedSec);
  const currentDate = new Date(currentSec * 1000).toISOString().slice(0, 10);
  console.log(`[${symbol.padEnd(10)}] [${bar}] ${pct.padStart(5)}% | Ingested: ${totalIngested.toLocaleString().padStart(9)} candles | Date: ${currentDate} | Speed: ${speed.toLocaleString().padStart(6)} c/s`);
  return { pct, speed, currentDate };
}

async function processSymbol(symbol, fromSec, toSec, force, state) {
  const existing = state[symbol];
  let startSec = fromSec;
  let totalIngested = 0;
  const stats = await getSymbolStats(symbol);
  const isGenuinelyHistorical = stats.totalCount >= 10000 && stats.minTs && stats.minTs <= (fromSec + (30 * 86400));
  const isUpToDate = stats.maxTs && (toSec - stats.maxTs) < (14 * 86400);

  if (!force && isGenuinelyHistorical && isUpToDate && stats.totalCount > 3000000) {
    console.log(`\x1b[33m⏩ [${symbol}] Already COMPLETED (${stats.totalCount.toLocaleString()} candles up to ${new Date(stats.maxTs * 1000).toISOString().slice(0, 10)}). Skipping.\x1b[0m\n`);
    return;
  }

  if (!force && isGenuinelyHistorical && stats.maxTs && stats.maxTs > fromSec) {
    startSec = stats.maxTs + 60;
    totalIngested = stats.totalCount;
    console.log(`\x1b[33m⏩ [${symbol}] Resuming from existing data at ${new Date(startSec * 1000).toISOString().slice(0, 10)} (Preserved ${totalIngested.toLocaleString()} candles)\x1b[0m`);
    await notifyTelegram(`⏩ <b>[${symbol} Smart Resume]</b> Resuming from <code>${new Date(startSec * 1000).toISOString().slice(0, 10)}</code> (Preserved ${totalIngested.toLocaleString()} candles)`);
  } else {
    console.log(`\x1b[34m>>> Starting backfill for ${symbol} from ${new Date(startSec * 1000).toISOString().slice(0, 10)}...\x1b[0m`);
    await notifyTelegram(`⏳ <b>[${symbol}]</b> Historical 11-Year backfill started (2015 to 2026)...`);
  }

  state[symbol] = {
    status: 'IN_PROGRESS',
    startedAt: existing?.startedAt || new Date().toISOString(),
    from: new Date(fromSec * 1000).toISOString().slice(0, 10),
    to: new Date(toSec * 1000).toISOString().slice(0, 10),
    totalCandles: totalIngested,
  };
  saveState(state);

  const endSec = toSec;
  const startTimeMs = Date.now();
  let batchMap = new Map();
  let lastProgressInfo = null;

  const PIPELINE_CHUNKS = 4;

  while (startSec < endSec) {
    const tasks = [];
    for (let i = 0; i < PIPELINE_CHUNKS; i++) {
      const chunkStart = startSec + (i * 2000 * 60);
      const chunkEnd = Math.min(chunkStart + (2000 * 60), endSec);
      if (chunkStart < endSec) {
        tasks.push(
          fetchCtraderKlines({
            symbol,
            interval: '1m',
            startTime: chunkStart * 1000,
            endTime: chunkEnd * 1000,
            limit: 2000,
          })
        );
      }
    }

    if (tasks.length === 0) break;

    try {
      const results = await Promise.all(tasks);
      for (const res of results) {
        const klines = Array.isArray(res) ? res : res?.candles || [];
        if (Array.isArray(klines) && klines.length > 0) {
          for (const k of klines) {
            const isArr = Array.isArray(k);
            const time = Number(isArr ? k[0] : k?.time);
            const timeSec = time > 1e11 ? Math.floor(time / 1000) : Math.floor(time);
            const open = Number(isArr ? k[1] : k?.open);
            if (Number.isFinite(timeSec) && Number.isFinite(open) && open > 0 && !batchMap.has(timeSec)) {
              batchMap.set(timeSec, {
                symbol,
                timestamp: timeSec,
                open,
                high: Number(isArr ? k[2] : k?.high),
                low: Number(isArr ? k[3] : k?.low),
                close: Number(isArr ? k[4] : k?.close),
                volume: Number(isArr ? k[5] || 0 : k?.volume || 0),
              });
              totalIngested++;
            }
          }
        }
      }

      startSec += (tasks.length * 2000 * 60);
      lastProgressInfo = renderProgress(symbol, startSec, fromSec, endSec, totalIngested, startTimeMs);

      if (batchMap.size >= 200000 || startSec >= endSec) {
        if (batchMap.size > 0) {
          const batchArr = Array.from(batchMap.values()).sort((a, b) => a.timestamp - b.timestamp);
          process.stdout.write(`\n\x1b[36m[TINYBIRD BULK]\x1b[0m Ingesting ${batchArr.length.toLocaleString()} candles for ${symbol} into Tinybird...\n`);
          await appendCandles(batchArr);
          batchMap.clear();

          if (lastProgressInfo) {
            const totalDbRows = await getTotalDatabaseRows();
            const estTotalSymbol = Math.max(Math.round((endSec - fromSec) / 60 * 0.71), totalIngested);
            const remainingSymbol = Math.max(estTotalSymbol - totalIngested, 0);

            await notifyTelegram(
              `📊 <b>[${symbol} Progress] ${lastProgressInfo.pct}%</b>\n` +
              `• <b>Batch Flushed:</b> <code>+${batchArr.length.toLocaleString()}</code> candles\n` +
              `• <b>Symbol Ingested:</b> <code>${totalIngested.toLocaleString()}</code> candles\n` +
              `• <b>Symbol Remaining:</b> <code>~${remainingSymbol.toLocaleString()}</code> candles\n` +
              `• <b>Total Database:</b> <code>${totalDbRows.toLocaleString()}</code> rows across all symbols\n` +
              `• <b>Current Date:</b> <code>${lastProgressInfo.currentDate}</code>\n` +
              `• <b>Speed:</b> <code>${lastProgressInfo.speed.toLocaleString()} c/s</code>`
            );
          }
        }
      }

      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      if (err.message && err.message.includes('rate limited')) {
        console.warn(`\x1b[33m[Rate Limit Cooling]\x1b[0m Waiting 3s for ${symbol}...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      console.error(`\x1b[31m[${symbol} Error]\x1b[0m ${err.message}. Retrying chunk...`);
      await ensureCtraderReady().catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
  }

  if (batchMap.size > 0) {
    const batchArr = Array.from(batchMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    process.stdout.write(`\n\x1b[36m[TINYBIRD BULK]\x1b[0m Ingesting final ${batchArr.length.toLocaleString()} candles for ${symbol} into Tinybird...\n`);
    await appendCandles(batchArr);
    batchMap.clear();
  }

  if (totalIngested < 100000 && !symbol.includes('SUI') && !symbol.includes('NEAR')) {
    console.error(`\x1b[31m[${symbol}] Incomplete run (${totalIngested} candles). Not marking completed.\x1b[0m`);
    return;
  }

  const durationSec = Math.max(Math.round((Date.now() - startTimeMs) / 1000), 1);
  state[symbol] = {
    status: 'COMPLETED',
    totalCandles: totalIngested,
    completedAt: new Date().toISOString(),
    durationSeconds: durationSec,
  };
  saveState(state);

  const qDone = loadQueue();
  qDone.pending = qDone.pending.filter((s) => s !== symbol);
  if (!qDone.completed.some((c) => c.symbol === symbol)) {
    qDone.completed.push({
      symbol,
      totalCandles: totalIngested,
      from: new Date(fromSec * 1000).toISOString().slice(0, 10),
      to: new Date(toSec * 1000).toISOString().slice(0, 10),
      completedAt: new Date().toISOString(),
      durationSeconds: durationSec,
    });
  }
  saveQueue(qDone);

  process.stdout.write('\n');
  console.log(`\x1b[32m✔ [${symbol}] Complete:\x1b[0m Total ${totalIngested.toLocaleString()} candles backfilled in ${durationSec}s. (${qDone.pending.length} remaining in queue)\n`);
  const totalDbRows = await getTotalDatabaseRows();
  await notifyTelegram(
    `✅ <b>[${symbol} 100% Completed]</b>\n` +
    `• <b>Symbol Candles:</b> <code>${totalIngested.toLocaleString()}</code> candles (100% Unique)\n` +
    `• <b>Total Database:</b> <code>${totalDbRows.toLocaleString()}</code> rows across all symbols\n` +
    `• <b>Duration:</b> <code>${Math.floor(durationSec / 60)}m ${durationSec % 60}s</code> (Speed: <code>${Math.round(totalIngested / durationSec).toLocaleString()} c/s</code>)\n` +
    `• <b>Remaining in Queue:</b> <code>${qDone.pending.length} symbols</code>`
  );
}

async function runBackfill() {
  const { symbols, fromDate, toDate, force } = await parseArgs();
  const fromSec = Math.floor(new Date(fromDate).getTime() / 1000);
  const toSec = Math.floor(new Date(toDate).getTime() / 1000);
  const state = loadState();

  console.log(`\n\x1b[36m=========================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m   cTrader -> Tinybird Deep Historical Backfill Engine   \x1b[0m`);
  console.log(`\x1b[36m=========================================================\x1b[0m`);
  console.log(`Target Symbols:  \x1b[33m${symbols.join(', ')}\x1b[0m`);
  console.log(`Range:           \x1b[33m${new Date(fromSec * 1000).toISOString().slice(0, 10)}\x1b[0m to \x1b[33m${new Date(toSec * 1000).toISOString().slice(0, 10)}\x1b[0m`);
  console.log(`Pipeline:        \x1b[32m4 Chunks Pipelined (Safe Rate-Limit Buffer)\x1b[0m`);
  console.log(`---------------------------------------------------------\n`);

  await loadCtraderTokensFromStore({ force: true });
  connectSocket();
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await ensureCtraderReady();
      break;
    } catch (err) {
      if (attempt === 10) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log(`\x1b[32m[cTrader Ready]\x1b[0m Authenticated and connected.\n`);

  await notifyTelegram(`🚀 <b>[Pipelined Backfill Engine Active]</b>\n• Queue: <code>${symbols.length} symbols</code>\n• Range: <code>${new Date(fromSec * 1000).toISOString().slice(0, 10)}</code> to <code>${new Date(toSec * 1000).toISOString().slice(0, 10)}</code>`);

  for (const sym of symbols) {
    await processSymbol(sym, fromSec, toSec, force, state);
  }

  console.log(`\x1b[32m=========================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m       ALL HISTORICAL BACKFILL TASKS FINISHED            \x1b[0m`);
  console.log(`\x1b[32m=========================================================\x1b[0m\n`);
  await notifyTelegram(`🎉 <b>[All Backfill Tasks Completed]</b>\nAll specified symbols have been successfully loaded into Tinybird!`);
  process.exit(0);
}

runBackfill().catch(async (err) => {
  console.error('\n[Backfill Error]', err.message);
  await notifyTelegram(`❌ <b>[Backfill Error]</b> ${err.message}`);
  process.exit(1);
});
