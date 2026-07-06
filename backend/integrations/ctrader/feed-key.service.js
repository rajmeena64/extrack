const pool = require('../../infra/db/database');
const { decryptMT5Password } = require('../mt5/credentials.service');

const SECRET_ID = 'ctrader-feed-api';
const configuredCacheMs = Number(process.env.FEED_KEY_CACHE_MS);
const CACHE_MS = Number.isFinite(configuredCacheMs)
  ? Math.min(Math.max(configuredCacheMs, 5000), 300000)
  : 60000;

let cachedKey = '';
let cachedAt = 0;
let loadPromise = null;

async function getFeedApiKey({ force = false } = {}) {
  if (!force && cachedKey && Date.now() - cachedAt < CACHE_MS) return cachedKey;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const result = await pool.query(
      `SELECT current_secret
       FROM system.service_secrets
       WHERE id = $1`,
      [SECRET_ID]
    );
    if (!result.rows[0]?.current_secret) {
      throw new Error('Rotating feed API key is not initialized');
    }

    cachedKey = decryptMT5Password(result.rows[0].current_secret);
    cachedAt = Date.now();
    return cachedKey;
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

module.exports = {
  getFeedApiKey,
};
