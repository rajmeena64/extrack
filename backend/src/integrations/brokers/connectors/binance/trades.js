const { decryptAesGcm } = require('../../../../core/utils/security');
const decryptUserBrokerCredential = (v, c) => decryptAesGcm(v, process.env.USER_BROKER_CREDENTIALS_KEY, c);
const repository = require('./repository');
const { signedRequest } = require('./signedRequest');
const PATHS = {
  spot: '/api/v3/myTrades',
  usdmFutures: '/fapi/v1/userTrades',
  coinmFutures: '/dapi/v1/userTrades',
};
async function fetchBinanceTrades(userId, connectionId, market, params, dependencies = {}) {
  const getCredential = dependencies.getCredential || repository.getCredentialByConnection;
  const decrypt = dependencies.decrypt || decryptUserBrokerCredential;
  const request = dependencies.request || signedRequest;
  const credential = await getCredential(userId, connectionId);
  if (!credential) {
    const error = new Error('Connect Binance before fetching trades');
    error.code = 'BINANCE_CONNECTION_REQUIRED';
    throw error;
  }
  let stored;
  try {
    stored = JSON.parse(decrypt(credential.encryptedPayload, `binance:user:${userId}`));
  } catch {
    const error = new Error('Stored Binance credentials are unavailable');
    error.code = 'SERVICE_UNAVAILABLE';
    throw error;
  }
  if (typeof stored.apiKey !== 'string' || !stored.apiKey || typeof stored.secretKey !== 'string' || !stored.secretKey) {
    const error = new Error('Stored Binance credentials are invalid');
    error.code = 'SERVICE_UNAVAILABLE';
    throw error;
  }
  const trades = await request({
    market, path: PATHS[market], apiKey: stored.apiKey, secretKey: stored.secretKey,
    environment: credential.environment || 'real', params,
  });
  if (!Array.isArray(trades)) throw Object.assign(new Error('Unexpected Binance trade response'), { code: 'SERVICE_UNAVAILABLE' });
  return trades;
}
module.exports = { fetchBinanceTrades, PATHS };
