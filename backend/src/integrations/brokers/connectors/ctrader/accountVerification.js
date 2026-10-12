const crypto = require('crypto');
const WebSocket = require('ws');
const ACCOUNT_ENDPOINTS = [
  'wss://live.ctraderapi.com:5036',
  'wss://demo.ctraderapi.com:5036',
];
function normalizeAuthorizedAccounts(payload) {
  if (![0, '0', 'SCOPE_VIEW'].includes(payload?.permissionScope)) {
    throw new Error('cTrader did not confirm accounts-only permission');
  }
  return (payload?.ctidTraderAccount || [])
    .map((account) => ({
      id: String(account?.ctidTraderAccountId || ''),
      isLive: Boolean(account?.isLive),
      login: account?.traderLogin == null ? null : String(account.traderLogin),
      brokerName: String(account?.brokerTitleShort || '').trim() || null,
      depositAssetId: account?.depositAssetId == null ? null : String(account.depositAssetId),
    }))
    .filter((account) => /^\d+$/.test(account.id));
}
const normalizeBrokerName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function filterAccountsForBroker(accounts, connection) {
  if (connection?.brokerSlug === 'ctrader') return accounts;
  const expected = [connection?.brokerName, ...(connection?.brokerSearchKeywords || [])]
    .map(normalizeBrokerName)
    .filter(Boolean);
  return accounts.filter((account) => {
    const actual = normalizeBrokerName(account.brokerName);
    return actual && expected.some((name) => actual.startsWith(name) || name.startsWith(actual));
  });
}
function getAuthorizedAccountIdsFromEndpoint(url, { accessToken, clientId, clientSecret }) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timeout = setTimeout(() => finish(new Error('cTrader account verification timed out')), 15000);
    const finish = (error, ids = []) => {
      clearTimeout(timeout);
      socket.removeAllListeners();
      try { socket.terminate(); } catch {  }
      if (error) reject(error); else resolve(ids);
    };
    const send = (payloadType, payload) => socket.send(JSON.stringify({
      clientMsgId: crypto.randomUUID(),
      payloadType,
      payload,
    }));
    socket.once('open', () => send(2100, { clientId, clientSecret }));
    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        const payloadType = Number(message.payloadType);
        if (payloadType === 50 || payloadType === 2142) return finish(new Error('cTrader account verification failed'));
        if (payloadType === 2101) return send(2149, { accessToken });
        if (payloadType === 2150) return finish(null, normalizeAuthorizedAccounts(message.payload));
      } catch {
        return finish(new Error('Invalid cTrader account verification response'));
      }
      return undefined;
    });
    socket.once('error', () => finish(new Error('cTrader account verification failed')));
    socket.once('close', () => finish(new Error('cTrader account verification closed early')));
  });
}
async function getAuthorizedAccounts(credentials) {
  const results = await Promise.allSettled(
    ACCOUNT_ENDPOINTS.map((url) => getAuthorizedAccountIdsFromEndpoint(url, credentials))
  );
  const accounts = new Map();
  for (const account of results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])) {
    accounts.set(account.id, account);
  }
  if (!accounts.size) throw new Error('No authorized cTrader accounts were returned');
  return Array.from(accounts.values());
}
module.exports = { filterAccountsForBroker, getAuthorizedAccounts, normalizeAuthorizedAccounts };
