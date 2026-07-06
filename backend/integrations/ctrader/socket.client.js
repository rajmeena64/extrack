const WebSocket = require('ws');
const feedClient = require('./feed.client');
const { normalizeStoredSymbol } = require('../../shared/utils/symbols');
const {
  CTRADER_INTERVALS,
  CTRADER_PERIODS,
  MAX_RECONNECT_ATTEMPTS,
  PRICE_SCALE,
} = require('./constants');
const { getAccounts } = require('./accounts.service');
const { loadProtos: loadProtobufRoot } = require('./proto.service');
const { createProtocolClient } = require('./protocol.client');
const { registerCtraderRoutes: registerRoutes } = require('./routes');
const {
  cacheSymbols,
  cacheSymbolDetails,
  resolveSymbolId,
} = require('./symbols.service');
const {
  buildCurrentCandle,
  buildQuote,
  getClosedHistoryEndTime,
  getSymbolName,
  normalizeCandles,
  normalizeDepthEvent,
  normalizeSpotEvent,
  trendbarToCandle,
} = require('./market-data.service');
const { connectionState, ctraderConfig, tokenState } = require('./state');
const {
  ensureCtraderTokenStore,
  ensureValidToken,
} = require('./token.service');

const protocol = createProtocolClient({
  getRoot: () => connectionState.root,
  getSocket: () => connectionState.ws,
});

let feedSymbolsCache = { symbols: [], expiresAt: 0 };

function normalizeFeedSymbol(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

async function getFeedSymbolsCached() {
  if (feedSymbolsCache.symbols.length && Date.now() < feedSymbolsCache.expiresAt) {
    return feedSymbolsCache.symbols;
  }
  const response = await feedClient.getFeedSymbols();
  const symbols = Array.isArray(response.symbols) ? response.symbols : [];
  feedSymbolsCache = { symbols, expiresAt: Date.now() + 5 * 60 * 1000 };
  return symbols;
}

async function loadProtos() {
  connectionState.root = await loadProtobufRoot();
  return connectionState.root;
}

function toPlain(typeName, value) {
  try {
    const Type = connectionState.root.lookupType(typeName);
    return Type.toObject(value, {
      defaults: false,
      enums: String,
      json: true,
      longs: String,
    });
  } catch {
    return value;
  }
}

function getAccountIdPayload() {
  if (!ctraderConfig.accountId) {
    const error = new Error('No cTrader account ID available');
    error.status = 503;
    throw error;
  }

  return {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId, 10),
  };
}

function makeSubscriptionKey(symbolId, interval) {
  return interval ? `${Number(symbolId)}:${interval}` : String(Number(symbolId));
}

function parseFiniteInteger(value, fallback = undefined) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function parseTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function createHttpError(message, status = 400, payload = null) {
  const error = new Error(message);
  error.status = status;
  if (payload) error.payload = payload;
  return error;
}

async function ensureSymbolId(symbol) {
  await ensureCtraderReady();

  let symbolId = resolveSymbolId(symbol);
  if (!symbolId) {
    await requestSymbolsAsync();
    symbolId = resolveSymbolId(symbol);
  }

  if (!symbolId) {
    const normalizedSymbol = normalizeStoredSymbol(symbol);
    throw createHttpError(`cTrader symbol not found: ${symbol}`, 404, {
      success: false,
      error: `cTrader symbol not found: ${symbol}`,
      symbol,
      normalizedSymbol,
      availableSymbolCount: ctraderConfig.symbols.size,
    });
  }

  await ensureSymbolDetails(symbolId);
  return Number(symbolId);
}

async function ensureSymbolDetails(symbolId) {
  const numericSymbolId = Number(symbolId);
  const cached = ctraderConfig.symbols.get(numericSymbolId);
  const cachedDigits = Number(cached?.digits);

  if (Number.isFinite(cachedDigits) && cachedDigits > 0) {
    return cached;
  }

  const raw = await protocol.requestMessage(2116, {
    ...getAccountIdPayload(),
    symbolId: [numericSymbolId],
  });
  const symbols = raw.symbol || raw.symbols || [];
  cacheSymbolDetails(symbols);
  return ctraderConfig.symbols.get(numericSymbolId) || cached || null;
}

function normalizeTrendbarEvent(spotEvent) {
  const symbolId = Number(spotEvent.symbolId);
  const trendbars = (spotEvent.trendbar || []).map((trendbar) => ({
    symbolId,
    symbolName: getSymbolName(symbolId),
    period: trendbar.period || null,
    candle: trendbarToCandle(trendbar, symbolId),
    raw: toPlain('ProtoOATrendbar', trendbar),
    receivedAt: new Date().toISOString(),
  }));

  trendbars.forEach((trendbar) => {
    const key = makeSubscriptionKey(symbolId, trendbar.period);
    ctraderConfig.latestTrendbars.set(key, trendbar);
  });
}

function normalizeTickData(tickData = []) {
  let currentTimestamp = null;

  return tickData.map((tick, index) => {
    const rawTimestamp = Number(tick.timestamp);
    if (index === 0 || currentTimestamp === null) {
      currentTimestamp = rawTimestamp;
    } else {
      currentTimestamp -= rawTimestamp;
    }

    return {
      timestamp: currentTimestamp,
      price: Number(tick.tick) / PRICE_SCALE,
      raw: toPlain('ProtoOATickData', tick),
    };
  });
}

function sendAppAuth() {
  protocol.sendMessage(2100, {
    clientId: ctraderConfig.clientId,
    clientSecret: ctraderConfig.clientSecret,
  });
}

function sendAccountAuth() {
  if (!ctraderConfig.accountId) return;

  protocol.sendMessage(2102, {
    ...getAccountIdPayload(),
    accessToken: ctraderConfig.accessToken,
  });
}

async function requestSymbolsAsync() {
  const symbolsData = await protocol.requestMessage(2114, getAccountIdPayload());

  cacheSymbols(symbolsData);
  return Array.from(ctraderConfig.symbols.values());
}

function requestCandles(symbolId = null, period = CTRADER_PERIODS.M1, count = 100) {
  const targetSymbolId = symbolId || ctraderConfig.currentSymbolId;

  if (!targetSymbolId || !ctraderConfig.accountId) return;

  protocol.sendMessage(2137, {
    ...getAccountIdPayload(),
    symbolId: targetSymbolId,
    period,
    count,
  });
}

async function requestTrendbars(symbolId, period, count, fromTimestamp, toTimestamp) {
  if (!symbolId) {
    throw new Error('No cTrader symbol ID available');
  }

  const payload = {
    ...getAccountIdPayload(),
    symbolId: Number(symbolId),
    period,
    count,
  };

  if (Number.isFinite(fromTimestamp)) {
    payload.fromTimestamp = fromTimestamp;
  }

  if (Number.isFinite(toTimestamp)) {
    payload.toTimestamp = toTimestamp;
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
  }, 30000);
}

function stopHeartbeat() {
  if (connectionState.heartbeatInterval) {
    clearInterval(connectionState.heartbeatInterval);
    connectionState.heartbeatInterval = null;
  }
}

async function reconnect() {
  if (connectionState.isConnecting) return;
  if (connectionState.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  connectionState.reconnectAttempts += 1;

  setTimeout(async () => {
    await connectSocket();
  }, 5000);
}

async function connectSocket() {
  if (connectionState.isConnecting) return;

  connectionState.isConnecting = true;

  try {
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

    connectionState.ws.on('error', () => {});

    connectionState.ws.on('close', () => {
      connectionState.isConnecting = false;
      stopHeartbeat();
      reconnect();
    });
  } catch (err) {
    connectionState.isConnecting = false;
    if (err.message.includes('access token could not be refreshed')) {
      return;
    }
    reconnect();
  }
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
  const numericEndTime = endTime ? Number(endTime) : getClosedHistoryEndTime(interval);
  const requestCount = Number.isFinite(numericStartTime)
    ? Math.max(
      normalizedLimit,
      Math.ceil((numericEndTime - numericStartTime) / 60000) + 5
    )
    : normalizedLimit;
  const trendData = await requestTrendbars(
    symbolId,
    period,
    Math.min(requestCount, 1000),
    Number.isFinite(numericStartTime) ? numericStartTime : undefined,
    Number.isFinite(numericEndTime) ? numericEndTime : undefined
  );

  const candles = (trendData?.trendbar || trendData?.trendbars || [])
    .map((trendbar) => trendbarToCandle(trendbar, symbolId))
    .filter((kline) => {
      const openTime = Number(kline.time) * 1000;
      if (!Number.isFinite(openTime)) return false;
      if (Number.isFinite(numericStartTime) && openTime < numericStartTime) return false;
      if (Number.isFinite(numericEndTime) && openTime > numericEndTime) return false;
      return true;
    })
    .sort((a, b) => Number(a.time) - Number(b.time));

  const normalizedCandles = normalizeCandles(candles);
  const symbolInfo = ctraderConfig.symbols.get(symbolId) || null;

  return {
    symbol: symbolInfo,
    interval,
    candles: normalizedCandles,
  };
}

async function getLiveMarketSnapshot({ symbol, interval = '1m' }) {
  const symbols = await getFeedSymbolsCached();
  const normalized = normalizeFeedSymbol(symbol || symbols[0]?.name);
  const match = symbols.find((item) => normalizeFeedSymbol(item.normalizedName || item.name) === normalized) || null;
  // Read the feed service's tick-aggregated candle instead of rebuilding OHLC
  // from one sampled quote. This preserves every tick received between browser
  // polls, including the true high and low for the active candle.
  const feedResponse = match
    ? await feedClient.getMarketData(match.name, {
      interval,
      limitTicks: 1,
      limitCandles: 1,
    })
    : null;
  const tick = feedResponse?.quote || null;
  const candle = Array.isArray(feedResponse?.candles) && feedResponse.candles.length
    ? feedResponse.candles[feedResponse.candles.length - 1]
    : buildCurrentCandle({ tick, interval, previousCandle: null });
  const quote = buildQuote(tick);

  return {
    symbol: match,
    symbols,
    quote,
    tick: quote,
    candle,
    depth: null,
    subscribed: Boolean(match),
    source: 'ctrader-feed-service',
    feedConnected: feedResponse?.connected === true,
    serverTime: Math.floor(Date.now() / 1000),
  };
}

async function getWatchlistQuotes(symbolValues = []) {
  const allSymbols = await getFeedSymbolsCached();
  const requestedSymbols = symbolValues.length
    ? symbolValues
      .map((value) => {
        const normalized = normalizeFeedSymbol(value);
        return allSymbols.find((symbol) => normalizeFeedSymbol(symbol.normalizedName || symbol.name) === normalized);
      })
      .filter(Boolean)
    : allSymbols.slice(0, 20);

  const feedResponse = await feedClient.getQuotes(requestedSymbols.map((symbol) => symbol.name));
  const quotes = requestedSymbols.reduce((result, symbol) => {
    const key = symbol.requestSymbol || symbol.name || symbol.normalizedName || String(symbol.id);
    result[key] = buildQuote(feedResponse.quotes?.[symbol.name]) || null;
    return result;
  }, {});

  return {
    quotes,
    symbols: requestedSymbols,
    source: 'ctrader-feed-service',
    feedConnected: feedResponse.connected === true,
  };
}

async function getSymbols() {
  await ensureCtraderReady();
  return Array.from(ctraderConfig.symbols.values());
}

async function getSymbolById(symbolId) {
  await ensureCtraderReady();
  const numericSymbolId = parseFiniteInteger(symbolId);
  if (!numericSymbolId) throw createHttpError('Valid symbolId is required', 400);

  const raw = await protocol.requestMessage(2116, {
    ...getAccountIdPayload(),
    symbolId: [numericSymbolId],
  });
  cacheSymbolDetails(raw.symbol || raw.symbols || []);

  return {
    symbols: raw.symbol || raw.symbols || [],
    archivedSymbols: raw.archivedSymbol || raw.archivedSymbols || [],
    raw: toPlain('ProtoOASymbolByIdRes', raw),
  };
}

async function getAssets() {
  await ensureCtraderReady();
  const raw = await protocol.requestMessage(2112, getAccountIdPayload());
  return { assets: raw.asset || raw.assets || [], raw: toPlain('ProtoOAAssetListRes', raw) };
}

async function getAssetClasses() {
  await ensureCtraderReady();
  const raw = await protocol.requestMessage(2153, getAccountIdPayload());
  return { assetClasses: raw.assetClass || raw.assetClasses || [], raw: toPlain('ProtoOAAssetClassListRes', raw) };
}

async function getSymbolCategories() {
  await ensureCtraderReady();
  const raw = await protocol.requestMessage(2160, getAccountIdPayload());
  return {
    symbolCategories: raw.symbolCategory || raw.symbolCategories || [],
    raw: toPlain('ProtoOASymbolCategoryListRes', raw),
  };
}

async function getConversionSymbols(firstAssetId, lastAssetId) {
  await ensureCtraderReady();
  const first = parseFiniteInteger(firstAssetId);
  const last = parseFiniteInteger(lastAssetId);
  if (!first || !last) throw createHttpError('firstAssetId and lastAssetId are required', 400);

  const raw = await protocol.requestMessage(2118, {
    ...getAccountIdPayload(),
    firstAssetId: first,
    lastAssetId: last,
  });

  return { symbols: raw.symbol || raw.symbols || [], raw: toPlain('ProtoOASymbolsForConversionRes', raw) };
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
      bid: bid.ticks.slice(0, maxRows),
      ask: ask.ticks.slice(0, maxRows),
      hasMore: bid.hasMore || ask.hasMore,
      raw: { bid: bid.raw, ask: ask.raw },
    };
  }

  const quoteType = normalizedType === 'ask' ? 2 : 1;
  const result = await fetchOneTickSide(symbolId, quoteType, from, to);

  return {
    symbolId,
    symbolName: getSymbolName(symbolId),
    type: quoteType === 2 ? 'ask' : 'bid',
    ticks: result.ticks.slice(0, maxRows),
    hasMore: result.hasMore,
    raw: result.raw,
  };
}

async function subscribeLiveTicks(symbol) {
  const symbolId = await ensureSymbolId(symbol);
  const raw = await protocol.requestMessage(2127, {
    ...getAccountIdPayload(),
    symbolId: [symbolId],
    subscribeToSpotTimestamp: true,
  });
  ctraderConfig.liveTickSubscriptions.add(makeSubscriptionKey(symbolId));
  return { symbolId, symbolName: getSymbolName(symbolId), subscribed: true, raw: toPlain('ProtoOASubscribeSpotsRes', raw) };
}

async function unsubscribeLiveTicks(symbol) {
  const symbolId = await ensureSymbolId(symbol);
  const raw = await protocol.requestMessage(2129, {
    ...getAccountIdPayload(),
    symbolId: [symbolId],
  });
  ctraderConfig.liveTickSubscriptions.delete(makeSubscriptionKey(symbolId));
  return { symbolId, symbolName: getSymbolName(symbolId), subscribed: false, raw: toPlain('ProtoOAUnsubscribeSpotsRes', raw) };
}

async function subscribeLiveTrendbar(symbol, interval = '1m') {
  const period = CTRADER_INTERVALS[interval];
  if (!period) throw createHttpError(`Unsupported cTrader interval: ${interval}`, 400);
  const symbolId = await ensureSymbolId(symbol);
  await subscribeLiveTicks(symbol);
  const raw = await protocol.requestMessage(2135, {
    ...getAccountIdPayload(),
    symbolId,
    period,
  });
  ctraderConfig.liveTrendbarSubscriptions.add(makeSubscriptionKey(symbolId, interval));
  return { symbolId, symbolName: getSymbolName(symbolId), interval, subscribed: true, raw: toPlain('ProtoOASubscribeLiveTrendbarRes', raw) };
}

async function unsubscribeLiveTrendbar(symbol, interval = '1m') {
  const period = CTRADER_INTERVALS[interval];
  if (!period) throw createHttpError(`Unsupported cTrader interval: ${interval}`, 400);
  const symbolId = await ensureSymbolId(symbol);
  const raw = await protocol.requestMessage(2136, {
    ...getAccountIdPayload(),
    symbolId,
    period,
  });
  ctraderConfig.liveTrendbarSubscriptions.delete(makeSubscriptionKey(symbolId, interval));
  return { symbolId, symbolName: getSymbolName(symbolId), interval, subscribed: false, raw: toPlain('ProtoOAUnsubscribeLiveTrendbarRes', raw) };
}

async function subscribeDepth(symbol) {
  const symbolId = await ensureSymbolId(symbol);
  const raw = await protocol.requestMessage(2156, {
    ...getAccountIdPayload(),
    symbolId: [symbolId],
  });
  ctraderConfig.depthSubscriptions.add(makeSubscriptionKey(symbolId));
  return { symbolId, symbolName: getSymbolName(symbolId), subscribed: true, raw: toPlain('ProtoOASubscribeDepthQuotesRes', raw) };
}

async function unsubscribeDepth(symbol) {
  const symbolId = await ensureSymbolId(symbol);
  const raw = await protocol.requestMessage(2158, {
    ...getAccountIdPayload(),
    symbolId: [symbolId],
  });
  ctraderConfig.depthSubscriptions.delete(makeSubscriptionKey(symbolId));
  return { symbolId, symbolName: getSymbolName(symbolId), subscribed: false, raw: toPlain('ProtoOAUnsubscribeDepthQuotesRes', raw) };
}

async function getTrader() {
  await ensureCtraderReady();
  const raw = await protocol.requestMessage(2121, getAccountIdPayload());
  return { trader: raw.trader || null, raw: toPlain('ProtoOATraderRes', raw) };
}

async function reconcileAccount() {
  await ensureCtraderReady();
  const raw = await protocol.requestMessage(2124, {
    ...getAccountIdPayload(),
    returnProtectionOrders: true,
  });
  return {
    positions: raw.position || raw.positions || [],
    orders: raw.order || raw.orders || [],
    raw: toPlain('ProtoOAReconcileRes', raw),
  };
}

async function getOrderList({ fromTimestamp, toTimestamp } = {}) {
  await ensureCtraderReady();
  const from = parseTimestamp(fromTimestamp);
  const to = parseTimestamp(toTimestamp);
  const raw = await protocol.requestMessage(2175, {
    ...getAccountIdPayload(),
    ...(from !== undefined ? { fromTimestamp: from } : {}),
    ...(to !== undefined ? { toTimestamp: to } : {}),
  });
  return { orders: raw.order || raw.orders || [], hasMore: Boolean(raw.hasMore), raw: toPlain('ProtoOAOrderListRes', raw) };
}

async function getOrderDetails(orderId) {
  await ensureCtraderReady();
  const id = parseFiniteInteger(orderId);
  if (!id) throw createHttpError('Valid orderId is required', 400);
  const raw = await protocol.requestMessage(2181, { ...getAccountIdPayload(), orderId: id });
  return { order: raw.order || null, deals: raw.deal || raw.deals || [], raw: toPlain('ProtoOAOrderDetailsRes', raw) };
}

async function getOrdersByPositionId(positionId, { fromTimestamp, toTimestamp } = {}) {
  await ensureCtraderReady();
  const id = parseFiniteInteger(positionId);
  if (!id) throw createHttpError('Valid positionId is required', 400);
  const from = parseTimestamp(fromTimestamp);
  const to = parseTimestamp(toTimestamp);
  const raw = await protocol.requestMessage(2183, {
    ...getAccountIdPayload(),
    positionId: id,
    ...(from !== undefined ? { fromTimestamp: from } : {}),
    ...(to !== undefined ? { toTimestamp: to } : {}),
  });
  return { orders: raw.order || raw.orders || [], hasMore: Boolean(raw.hasMore), raw: toPlain('ProtoOAOrderListByPositionIdRes', raw) };
}

async function getDeals({ fromTimestamp, toTimestamp, maxRows } = {}) {
  await ensureCtraderReady();
  const from = parseTimestamp(fromTimestamp);
  const to = parseTimestamp(toTimestamp);
  const raw = await protocol.requestMessage(2133, {
    ...getAccountIdPayload(),
    ...(from !== undefined ? { fromTimestamp: from } : {}),
    ...(to !== undefined ? { toTimestamp: to } : {}),
    maxRows: Math.min(Math.max(parseFiniteInteger(maxRows, 1000), 1), 5000),
  });
  return { deals: raw.deal || raw.deals || [], hasMore: Boolean(raw.hasMore), raw: toPlain('ProtoOADealListRes', raw) };
}

async function getDealsByPositionId(positionId, { fromTimestamp, toTimestamp } = {}) {
  await ensureCtraderReady();
  const id = parseFiniteInteger(positionId);
  if (!id) throw createHttpError('Valid positionId is required', 400);
  const from = parseTimestamp(fromTimestamp);
  const to = parseTimestamp(toTimestamp);
  const raw = await protocol.requestMessage(2179, {
    ...getAccountIdPayload(),
    positionId: id,
    ...(from !== undefined ? { fromTimestamp: from } : {}),
    ...(to !== undefined ? { toTimestamp: to } : {}),
  });
  return { deals: raw.deal || raw.deals || [], hasMore: Boolean(raw.hasMore), raw: toPlain('ProtoOADealListByPositionIdRes', raw) };
}

async function getDealOffsets({ dealId }) {
  await ensureCtraderReady();
  const id = parseFiniteInteger(dealId);
  if (!id) throw createHttpError('Valid dealId is required', 400);
  const raw = await protocol.requestMessage(2185, { ...getAccountIdPayload(), dealId: id });
  return {
    offsetBy: raw.offsetBy || [],
    offsetting: raw.offsetting || [],
    raw: toPlain('ProtoOADealOffsetListRes', raw),
  };
}

async function getCashFlowHistory({ fromTimestamp, toTimestamp } = {}) {
  await ensureCtraderReady();
  const from = parseTimestamp(fromTimestamp);
  const to = parseTimestamp(toTimestamp) || Date.now();
  if (from === undefined) throw createHttpError('fromTimestamp is required', 400);
  const raw = await protocol.requestMessage(2143, {
    ...getAccountIdPayload(),
    fromTimestamp: from,
    toTimestamp: to,
  });
  return {
    depositWithdrawals: raw.depositWithdraw || raw.depositWithdrawals || [],
    raw: toPlain('ProtoOACashFlowHistoryListRes', raw),
  };
}

async function getPositionUnrealizedPnL(positionId) {
  await ensureCtraderReady();
  const id = parseFiniteInteger(positionId);
  const raw = await protocol.requestMessage(2187, getAccountIdPayload());
  const positions = raw.positionUnrealizedPnL || [];
  return {
    positions: id ? positions.filter((position) => Number(position.positionId) === id) : positions,
    moneyDigits: raw.moneyDigits,
    raw: toPlain('ProtoOAGetPositionUnrealizedPnLRes', raw),
  };
}

async function getExpectedMargin({ symbol, volume }) {
  await ensureCtraderReady();
  const symbolId = await ensureSymbolId(symbol);
  const normalizedVolume = parseFiniteInteger(volume);
  if (!normalizedVolume) throw createHttpError('Valid volume is required', 400);
  const raw = await protocol.requestMessage(2139, {
    ...getAccountIdPayload(),
    symbolId,
    volume: [normalizedVolume],
  });
  return { margins: raw.margin || raw.margins || [], moneyDigits: raw.moneyDigits, raw: toPlain('ProtoOAExpectedMarginRes', raw) };
}

async function getMarginCallList() {
  await ensureCtraderReady();
  const raw = await protocol.requestMessage(2167, getAccountIdPayload());
  return { marginCalls: raw.marginCall || raw.marginCalls || [], raw: toPlain('ProtoOAMarginCallListRes', raw) };
}

async function getDynamicLeverage(symbol) {
  await ensureCtraderReady();
  const symbolId = await ensureSymbolId(symbol);
  const symbolData = await getSymbolById(symbolId);
  const symbolDetails = symbolData.symbols?.[0];
  const leverageId = parseFiniteInteger(symbolDetails?.leverageId);
  if (!leverageId) throw createHttpError(`Dynamic leverage not available for symbol: ${symbol}`, 404);
  const raw = await protocol.requestMessage(2177, { ...getAccountIdPayload(), leverageId });
  return { symbolId, symbolName: getSymbolName(symbolId), leverageId, leverage: raw.leverage || null, raw: toPlain('ProtoOAGetDynamicLeverageByIDRes', raw) };
}

function handleEvent(decoded, typeName, handler) {
  try {
    const EventType = connectionState.root.lookupType(typeName);
    const event = EventType.decode(decoded.payload);
    handler(event);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('ctrader.event_decode_failed', { typeName, error: error.message });
    }
  }
}

function handleMessage(data) {
  try {
    const root = connectionState.root;
    const Message = root.lookupType('ProtoMessage');
    const decoded = Message.decode(new Uint8Array(data));

    if (protocol.resolvePendingResponse(decoded)) {
      return;
    }

    switch (decoded.payloadType) {
      case 2101:
        ctraderConfig.isAppAuthed = true;
        setTimeout(() => sendAccountAuth(), 500);
        break;

      case 2103:
        try {
          const AccAuthRes = root.lookupType('ProtoOAAccountAuthRes');
          AccAuthRes.decode(decoded.payload);
          ctraderConfig.isAccountAuthed = true;
        } catch (_err) {
          ctraderConfig.isAccountAuthed = true;
        }
        break;

      case 2115:
        handleEvent(decoded, 'ProtoOASymbolsListRes', cacheSymbols);
        break;

      case 2131:
        handleEvent(decoded, 'ProtoOASpotEvent', (event) => {
          const tick = normalizeSpotEvent(event, toPlain);
          ctraderConfig.latestTicks.set(tick.symbolId, tick);
          normalizeTrendbarEvent(event);
          if (process.env.NODE_ENV !== 'production') {
            console.info('ctrader.spot', { symbol: tick.symbolName, bid: tick.bid, ask: tick.ask });
          }
        });
        break;

      case 2138:
        try {
          const TrendRes = root.lookupType('ProtoOAGetTrendbarsRes');
          const trendData = TrendRes.decode(decoded.payload);

          const trendbars = trendData.trendbar || trendData.trendbars || [];
          if (trendbars.length > 0) {
            const candles = trendbars.map((candle) => ({
              time: Number(candle.utcTimestamp) / 1000,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            }));

            if (candles.length > 0) {
              global.lastCandles = candles;
            }
          }
        } catch (err) {
        }
        break;

      case 2142:
        handleEvent(decoded, 'ProtoOAErrorRes', (errorData) => {
          tokenState.lastRefreshError = errorData.errorCode || '';
        });
        break;

      case 2155:
        handleEvent(decoded, 'ProtoOADepthEvent', (event) => {
          const depth = normalizeDepthEvent(event);
          ctraderConfig.latestDepth.set(depth.symbolId, depth);
        });
        break;

      case 2123:
        handleEvent(decoded, 'ProtoOATraderUpdatedEvent', (event) => {
          ctraderConfig.latestTraderUpdate = toPlain('ProtoOATraderUpdatedEvent', event);
        });
        break;

      case 2126:
        handleEvent(decoded, 'ProtoOAExecutionEvent', (event) => {
          ctraderConfig.latestExecutionEvent = toPlain('ProtoOAExecutionEvent', event);
        });
        break;

      case 2132:
        handleEvent(decoded, 'ProtoOAOrderErrorEvent', (event) => {
          ctraderConfig.latestOrderError = toPlain('ProtoOAOrderErrorEvent', event);
        });
        break;

      case 2141:
        handleEvent(decoded, 'ProtoOAMarginChangedEvent', (event) => {
          ctraderConfig.latestMarginChanged = toPlain('ProtoOAMarginChangedEvent', event);
        });
        break;

      case 2147:
        handleEvent(decoded, 'ProtoOAAccountsTokenInvalidatedEvent', (event) => {
          tokenState.lastRefreshError = 'cTrader accounts token invalidated';
          ctraderConfig.latestTokenInvalidatedEvent = toPlain('ProtoOAAccountsTokenInvalidatedEvent', event);
        });
        break;

      case 2148:
        handleEvent(decoded, 'ProtoOAClientDisconnectEvent', (event) => {
          ctraderConfig.latestClientDisconnectEvent = toPlain('ProtoOAClientDisconnectEvent', event);
        });
        break;

      case 2164:
        handleEvent(decoded, 'ProtoOAAccountDisconnectEvent', (event) => {
          ctraderConfig.isAccountAuthed = false;
          ctraderConfig.latestAccountDisconnectEvent = toPlain('ProtoOAAccountDisconnectEvent', event);
        });
        break;

      default:
        break;
    }
  } catch (err) {
  }
}

function cleanup() {
  stopHeartbeat();

  if (connectionState.ws) {
    connectionState.ws.removeAllListeners();
    connectionState.ws.close();
    connectionState.ws = null;
  }

  ctraderConfig.isAppAuthed = false;
  ctraderConfig.isAccountAuthed = false;
  ctraderConfig.liveTickSubscriptions.clear();
  ctraderConfig.depthSubscriptions.clear();
  ctraderConfig.chartLiveConsumers.clear();
  ctraderConfig.liveTrendbarSubscriptions.clear();
  connectionState.isConnecting = false;
  connectionState.reconnectAttempts = 0;
}

function registerCtraderRoutes(app) {
  registerRoutes(app, {
    cleanup,
    connectSocket,
    ensureCtraderReady,
    fetchCtraderKlines,
    fetchCtraderTicks,
    getAssetClasses,
    getAssets,
    getCashFlowHistory,
    getConversionSymbols,
    getDealOffsets,
    getDeals,
    getDealsByPositionId,
    getDynamicLeverage,
    getExpectedMargin,
    getLiveMarketSnapshot,
    getMarginCallList,
    getOrderDetails,
    getOrderList,
    getOrdersByPositionId,
    getPositionUnrealizedPnL,
    getSymbolById,
    getSymbolCategories,
    getSymbols,
    getTrader,
    getWatchlistQuotes,
    loadProtos,
    reconcileAccount,
    subscribeDepth,
    subscribeLiveTicks,
    subscribeLiveTrendbar,
    unsubscribeDepth,
    unsubscribeLiveTicks,
    unsubscribeLiveTrendbar,
  });
}

module.exports = {
  cleanup,
  connectSocket,
  ensureCtraderReady,
  ensureCtraderTokenStore,
  fetchCtraderKlines,
  fetchCtraderTicks,
  getAssetClasses,
  getAssets,
  getCashFlowHistory,
  getConversionSymbols,
  getDealOffsets,
  getDeals,
  getDealsByPositionId,
  getDynamicLeverage,
  getExpectedMargin,
  getLiveMarketSnapshot,
  getMarginCallList,
  getOrderDetails,
  getOrderList,
  getOrdersByPositionId,
  getPositionUnrealizedPnL,
  getSymbolById,
  getSymbolCategories,
  getSymbols,
  getTrader,
  getWatchlistQuotes,
  loadProtos,
  reconcileAccount,
  registerCtraderRoutes,
  requestCandles,
  requestSymbolsAsync,
  subscribeDepth,
  subscribeLiveTicks,
  subscribeLiveTrendbar,
  unsubscribeDepth,
  unsubscribeLiveTicks,
  unsubscribeLiveTrendbar,
};
