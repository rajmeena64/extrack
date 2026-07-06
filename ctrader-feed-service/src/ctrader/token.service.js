const axios = require('axios');
const pool = require('../infra/db/database');
const { TABLES } = require('../config/tables');
const {
  decryptMT5Password,
  encryptMT5Password,
} = require('../mt5/credentials.service');
const { ctraderConfig, tokenState } = require('./state');

function useDatabaseTokens() {
  return String(process.env.CTRADER_TOKEN_SOURCE || 'database').toLowerCase() !== 'env';
}

async function ensureCtraderTokenStore() {
  if (tokenState.storeReady) return;
  tokenState.storeReady = true;

  if (!useDatabaseTokens()) return;

  if (!process.env.DATABASE_URL && !(process.env.DB_HOST || process.env.PGHOST)) {
    throw new Error('DATABASE_URL or DB_HOST is required because CTRADER_TOKEN_SOURCE=database');
  }
}

async function loadCtraderTokensFromStore({ force = false } = {}) {
  if (!force && tokenState.loadedFromStore) return;
  tokenState.loadedFromStore = true;

  if (!useDatabaseTokens()) return;

  try {
    await ensureCtraderTokenStore();

    const result = await pool.query(
      `SELECT account_id, is_demo, access_token, refresh_token, expires_at
       FROM ${TABLES.adminIntegrations}
       WHERE id = $1`,
      ['ctrader']
    );

    const row = result.rows[0];
    if (!row) {
      tokenState.lastRefreshError = 'No cTrader row found in admin integrations table';
      return;
    }

    if (row.account_id) {
      ctraderConfig.accountId = Number(row.account_id);
    }

    if (typeof row.is_demo === 'boolean') {
      ctraderConfig.isDemo = row.is_demo;
    }

    if (row.access_token) {
      ctraderConfig.accessToken = decryptMT5Password(row.access_token);
    }

    if (row.refresh_token) {
      ctraderConfig.refreshToken = decryptMT5Password(row.refresh_token);
    }

    if (row.expires_at) {
      ctraderConfig.expiresAt = Number(row.expires_at);
    } else if (row.access_token) {
      ctraderConfig.expiresAt = Date.now() + (25 * 24 * 60 * 60 * 1000);
    }

    tokenState.lastRefreshError = '';
  } catch (error) {
    tokenState.lastRefreshError = error.message;
  }
}

async function saveCtraderTokensToStore() {
  if (!useDatabaseTokens()) return;

  try {
    await ensureCtraderTokenStore();

    await pool.query(
      `INSERT INTO ${TABLES.adminIntegrations}
       (id, provider, account_id, is_demo, access_token, refresh_token, expires_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         provider = EXCLUDED.provider,
         account_id = EXCLUDED.account_id,
         is_demo = EXCLUDED.is_demo,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [
        'ctrader',
        'ctrader',
        ctraderConfig.accountId || null,
        Boolean(ctraderConfig.isDemo),
        ctraderConfig.accessToken ? encryptMT5Password(ctraderConfig.accessToken) : null,
        ctraderConfig.refreshToken ? encryptMT5Password(ctraderConfig.refreshToken) : null,
        Number(ctraderConfig.expiresAt || 0),
      ]
    );
  } catch (error) {
    tokenState.lastRefreshError = error.message;
  }
}

async function refreshAccessToken() {
  await loadCtraderTokensFromStore({ force: true });

  if (Date.now() < tokenState.refreshBlockedUntil) {
    return false;
  }

  if (!ctraderConfig.refreshToken || !ctraderConfig.clientId || !ctraderConfig.clientSecret) {
    tokenState.lastRefreshError = 'cTrader refresh token, client id, or client secret is missing';
    tokenState.refreshBlockedUntil = Date.now() + (5 * 60 * 1000);
    return false;
  }

  try {
    const res = await axios.post(
      'https://openapi.ctrader.com/apps/token',
      null,
      {
        params: {
          grant_type: 'refresh_token',
          refresh_token: ctraderConfig.refreshToken,
          client_id: ctraderConfig.clientId,
          client_secret: ctraderConfig.clientSecret,
        },
      }
    );

    const data = res.data || {};
    if (data.errorCode) {
      throw new Error(`${data.errorCode}: ${data.description || 'cTrader token refresh failed'}`);
    }

    const accessToken = data.accessToken || data.access_token;
    const refreshToken = data.refreshToken || data.refresh_token;
    const expiresIn = data.expiresIn || data.expires_in || 1800;

    if (!accessToken) {
      throw new Error('cTrader token refresh response did not include an access token');
    }

    ctraderConfig.accessToken = accessToken;
    ctraderConfig.refreshToken = refreshToken || ctraderConfig.refreshToken;
    ctraderConfig.expiresAt = Date.now() + (Number(expiresIn) * 1000);

    await saveCtraderTokensToStore();

    tokenState.refreshBlockedUntil = 0;
    tokenState.lastRefreshError = '';
    return true;
  } catch (err) {
    tokenState.lastRefreshError = err.response?.data?.description || err.message;
    tokenState.refreshBlockedUntil = Date.now() + (5 * 60 * 1000);
    return false;
  }
}

async function ensureValidToken() {
  await loadCtraderTokensFromStore();

  if (!ctraderConfig.accessToken && ctraderConfig.refreshToken) {
    return refreshAccessToken();
  }

  if (Date.now() >= (Number(ctraderConfig.expiresAt || 0) - (5 * 60 * 1000))) {
    return refreshAccessToken();
  }

  return Boolean(ctraderConfig.accessToken);
}

module.exports = {
  ensureCtraderTokenStore,
  ensureValidToken,
  loadCtraderTokensFromStore,
  refreshAccessToken,
  saveCtraderTokensToStore,
};
