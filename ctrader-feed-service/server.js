const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('http');
const os = require('os');
const express = require('express');
const WebSocket = require('ws');
const {
  cleanup,
  connectSocket,
  ensureCtraderReady,
  fetchCtraderKlines,
  getSymbols,
  getWatchlistQuotes,
  subscribeAllSymbols,
  subscribeLiveTicks,
  subscribeSpotsBatch,
  unsubscribeLiveTicks,
} = require('./src/ctrader/socket.client');
const { connectionState, ctraderConfig, tokenState } = require('./src/ctrader/state');
const { getCtraderCatalogFromDb, loadCtraderTokensFromStore, refreshAccessToken } = require('./src/ctrader/token.service');
const { getData, getStatus, getSymbolByName, recordTick, removeSymbolCache, seedCandles, setCandleAppendReady, setTinybirdSymbols } = require('./src/feed-cache.service');
const tinybirdIngest = require('./src/tinybird-ingest.service');
const { startTelegramMonitor, sendTelegramAlert } = require('./src/telegram-monitor.service');
const { requireInternalKey, verifyInternalKey } = require('./src/security');
const logger = require('./src/logger.service');

const SERVICE_STARTED_AT = new Date();
let totalRequestsHandled = 0;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Global Request Logger Middleware & Metrics
app.use((req, res, next) => {
  totalRequestsHandled += 1;
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req, res, duration, {
      candlesCount: res.locals?.candlesCount,
      source: res.locals?.source,
      errorReason: res.locals?.errorReason,
    });
  });
  next();
});

const HOST = process.env.FEED_HOST || '127.0.0.1';
const PORT = Number(process.env.FEED_PORT || 8020);
const BOOTSTRAP_INTERVALS = String(process.env.FEED_BOOTSTRAP_INTERVALS || '1m')
  .split(',')
  .map((interval) => interval.trim())
  .filter(Boolean);

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

function normalizeSymbol(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function broadcastTickToClients(tick) {
  if (!tick || !tick.symbolName) return;
  const rawSymbol = normalizeSymbol(tick.symbolName);

  const payload = JSON.stringify({
    type: 'MARKET_TICK',
    tick: {
      ...tick,
      symbolName: tick.symbolName,
    },
  });

  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (client.subscribedSymbols && client.subscribedSymbols.has(rawSymbol)) {
      client.send(payload);
    }
  }
}

global.__ctraderFeedOnTick = (tick) => {
  recordTick(tick);
  broadcastTickToClients(tick);
};

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/internal/stream' || url.pathname === '/internal/stream/') {
    if (!verifyInternalKey(request)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  ws.subscribedSymbols = new Set();

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString('utf8'));

      if (message.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        return;
      }

      if (message.type === 'MARKET_SUBSCRIBE' && Array.isArray(message.symbols)) {
        for (const sym of message.symbols) {
          const norm = normalizeSymbol(sym);
          if (norm) {
            ws.subscribedSymbols.add(norm);
            subscribeLiveTicks(sym).catch(() => null);
          }
        }
        ws.send(JSON.stringify({
          type: 'MARKET_SUBSCRIBED',
          symbols: Array.from(ws.subscribedSymbols),
        }));
        return;
      }

      if (message.type === 'MARKET_UNSUBSCRIBE' && Array.isArray(message.symbols)) {
        for (const sym of message.symbols) {
          const norm = normalizeSymbol(sym);
          if (norm) ws.subscribedSymbols.delete(norm);
        }
        ws.send(JSON.stringify({
          type: 'MARKET_UNSUBSCRIBED',
          symbols: Array.from(ws.subscribedSymbols),
        }));
        return;
      }
    } catch {
      // Ignore invalid JSON payloads from clients
    }
  });

  ws.on('error', () => {});
});

function connected() {
  return Boolean(ctraderConfig.isAppAuthed && ctraderConfig.isAccountAuthed);
}

function getPublicTokenStatus() {
  const now = Date.now();
  return {
    hasAccessToken: Boolean(ctraderConfig.accessToken),
    hasRefreshToken: Boolean(ctraderConfig.refreshToken),
    expiresInSeconds: ctraderConfig.expiresAt ? Math.max(0, Math.floor((ctraderConfig.expiresAt - now) / 1000)) : null,
    expired: ctraderConfig.expiresAt ? now >= ctraderConfig.expiresAt : null,
  };
}

async function bootstrapCandlesForSymbol(symbol, symbolInfo) {
  if (!symbolInfo) return;

  const endTime = Date.now();
  const startTime = endTime - (24 * 60 * 60 * 1000); // 24 hours of 1-minute candles

  for (const interval of BOOTSTRAP_INTERVALS) {
    try {
      const result = await fetchCtraderKlines({
        symbol,
        interval,
        startTime,
        endTime,
        limit: 1440,
      });

      if (result?.candles && Array.isArray(result.candles)) {
        await seedCandles(symbolInfo.id, interval, result.candles);
      }
    } catch (error) {
      logger.warn('BOOTSTRAP', `Bootstrap error for ${symbol} (${interval}): ${error.message}`);
    }
  }
}

async function startFeed() {
  logger.info('STARTUP', 'Starting ctrader-feed-service in clean on-demand mode...');
  try {
    await loadCtraderTokensFromStore({ force: true });
    logger.info('STARTUP', `Tokens loaded from DB. Account ID: ${ctraderConfig.accountId}`);
  } catch (err) {
    logger.warn('STARTUP', `Failed loading tokens from DB: ${err.message}`);
  }

  connectSocket();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await ensureCtraderReady();
      logger.info('STARTUP', 'cTrader connection established and ready.');
      break;
    } catch (err) {
      logger.warn('STARTUP', `Waiting for ready state attempt ${attempt + 1}/10: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const catalog = await getCtraderCatalogFromDb();
  const liveFeedSymbols = catalog.filter((s) => s.is_live_feed).map((s) => s.symbol);
  const ramCachedSymbols = catalog.filter((s) => s.is_ram_cached).map((s) => s.symbol);
  const tinybirdSymbols = catalog.filter((s) => s.historical_data_source === 'tinybird').map((s) => s.symbol);
  setTinybirdSymbols(tinybirdSymbols);

  logger.info('STARTUP', `Database Catalog: ${catalog.length} active cTrader instruments (${tinybirdSymbols.length} Tinybird, ${ramCachedSymbols.length} RAM cached, ${liveFeedSymbols.length} Live feed).`);

  const symbols = await getSymbols();
  const byNormalized = new Map(
    symbols.map((s) => [
      String(s.normalizedName || s.name || '').replace(/[^a-z0-9]/gi, '').toUpperCase(),
      s,
    ])
  );

  setCandleAppendReady(false);
  const validIds = liveFeedSymbols
    .map((sym) => byNormalized.get(String(sym).replace(/[^a-z0-9]/gi, '').toUpperCase())?.id)
    .filter((id) => Number.isFinite(Number(id)) && Number(id) > 0);
  if (validIds.length > 0) {
    await subscribeSpotsBatch(validIds).catch(() => null);
  }

  (async () => {
    if (tinybirdSymbols.length > 0) {
      await tinybirdIngest.reconcileGapsOnStartup(tinybirdSymbols, fetchCtraderKlines).catch((err) => {
        logger.warn('STARTUP', `Tinybird gap reconciliation error: ${err.message}`);
      });
    }

    for (const sym of ramCachedSymbols) {
      const match = byNormalized.get(String(sym).replace(/[^a-z0-9]/gi, '').toUpperCase());
      if (!match) continue;
      let snapshot = await getData(match.name, { interval: '1m', limitCandles: 1440 });
      if (!snapshot?.found || snapshot.candles.length < 1440) {
        await bootstrapCandlesForSymbol(match.name, match).catch(() => null);
        snapshot = await getData(match.name, { interval: '1m', limitCandles: 1440 });
        await new Promise((r) => setTimeout(r, 100));
      }
      logger.info('CACHE', `[${match.name}] ${snapshot?.candles?.length || 0}/1440 candles ready in memory cache`);
    }

    setCandleAppendReady(true);
    logger.info('STARTUP', 'All gaps reconciled up to last minute. Live candle appending enabled.');
  })().catch(() => {});
}

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ctrader-feed-service',
    connected: connected(),
  });
});

app.get('/internal/status', requireInternalKey, async (req, res) => {
  res.json({
    success: true,
    connected: connected(),
    accountId: ctraderConfig.accountId,
    isDemo: ctraderConfig.isDemo,
    symbolCount: ctraderConfig.symbols.size,
    liveTickSubscriptionCount: ctraderConfig.liveTickSubscriptions.size,
    subscriptions: Array.from(ctraderConfig.liveTickSubscriptions.values()),
    token: getPublicTokenStatus(),
    cache: await getStatus(),
  });
});

/**
 * Super Comprehensive Diagnostics & Observability Endpoint
 * GET /internal/diagnostics
 */
app.get('/internal/diagnostics', requireInternalKey, async (req, res) => {
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - SERVICE_STARTED_AT.getTime()) / 1000);
  const cacheStatus = await getStatus();

  // Format human readable uptime
  const days = Math.floor(uptimeSeconds / (24 * 3600));
  const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  const uptimeHuman = `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

  // Memory Metrics
  const memUsage = process.memoryUsage();
  const totalSysMem = os.totalmem();
  const freeSysMem = os.freemem();
  const usedSysMem = totalSysMem - freeSysMem;

  return res.json({
    success: true,
    service: 'ctrader-feed-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: {
      startedAt: SERVICE_STARTED_AT.toISOString(),
      startedAtIST: SERVICE_STARTED_AT.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      uptimeSeconds,
      uptimeHuman,
    },
    ctrader: {
      connected: connected(),
      appAuthed: connectionState.appAuthed,
      accountAuthed: connectionState.accountAuthed,
      accountId: ctraderConfig.accountId,
      isDemo: ctraderConfig.isDemo,
      token: getPublicTokenStatus(),
      totalBrokerSymbolsAvailable: ctraderConfig.symbols.size,
      activeSubscriptionsCount: ctraderConfig.liveTickSubscriptions.size,
      activeSubscriptionSymbols: Array.from(ctraderConfig.liveTickSubscriptions.values()),
    },
    cache: {
      maxRollingCandlesPerSymbol: cacheStatus.maxRollingCandlesPerSymbol,
      cachedKeysCount: cacheStatus.cachedKeysCount,
      totalCandlesInMemory: cacheStatus.totalCandlesInMemory,
      estimatedCacheMemoryMB: cacheStatus.estimatedCacheMemoryMB,
      symbols: cacheStatus.symbols,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      processMemory: {
        heapUsedMB: Number((memUsage.heapUsed / (1024 * 1024)).toFixed(2)),
        heapTotalMB: Number((memUsage.heapTotal / (1024 * 1024)).toFixed(2)),
        rssMB: Number((memUsage.rss / (1024 * 1024)).toFixed(2)),
        externalMB: Number((memUsage.external / (1024 * 1024)).toFixed(2)),
      },
      hostMemory: {
        totalMB: Number((totalSysMem / (1024 * 1024)).toFixed(2)),
        freeMB: Number((freeSysMem / (1024 * 1024)).toFixed(2)),
        usedPercent: `${((usedSysMem / totalSysMem) * 100).toFixed(1)}%`,
      },
      loadAverage: os.loadavg(),
    },
    throughput: {
      totalRequestsHandled,
      totalTicksReceived: cacheStatus.throughput.totalTicksReceived,
      liveTicksPerSecond: cacheStatus.throughput.ticksPerSecond,
    },
  });
});

/**
 * Dynamic Dynamic Symbol Sync Endpoint (Hot-update without restarts)
 * POST /internal/sync-symbols
 */
app.post('/internal/sync-symbols', requireInternalKey, async (req, res) => {
  const { ramCachedSymbols = [], liveFeedSymbols = [] } = req.body || {};
  logger.info('SYNC', `Dynamic sync requested: ${ramCachedSymbols.length} RAM cached, ${liveFeedSymbols.length} live feed.`);

  // If cTrader not yet connected (e.g. fresh restart), acknowledge and defer gracefully.
  // klines endpoint handles cold cache on-demand when user opens a chart.
  if (!connected()) {
    logger.warn('SYNC', 'cTrader not yet connected. Sync deferred — charts will load on-demand.');
    return res.json({
      success: true,
      message: 'cTrader not yet connected. Sync deferred — charts will load on-demand.',
      activeLiveSubscriptionsCount: 0,
      warmedUpSymbols: [],
      totalCachedSymbolsCount: 0,
      totalCandlesInMemory: 0,
      deferred: true,
    });
  }

  try {
    const symbols = await getSymbols();
    const byNormalized = new Map(
      symbols.map((s) => [
        String(s.normalizedName || s.name || '').replace(/[^a-z0-9]/gi, '').toUpperCase(),
        s,
      ])
    );

    // 1. Subscribe live stream ticks for requested symbols & Unsubscribe removed ones
    const targetLiveNormalized = new Set(liveFeedSymbols.map((s) => String(s).replace(/[^a-z0-9]/gi, '').toUpperCase()));
    for (const sym of liveFeedSymbols) {
      subscribeLiveTicks(sym).catch((err) => {
        logger.warn('SYNC', `Failed subscribing live ticks for ${sym}: ${err.message}`);
      });
    }

    for (const subId of Array.from(ctraderConfig.liveTickSubscriptions.values())) {
      const symInfo = ctraderConfig.symbols.get(Number(subId));
      if (symInfo && !targetLiveNormalized.has(symInfo.normalizedName)) {
        unsubscribeLiveTicks(symInfo.name).catch(() => null);
      }
    }

    const currentStatus = await getStatus();
    res.json({
      success: true,
      message: 'Symbols dynamically synced successfully',
      activeLiveSubscriptionsCount: liveFeedSymbols.length,
      warmedUpSymbols: ramCachedSymbols,
      totalCachedSymbolsCount: currentStatus.cachedKeysCount,
      totalCandlesInMemory: currentStatus.totalCandlesInMemory,
      deferred: false,
    });

    (async () => {
      const targetRamNormalized = new Set(ramCachedSymbols.map((s) => String(s).replace(/[^a-z0-9]/gi, '').toUpperCase()));
      for (const sym of ramCachedSymbols) {
        const match = byNormalized.get(String(sym).replace(/[^a-z0-9]/gi, '').toUpperCase());
        if (!match) continue;
        const snapshot = await getData(match.name, { interval: '1m', limitCandles: 1440 });
        if (!snapshot?.found || snapshot.candles.length < 1440) {
          try {
            await bootstrapCandlesForSymbol(match.name, match);
            await new Promise((r) => setTimeout(r, 100));
          } catch (err) {
            logger.warn('SYNC', `Warmup failed for ${match.name}: ${err.message}`);
          }
        }
      }

      for (const sym of symbols) {
        if (!targetRamNormalized.has(sym.normalizedName)) {
          await removeSymbolCache(sym.name);
        }
      }
    })().catch(() => {});
  } catch (error) {
    logger.error('SYNC', `Sync failed: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/internal/logs', (req, res) => {
  const lineCount = Number(req.query.lines) || 200;
  const logs = logger.getRecentLogs(lineCount);
  if (req.query.format === 'json') {
    return res.json({ success: true, count: logs.length, logs });
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(logs.join('\n'));
});

app.get('/internal/symbols', requireInternalKey, async (req, res) => {
  try {
    const symbols = await getSymbols();
    return res.json({
      success: true,
      symbols,
    });
  } catch (error) {
    res.locals.errorReason = error.message;
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Symbols unavailable',
    });
  }
});

app.get('/internal/quotes', requireInternalKey, async (req, res) => {
  const rawSymbols = req.query.symbols;
  const symbols = typeof rawSymbols === 'string'
    ? rawSymbols.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  try {
    const quotes = await getWatchlistQuotes(symbols);
    return res.json({
      success: true,
      quotes,
    });
  } catch (error) {
    res.locals.errorReason = error.message;
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Quotes unavailable',
    });
  }
});

app.get('/internal/quote', requireInternalKey, (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) {
    res.locals.errorReason = 'Missing symbol query param';
    return res.status(400).json({ success: false, error: 'Missing symbol' });
  }

  const snapshot = getQuoteSnapshot(symbol);
  if (!snapshot.found) {
    res.locals.errorReason = `Symbol '${symbol}' not found`;
    return res.status(404).json({ success: false, error: 'Symbol not found' });
  }

  return res.json({
    success: true,
    symbol: snapshot.symbol.name,
    quote: snapshot.quote,
  });
});

app.get('/internal/binance/price', requireInternalKey, async (req, res) => {
  const symbol = req.query.symbol;
  try {
    const url = symbol ? `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${encodeURIComponent(String(symbol).toUpperCase())}` : 'https://fapi.binance.com/fapi/v1/ticker/price';
    const r = await fetch(url);
    const data = await r.json();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/internal/binance/klines', requireInternalKey, async (req, res) => {
  const { symbol, interval = '1m', limit = 500, startTime, endTime } = req.query;
  if (!symbol) return res.status(400).json({ success: false, error: 'Missing symbol' });
  try {
    const params = new URLSearchParams({ symbol: String(symbol).toUpperCase(), interval: String(interval), limit: String(limit) });
    if (startTime) params.set('startTime', String(startTime));
    if (endTime) params.set('endTime', String(endTime));
    const r = await fetch(`https://fapi.binance.com/fapi/v1/klines?${params.toString()}`);
    const data = await r.json();
    return res.json({ success: true, symbol, candles: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/internal/klines', requireInternalKey, async (req, res) => {
  const { symbol, interval = '1m', startTime, endTime, limit = 250 } = req.query;

  if (!symbol) {
    res.locals.errorReason = 'Missing symbol parameter';
    return res.status(400).json({
      success: false,
      error: 'Missing symbol parameter',
    });
  }

  try {
    // 1. If memory cache has sufficient rolling candles and no specific historical range requested, return RAM cache instantly (< 1ms)
    const minRequired = Math.min(Number(limit) || 250, 200);
    if (!startTime && !endTime) {
      const snapshot = await getData(symbol, { interval, limitCandles: limit });
      if (snapshot?.found && Array.isArray(snapshot?.candles) && snapshot.candles.length >= minRequired) {
        res.locals.candlesCount = snapshot.candles.length;
        res.locals.source = 'cache';
        return res.json({
          success: true,
          symbol,
          interval,
          candles: snapshot.candles,
          source: 'cache',
          serverTime: Math.floor(Date.now() / 1000),
          serverTimeMs: Date.now(),
        });
      }
    }

    // 2. Fetch from cTrader API for cold cache, insufficient cache, or explicit historical range
    const result = await fetchCtraderKlines({
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });

    const symbolInfo = getSymbolByName(symbol);
    if (symbolInfo?.id && Array.isArray(result?.candles)) {
      await seedCandles(symbolInfo.id, interval, result.candles);
    }

    res.locals.candlesCount = result?.candles?.length || 0;
    res.locals.source = 'ctrader-api';

    return res.json({
      success: true,
      symbol,
      interval,
      candles: result.candles,
      source: 'ctrader-api',
      serverTime: Math.floor(Date.now() / 1000),
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    res.locals.errorReason = error.message;
    return res.status(error.status || 502).json({
      success: false,
      error: error.message || 'Failed fetching klines',
      candles: [],
    });
  }
});

async function shutdown() {
  logger.info('SHUTDOWN', 'Shutting down cTrader feed service...');
  try {
    await cleanup();
  } catch {}
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function startProactiveTokenRefresh() {
  const interval = 12 * 60 * 60 * 1000;
  const threshold = 5 * 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const exp = Number(ctraderConfig.expiresAt || 0);
      if (exp > 0 && (exp - Date.now()) < threshold) {
        logger.info('TOKEN', 'Proactively refreshing cTrader token...');
        const ok = await refreshAccessToken();
        if (ok) {
          sendTelegramAlert('Token Refreshed', 'cTrader token refreshed in background.', false).catch(() => {});
        } else {
          sendTelegramAlert('Token Refresh Failed', tokenState.lastRefreshError || 'Unknown error', true).catch(() => {});
        }
      }
    } catch (err) {
      logger.error('TOKEN', `Proactive refresh error: ${err.message}`);
      sendTelegramAlert('Token Refresh Error', err.message, true).catch(() => {});
    }
  }, interval).unref?.();
}

server.listen(PORT, HOST, async () => {
  logger.info('SERVER', `ctrader-feed-service HTTP/WS listening on http://${HOST}:${PORT}`);
  startTelegramMonitor({ startedAt: SERVICE_STARTED_AT });
  startProactiveTokenRefresh();
  try {
    await startFeed();
  } catch (error) {
    logger.error('FATAL', `Failed to start feed: ${error.message}`);
  }
});
