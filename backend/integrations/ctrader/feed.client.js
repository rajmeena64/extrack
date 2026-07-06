const axios = require('axios');
const crypto = require('crypto');
const { getFeedApiKey } = require('./feed-key.service');

const EMPTY_BODY_SHA256 = crypto.createHash('sha256').update('').digest('hex');

function getConfig() {
  const baseURL = String(process.env.MARKET_FEED_URL || '').replace(/\/$/, '');
  if (!baseURL) {
    throw new Error('MARKET_FEED_URL is required');
  }

  const parsed = new URL(baseURL);
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  const allowInsecure = String(process.env.ALLOW_INSECURE_MARKET_FEED_HTTP || 'false') === 'true';
  if (parsed.protocol !== 'https:' && !loopback && !allowInsecure) {
    throw new Error('MARKET_FEED_URL must use HTTPS outside localhost');
  }

  const configuredTimeout = Number(process.env.MARKET_FEED_TIMEOUT_MS);
  return {
    baseURL,
    timeout: Number.isFinite(configuredTimeout)
      ? Math.min(Math.max(configuredTimeout, 1000), 15000)
      : 5000,
  };
}

function getFeedBaseUrl() {
  return getConfig().baseURL;
}

function buildRequestPath(path, params) {
  if (!params || Object.keys(params).length === 0) return path;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  return `${path}?${query.toString()}`;
}

function createSignedHeaders(apiKey, requestPath) {
  const clientId = process.env.FEED_CLIENT_ID || 'newapp-backend';
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = [timestamp, nonce, clientId, 'GET', requestPath, EMPTY_BODY_SHA256].join('\n');
  const signature = crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
  return {
    'x-feed-client-id': clientId,
    'x-feed-timestamp': timestamp,
    'x-feed-nonce': nonce,
    'x-feed-signature': signature,
  };
}

async function request(path, params) {
  const requestPath = buildRequestPath(path, params);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const apiKey = await getFeedApiKey({ force: attempt > 0 });
    try {
      const response = await axios.get(requestPath, {
        ...getConfig(),
        headers: createSignedHeaders(apiKey, requestPath),
      });
      return response.data;
    } catch (error) {
      if (error.response?.status !== 401 || attempt > 0) throw error;
    }
  }
  throw new Error('Feed authentication failed');
}

function getQuote(symbol) {
  return request(`/internal/quote/${encodeURIComponent(symbol)}`);
}

function getQuotes(symbols) {
  return request('/internal/quotes', { symbols: symbols.join(',') });
}

function getMarketData(symbol, options = {}) {
  return request(`/internal/data/${encodeURIComponent(symbol)}`, options);
}

function getFeedSymbols() {
  return request('/internal/symbols');
}

module.exports = {
  createSignedHeaders,
  getFeedBaseUrl,
  getFeedSymbols,
  getMarketData,
  getQuote,
  getQuotes,
};
