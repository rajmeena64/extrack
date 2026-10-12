const WebSocket = require('ws');
const { decryptUserBrokerCredential } = require('../../../shared/utils/credentialEncryption');
const { getClient } = require('./client');
const { normalizeCcxtPosition } = require('./normalizer');
const repository = require('./repository');

const positionsMap = new Map();
const balancesMap = new Map();
let browserWss = null;
let pollTimer = null;
let stopped = true;
let isPolling = false;

function sendToUser(userId, payload) {
  if (!browserWss) return;
  const data = JSON.stringify(payload);
  for (const client of browserWss.clients) {
    if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 1048576 && String(client.userId) === String(userId)) {
      try { client.send(data); } catch {}
    }
  }
}

function hasOnlineUser(userId) {
  if (!browserWss) return false;
  for (const client of browserWss.clients) {
    if (client.readyState === WebSocket.OPEN && String(client.userId) === String(userId)) return true;
  }
  return false;
}

function extractCurrency(symbol) {
  const str = String(symbol || '');
  if (str.includes(':')) return str.split(':')[1];
  if (str.includes('/')) return str.split('/')[1];
  return null;
}

function normalizePosition(p, conn) {
  const side = String(p.side || '').trim().toLowerCase();
  if (side !== 'long' && side !== 'short') return null;
  const symbol = String(p.symbol || '').toUpperCase();
  if (!symbol) return null;
  const qty = Math.abs(Number(p.contracts ?? 0));
  if (qty <= 0) return null;
  const entryPrice = Number(p.entryPrice) || null;
  const currentPrice = Number(p.markPrice) || (entryPrice && qty > 0 ? (side === 'short' ? entryPrice - (Number(p.unrealizedPnl || 0) / qty) : entryPrice + (Number(p.unrealizedPnl || 0) / qty)) : null);
  const pnl = Number(p.unrealizedPnl) || 0;
  const posId = String(p.id || `${symbol}:${side}`);
  const marginAsset = p.marginAsset ?? extractCurrency(p.symbol);
  return {
    unique_id: `ccxt-open:${conn.connectionId}:${posId}`,
    uniqueId: `ccxt-open:${conn.connectionId}:${posId}`,
    is_open_position: true,
    connection_id: conn.connectionId,
    account_name: conn.accountName,
    accountName: conn.accountName,
    platform: conn.brokerName,
    brokerName: conn.brokerName,
    position_id: posId,
    symbol,
    side,
    positionDirection: side,
    status: 'open',
    quantity: qty,
    entryPrice,
    price: entryPrice,
    exitPrice: null,
    exitAt: null,
    currentPrice,
    current_price: currentPrice,
    entryAt: p.timestamp ? new Date(Number(p.timestamp)).toISOString() : null,
    entry_timestamp: Number(p.timestamp) || null,
    grossPnl: pnl,
    gross_pnl: pnl,
    netPnl: pnl,
    net_pnl: pnl,
    pnl,
    pnlCurrency: marginAsset,
    pnl_currency: marginAsset,
    currency: marginAsset,
  };
}

async function pollAccount(conn) {
  if (!hasOnlineUser(conn.userId)) return;
  let creds;
  try {
    creds = JSON.parse(decryptUserBrokerCredential(conn.encryptedPayload, `ccxt:user:${conn.userId}`));
  } catch { return; }
  const client = getClient(conn.brokerSlug, creds);
  if (client.has['fetchTime']) await client.loadTimeDifference();

  if (typeof client.fetchPositions === 'function') {
    try {
      const rawPositions = await client.fetchPositions();
      const open = (rawPositions || []).filter((p) => Number(p.contracts ?? 0) !== 0 || Number(p.unrealizedPnl || 0) !== 0);
      const normalized = open.map((p) => normalizePosition(p, conn)).filter(Boolean);
      positionsMap.set(conn.connectionId, normalized);
      sendToUser(conn.userId, {
        type: 'OPEN_POSITIONS_UPDATED',
        connection_ids: [conn.connectionId],
        positions: normalized,
      });
    } catch {}
  }

  if (typeof client.fetchBalance === 'function') {
    try {
      const bal = await client.fetchBalance();
      const total = bal.total || {};
      const priorities = ['USDT', 'USDC', 'USD', 'EUR'];
      const chosenCur = priorities.find((c) => Number(total[c]) > 0) || Object.keys(total).find((c) => Number(total[c]) > 0) || 'USDT';
      const balanceVal = Number(total[chosenCur]) || 0;
      const snapshot = { connectionId: conn.connectionId, accountId: conn.connectionId, balance: balanceVal, currency: chosenCur, userId: conn.userId };
      balancesMap.set(conn.connectionId, snapshot);
      sendToUser(conn.userId, {
        type: 'BROKER_BALANCES_UPDATED',
        balances: [snapshot],
      });
    } catch {}
  }

  if (typeof client.fetchPositionsHistory === 'function' && client.has['fetchPositionsHistory']) {
    try {
      const rawPositions = await client.fetchPositionsHistory();
      if (Array.isArray(rawPositions) && rawPositions.length > 0) {
        const trades = rawPositions.map((p) => normalizeCcxtPosition(p, conn.brokerSlug, conn.connectionId)).filter(Boolean);
        const saved = await repository.saveTrades(conn.userId, conn.connectionId, trades);
        if (saved > 0) sendToUser(conn.userId, { type: 'TRADE_UPDATED', connectionId: conn.connectionId });
      }
    } catch {}
  }
}

async function runPoll() {
  if (stopped || isPolling) return;
  isPolling = true;
  try {
    const accounts = await repository.listConnectedAccounts();
    for (const conn of accounts) {
      if (stopped) break;
      await pollAccount(conn);
    }
  } catch {} finally {
    isPolling = false;
  }
}

function startLiveSync(wss) {
  browserWss = wss;
  stopped = false;
  if (!pollTimer) pollTimer = setInterval(runPoll, 4000);
}

function stopLiveSync() {
  stopped = true;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  positionsMap.clear();
  balancesMap.clear();
}

async function reloadLiveSync() {
  if (!stopped) await runPoll();
}

function sendSnapshot(userId) {
  const userPositions = Array.from(positionsMap.values()).flat().filter((p) => String(p.userId) === String(userId));
  const userBalances = Array.from(balancesMap.values()).filter((b) => String(b.userId) === String(userId));
  if (userPositions.length) sendToUser(userId, { type: 'OPEN_POSITIONS_UPDATED', positions: userPositions });
  if (userBalances.length) sendToUser(userId, { type: 'BROKER_BALANCES_UPDATED', balances: userBalances });
}

function getBalances(userId) {
  return Array.from(balancesMap.values()).filter((b) => String(b.userId) === String(userId));
}

module.exports = { startLiveSync, stopLiveSync, reloadLiveSync, sendSnapshot, getBalances };
