const crypto = require('crypto');
const MARKET_FEED_URL = process.env.MARKET_FEED_URL || 'http://127.0.0.1:8020';
const pool = require('../src/infra/db/database');
const { decryptMT5Password } = require('../src/mt5/credentials.service');

async function getFeedInternalApiKey() {
  const result = await pool.query(
    'SELECT current_secret FROM system.service_secrets WHERE id = $1',
    ['ctrader-feed-api']
  );
  if (!result.rows[0]?.current_secret) throw new Error('Feed API key is not initialized');
  return decryptMT5Password(result.rows[0].current_secret);
}

async function signedFetch(url) {
  const apiKey = await getFeedInternalApiKey();
  const parsed = new URL(url);
  const requestPath = `${parsed.pathname}${parsed.search}`;
  const clientId = process.env.FEED_CLIENT_ID || 'newapp-backend';
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString('hex');
  const emptyBodyHash = crypto.createHash('sha256').update('').digest('hex');
  const payload = [timestamp, nonce, clientId, 'GET', requestPath, emptyBodyHash].join('\n');
  const signature = crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
  return fetch(url, {
    headers: {
      'x-feed-client-id': clientId,
      'x-feed-timestamp': timestamp,
      'x-feed-nonce': nonce,
      'x-feed-signature': signature,
    },
  });
}

async function getMarketData(symbol, interval = '1m') {
  const url = `${MARKET_FEED_URL}/internal/data/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}`;
  const response = await signedFetch(url);

  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status}`);
  }

  return response.json();
}

async function getQuote(symbol) {
  const url = `${MARKET_FEED_URL}/internal/quote/${encodeURIComponent(symbol)}`;
  const response = await signedFetch(url);

  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status}`);
  }

  return response.json();
}

async function getQuotes(symbols) {
  const query = symbols.map(encodeURIComponent).join(',');
  const url = `${MARKET_FEED_URL}/internal/quotes?symbols=${query}`;
  const response = await signedFetch(url);

  if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
  return response.json();
}

module.exports = {
  getMarketData,
  getQuote,
  getQuotes,
};
