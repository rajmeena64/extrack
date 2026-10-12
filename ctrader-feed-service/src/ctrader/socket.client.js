const WebSocket = require('ws');
const {
  CTRADER_INTERVALS,
  PRICE_SCALE,
} = require('./constants');
const {
  normalizeSpotEvent,
  normalizeCandles,
  trendbarToCandle,
  buildCurrentCandle,
} = require('./market-data.service');
const { createProtocolClient } = require('./protocol.client');
const { connectionState, ctraderConfig, tokenState } = require('./state');
const {
  cacheAssets,
  cacheSymbols,
  cacheSymbolDetails,
  normalizeSymbolName,
  resolveSymbolId,
  trendbarToBinanceKline,
} = require('./symbols.service');
const { ensureValidToken } = require('./token.service');
const { getAccounts } = require('./accounts.service');
const { sendTelegramAlert } = require('../telegram-monitor.service');

const protocol = createProtocolClient({
  getRoot: () => connectionState.root,
  getSocket: () => connectionState.ws,
});

function toPlain(typeName, message) {
  if (!message || !connectionState.root) return null;
  const Type = connectionState.root.lookupType(typeName);
  return Type.toObject(message, {
    defaults: true,
    arrays: true,
    objects: true,
    longs: String,
    enums: String,
    bytes: String,
  });
}

function getAccountIdPayload() {
  if (!ctraderConfig.accountId) {
    throw new Error('No cTrader account ID configured');
  }
  return {
    ctidTraderAccountId: Number(ctraderConfig.accountId),
  };
}

function makeSubscriptionKey(symbolId) {
  return String(symbolId);
}

function makeTrendbarSubscriptionKey(symbolId, period) {
  return `${symbolId}:${period}`;
}

function getSymbolName(symbolId) {
  const match = ctraderConfig.symbols.get(Number(symbolId));
  return match?.name || String(symbolId);
}

function parseFiniteInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTimestamp(value) {
  if (!value) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric;
}

function normalizeStoredSymbol(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function getClosedHistoryEndTime(interval) {
  const intervalSeconds = {
    '1m': 60,
    '3m': 3 * 60,
    '5m': 5 * 60,
    '15m': 15 * 60,
    '30m': 30 * 60,
    '1h': 60 * 60,
    '4h': 4 * 60 * 60,
    '1d': 24 * 60 * 60,
    '1w': 7 * 24 * 60 * 60,
    '1M': 31 * 24 * 60 * 60,
  }[interval] || 60;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.floor(nowSeconds / intervalSeconds) * intervalSeconds * 1000;
}

function findSymbolMatch(symbol) {
  const normalized = normalizeSymbolName(symbol);

  for (const candidate of ctraderConfig.symbols.values()) {
    if (candidate.normalizedName === normalized) {
      return candidate;
    }
  }

  return null;
}

async function ensureSymbolId(symbol) {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  let symbolId = resolveSymbolId(symbol);

  if (!symbolId) {
    await requestSymbolsAsync();
    symbolId = resolveSymbolId(symbol);
  }

  if (!symbolId) {
    const match = findSymbolMatch(symbol);
    if (match?.id) {
      symbolId = Number(match.id);
    }
  }

  if (!symbolId) {
    const error = new Error(`Symbol ${symbol} was not found on cTrader`);
    error.status = 404;
    throw error;
  }

  return symbolId;
}

function handleMessage(data) {
  if (!connectionState.root) {
    return;
  }

  try {
    const Message = connectionState.root.lookupType('ProtoMessage');
    const decoded = Message.decode(data);

    if (protocol.resolvePendingResponse(decoded)) {
      return;
    }

    switch (decoded.payloadType) {
      case 2101: {
        ctraderConfig.isAppAuthed = true;
        sendAccountAuth();
        break;
      }

      case 2103: {
        const wasAuthed = ctraderConfig.isAccountAuthed;
        ctraderConfig.isAccountAuthed = true;
        requestSymbolsAsync().catch(() => {});
        resubscribeActiveSubscriptions().catch(() => {});
        if (!wasAuthed) {
          sendTelegramAlert('Feed Connected', `cTrader account ${ctraderConfig.accountId} authenticated.`, false).catch(() => {});
        }
        break;
      }

      case 2131: {
        const SpotEvent = connectionState.root.lookupType('ProtoOASpotEvent');
        const event = SpotEvent.decode(decoded.payload);
        const normalizedTick = normalizeSpotEvent(event, toPlain);
        if (normalizedTick) {
          ctraderConfig.latestTicks.set(Number(normalizedTick.symbolId), normalizedTick);
          if (typeof global.__ctraderFeedOnTick === 'function') {
            global.__ctraderFeedOnTick(normalizedTick);
          }
        }
        break;
      }

      case 2155: {
        const DepthEvent = connectionState.root.lookupType('ProtoOADepthEvent');
        const event = DepthEvent.decode(decoded.payload);
        const symbolId = Number(event.symbolId);
        ctraderConfig.depthQuotes.set(symbolId, toPlain('ProtoOADepthEvent', event));
        break;
      }

      case 2138: {
        break;
      }

      case 2146: {
        break;
      }

      case 2142: {
        const ErrorRes = connectionState.root.lookupType('ProtoOAErrorRes');
        const errorData = ErrorRes.decode(decoded.payload);
        const authErrorCodes = new Set(['CH_ACCESS_TOKEN_INVALID', 'OA_AUTH_TOKEN_EXPIRED', 'INVALID_ACCESS_TOKEN']);
        if (authErrorCodes.has(errorData.errorCode)) {
          tokenState.lastRefreshError = errorData.description || errorData.errorCode;
          sendTelegramAlert('Auth Error', `cTrader auth error: ${errorData.errorCode} - ${errorData.description || ''}`, true).catch(() => {});
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
  }
}

async function loadProtos() {
  const protobuf = require('protobufjs');
  const path = require('path');

  const protoDir = path.resolve(__dirname, 'protobuf');

  const root = new protobuf.Root();

  await root.load([
    path.join(protoDir, 'OpenApiModelMessages.proto'),
    path.join(protoDir, 'OpenApiMessages.proto'),
    path.join(protoDir, 'OpenApiCommonModelMessages.proto'),
    path.join(protoDir, 'OpenApiCommonMessages.proto'),
  ]);

  connectionState.root = root;
  return root;
}

function sendAppAuth() {
  if (!ctraderConfig.clientId || !ctraderConfig.clientSecret) {
    return;
  }

  protocol.sendMessage(2100, {
    clientId: ctraderConfig.clientId,
    clientSecret: ctraderConfig.clientSecret,
  });
}

function sendAccountAuth() {
  if (!ctraderConfig.accountId || !ctraderConfig.accessToken) {
    return;
  }

  protocol.sendMessage(2102, {
    ...getAccountIdPayload(),
    accessToken: ctraderConfig.accessToken,
  });
}

async function requestSymbolsAsync() {
  const assetsRes = await protocol.requestMessage(2112, getAccountIdPayload());
  cacheAssets(assetsRes.asset || []);

  const symbolsRes = await protocol.requestMessage(2114, {
    ...getAccountIdPayload(),
    includeArchivedSymbols: false,
  });

  cacheSymbols(symbolsRes.symbol || []);
  return symbolsRes;
}

async function requestSymbolDetails(symbolIds = []) {
  if (!symbolIds.length) return [];
  const res = await protocol.requestMessage(2116, {
    ...getAccountIdPayload(),
    symbolId: symbolIds.map(Number),
  });

  const details = res.symbol || [];
  cacheSymbolDetails(details);
  return details;
}

async function requestTrendbars(symbolId, period, count, fromTimestamp, toTimestamp) {
  if (!symbolId) {
    throw new Error('No cTrader symbol ID available');
  }

  const payload = {
    ...getAccountIdPayload(),
    symbolId: Number(symbolId),
    period,
  };

  const hasFrom = Number.isFinite(fromTimestamp);
  const hasTo = Number.isFinite(toTimestamp);

  if (hasFrom) {
    payload.fromTimestamp = fromTimestamp;
  }

  if (hasTo) {
    payload.toTimestamp = toTimestamp;
  }

  if (Number.isFinite(count)) {
    payload.count = count;
  }

  return protocol.requestMessage(2137, payload);
}

function sendHeartbeat() {
  try {
    protocol.sendMessage(51, {});
  } catch (err) {
  }
}

function startHeartbeat() {
  if (connectionState.heartbeatInterval) {
    clearInterval(connectionState.heartbeatInterval);
  }

  connectionState.heartbeatInterval = setInterval(() => {
    if (connectionState.ws && connectionState.ws.readyState === WebSocket.OPEN) {
      sendHeartbeat();
    }
  }, 10000);
}

function stopHeartbeat() {
  if (connectionState.heartbeatInterval) {
    clearInterval(connectionState.heartbeatInterval);
    connectionState.heartbeatInterval = null;
  }
}

function reconnect() {
  if (connectionState.reconnectTimer) return;

  const delay = Math.min(1000 * Math.pow(2, connectionState.reconnectAttempts || 0), 30000);
  connectionState.reconnectAttempts = (connectionState.reconnectAttempts || 0) + 1;

  connectionState.reconnectTimer = setTimeout(async () => {
    connectionState.reconnectTimer = null;
    try {
      await connectSocket();
    } catch {
      reconnect();
    }
  }, delay);
}

async function connectSocket() {
  if (
    connectionState.ws &&
    (connectionState.ws.readyState === WebSocket.OPEN || connectionState.ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  if (connectionState.isConnecting) {
    return;
  }

  connectionState.isConnecting = true;

  try {
    if (!connectionState.root) {
      await loadProtos();
    }

    if (connectionState.ws) {
      connectionState.ws.removeAllListeners();
      connectionState.ws.close();
      connectionState.ws = null;
    }

    ctraderConfig.isAppAuthed = false;
    ctraderConfig.isAccountAuthed = false;
    stopHeartbeat();

    const tokenReady = await ensureValidToken();
    if (!tokenReady) {
      throw new Error('cTrader access token could not be refreshed');
    }

    await getAccounts();

    if (!ctraderConfig.accountId) {
      connectionState.isConnecting = false;
      return;
    }

    const url = ctraderConfig.isDemo
      ? 'wss://demo.ctraderapi.com:5035'
      : 'wss://live.ctraderapi.com:5035';

    connectionState.ws = new WebSocket(url);

    connectionState.ws.on('open', () => {
      connectionState.reconnectAttempts = 0;
      connectionState.isConnecting = false;
      sendAppAuth();
      startHeartbeat();
    });

    connectionState.ws.on('message', (data) => {
      handleMessage(data);
    });

    connectionState.ws.on('error', (err) => {
      sendTelegramAlert('WebSocket Error', `cTrader socket error: ${err?.message || 'unknown'}`, true).catch(() => {});
    });

    connectionState.ws.on('close', (code) => {
      const hadAuth = ctraderConfig.isAccountAuthed;
      ctraderConfig.isAppAuthed = false;
      ctraderConfig.isAccountAuthed = false;
      connectionState.isConnecting = false;
      stopHeartbeat();
      if (hadAuth) {
        sendTelegramAlert('Feed Disconnected', `WebSocket closed (code: ${code}). Reconnecting...`, true).catch(() => {});
      }
      reconnect();
    });
  } catch (err) {
    connectionState.isConnecting = false;
    sendTelegramAlert('Connection Error', `Failed to connect socket: ${err?.message || 'unknown'}`, true).catch(() => {});
    reconnect();
  }
}

function connected() {
  return Boolean(
    connectionState.ws &&
    connectionState.ws.readyState === WebSocket.OPEN &&
    ctraderConfig.isAppAuthed &&
    ctraderConfig.isAccountAuthed
  );
}

async function waitForSocketReady(timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (
      connectionState.ws &&
      connectionState.ws.readyState === WebSocket.OPEN &&
      ctraderConfig.isAppAuthed &&
      ctraderConfig.isAccountAuthed
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('cTrader connection is not ready');
}

async function ensureCtraderReady() {
  if (!connectionState.root) {
    await loadProtos();
  }

  if (
    !connectionState.ws ||
    connectionState.ws.readyState !== WebSocket.OPEN ||
    !ctraderConfig.isAppAuthed ||
    !ctraderConfig.isAccountAuthed
  ) {
    await connectSocket();
  }

  await waitForSocketReady();

  if (ctraderConfig.symbols.size === 0) {
    await requestSymbolsAsync();
  }
}

async function fetchCtraderKlines({ symbol, interval = '1m', startTime, endTime, limit = 1000 }) {
  const period = CTRADER_INTERVALS[interval];

  if (!period) {
    const error = new Error(`Unsupported cTrader interval: ${interval}`);
    error.status = 400;
    throw error;
  }

  await ensureCtraderReady();

  const symbolId = await ensureSymbolId(symbol);

  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 1000, 1), 1000);
  const numericStartTime = startTime ? Number(startTime) : undefined;
  const intervalMs = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 31 * 24 * 60 * 60 * 1000,
  }[interval] || 60 * 1000;
  const hasExplicitEndTime = endTime !== undefined && endTime !== null && endTime !== '';
  const numericEndTime = hasExplicitEndTime ? Number(endTime) : undefined;
  const resolvedStartTime = Number.isFinite(numericStartTime)
    ? (numericStartTime > 1e11 ? numericStartTime : numericStartTime * 1000)
    : undefined;
  const resolvedEndTime = Number.isFinite(numericEndTime)
    ? (numericEndTime > 1e11 ? numericEndTime : numericEndTime * 1000)
    : undefined;
  const requestEndTime = Number.isFinite(resolvedEndTime)
    ? resolvedEndTime
    : (Number.isFinite(resolvedStartTime) ? getClosedHistoryEndTime(interval) : Date.now());

  if (Number.isFinite(resolvedStartTime) && Number.isFinite(resolvedEndTime)) {
    const rangeBars = Math.max(1, Math.floor((resolvedEndTime - resolvedStartTime) / intervalMs) + 1);
    const parsedLimit = Number.parseInt(limit, 10);
    const exactLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, rangeBars, 2000) : Math.min(rangeBars, 2000);
    const trendData = await requestTrendbars(symbolId, period, exactLimit, resolvedStartTime, resolvedEndTime);
    const minSec = Math.floor(resolvedStartTime / 1000);
    const maxSec = Math.floor(resolvedEndTime / 1000);
    const chunk = trendData?.trendbar || trendData?.trendbars || [];
    const candles = chunk
      .map((trendbar) => trendbarToCandle(trendbar, symbolId))
      .filter((kline) => Number.isFinite(kline.time) && kline.time >= minSec && kline.time <= maxSec)
      .sort((a, b) => Number(a.time) - Number(b.time));
    const symbolInfo = ctraderConfig.symbols.get(symbolId) || null;
    return {
      symbol: symbolInfo?.name || symbol,
      interval,
      candles: normalizeCandles(candles),
    };
  }

  const requestedRangeCount = Number.isFinite(resolvedStartTime) && Number.isFinite(requestEndTime)
    ? Math.ceil((requestEndTime - resolvedStartTime) / intervalMs) + 5
    : normalizedLimit;
  const targetCount = Math.min(Math.max(requestedRangeCount, normalizedLimit), 5000);
  const rawTrendbars = [];
  let cursorEndTime = requestEndTime;

  while (rawTrendbars.length < targetCount) {
    const chunkLimit = Math.min(1000, targetCount - rawTrendbars.length);
    const trendData = await requestTrendbars(
      symbolId,
      period,
      chunkLimit,
      undefined,
      Number.isFinite(cursorEndTime) ? cursorEndTime : Date.now()
    );
    const chunk = trendData?.trendbar || trendData?.trendbars || [];

    if (!chunk.length) break;

    rawTrendbars.push(...chunk);

    const oldestMinute = Math.min(
      ...chunk
        .map((trendbar) => Number(trendbar.utcTimestampInMinutes))
        .filter(Number.isFinite)
    );

    if (!Number.isFinite(oldestMinute)) break;

    const oldestOpenTime = oldestMinute * 60 * 1000;
    if (Number.isFinite(resolvedStartTime) && oldestOpenTime <= resolvedStartTime) break;

    cursorEndTime = oldestOpenTime - 1;
  }

  const candles = rawTrendbars
    .map((trendbar) => trendbarToCandle(trendbar, symbolId))
    .filter((kline) => {
      const openTime = Number(kline.time) * 1000;
      if (!Number.isFinite(openTime)) return false;
      if (Number.isFinite(resolvedStartTime) && openTime < resolvedStartTime) return false;
      if (Number.isFinite(requestEndTime) && openTime > requestEndTime) return false;
      return true;
    })
    .sort((a, b) => Number(a.time) - Number(b.time));

  const normalizedCandles = normalizeCandles(candles);
  if (!hasExplicitEndTime && normalizedCandles.length > 0) {
    const latestTick = ctraderConfig.latestTicks.get(symbolId);
    if (latestTick) {
      const price = Number(latestTick.last ?? latestTick.bid ?? latestTick.ask);
      const tickTime = Number(latestTick.time || Math.floor(Date.now() / 1000));
      const bucketSize = intervalMs / 1000;
      const currentBucketTime = Math.floor(tickTime / bucketSize) * bucketSize;
      const lastCandle = normalizedCandles[normalizedCandles.length - 1];

      if (lastCandle && lastCandle[0] === currentBucketTime && Number.isFinite(price) && price > 0) {
        lastCandle[2] = Math.max(lastCandle[2], price);
        lastCandle[3] = Math.min(lastCandle[3], price);
        lastCandle[4] = price;
      }
    }
  }

  const symbolInfo = ctraderConfig.symbols.get(symbolId) || null;

  return {
    symbol: symbolInfo?.name || symbol,
    interval,
    candles: normalizedCandles,
  };
}

async function getLiveMarketSnapshot({ symbol, interval = '1m', subscribe = true }) {
  await ensureCtraderReady();
  const symbols = await getSymbols();
  const symbolId = symbol ? await ensureSymbolId(symbol) : Number(symbols[0]?.id);
  const match = ctraderConfig.symbols.get(symbolId) || symbols[0] || null;

  if (match && subscribe) {
    if (!ctraderConfig.liveTickSubscriptions.has(String(match.id))) {
      await subscribeLiveTicks(match.name);
    }
    if (!ctraderConfig.depthSubscriptions.has(String(match.id))) {
      await subscribeDepth(match.name);
    }
  }

  const snapshot = {
    symbol: match,
    quote: ctraderConfig.latestTicks.get(symbolId) || null,
    depth: ctraderConfig.depthQuotes.get(symbolId) || null,
    candle: null,
  };

  if (snapshot.quote) {
    snapshot.candle = buildCurrentCandle({
      tick: snapshot.quote,
      interval,
    });
  }

  return snapshot;
}

async function subscribeLiveTicks(symbol) {
  await ensureCtraderReady();
  const symbolId = await ensureSymbolId(symbol);
  const subscriptionKey = makeSubscriptionKey(symbolId);

  if (ctraderConfig.liveTickSubscriptions.has(subscriptionKey)) {
    return {
      subscribed: true,
      alreadySubscribed: true,
      symbolId,
      symbolName: getSymbolName(symbolId),
    };
  }

  const raw = await protocol.requestMessage(2127, {
    ...getAccountIdPayload(),
    symbolId: [Number(symbolId)],
    subscribeToSpotTimestamp: true,
  });

  console.log(`[cTrader SUB 2127 RES for ${symbol} (id:${symbolId})]:`, JSON.stringify(toPlain('ProtoOASubscribeSpotsRes', raw)));
  ctraderConfig.liveTickSubscriptions.add(subscriptionKey);

  return {
    subscribed: true,
    symbolId,
    symbolName: getSymbolName(symbolId),
    raw: toPlain('ProtoOASubscribeSpotsRes', raw),
  };
}

async function unsubscribeLiveTicks(symbol) {
  await ensureCtraderReady();
  const symbolId = await ensureSymbolId(symbol);
  const subscriptionKey = makeSubscriptionKey(symbolId);

  if (!ctraderConfig.liveTickSubscriptions.has(subscriptionKey)) {
    return { unsubscribed: true, wasNotSubscribed: true };
  }

  const raw = await protocol.requestMessage(2129, {
    ...getAccountIdPayload(),
    symbolId: [Number(symbolId)],
  });

  ctraderConfig.liveTickSubscriptions.delete(subscriptionKey);

  return { unsubscribed: true, raw: toPlain('ProtoOAUnsubscribeSpotsRes', raw) };
}

async function fetchOneTickSide(symbolId, type, fromTimestamp, toTimestamp) {
  const raw = await protocol.requestMessage(2145, {
    ...getAccountIdPayload(),
    symbolId,
    type,
    ...(Number.isFinite(fromTimestamp) ? { fromTimestamp } : {}),
    ...(Number.isFinite(toTimestamp) ? { toTimestamp } : {}),
  });

  return {
    ticks: normalizeTickData(raw.tickData || []),
    hasMore: Boolean(raw.hasMore),
    raw: toPlain('ProtoOAGetTickDataRes', raw),
  };
}

async function fetchCtraderTicks({ symbol, fromTimestamp, toTimestamp, type = 'bidask', limit }) {
  await ensureCtraderReady();
  const symbolId = await ensureSymbolId(symbol);
  const from = parseTimestamp(fromTimestamp);
  const to = parseTimestamp(toTimestamp) || Date.now();
  const normalizedType = String(type || 'bidask').toLowerCase();
  const maxRows = Math.min(Math.max(parseFiniteInteger(limit, 1000), 1), 5000);

  if (normalizedType === 'bidask' || normalizedType === 'both') {
    const [bid, ask] = await Promise.all([
      fetchOneTickSide(symbolId, 1, from, to),
      fetchOneTickSide(symbolId, 2, from, to),
    ]);

    return {
      symbolId,
      symbolName: getSymbolName(symbolId),
      type: 'bidask',
      bidTicks: (bid.ticks || []).slice(-maxRows),
      askTicks: (ask.ticks || []).slice(-maxRows),
    };
  }

  const sideType = normalizedType === 'ask' ? 2 : 1;
  const result = await fetchOneTickSide(symbolId, sideType, from, to);
  return {
    symbolId,
    symbolName: getSymbolName(symbolId),
    type: normalizedType === 'ask' ? 'ask' : 'bid',
    ticks: (result.ticks || []).slice(-maxRows),
  };
}

async function subscribeSpotsBatch(symbolIds = []) {
  if (!symbolIds.length) return { subscribed: 0 };
  const numericIds = symbolIds.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (!numericIds.length) return { subscribed: 0 };

  const raw = await protocol.requestMessage(2127, {
    ...getAccountIdPayload(),
    symbolId: numericIds,
    subscribeToSpotTimestamp: true,
  });

  numericIds.forEach((id) => {
    ctraderConfig.liveTickSubscriptions.add(makeSubscriptionKey(id));
  });

  return { subscribed: numericIds.length, raw: toPlain('ProtoOASubscribeSpotsRes', raw) };
}

async function resubscribeActiveSubscriptions() {
  const ids = Array.from(ctraderConfig.liveTickSubscriptions).map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return { subscribed: 0 };
  return subscribeSpotsBatch(ids);
}

async function subscribeAllSymbols(batchSize = 50, delayMs = 60) {
  await ensureCtraderReady();
  const allSymbols = await getSymbols();
  const allIds = allSymbols.map((s) => Number(s.id || s.symbolId)).filter((id) => Number.isFinite(id) && id > 0);

  console.log(`[cTrader] 24/7 Subscribing ${allIds.length} symbols in batches of ${batchSize}...`);

  for (let i = 0; i < allIds.length; i += batchSize) {
    const batch = allIds.slice(i, i + batchSize);
    try {
      await subscribeSpotsBatch(batch);
    } catch (err) {
      console.warn(`[cTrader] Batch subscribe failed at offset ${i}:`, err.message);
    }
    if (delayMs > 0 && i + batchSize < allIds.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { total: allIds.length, subscribedCount: ctraderConfig.liveTickSubscriptions.size };
}

async function getSymbols() {
  await ensureCtraderReady();
  return Array.from(ctraderConfig.symbols.values());
}

async function getWatchlistQuotes(symbols = []) {
  await ensureCtraderReady();
  const quotes = {};
  const requestedSymbols = [];

  for (const sym of symbols) {
    const match = findSymbolMatch(sym);
    if (!match) continue;

    requestedSymbols.push(match);
    const tick = ctraderConfig.latestTicks.get(Number(match.id));
    if (tick) {
      quotes[match.name] = tick;
    }
  }

  return {
    quotes,
    symbols: requestedSymbols,
  };
}

function cleanup() {
  stopHeartbeat();
  if (connectionState.ws) {
    connectionState.ws.removeAllListeners();
    connectionState.ws.close();
    connectionState.ws = null;
  }
}

module.exports = {
  cleanup,
  connectSocket,
  connected,
  ensureCtraderReady,
  fetchCtraderKlines,
  fetchCtraderTicks,
  getLiveMarketSnapshot,
  getSymbols,
  getWatchlistQuotes,
  loadProtos,
  protocol,
  resubscribeActiveSubscriptions,
  subscribeAllSymbols,
  subscribeLiveTicks,
  subscribeSpotsBatch,
  unsubscribeLiveTicks,
};
