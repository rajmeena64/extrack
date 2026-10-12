const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const { decryptUserBrokerCredential } = require('../../../shared/utils/credentialEncryption');
const connections = require('../../connections/connectionRepository');
const repository = require('./repository');
const { createRoundTripAssembler } = require('./roundTrips');
const { buildSignature, signedRequest } = require('./signedRequest');

const SPOT_WS_URL = 'wss://ws-api.binance.com:443/ws-api/v3';
const USDM_ENDPOINTS = {
  real: { rest: 'https://fapi.binance.com', ws: 'wss://fstream.binance.com/ws' },
  demo: { rest: 'https://demo-fapi.binance.com', ws: 'wss://demo-fstream.binance.com/ws' },
};
const streams = new Map();
const balances = new Map();
const tradeAssemblers = new Map();
let browserWss = null;
let stopped = true;
let reconnectTimer = null;
let reloadPromise = Promise.resolve();
let retryDelay = 5000;

function sendToUser(userId, payload) {
  if (!browserWss) return;
  const serialized = JSON.stringify(payload);
  for (const client of browserWss.clients) {
    if (client.readyState !== WebSocket.OPEN || client.bufferedAmount >= 1024 * 1024
      || String(client.userId) !== String(userId)) continue;
    try { client.send(serialized); } catch { /* A later snapshot replaces this update. */ }
  }
}

function buildSpotSubscriptionParams(apiKey, secretKey, timestamp) {
  const params = { apiKey, recvWindow: 5000, timestamp };
  const query = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&');
  return { ...params, signature: buildSignature(secretKey, query) };
}

function normalizeSpotTrade(event) {
  if (event?.e !== 'executionReport' || event.x !== 'TRADE' || Number(event.t) < 0
    || !(Number(event.l) > 0) || !(Number(event.L) > 0)) return null;
  return {
    symbol: event.s,
    id: event.t,
    orderId: event.i,
    isBuyer: event.S === 'BUY',
    qty: event.l,
    price: event.L,
    commission: event.n,
    commissionAsset: event.N,
    time: Number(event.T != null ? event.T : event.E),
  };
}

function normalizeFuturesTrade(event) {
  const order = event?.e === 'ORDER_TRADE_UPDATE' ? event.o : null;
  if (!order || order.x !== 'TRADE' || Number(order.t) < 0
    || !(Number(order.l) > 0) || !(Number(order.L) > 0)) return null;
  return {
    symbol: order.s,
    id: order.t,
    orderId: order.i,
    side: order.S,
    qty: order.l,
    price: order.L,
    realizedPnl: order.rp,
    commission: order.n,
    commissionAsset: order.N,
    positionSide: order.ps,
    time: Number(order.T != null ? order.T : (event.T != null ? event.T : event.E)),
  };
}

function selectBalance(state) {
  const entries = Array.from(state.assets.entries()).filter(([, value]) => Number.isFinite(value));
  const priorities = ['USDT', 'USDC', 'FDUSD', 'BUSD'];
  const selected = priorities.map((asset) => entries.find(([name, value]) => name === asset && value !== 0)).find(Boolean)
    || priorities.map((asset) => entries.find(([name]) => name === asset)).find(Boolean)
    || entries.find(([, value]) => value !== 0)
    || entries[0];
  return selected ? {
    connectionId: state.connectionId,
    accountId: state.market,
    market: state.market,
    balance: selected[1],
    currency: selected[0],
    ...(state.market === 'spot' ? {
      holdings: entries
        .filter(([asset, balance]) => /^[A-Z0-9._-]{1,20}$/.test(asset) && balance > 0)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([asset, balance]) => ({ asset, balance })),
    } : {}),
  } : null;
}

function getBalances(userId) {
  return Array.from(balances.values())
    .filter((state) => String(state.userId) === String(userId))
    .map(selectBalance)
    .filter(Boolean);
}

function normalizeFuturesPosition(position, timestamp = Date.now()) {
  const amount = Number(position?.positionAmt ?? position?.pa);
  const entryPrice = Number(position?.entryPrice ?? position?.ep);
  const unrealizedPnl = Number(position?.unRealizedProfit ?? position?.unrealizedProfit ?? position?.up);
  const positionSide = String(position?.positionSide ?? position?.ps ?? 'BOTH').toUpperCase();
  const symbol = String(position?.symbol ?? position?.s ?? '').toUpperCase();
  if (!symbol || !Number.isFinite(amount) || !Number.isFinite(entryPrice) || !Number.isFinite(unrealizedPnl)) return null;
  const markPrice = Number(position?.markPrice);
  return {
    key: `${symbol}:${positionSide}`,
    symbol,
    positionSide,
    amount,
    entryPrice,
    unrealizedPnl,
    currentPrice: Number.isFinite(markPrice) ? markPrice : amount ? entryPrice + (unrealizedPnl / amount) : null,
    updatedAt: Number(position?.updateTime ?? timestamp) || timestamp,
  };
}

function publicFuturesPosition(state, position) {
  const isSell = position.positionSide === 'SHORT' || (position.positionSide === 'BOTH' && position.amount < 0);
  return {
    unique_id: `binance-open:${state.connectionId}:${position.key}`,
    uniqueId: `binance-open:${state.connectionId}:${position.key}`,
    is_open_position: true,
    connection_id: state.connectionId,
    account_name: state.accountName,
    accountName: state.accountName,
    platform: 'Binance',
    brokerName: 'Binance',
    environment: state.environment,
    position_id: position.key,
    symbol: position.symbol,
    category: 'perpetual',
    productType: 'perpetual',
    side: isSell ? 'short' : 'long',
    positionDirection: isSell ? 'short' : 'long',
    status: 'open',
    quantity: Math.abs(position.amount),
    quantityUnit: 'asset',
    entryPrice: position.entryPrice,
    price: position.entryPrice,
    exitPrice: null,
    exitAt: null,
    currentPrice: position.currentPrice,
    current_price: position.currentPrice,
    entryAt: position.updatedAt ? new Date(Number(position.updatedAt)).toISOString() : null,
    entry_timestamp: position.updatedAt,
    grossPnl: position.unrealizedPnl,
    gross_pnl: position.unrealizedPnl,
    netPnl: position.unrealizedPnl,
    net_pnl: position.unrealizedPnl,
    pnl: position.unrealizedPnl,
    pnlCurrency: 'USDT',
    pnl_currency: 'USDT',
    currency: 'USDT',
    instrumentDigits: 2,
  };
}

function getOpenPositions(userId) {
  return Array.from(balances.values())
    .filter((state) => state.market === 'usdmFutures' && String(state.userId) === String(userId))
    .flatMap((state) => Array.from(state.positions?.values() || []).map((position) => publicFuturesPosition(state, position)));
}

function sendSnapshot(userId) {
  const userConnections = Array.from(new Set(Array.from(balances.values())
    .filter((state) => String(state.userId) === String(userId))
    .map((state) => state.connectionId)
    .filter(Boolean)));
  sendToUser(userId, { type: 'BROKER_BALANCES_UPDATED', balances: getBalances(userId) });
  sendToUser(userId, {
    type: 'OPEN_POSITIONS_UPDATED',
    connection_ids: userConnections,
    positions: getOpenPositions(userId),
  });
}

function updatePositions(state, entries, timestamp) {
  for (const entry of entries || []) {
    const position = normalizeFuturesPosition(entry, timestamp);
    if (!position) continue;
    if (position.amount === 0) state.positions.delete(position.key);
    else {
      const existing = state.positions.get(position.key);
      state.positions.set(position.key, { ...existing, ...position, updatedAt: existing?.updatedAt || position.updatedAt });
    }
  }
  sendSnapshot(state.userId);
}

function persistBalance(state) {
  state.persistPromise = (state.persistPromise || Promise.resolve()).then(async () => {
    const snapshot = selectBalance(state);
    if (!snapshot) return;
    const version = `${snapshot.balance}:${snapshot.currency}`;
    if (version === state.persistedVersion) return;
    const saved = await connections.saveBalanceSnapshot(
      state.userId, state.connectionId, state.market, snapshot.balance, snapshot.currency
    );
    if (saved) state.persistedVersion = version;
  }).catch(() => {});
}

function updateAssets(state, entries, readAsset, readBalance) {
  for (const entry of entries || []) {
    const asset = String(readAsset(entry) || '').trim().toUpperCase();
    const balance = Number(readBalance(entry));
    if (asset && Number.isFinite(balance)) state.assets.set(asset, balance);
  }
  persistBalance(state);
  sendSnapshot(state.userId);
}

async function saveLiveTrade(context, market, trade) {
  if (!trade || !Number.isSafeInteger(trade.time)) return;
  const key = `${context.connectionId}:${market}`;
  if (!tradeAssemblers.has(key)) tradeAssemblers.set(key, createRoundTripAssembler(market));
  const savedCount = await repository.saveTrades(
    context.userId, context.connectionId, market, tradeAssemblers.get(key).push(trade)
  );
  if (savedCount) sendToUser(context.userId, {
    type: 'TRADE_UPDATED',
    route: `/api/broker-connections/binance/live/${market}`,
    connectionId: context.connectionId,
  });
}

function waitForOpen(socket) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Binance user stream timed out')), 15000);
    socket.once('open', () => { clearTimeout(timeout); resolve(); });
    socket.once('error', () => { clearTimeout(timeout); reject(new Error('Binance user stream failed')); });
  });
}

function trackStream(key, context, market, socket) {
  const stream = { context, market, socket, closing: false, keepalive: null, lifetime: null };
  streams.set(key, stream);
  stream.lifetime = setTimeout(() => socket.close(), 23 * 60 * 60 * 1000);
  stream.lifetime.unref?.();
  socket.on('close', () => {
    if (stream.keepalive) clearInterval(stream.keepalive);
    if (stream.positionRefresh) clearInterval(stream.positionRefresh);
    if (stream.lifetime) clearTimeout(stream.lifetime);
    if (streams.get(key) === stream) streams.delete(key);
    if (!stream.closing && !stopped) scheduleReload();
  });
  return stream;
}

async function connectSpot(context) {
  const account = await signedRequest({ market: 'spot', path: '/api/v3/account', ...context.credentials });
  const state = { connectionId: context.connectionId, userId: context.userId, market: 'spot', assets: new Map() };
  balances.set(`${context.connectionId}:spot`, state);
  updateAssets(state, account?.balances, (item) => item.asset, (item) => Number(item.free) + Number(item.locked));

  const socket = new WebSocket(SPOT_WS_URL, { handshakeTimeout: 15000, maxPayload: 1024 * 1024 });
  const stream = trackStream(`${context.connectionId}:spot`, context, 'spot', socket);
  socket.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (message.id === stream.subscriptionRequestId) {
      if (message.status !== 200) socket.close();
      return;
    }
    const event = message.event || message;
    if (event.e === 'eventStreamTerminated') { socket.close(); return; }
    if (event.e === 'outboundAccountPosition') {
      updateAssets(state, event.B, (item) => item.a, (item) => Number(item.f) + Number(item.l));
    } else if (event.e === 'balanceUpdate') {
      const current = state.assets.get(String(event.a || '').toUpperCase()) || 0;
      updateAssets(state, [event], (item) => item.a, (item) => current + Number(item.d));
    }
    saveLiveTrade(context, 'spot', normalizeSpotTrade(event)).catch(() => scheduleReload());
  });
  await waitForOpen(socket);
  const { data } = await axios.get('https://api.binance.com/api/v3/time', { timeout: 5000 });
  const timestamp = Number(data?.serverTime);
  if (!Number.isSafeInteger(timestamp)) throw new Error('Binance server time is unavailable');
  stream.subscriptionRequestId = crypto.randomUUID();
  socket.send(JSON.stringify({
    id: stream.subscriptionRequestId,
    method: 'userDataStream.subscribe.signature',
    params: buildSpotSubscriptionParams(context.credentials.apiKey, context.credentials.secretKey, timestamp),
  }));
}

async function createFuturesListenKey(apiKey, environment) {
  const { data } = await axios.post(`${USDM_ENDPOINTS[environment].rest}/fapi/v1/listenKey`, null, {
    headers: { 'X-MBX-APIKEY': apiKey }, timeout: 8000,
  });
  const listenKey = String(data?.listenKey || '');
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(listenKey)) throw new Error('Binance user stream could not be started');
  return listenKey;
}

async function connectUsdmFutures(context) {
  const environment = context.metadata?.environment || 'real';
  const [account, positions] = await Promise.all([
    signedRequest({ market: 'usdmFutures', path: '/fapi/v3/balance', environment, ...context.credentials }),
    signedRequest({ market: 'usdmFutures', path: '/fapi/v3/positionRisk', environment, ...context.credentials }),
  ]);
  const state = {
    connectionId: context.connectionId, userId: context.userId, accountName: context.accountName,
    environment, market: 'usdmFutures', assets: new Map(), positions: new Map(),
  };
  balances.set(`${context.connectionId}:usdmFutures`, state);
  updateAssets(state, account, (item) => item.asset, (item) => item.balance);
  updatePositions(state, positions);

  const listenKey = await createFuturesListenKey(context.credentials.apiKey, environment);
  const socket = new WebSocket(`${USDM_ENDPOINTS[environment].ws}/${listenKey}`, { handshakeTimeout: 15000, maxPayload: 1024 * 1024 });
  const stream = trackStream(`${context.connectionId}:usdmFutures`, context, 'usdmFutures', socket);
  socket.on('message', (raw) => {
    let event;
    try { event = JSON.parse(raw.toString()); } catch { return; }
    if (event.e === 'listenKeyExpired') { socket.close(); return; }
    if (event.e === 'ACCOUNT_UPDATE') {
      updateAssets(state, event.a?.B, (item) => item.a, (item) => item.wb);
      updatePositions(state, event.a?.P, Number(event.T != null ? event.T : event.E));
    }
    saveLiveTrade(context, 'usdmFutures', normalizeFuturesTrade(event)).catch(() => scheduleReload());
  });
  await waitForOpen(socket);
  stream.keepalive = setInterval(() => {
    axios.put(`${USDM_ENDPOINTS[environment].rest}/fapi/v1/listenKey`, null, {
      headers: { 'X-MBX-APIKEY': context.credentials.apiKey }, timeout: 8000,
    }).catch(() => socket.close());
  }, 50 * 60 * 1000);
  stream.keepalive.unref?.();
  // ponytail: signed polling is simplest; replace with shared mark-price streams if account volume approaches IP limits.
  stream.positionRefresh = setInterval(() => {
    if (stream.refreshingPositions) return;
    stream.refreshingPositions = true;
    signedRequest({ market: 'usdmFutures', path: '/fapi/v3/positionRisk', environment, ...context.credentials })
      .then((latest) => updatePositions(state, latest))
      .catch(() => {})
      .finally(() => { stream.refreshingPositions = false; });
  }, 5000);
  stream.positionRefresh.unref?.();
}

function closeStreams() {
  for (const stream of streams.values()) {
    stream.closing = true;
    if (stream.keepalive) clearInterval(stream.keepalive);
    if (stream.positionRefresh) clearInterval(stream.positionRefresh);
    if (stream.lifetime) clearTimeout(stream.lifetime);
    try { stream.socket.close(); } catch { /* Already closed. */ }
  }
  streams.clear();
  tradeAssemblers.clear();
}

function scheduleReload() {
  if (stopped || reconnectTimer) return;
  const delay = retryDelay;
  retryDelay = Math.min(retryDelay * 2, 60000);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reload().catch(() => scheduleReload());
  }, delay);
  reconnectTimer.unref?.();
}

async function doReload() {
  const affectedUsers = new Set(Array.from(balances.values()).map((state) => state.userId));
  closeStreams();
  balances.clear();
  if (stopped) return;
  const rows = await repository.listConnectedCredentials();
  const connections = [];
  for (const row of rows) {
    affectedUsers.add(row.userId);
    try {
      const credentials = JSON.parse(decryptUserBrokerCredential(row.encryptedPayload, `binance:user:${row.userId}`));
      if (!credentials.apiKey || !credentials.secretKey) continue;
      connections.push({ ...row, credentials });
    } catch { /* Invalid credentials stay disconnected from the live stream. */ }
  }
  const jobs = connections.flatMap((context) => [
    context.metadata?.environment !== 'demo' && context.metadata?.capabilities?.spot === true ? connectSpot(context) : null,
    context.metadata?.capabilities?.usdmFutures === true ? connectUsdmFutures(context) : null,
  ].filter(Boolean));
  const results = await Promise.allSettled(jobs);
  if (results.some((result) => result.status === 'rejected')) scheduleReload();
  else retryDelay = 5000;
  for (const userId of affectedUsers) sendSnapshot(userId);
}

function reload() {
  reloadPromise = reloadPromise.catch(() => {}).then(doReload);
  return reloadPromise;
}

async function start(wss) {
  browserWss = wss;
  stopped = false;
  try { await reload(); } catch { scheduleReload(); }
}

function stop() {
  stopped = true;
  browserWss = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  closeStreams();
  balances.clear();
}

module.exports = {
  buildSpotSubscriptionParams,
  getBalances,
  normalizeFuturesTrade,
  normalizeFuturesPosition,
  normalizeSpotTrade,
  publicFuturesPosition,
  reload,
  selectBalance,
  sendSnapshot,
  start,
  stop,
};
