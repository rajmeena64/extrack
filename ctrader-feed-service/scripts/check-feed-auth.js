require('dotenv').config();

const crypto = require('crypto');
const pool = require('../src/infra/db/database');
const { decryptMT5Password } = require('../src/mt5/credentials.service');

const baseUrl = process.env.MARKET_FEED_URL || 'http://127.0.0.1:8020';
const requestPath = '/internal/quote/EURUSD';
const emptyBodyHash = crypto.createHash('sha256').update('').digest('hex');

function signedHeaders(key, { timestamp = Date.now(), nonce = crypto.randomBytes(16).toString('hex') } = {}) {
  const clientId = 'newapp-backend';
  const timestampText = String(timestamp);
  const payload = [timestampText, nonce, clientId, 'GET', requestPath, emptyBodyHash].join('\n');
  return {
    'x-feed-client-id': clientId,
    'x-feed-timestamp': timestampText,
    'x-feed-nonce': nonce,
    'x-feed-signature': crypto.createHmac('sha256', key).update(payload).digest('hex'),
  };
}

async function requestStatus(headers) {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    headers,
  });
  return {
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    nosniff: response.headers.get('x-content-type-options'),
  };
}

(async () => {
  try {
    const result = await pool.query(
      `SELECT current_secret, previous_secret, previous_valid_until
       FROM system.service_secrets
       WHERE id = $1`,
      ['ctrader-feed-api']
    );
    const row = result.rows[0];
    if (!row) throw new Error('Feed API key row does not exist');

    const currentKey = decryptMT5Password(row.current_secret);
    const current = await requestStatus(signedHeaders(currentKey));
    const unauthorized = await requestStatus(signedHeaders('invalid-feed-key'));
    const expired = await requestStatus(signedHeaders(currentKey, { timestamp: Date.now() - 10 * 60 * 1000 }));
    const replayHeaders = signedHeaders(currentKey);
    const replayFirst = await requestStatus(replayHeaders);
    const replaySecond = await requestStatus(replayHeaders);
    const previousStillValid = row.previous_secret
      && row.previous_valid_until
      && new Date(row.previous_valid_until).getTime() >= Date.now();
    const previous = previousStillValid
      ? await requestStatus(signedHeaders(decryptMT5Password(row.previous_secret)))
      : null;

    console.log({
      currentStatus: current.status,
      previousStatus: previous?.status || null,
      unauthorizedStatus: unauthorized.status,
      expiredStatus: expired.status,
      replayFirstStatus: replayFirst.status,
      replaySecondStatus: replaySecond.status,
      noStore: current.cacheControl?.includes('no-store') || false,
      nosniff: current.nosniff === 'nosniff',
    });
    if (
      current.status !== 200
      || unauthorized.status !== 401
      || expired.status !== 401
      || replayFirst.status !== 200
      || replaySecond.status !== 401
      || (previousStillValid && previous.status !== 200)
      || !current.cacheControl?.includes('no-store')
      || current.nosniff !== 'nosniff'
    ) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error('Feed authentication check failed:', error.message);
  process.exit(1);
});
