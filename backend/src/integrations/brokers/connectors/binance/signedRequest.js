const axios = require('axios');
const crypto = require('crypto');
const BASE_URLS = {
  spot: 'https://api.binance.com',
  usdmFutures: 'https://fapi.binance.com',
  coinmFutures: 'https://dapi.binance.com',
};
const DEMO_BASE_URLS = { usdmFutures: 'https://demo-fapi.binance.com' };
const TIME_PATHS = {
  spot: '/api/v3/time',
  usdmFutures: '/fapi/v1/time',
  coinmFutures: '/dapi/v1/time',
};
function buildSignature(secretKey, query) {
  return crypto.createHmac('sha256', secretKey).update(query).digest('hex');
}
function buildSignedQuery({ secretKey, timestamp = Date.now(), recvWindow = 5000, params = {} }) {
  const search = new URLSearchParams();
  Object.keys(params).sort().forEach((key) => search.set(key, String(params[key])));
  search.set('recvWindow', String(recvWindow));
  search.set('timestamp', String(timestamp));
  const query = search.toString();
  return `${query}&signature=${buildSignature(secretKey, query)}`;
}
function safeRequestError(error) {
  const status = Number(error?.response?.status);
  const providerCode = Number(error?.response?.data?.code);
  const kind = status === 403
    ? 'permission'
    : status === 401 || [-2014, -2015, -1022].includes(providerCode)
      ? 'invalid'
      : [418, 429].includes(status)
        ? 'rateLimited'
        : status >= 400 && status < 500
          ? 'validation'
      : 'service';
  const safe = new Error('Binance credential verification failed');
  safe.code = kind === 'invalid'
    ? 'INVALID_CREDENTIALS'
    : kind === 'permission'
      ? 'BINANCE_PERMISSION_REQUIRED'
      : kind === 'rateLimited'
        ? 'RATE_LIMITED'
        : kind === 'validation'
          ? 'VALIDATION_FAILED'
      : 'SERVICE_UNAVAILABLE';
  return safe;
}
async function signedRequest({ market, path, apiKey, secretKey, params, timestamp, environment = 'real', client = axios }) {
  const baseUrl = environment === 'demo' ? DEMO_BASE_URLS[market] : BASE_URLS[market];
  if (!baseUrl) throw new Error('Unsupported Binance market');
  try {
    let requestTimestamp = timestamp;
    if (requestTimestamp === undefined) {
      const timeResponse = await client.get(`${baseUrl}${TIME_PATHS[market]}`, { timeout: 5000 });
      requestTimestamp = Number(timeResponse.data?.serverTime);
      if (!Number.isSafeInteger(requestTimestamp)) throw new Error('Invalid Binance server time');
    }
    const query = buildSignedQuery({ secretKey, params, timestamp: requestTimestamp });
    const response = await client.get(`${baseUrl}${path}?${query}`, {
      headers: { 'X-MBX-APIKEY': apiKey },
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    throw safeRequestError(error);
  }
}
module.exports = {
  BASE_URLS,
  DEMO_BASE_URLS,
  buildSignature,
  buildSignedQuery,
  signedRequest,
};
