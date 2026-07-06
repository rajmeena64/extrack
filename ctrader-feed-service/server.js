require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const WebSocket = require('ws');
const {
  cleanup,
  ensureCtraderReady,
  fetchCtraderKlines,
  getSymbols,
  subscribeLiveTickIds,
} = require('./src/ctrader/socket.client');
const { connectionState, ctraderConfig, tokenState } = require('./src/ctrader/state');
const { getData, getQuoteSnapshot, getStatus, pruneAll, recordTick, seedCandles } = require('./src/feed-cache.service');
const { getFeedKeyStatus, loadOrRotateKey } = require('./src/security/feed-key.service');
const {
  authenticateBackendSignature,
  requireBackendSignature,
  requireSecureTransport,
} = require('./src/security');

const app = express();
app.disable('x-powered-by');
if (process.env.FEED_TRUST_PROXY) {
  const numericTrustProxy = Number(process.env.FEED_TRUST_PROXY);
  app.set('trust proxy', Number.isFinite(numericTrustProxy) ? numericTrustProxy : process.env.FEED_TRUST_PROXY);
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));

const internalRateLimiter = rateLimit({
  windowMs: boundedNumber(process.env.FEED_RATE_LIMIT_WINDOW_MS, 60000, 1000, 3600000),
  limit: boundedNumber(process.env.FEED_RATE_LIMIT_MAX, 6000, 10, 100000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use('/internal', requireSecureTransport);
app.use('/internal', (req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  res.set('Pragma', 'no-cache');
  next();
});
app.use('/internal', internalRateLimiter, requireBackendSignature);

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

const HOST = process.env.FEED_HOST || '0.0.0.0';
const PORT = boundedNumber(process.env.FEED_PORT || process.env.PORT, 8020, 1, 65535);
const PRESUBSCRIBED_SYMBOLS = String(process.env.CTRADER_PRESUBSCRIBED_SYMBOLS || process.env.PRESUBSCRIBED_SYMBOLS || 'ALL')
  .split(',')
  .map((symbol) => symbol.trim())
  .filter(Boolean);
const BOOTSTRAP_INTERVALS = String(process.env.FEED_BOOTSTRAP_INTERVALS || '1m')
  .split(',')
  .map((interval) => interval.trim())
  .filter(Boolean);
const BOOTSTRAP_CANDLES = String(process.env.FEED_BOOTSTRAP_CANDLES || 'false') === 'true';
const BOOTSTRAP_MAX_SYMBOLS = boundedNumber(process.env.FEED_BOOTSTRAP_MAX_SYMBOLS, 25, 1, 100);
const RECONCILE_INTERVAL_MS = boundedNumber(process.env.FEED_RECONCILE_INTERVAL_MS, 15000, 5000, 300000);
const SUPPORTED_INTERVALS = new Set(['1m', '3m', '5m', '15m', '30m', '1h', '4h']);

let reconcileInFlight = null;
let reconcileTimer = null;
let pruneTimer = null;
let keyRotationTimer = null;
let streamHeartbeatTimer = null;
let targetSymbolCount = 0;

const feedWss = new WebSocket.Server({ noServer: true, maxPayload: 1024 });

function handleFeedTick(tick) {
  recordTick(tick);
  if (feedWss.clients.size === 0) return;

  const payload = JSON.stringify({ type: 'MARKET_TICK', tick });
  for (const client of feedWss.clients) {
    if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 1024 * 1024) {
      client.send(payload);
    }
  }
}

global.__ctraderFeedOnTick = handleFeedTick;

feedWss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

function connected() {
  return Boolean(
    connectionState.ws &&
    connectionState.ws.readyState === connectionState.ws.OPEN &&
    ctraderConfig.isAppAuthed &&
    ctraderConfig.isAccountAuthed
  );
}

function validSymbol(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 64 && /^[a-z0-9._:/-]+$/i.test(value);
}

function getPublicTokenStatus() {
  const expiresAt = Number(ctraderConfig.expiresAt || 0);
  return {
    hasAccessToken: Boolean(ctraderConfig.accessToken),
    hasRefreshToken: Boolean(ctraderConfig.refreshToken),
    hasClientId: Boolean(ctraderConfig.clientId),
    hasClientSecret: Boolean(ctraderConfig.clientSecret),
    expiresAtIso: expiresAt ? new Date(expiresAt).toISOString() : null,
    expiresInSeconds: expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : null,
    lastTokenRefreshError: tokenState.lastRefreshError || null,
  };
}

async function bootstrapCandlesForSymbol(symbol, symbolInfo) {
  if (!BOOTSTRAP_CANDLES || !symbolInfo) return;

  const endTime = Date.now();
  const startTime = endTime - (4 * 60 * 60 * 1000);

  for (const interval of BOOTSTRAP_INTERVALS) {
    try {
      const result = await fetchCtraderKlines({
        symbol,
        interval,
        startTime,
        endTime,
        limit: 1000,
      });

      seedCandles(symbolInfo.id, interval, result.candles || []);
      console.info('feed.bootstrap_candles.ok', {
        symbol,
        interval,
        candles: result.candles?.length || 0,
      });
    } catch (error) {
      console.warn('feed.bootstrap_candles.failed', {
        symbol,
        interval,
        error: error.message,
      });
    }
  }
}

function resolveTargetSymbols(symbols) {
  const subscribeAll = PRESUBSCRIBED_SYMBOLS.some((symbol) => ['ALL', '*'].includes(symbol.toUpperCase()));
  if (subscribeAll) return symbols;

  const byNormalized = new Map(
    symbols.map((symbol) => [
      String(symbol.normalizedName || symbol.name || '').replace(/[^a-z0-9]/gi, '').toUpperCase(),
      symbol,
    ])
  );

  return PRESUBSCRIBED_SYMBOLS.map((requested) => {
    const normalized = requested.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const match = byNormalized.get(normalized);
    if (!match) console.warn('feed.presubscribe.symbol_not_found', { symbol: requested });
    return match;
  }).filter(Boolean);
}

async function reconcileSubscriptions({ bootstrap = false } = {}) {
  if (reconcileInFlight) return reconcileInFlight;

  reconcileInFlight = (async () => {
    await ensureCtraderReady();
    const symbols = await getSymbols();
    const targets = resolveTargetSymbols(symbols);
    targetSymbolCount = targets.length;
    const missingIds = targets
      .map((symbol) => Number(symbol.id))
      .filter((symbolId) => !ctraderConfig.liveTickSubscriptions.has(String(symbolId)));

    if (missingIds.length) {
      await subscribeLiveTickIds(missingIds);
      console.info('feed.presubscribe.ok', {
        added: missingIds.length,
        total: ctraderConfig.liveTickSubscriptions.size,
      });
    }

    if (bootstrap && BOOTSTRAP_CANDLES) {
      const bootstrapTargets = targets.slice(0, BOOTSTRAP_MAX_SYMBOLS);
      if (bootstrapTargets.length < targets.length) {
        console.warn('feed.bootstrap_candles.capped', {
          requested: targets.length,
          maxSymbols: BOOTSTRAP_MAX_SYMBOLS,
        });
      }
      for (const symbol of bootstrapTargets) {
        await bootstrapCandlesForSymbol(symbol.name, symbol);
      }
    }
  })().finally(() => {
    reconcileInFlight = null;
  });

  return reconcileInFlight;
}

async function startFeed() {
  const missing = ['CTRADER_CLIENT_ID', 'CTRADER_CLIENT_SECRET'].filter((key) => !process.env[key]);

  if (String(process.env.CTRADER_TOKEN_SOURCE || 'database').toLowerCase() !== 'env') {
    if (!process.env.DATABASE_URL && !(process.env.DB_HOST || process.env.PGHOST)) {
      missing.push('DATABASE_URL or DB_HOST');
    }
    if (!process.env.MT5_CREDENTIALS_KEY) {
      missing.push('MT5_CREDENTIALS_KEY');
    }
  } else if (!process.env.CTRADER_ACCESS_TOKEN && !process.env.CTRADER_REFRESH_TOKEN) {
    missing.push('CTRADER_ACCESS_TOKEN or CTRADER_REFRESH_TOKEN');
  }

  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }

  await loadOrRotateKey({ force: true });

  // Important: ensureCtraderReady() loads DB tokens, loads protobuf root, then opens the socket.
  // If connectSocket() runs first, the socket can open before root exists,
  // sendAppAuth() silently fails, and the service times out with
  // "cTrader connection is not ready".
  await ensureCtraderReady();

  await reconcileSubscriptions({ bootstrap: true });
}

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ctrader-feed-service',
  });
});

app.get('/ready', (req, res) => {
  const subscriptionCount = ctraderConfig.liveTickSubscriptions.size;
  const isReady = connected() && targetSymbolCount > 0 && subscriptionCount >= targetSymbolCount;
  res.status(isReady ? 200 : 503).json({
    success: isReady,
  });
});

app.get('/internal/status', (req, res) => {
  res.json({
    success: true,
    connected: connected(),
    accountId: ctraderConfig.accountId,
    isDemo: ctraderConfig.isDemo,
    symbolCount: ctraderConfig.symbols.size,
    liveTickSubscriptionCount: ctraderConfig.liveTickSubscriptions.size,
    targetSubscriptionCount: targetSymbolCount,
    subscriptions: Array.from(ctraderConfig.liveTickSubscriptions.values()),
    presubscribedSymbols: PRESUBSCRIBED_SYMBOLS,
    token: getPublicTokenStatus(),
    apiKey: getFeedKeyStatus(),
    connectionError: connectionState.lastConnectError || null,
    apiError: connectionState.lastApiError || null,
    cache: getStatus(),
  });
});

app.get('/internal/data/:symbol', async (req, res) => {
  const symbol = String(req.params.symbol || '').trim();
  const interval = String(req.query.interval || '1m');
  const limitTicks = Number(req.query.limitTicks || 2000);
  const limitCandles = Number(req.query.limitCandles || 500);

  try {
    if (!validSymbol(symbol)) {
      return res.status(400).json({ success: false, error: 'Invalid symbol' });
    }
    if (!SUPPORTED_INTERVALS.has(interval)) {
      return res.status(400).json({ success: false, error: 'Unsupported interval' });
    }

    const snapshot = getData(symbol, {
      interval,
      limitTicks,
      limitCandles,
    });

    if (!snapshot.found) {
      return res.status(404).json({
        success: false,
        error: 'Symbol not found or not loaded',
        symbol,
      });
    }

    return res.json({
      success: true,
      ...snapshot,
      connected: connected(),
      serverTime: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: 'Market feed unavailable',
    });
  }
});

app.get('/internal/quote/:symbol', async (req, res) => {
  const symbol = String(req.params.symbol || '').trim();

  try {
    if (!validSymbol(symbol)) {
      return res.status(400).json({ success: false, error: 'Invalid symbol' });
    }
    const snapshot = getQuoteSnapshot(symbol);

    if (!snapshot.found) {
      return res.status(404).json({
        success: false,
        error: 'Symbol not found or not loaded',
        symbol,
      });
    }

    return res.json({
      success: true,
      symbol: snapshot.symbol,
      quote: snapshot.quote,
      connected: connected(),
      serverTime: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: 'Market feed unavailable',
    });
  }
});

app.get('/internal/symbols', (req, res) => {
  const symbols = Array.from(ctraderConfig.symbols.values()).map((symbol) => ({
    ...symbol,
    subscribed: ctraderConfig.liveTickSubscriptions.has(String(symbol.id)),
    hasQuote: ctraderConfig.latestTicks.has(Number(symbol.id)),
  }));
  res.json({ success: true, connected: connected(), count: symbols.length, symbols });
});

app.get('/internal/quotes', (req, res) => {
  const requested = String(req.query.symbols || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!requested.length) {
    return res.status(400).json({ success: false, error: 'symbols query parameter is required' });
  }
  if (requested.length > 250) {
    return res.status(400).json({ success: false, error: 'Maximum 250 symbols per request' });
  }
  if (requested.some((symbol) => !validSymbol(symbol))) {
    return res.status(400).json({ success: false, error: 'Invalid symbol list' });
  }

  const quotes = {};
  for (const symbol of requested) {
    const snapshot = getQuoteSnapshot(symbol);
    quotes[symbol] = snapshot.found ? snapshot.quote : null;
  }

  return res.json({
    success: true,
    connected: connected(),
    quotes,
    serverTime: Math.floor(Date.now() / 1000),
  });
});

function shutdown() {
  if (reconcileTimer) clearInterval(reconcileTimer);
  if (pruneTimer) clearInterval(pruneTimer);
  if (keyRotationTimer) clearInterval(keyRotationTimer);
  if (streamHeartbeatTimer) clearInterval(streamHeartbeatTimer);
  for (const client of feedWss.clients) client.terminate();
  feedWss.close();
  cleanup();
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

const httpServer = app.listen(PORT, HOST, async () => {
  console.log(`ctrader-feed-service listening on http://${HOST}:${PORT}`);
  try {
    await startFeed();
    console.log('ctrader-feed-service ready');
  } catch (error) {
    console.error('ctrader-feed-service failed to start feed', error.message);
  }

  reconcileTimer = setInterval(() => {
    reconcileSubscriptions().catch((error) => {
      console.warn('feed.reconcile.failed', { error: error.message });
    });
  }, RECONCILE_INTERVAL_MS);
  pruneTimer = setInterval(pruneAll, 60000);
  keyRotationTimer = setInterval(() => {
    loadOrRotateKey({ force: true }).catch((error) => {
      console.warn('feed.api_key.refresh_failed', { error: error.message });
    });
  }, boundedNumber(process.env.FEED_KEY_CHECK_INTERVAL_MS, 300000, 30000, 3600000));

  streamHeartbeatTimer = setInterval(() => {
    for (const client of feedWss.clients) {
      if (!client.isAlive) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);
});

httpServer.on('upgrade', async (req, socket, head) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (requestUrl.pathname !== '/internal/stream' || feedWss.clients.size >= 20) {
    socket.destroy();
    return;
  }

  const secureRequired = process.env.FEED_REQUIRE_HTTPS === undefined
    ? true
    : String(process.env.FEED_REQUIRE_HTTPS) === 'true';
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (secureRequired && !req.socket.encrypted && forwardedProtocol !== 'https') {
    socket.destroy();
    return;
  }

  try {
    const authenticated = await authenticateBackendSignature({
      clientId: req.headers['x-feed-client-id'],
      timestampText: req.headers['x-feed-timestamp'],
      nonce: req.headers['x-feed-nonce'],
      signature: req.headers['x-feed-signature'],
      method: 'GET',
      requestPath: req.url,
    });
    if (!authenticated) {
      socket.destroy();
      return;
    }

    feedWss.handleUpgrade(req, socket, head, (ws) => {
      feedWss.emit('connection', ws, req);
    });
  } catch {
    socket.destroy();
  }
});

httpServer.requestTimeout = boundedNumber(process.env.FEED_REQUEST_TIMEOUT_MS, 10000, 1000, 60000);
httpServer.headersTimeout = boundedNumber(process.env.FEED_HEADERS_TIMEOUT_MS, 15000, 2000, 65000);
httpServer.keepAliveTimeout = boundedNumber(process.env.FEED_KEEP_ALIVE_TIMEOUT_MS, 5000, 1000, 30000);
httpServer.maxRequestsPerSocket = boundedNumber(process.env.FEED_MAX_REQUESTS_PER_SOCKET, 1000, 10, 10000);
