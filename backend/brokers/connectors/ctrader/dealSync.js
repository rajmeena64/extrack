const crypto = require('crypto');
const WebSocket = require('ws');

const ENDPOINTS = {
  demo: 'wss://demo.ctraderapi.com:5036',
  live: 'wss://live.ctraderapi.com:5036',
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function createClient(endpoint, { onClose, onEvent } = {}) {
  const socket = new WebSocket(endpoint, {
    handshakeTimeout: 15000,
    maxPayload: 1024 * 1024,
  });
  const pending = new Map();
  let openedSuccessfully = false;
  let heartbeat = null;

  const rejectPending = (message) => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(new Error(message));
    }
    pending.clear();
  };

  socket.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if ([50, 2142].includes(Number(message.payloadType))) {
      const code = String(message.payload?.errorCode || 'REQUEST_REJECTED').replace(/[^A-Z0-9_]/gi, '').slice(0, 80);
      const request = pending.get(message.clientMsgId) || pending.values().next().value;
      const failure = `cTrader rejected request ${request?.requestType || 'unknown'} (${code})`;
      if (request) {
        for (const [id, pendingRequest] of pending) {
          if (pendingRequest === request) pending.delete(id);
        }
        clearTimeout(request.timeout);
        request.reject(new Error(failure));
      } else {
        rejectPending(failure);
      }
      return;
    }
    const request = pending.get(message.clientMsgId);
    if (!request) {
      if (onEvent) Promise.resolve(onEvent(message)).catch(() => {});
      return;
    }
    pending.delete(message.clientMsgId);
    clearTimeout(request.timeout);
    if (Number(message.payloadType) !== request.responseType) {
      request.reject(new Error('cTrader returned an unexpected response'));
      return;
    }
    request.resolve(message.payload || {});
  });

  const opened = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('cTrader connection timed out')), 15000);
    socket.once('open', () => {
      openedSuccessfully = true;
      heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ payloadType: 51, payload: {} }));
        }
      }, 10000);
      heartbeat.unref?.();
      clearTimeout(timeout);
      resolve();
    });
    socket.once('error', () => { clearTimeout(timeout); reject(new Error('cTrader connection failed')); });
  });
  socket.on('error', () => {
    if (openedSuccessfully) rejectPending('cTrader connection failed');
  });
  socket.on('close', () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    rejectPending('cTrader connection closed');
    onClose?.();
  });

  function request(payloadType, responseType, payload) {
    return new Promise((resolve, reject) => {
      const clientMsgId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        pending.delete(clientMsgId);
        reject(new Error('cTrader data request timed out'));
      }, 15000);
      pending.set(clientMsgId, { reject, requestType: payloadType, resolve, responseType, timeout });
      socket.send(JSON.stringify({ clientMsgId, payloadType, payload }));
    });
  }

  function close() {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    rejectPending('cTrader connection closed');
    try { socket.close(); } catch { /* Already closed. */ }
  }

  return { close, opened, request };
}

function isFilled(deal) {
  return [2, 3, '2', '3', 'FILLED', 'PARTIALLY_FILLED'].includes(deal?.dealStatus);
}

function prepareDeals(deals, symbols, fullSymbols, protections, account) {
  const positionEntries = new Map();
  const dealsByPosition = new Map();
  for (const deal of deals) {
    const positionId = String(deal.positionId || '');
    const executedAt = Number(deal.executionTimestamp);
    if (positionId && Number.isFinite(executedAt)) {
      positionEntries.set(positionId, Math.min(positionEntries.get(positionId) || executedAt, executedAt));
      if (!dealsByPosition.has(positionId)) dealsByPosition.set(positionId, []);
      dealsByPosition.get(positionId).push(deal);
    }
  }
  return deals.flatMap((deal) => {
    const close = deal?.closePositionDetail;
    if (!close || !isFilled(deal)) return [];
    const symbolId = String(deal.symbolId || '');
    const symbol = symbols.get(symbolId) || {};
    const protection = protections.get(String(deal.positionId || '')) || {};
    const entryPrice = Number(close.entryPrice);
    const isLong = ['2', 'SELL'].includes(String(deal.tradeSide).toUpperCase());
    const relativeStop = Number(protection.relativeStopLoss) / 100000;
    const relativeTarget = Number(protection.relativeTakeProfit) / 100000;
    const lotSize = Number(fullSymbols.get(symbolId)?.lotSize);
    const volumeToQuantity = (value) => Number.isFinite(lotSize) && lotSize > 0 ? Number(value) / lotSize : null;
    const actionFor = (value) => ['1', 'BUY'].includes(String(value).toUpperCase()) ? 'long' : 'short';
    const moneyDigits = Number(close.moneyDigits ?? deal.moneyDigits);
    const feeFor = (value) => Math.abs(Number(value || 0) / (10 ** (Number.isInteger(moneyDigits) ? moneyDigits : 2)));
    const openingExecutions = (dealsByPosition.get(String(deal.positionId || '')) || [])
      .filter((positionDeal) => !positionDeal.closePositionDetail && isFilled(positionDeal))
      .map((positionDeal) => ({
        action: actionFor(positionDeal.tradeSide), positionEffect: 'open',
        quantity: volumeToQuantity(positionDeal.filledVolume),
        price: Number(positionDeal.executionPrice),
        executedAt: Number(positionDeal.executionTimestamp),
        fees: feeFor(positionDeal.commission),
        brokerOrderId: String(positionDeal.orderId ?? ''),
        brokerExecutionId: String(positionDeal.dealId ?? ''),
      }))
      .filter((execution) => execution.quantity > 0 && execution.price > 0 && Number.isFinite(execution.executedAt));
    const closeQuantity = volumeToQuantity(deal.filledVolume);
    const executions = [
      ...(openingExecutions.length ? openingExecutions : [{
        action: isLong ? 'long' : 'short', positionEffect: 'open', quantity: closeQuantity,
        price: entryPrice, executedAt: deal.positionEntryTimestamp || positionEntries.get(String(deal.positionId || '')),
        fees: 0, brokerExecutionId: `position:${deal.positionId}:entry-summary`,
      }]),
      {
        action: actionFor(deal.tradeSide), positionEffect: 'close', quantity: closeQuantity,
        price: Number(deal.executionPrice), executedAt: Number(deal.executionTimestamp),
        fees: feeFor(deal.commission), brokerOrderId: String(deal.orderId ?? ''),
        brokerExecutionId: String(deal.dealId ?? ''),
      },
    ].filter((execution) => execution.quantity > 0 && execution.price > 0 && Number.isFinite(Number(execution.executedAt)));
    return [{
      ...deal,
      accountId: account.id,
      symbolName: symbol.name,
      symbolCategoryName: symbol.categoryName,
      lotSize: fullSymbols.get(symbolId)?.lotSize,
      productType: /forex|currenc|\bfx\b/i.test(String(symbol.categoryName || '')) ? 'forex' : 'cfd',
      executions,
      moneyDigits: close.moneyDigits ?? deal.moneyDigits,
      accountEnvironment: account.isLive ? 'live' : 'demo',
      accountCurrency: account.accountCurrency,
      positionEntryTimestamp: deal.positionEntryTimestamp
        || positionEntries.get(String(deal.positionId || '')) || deal.executionTimestamp,
      stopLoss: protection.stopLoss ?? (Number.isFinite(relativeStop) && relativeStop > 0
        ? entryPrice + (isLong ? -relativeStop : relativeStop) : undefined),
      takeProfit: protection.takeProfit ?? (Number.isFinite(relativeTarget) && relativeTarget > 0
        ? entryPrice + (isLong ? relativeTarget : -relativeTarget) : undefined),
    }];
  });
}

async function fetchClosedTrades({ accessToken, account, clientId, clientSecret, fromTimestamp, toTimestamp }) {
  const accountId = Number(account.id);
  if (!Number.isSafeInteger(accountId)) throw new Error('Invalid cTrader account id');
  const client = createClient(account.isLive ? ENDPOINTS.live : ENDPOINTS.demo);
  try {
    await client.opened;
    await client.request(2100, 2101, { clientId, clientSecret });
    await client.request(2102, 2103, { ctidTraderAccountId: accountId, accessToken });
    const assetResponse = await client.request(2112, 2113, { ctidTraderAccountId: accountId }).catch(() => ({}));
    const assets = new Map((assetResponse.asset || []).map((asset) => [
      String(asset.assetId), String(asset.name || '').trim().toUpperCase(),
    ]));
    const accountCurrency = assets.get(String(account.depositAssetId || '')) || null;
    const symbolResponse = await client.request(2114, 2115, { ctidTraderAccountId: accountId, includeArchivedSymbols: true });
    const categoryResponse = await client.request(2160, 2161, { ctidTraderAccountId: accountId }).catch(() => ({}));
    const categories = new Map((categoryResponse.symbolCategory || []).map((category) => [String(category.id), category.name]));
    const symbols = new Map([
      ...(symbolResponse.symbol || []).map((symbol) => [String(symbol.symbolId), {
        name: symbol.symbolName,
        categoryName: categories.get(String(symbol.symbolCategoryId || '')),
      }]),
      ...(symbolResponse.archivedSymbol || []).map((symbol) => [String(symbol.symbolId), { name: symbol.name }]),
    ]);

    const dealsById = new Map();
    let pageEnd = toTimestamp;
    while (pageEnd >= fromTimestamp) {
      const response = await client.request(2133, 2134, {
        ctidTraderAccountId: accountId,
        fromTimestamp,
        toTimestamp: pageEnd,
        maxRows: 1000,
      });
      const page = Array.isArray(response.deal) ? response.deal : [];
      for (const deal of page) dealsById.set(String(deal.dealId), deal);
      if (!response.hasMore || !page.length) break;
      const oldest = Math.min(...page.map((deal) => Number(deal.executionTimestamp)).filter(Number.isFinite));
      if (!Number.isFinite(oldest) || oldest > pageEnd || oldest <= fromTimestamp) break;
      pageEnd = oldest - 1;
      await wait(220);
    }

    const symbolIds = Array.from(new Set(Array.from(dealsById.values()).map((deal) => String(deal.symbolId || '')).filter(Boolean)));
    const fullSymbols = new Map();
    for (let index = 0; index < symbolIds.length; index += 100) {
      const response = await client.request(2116, 2117, { ctidTraderAccountId: accountId, symbolId: symbolIds.slice(index, index + 100).map(Number) });
      for (const symbol of response.symbol || []) fullSymbols.set(String(symbol.symbolId), symbol);
    }

    const ordersById = new Map();
    pageEnd = toTimestamp;
    while (pageEnd >= fromTimestamp) {
      const response = await client.request(2175, 2176, { ctidTraderAccountId: accountId, fromTimestamp, toTimestamp: pageEnd });
      const page = Array.isArray(response.order) ? response.order : [];
      for (const order of page) ordersById.set(String(order.orderId), order);
      if (!response.hasMore || !page.length) break;
      const oldest = Math.min(...page.map((order) => Number(order.utcLastUpdateTimestamp)).filter(Number.isFinite));
      if (!Number.isFinite(oldest) || oldest > pageEnd || oldest <= fromTimestamp) break;
      pageEnd = oldest - 1;
      await wait(220);
    }
    const protections = new Map();
    for (const order of Array.from(ordersById.values()).sort((left, right) => (
      Number(left.utcLastUpdateTimestamp || 0) - Number(right.utcLastUpdateTimestamp || 0)
    ))) {
      const positionId = String(order.positionId || '');
      if (!positionId || ![order.stopLoss, order.takeProfit, order.relativeStopLoss, order.relativeTakeProfit].some((value) => value != null)) continue;
      protections.set(positionId, { ...(protections.get(positionId) || {}), ...order });
    }
    return prepareDeals(Array.from(dealsById.values()), symbols, fullSymbols, protections, { ...account, accountCurrency });
  } finally {
    client.close();
  }
}

module.exports = { createClient, fetchClosedTrades, isFilled, prepareDeals };
