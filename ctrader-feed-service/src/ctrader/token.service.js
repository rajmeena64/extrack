const crypto = require('crypto');
const axios = require('axios');
let Pool = null;
try {
  ({ Pool } = require('pg'));
} catch {
  // pg is optional if DB store is not used
}
const { ctraderConfig, tokenState } = require('./state');

let dbPool = null;

function getDbPool() {
  if (dbPool) return dbPool;
  if (!process.env.DATABASE_URL && !(process.env.DB_HOST || process.env.PGHOST)) {
    return null;
  }

  const sslEnabled = String(process.env.DB_SSL_ENABLED || 'true').toLowerCase() === 'true';
  const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';

  dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslEnabled ? { rejectUnauthorized } : false,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  dbPool.on('error', (err) => {
    console.warn('[Feed DB Pool]', err.message);
  });

  return dbPool;
}

function getKeyMaterial() {
  const raw = String(process.env.CTRADER_ADMIN_CREDENTIALS_KEY || process.env.MT5_CREDENTIALS_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest();
}

function looksPlainText(value) {
  const text = String(value || '');
  if (!text) return true;
  if (!/[.:|{}]/.test(text)) return true;
  if (/^(enc|aes|v1)[:.]/i.test(text)) return false;
  if (text.trim().startsWith('{')) return false;
  const parts = text.split(/[:|]/g);
  if (parts.length >= 3 && parts.every((part) => part.length >= 12)) return false;
  return true;
}

function bufferFromFlexible(value) {
  const text = String(value || '').trim();
  if (/^[a-f0-9]+$/i.test(text) && text.length % 2 === 0) {
    return Buffer.from(text, 'hex');
  }
  return Buffer.from(text, 'base64');
}

function decryptWithParts(parts, key) {
  const cleaned = parts.filter(Boolean);
  const candidates = [];
  if (cleaned.length >= 3) {
    candidates.push({ iv: cleaned[0], tag: cleaned[1], encrypted: cleaned.slice(2).join(':') });
    candidates.push({ iv: cleaned[0], encrypted: cleaned[1], tag: cleaned[2] });
    candidates.push({ encrypted: cleaned[0], iv: cleaned[1], tag: cleaned[2] });
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const iv = bufferFromFlexible(candidate.iv);
      const authTag = bufferFromFlexible(candidate.tag || candidate.authTag);
      const encrypted = bufferFromFlexible(candidate.encrypted);
      if (!iv.length || !authTag.length || !encrypted.length) continue;

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unsupported encrypted token format');
}

function decryptToken(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text || looksPlainText(text)) return text;

  const key = getKeyMaterial();
  if (!key) return text;

  const withoutPrefix = text.replace(/^(enc|aes|v1)[:.]/i, '');
  const dotParts = withoutPrefix.split('.').filter(Boolean);
  if (dotParts.length === 3) {
    try {
      return decryptWithParts(dotParts, key);
    } catch {}
  }

  const parts = withoutPrefix.split(/[:|]/g).filter(Boolean);
  if (parts.length >= 3) {
    try {
      return decryptWithParts(parts.slice(-3), key);
    } catch {}
  }

  return text;
}

function encryptToken(value) {
  if (!value) return null;
  const key = getKeyMaterial();
  if (!key) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `enc:${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

async function ensureCtraderTokenStore() {
  tokenState.storeReady = true;
}

async function loadCtraderTokensFromStore({ force = false } = {}) {
  if (!force && tokenState.loadedFromStore) return;
  tokenState.loadedFromStore = true;

  // 1. Direct environment variable fallback
  if (process.env.CTRADER_ACCESS_TOKEN) {
    ctraderConfig.accessToken = process.env.CTRADER_ACCESS_TOKEN;
  }
  if (process.env.CTRADER_REFRESH_TOKEN) {
    ctraderConfig.refreshToken = process.env.CTRADER_REFRESH_TOKEN;
  }
  if (process.env.CTRADER_ACCOUNT_ID) {
    ctraderConfig.accountId = Number(process.env.CTRADER_ACCOUNT_ID);
  }
  if (process.env.CTRADER_IS_DEMO !== undefined) {
    ctraderConfig.isDemo = String(process.env.CTRADER_IS_DEMO).toLowerCase() === 'true';
  }

  // 2. Load from database if database URL is configured
  const pool = getDbPool();
  if (!pool) return;

  const tableName = process.env.CTRADER_ADMIN_INTEGRATIONS_TABLE || 'system.admin_integrations';

  try {
    const result = await pool.query(
      `SELECT account_id, is_demo, access_token, refresh_token, expires_at
       FROM ${tableName}
       WHERE id = $1`,
      ['ctrader']
    );

    const row = result.rows[0];
    if (row) {
      if (row.account_id) {
        ctraderConfig.accountId = Number(row.account_id);
      }
      if (typeof row.is_demo === 'boolean') {
        ctraderConfig.isDemo = row.is_demo;
      }
      if (row.access_token) {
        ctraderConfig.accessToken = decryptToken(row.access_token);
      }
      if (row.refresh_token) {
        ctraderConfig.refreshToken = decryptToken(row.refresh_token);
      }
      if (row.expires_at) {
        ctraderConfig.expiresAt = Number(row.expires_at);
      } else if (ctraderConfig.accessToken) {
        ctraderConfig.expiresAt = Date.now() + (25 * 24 * 60 * 60 * 1000);
      }
      tokenState.lastRefreshError = '';
    }
  } catch (error) {
    console.warn('[Feed Token Store] DB token fetch skipped:', error.message);
    tokenState.lastRefreshError = error.message;
  }
}

async function saveCtraderTokensToStore() {
  const pool = getDbPool();
  if (!pool) return;

  const tableName = process.env.CTRADER_ADMIN_INTEGRATIONS_TABLE || 'system.admin_integrations';

  try {
    await pool.query(
      `INSERT INTO ${tableName}
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
        ctraderConfig.accessToken ? encryptToken(ctraderConfig.accessToken) : null,
        ctraderConfig.refreshToken ? encryptToken(ctraderConfig.refreshToken) : null,
        Number(ctraderConfig.expiresAt || 0),
      ]
    );
  } catch (error) {
    console.warn('[Feed Token Store] DB token save skipped:', error.message);
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

async function getCtraderCatalogFromDb() {
  const pool = getDbPool();
  if (!pool) return [];
  try {
    const result = await pool.query(
      `SELECT symbol, display_name, category, asset_class, market_source, historical_data_source, is_ram_cached, is_live_feed, is_active
       FROM trading_catalog.instruments
       WHERE market_source IN ('entrackCfeed', 'ctrader') AND is_active = true
       ORDER BY sort_order ASC NULLS LAST, symbol ASC`
    );
    return result.rows || [];
  } catch (err) {
    console.warn('[DB_CATALOG_ERROR]', err.message);
    return [];
  }
}

module.exports = {
  decryptToken,
  encryptToken,
  ensureCtraderTokenStore,
  ensureValidToken,
  getCtraderCatalogFromDb,
  loadCtraderTokensFromStore,
  refreshAccessToken,
  saveCtraderTokensToStore,
};
