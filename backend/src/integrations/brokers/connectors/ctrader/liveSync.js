const WebSocket = require('ws');
const { decryptAesGcm } = require('../../../../core/utils/security');
const decryptUserBrokerCredential = (v, c) => decryptAesGcm(v, process.env.USER_BROKER_CREDENTIALS_KEY, c, 'enc:v1:');
const { createClient, isFilled, prepareDeals } = require('./dealSync');
const repository = require('./repository');
const ENDPOINTS = {
  demo: 'wss://demo.ctraderapi.com:5036',
  live: 'wss://live.ctraderapi.com:5036',
};
const streams = new Map();
let browserWss = null;
let stopped = true;
let reloadPromise = Promise.resolve();
let reconnectTimer = null;
let pnlTimer = null;
let pnlCursor = 0;
function sendToUser(userId, payload) {
  if (!browserWss) return;
  const serialized = JSON.stringify(payload);
  for (const client of browserWss.clients) {
    if (
      client.readyState === WebSocket.OPEN
      && client.bufferedAmount < 1024 * 1024
      && String(client.userId) === String(userId)
    ) {
      try { client.send(serialized); } catch {  }
    }
  }
}
function hasOnlineUser(contexts) {
  if (!browserWss) return false;
  const users = new Set(contexts.map((context) => String(context.userId)));
  for (const client of browserWss.clients) {
    if (client.readyState === WebSocket.OPEN && users.has(String(client.userId))) return true;
  }
  return false;
}
function isOpenPosition(position) {
  return [1, '1', 'OPEN', 'POSITION_STATUS_OPEN'].includes(position?.positionStatus);
}
function money(value, digits) {
  const number = Number(value);
  const scale = 10 ** Number(digits || 0);
  return Number.isFinite(number) && Number.isFinite(scale) && scale > 0 ? number / scale : null;
}
function publicPosition(streamAccount, context, position, pnl = {}) {
  const trade = position.tradeData || {};
  const isSell = [2, '2', 'SELL'].includes(trade.tradeSide);
  const positionId = String(position.positionId || '');
  const entryPrice = Number(position.price) || null;
  const volumeUnits = Number(trade.volume || 0) / 100;
  const grossUnrealized = money(pnl.grossUnrealizedPnL, pnl.moneyDigits);
  const netUnrealized = money(pnl.netUnrealizedPnL, pnl.moneyDigits);
  const currentPrice = entryPrice && volumeUnits > 0 && Number.isFinite(grossUnrealized)
    ? (isSell ? entryPrice - (grossUnrealized / volumeUnits) : entryPrice + (grossUnrealized / volumeUnits))
    : null;
  return {
    unique_id: `ctrader-open:${context.connectionId}:${positionId}`,
    uniqueId: `ctrader-open:${context.connectionId}:${positionId}`,
    is_open_position: true,
    connection_id: context.connectionId,
    account_id: String(streamAccount.account.id),
    account_name: context.accountName,
    accountName: context.accountName,
    platform: 'cTrader',
    brokerName: 'cTrader',
    environment: streamAccount.environment,
    position_id: positionId,
    symbol: streamAccount.symbols.get(String(trade.symbolId || ''))?.name || null,
    category: streamAccount.symbols.get(String(trade.symbolId || ''))?.categoryName || 'other',
    side: isSell ? 'short' : 'long',
    positionDirection: isSell ? 'short' : 'long',
    status: 'open',
    quantity: volumeUnits,
    quantityUnit: 'lot',
    entryPrice,
    price: entryPrice,
    exitPrice: null,
    exitAt: null,
    currentPrice,
    current_price: currentPrice,
    stopLoss: Number(position.stopLoss) || null,
    stop_loss: Number(position.stopLoss) || null,
    takeProfit: Number(position.takeProfit) || null,
    take_profit: Number(position.takeProfit) || null,
    entryAt: trade.openTimestamp ? new Date(Number(trade.openTimestamp)).toISOString() : null,
    entry_timestamp: Number(trade.openTimestamp) || null,
    grossPnl: grossUnrealized,
    gross_pnl: grossUnrealized,
    netPnl: netUnrealized,
    net_pnl: netUnrealized,
    pnl: netUnrealized,
    pnlCurrency: streamAccount.pnlCurrency,
    pnl_currency: streamAccount.pnlCurrency,
    currency: streamAccount.pnlCurrency,
    instrumentDigits: streamAccount.fullSymbols.get(String(trade.symbolId || ''))?.digits ?? 2,
  };
}
function openPositionsForUser(userId) {
  const positions = [];
  for (const stream of streams.values()) {
    for (const streamAccount of stream.accounts.values()) {
      for (const context of streamAccount.contexts) {
        if (String(context.userId) !== String(userId)) continue;
        for (const position of streamAccount.positions.values()) {
          const pnl = streamAccount.pnlByPosition.get(String(position.positionId || '')) || {};
          positions.push(publicPosition(streamAccount, context, position, pnl));
        }
      }
    }
  }
  return positions;
}
function openPositionConnectionIds(userId) {
  const ids = new Set();
  for (const stream of streams.values()) {
    for (const streamAccount of stream.accounts.values()) {
      for (const context of streamAccount.contexts) {
        if (String(context.userId) === String(userId) && context.connectionId) ids.add(context.connectionId);
      }
    }
  }
  return Array.from(ids);
}
function sendSnapshot(userId) {
  sendToUser(userId, {
    type: 'OPEN_POSITIONS_UPDATED',
    connection_ids: openPositionConnectionIds(userId),
    positions: openPositionsForUser(userId),
  });
}
function broadcastOpenPositions(streamAccount) {
  for (const userId of new Set(streamAccount.contexts.map((context) => context.userId))) sendSnapshot(userId);
}
async function persistBalance(streamAccount) {
  if (!Number.isFinite(streamAccount.balance) || !streamAccount.pnlCurrency) return;
  await Promise.allSettled(streamAccount.contexts.map((context) => repository.saveAccountBalance(
    context.userId,
    context.connectionId,
    streamAccount.account.id,
    streamAccount.balance,
    streamAccount.pnlCurrency
  )));
  for (const userId of new Set(streamAccount.contexts.map((context) => context.userId))) {
    sendToUser(userId, { type: 'BROKER_BALANCES_UPDATED', balances: getBalances(userId) });
  }
}
async function loadSymbolData(stream, streamAccount) {
  const accountId = Number(streamAccount.account.id);
  const [symbolsResponse, categoriesResponse, traderResponse, assetsResponse] = await Promise.all([
    stream.client.request(2114, 2115, { ctidTraderAccountId: accountId, includeArchivedSymbols: true }),
    stream.client.request(2160, 2161, { ctidTraderAccountId: accountId }).catch(() => ({})),
    stream.client.request(2121, 2122, { ctidTraderAccountId: accountId }).catch(() => ({})),
    stream.client.request(2112, 2113, { ctidTraderAccountId: accountId }).catch(() => ({})),
  ]);
  const depositAssetId = String(traderResponse.trader?.depositAssetId || '');
  const reportedCurrency = String((assetsResponse.asset || [])
    .find((asset) => String(asset.assetId) === depositAssetId)?.name || '').trim().toUpperCase();
  streamAccount.pnlCurrency = /^[A-Z0-9._-]{1,16}$/.test(reportedCurrency) ? reportedCurrency : null;
  streamAccount.balance = money(traderResponse.trader?.balance, traderResponse.trader?.moneyDigits);
  const categories = new Map((categoriesResponse.symbolCategory || []).map((item) => [String(item.id), item.name]));
  for (const symbol of symbolsResponse.symbol || []) {
    streamAccount.symbols.set(String(symbol.symbolId), {
      name: symbol.symbolName,
      categoryName: categories.get(String(symbol.symbolCategoryId || '')),
    });
  }
  for (const symbol of symbolsResponse.archivedSymbol || []) {
    streamAccount.symbols.set(String(symbol.symbolId), { name: symbol.name });
  }
}
async function ensureFullSymbol(stream, streamAccount, symbolId) {
  const key = String(symbolId || '');
  if (!key || streamAccount.fullSymbols.has(key)) return;
  const response = await stream.client.request(2116, 2117, {
    ctidTraderAccountId: Number(streamAccount.account.id),
    symbolId: [Number(key)],
  });
  for (const symbol of response.symbol || []) streamAccount.fullSymbols.set(String(symbol.symbolId), symbol);
}
async function reconcile(stream, streamAccount) {
  const response = await stream.client.request(2124, 2125, {
    ctidTraderAccountId: Number(streamAccount.account.id),
    returnProtectionOrders: true,
  });
  streamAccount.positions = new Map(
    (response.position || []).filter(isOpenPosition).map((position) => [String(position.positionId), position])
  );
  broadcastOpenPositions(streamAccount);
}
async function saveClosedDeal(stream, streamAccount, event) {
  const deal = event.deal;
  if (!deal?.closePositionDetail || !isFilled(deal)) return;
  await ensureFullSymbol(stream, streamAccount, deal.symbolId);
  const position = event.position || {};
  const protections = new Map([[String(deal.positionId || position.positionId || ''), position]]);
  const prepared = prepareDeals([{
    ...deal,
    positionEntryTimestamp: position.tradeData?.openTimestamp,
  }], streamAccount.symbols, streamAccount.fullSymbols, protections, streamAccount.account);
  for (const context of streamAccount.contexts) {
    const savedCount = await repository.saveTrades(context.userId, context, streamAccount.account.id, prepared);
    if (savedCount) {
      sendToUser(context.userId, {
        type: 'TRADE_UPDATED',
        route: '/api/broker-connections/ctrader/live',
        connectionId: context.connectionId,
      });
    }
  }
}
async function handleEvent(stream, message) {
  const type = Number(message.payloadType);
  const payload = message.payload || {};
  if (type === 2147) {
    scheduleReload(1000);
    return;
  }
  const id = String(payload.ctidTraderAccountId || '');
  const streamAccount = stream.accounts.get(id);
  if (!streamAccount) return;
  if (type === 2123) {
    const balance = money(payload.trader?.balance, payload.trader?.moneyDigits);
    if (Number.isFinite(balance)) {
      streamAccount.balance = balance;
      await persistBalance(streamAccount);
    }
    return;
  }
  if (type !== 2126) return;
  await saveClosedDeal(stream, streamAccount, payload);
  await reconcile(stream, streamAccount);
}
async function contextsFromDatabase() {
  const rows = await repository.listConnectedCredentials();
  const contexts = [];
  for (const row of rows) {
    try {
      const credential = JSON.parse(decryptUserBrokerCredential(
        row.encryptedPayload,
        `ctrader:user:${row.userId}`
      ));
      let accounts = Array.isArray(row.metadata?.authorizedAccounts) ? row.metadata.authorizedAccounts : [];
      const expiresAt = new Date(credential.expiresAt || row.expiresAt).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + 5 * 60 * 1000) {
        const { refreshConnection } = require('./routes');
        const refreshed = await refreshConnection(row.userId, row.connectionId);
        credential.accessToken = refreshed.accessToken;
        accounts = refreshed.accounts;
      }
      for (const account of accounts) {
        if (!/^\d+$/.test(String(account.id || ''))) continue;
        contexts.push({
          ...row,
          id: row.connectionId,
          accessToken: credential.accessToken,
          account,
          environment: account.isLive ? 'live' : 'demo',
        });
      }
    } catch {
    }
  }
  return contexts;
}
async function connectEnvironment(environment, contexts, config) {
  const stream = { environment, client: null, accounts: new Map() };
  stream.client = createClient(ENDPOINTS[environment], {
    onEvent: (message) => handleEvent(stream, message),
    onClose: () => {
      if (!stream.closing && streams.get(environment) === stream) scheduleReload();
    },
  });
  streams.set(environment, stream);
  await stream.client.opened;
  await stream.client.request(2100, 2101, { clientId: config.clientId, clientSecret: config.clientSecret });
  const grouped = new Map();
  for (const context of contexts) {
    const id = String(context.account.id);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(context);
  }
  for (const [id, accountContexts] of grouped) {
    const authorizedContexts = [];
    for (const context of accountContexts) {
      try {
        await stream.client.request(2102, 2103, {
          ctidTraderAccountId: Number(id),
          accessToken: context.accessToken,
        });
        authorizedContexts.push(context);
      } catch {
      }
    }
    if (!authorizedContexts.length) continue;
    const first = authorizedContexts[0];
    const streamAccount = {
      account: first.account,
      contexts: authorizedContexts,
      environment,
      fullSymbols: new Map(),
      pnlByPosition: new Map(),
      pnlCurrency: null,
      balance: null,
      positions: new Map(),
      symbols: new Map(),
    };
    stream.accounts.set(id, streamAccount);
    await loadSymbolData(stream, streamAccount);
    await persistBalance(streamAccount);
    await reconcile(stream, streamAccount);
  }
}
function closeStreams() {
  for (const stream of streams.values()) {
    stream.closing = true;
    stream.client?.close();
  }
  streams.clear();
}
function currentUserIds() {
  return new Set(Array.from(streams.values()).flatMap((stream) => (
    Array.from(stream.accounts.values()).flatMap((account) => account.contexts.map((context) => context.userId))
  )));
}
function scheduleReload(delay = 5000) {
  if (stopped || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reload().catch(() => scheduleReload(Math.min(delay * 2, 30000)));
  }, delay);
  reconnectTimer.unref?.();
}
async function doReload() {
  const affectedUsers = currentUserIds();
  closeStreams();
  if (stopped) return;
  const contexts = await contextsFromDatabase();
  for (const context of contexts) affectedUsers.add(context.userId);
  try {
    if (contexts.length) {
      const { getConfig } = require('./routes');
      const config = getConfig();
      for (const environment of ['demo', 'live']) {
        const selected = contexts.filter((context) => context.environment === environment);
        if (!selected.length) continue;
        try {
          await connectEnvironment(environment, selected, config);
        } catch {
          streams.get(environment)?.client?.close();
          streams.delete(environment);
          scheduleReload();
        }
      }
    }
  } finally {
    for (const userId of affectedUsers) sendSnapshot(userId);
  }
}
function reload() {
  reloadPromise = reloadPromise.catch(() => {}).then(doReload);
  return reloadPromise;
}
function getBalances(userId) {
  return Array.from(streams.values()).flatMap((stream) => (
    Array.from(stream.accounts.values()).flatMap((account) => account.contexts
      .filter((context) => String(context.userId) === String(userId))
      .map((context) => ({
        connectionId: context.connectionId,
        accountId: String(account.account.id),
        balance: account.balance,
        currency: account.pnlCurrency,
      })))
  ));
}
async function pollNextPnl() {
  const accounts = Array.from(streams.values()).flatMap((stream) => (
    Array.from(stream.accounts.values()).map((account) => ({ stream, account }))
  )).filter(({ account }) => account.positions.size && hasOnlineUser(account.contexts));
  if (!accounts.length) return;
  const selected = accounts[pnlCursor % accounts.length];
  pnlCursor += 1;
  try {
    const response = await selected.stream.client.request(2187, 2188, {
      ctidTraderAccountId: Number(selected.account.account.id),
    });
    const pnl = new Map((response.positionUnrealizedPnL || []).map((item) => [String(item.positionId), {
      ...item,
      moneyDigits: response.moneyDigits,
    }]));
    selected.account.pnlByPosition = pnl;
    broadcastOpenPositions(selected.account);
  } catch {
  }
}
async function start(wss) {
  browserWss = wss;
  stopped = false;
  if (!pnlTimer) {
    pnlTimer = setInterval(() => pollNextPnl().catch(() => {}), 200);
    pnlTimer.unref?.();
  }
  try {
    await reload();
  } catch {
    scheduleReload();
  }
}
function stop() {
  stopped = true;
  browserWss = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (pnlTimer) clearInterval(pnlTimer);
  reconnectTimer = null;
  pnlTimer = null;
  closeStreams();
}
module.exports = { getBalances, reload, sendSnapshot, start, stop };
