const crypto = require('crypto');
const pool = require('../infra/db/database');
const {
  decryptMT5Password,
  encryptMT5Password,
} = require('../mt5/credentials.service');

const SECRET_ID = 'ctrader-feed-api';
const ROTATION_MS = boundedNumber(process.env.FEED_KEY_ROTATION_MS, 24 * 60 * 60 * 1000, 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000);
const PREVIOUS_KEY_GRACE_MS = boundedNumber(process.env.FEED_KEY_GRACE_MS, 10 * 60 * 1000, 60 * 1000, 60 * 60 * 1000);
const REFRESH_MS = boundedNumber(process.env.FEED_KEY_REFRESH_MS, 60 * 1000, 5 * 1000, 5 * 60 * 1000);
const OUTAGE_GRACE_MS = boundedNumber(process.env.FEED_KEY_OUTAGE_GRACE_MS, 15 * 60 * 1000, 0, 60 * 60 * 1000);

const state = {
  currentKey: '',
  previousKey: '',
  rotatedAt: 0,
  expiresAt: 0,
  previousValidUntil: 0,
  loadedAt: 0,
  lastError: '',
  loadPromise: null,
};

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function createKey() {
  return crypto.randomBytes(32).toString('hex');
}

function safeEqual(expected, actual) {
  const left = Buffer.from(String(expected || ''));
  const right = Buffer.from(String(actual || ''));
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
}

function signPayload(key, payload) {
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

function applyRow(row) {
  state.currentKey = decryptMT5Password(row.current_secret);
  state.previousKey = row.previous_secret ? decryptMT5Password(row.previous_secret) : '';
  state.rotatedAt = new Date(row.rotated_at).getTime();
  state.expiresAt = new Date(row.expires_at).getTime();
  state.previousValidUntil = row.previous_valid_until
    ? new Date(row.previous_valid_until).getTime()
    : 0;
  state.loadedAt = Date.now();
  state.lastError = '';
}

async function loadOrRotateKey({ force = false } = {}) {
  if (!force && state.currentKey && Date.now() - state.loadedAt < REFRESH_MS && Date.now() < state.expiresAt) {
    return;
  }
  if (state.loadPromise) return state.loadPromise;

  state.loadPromise = (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('ctrader-feed-api-key-rotation'))");
      const result = await client.query(
        `SELECT current_secret, previous_secret, rotated_at, expires_at, previous_valid_until
         FROM system.service_secrets
         WHERE id = $1
         FOR UPDATE`,
        [SECRET_ID]
      );

      const now = Date.now();
      let row = result.rows[0];

      if (!row) {
        const currentKey = createKey();
        const inserted = await client.query(
          `INSERT INTO system.service_secrets
           (id, current_secret, rotated_at, expires_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING current_secret, previous_secret, rotated_at, expires_at, previous_valid_until`,
          [SECRET_ID, encryptMT5Password(currentKey), new Date(now), new Date(now + ROTATION_MS)]
        );
        row = inserted.rows[0];
        console.info('feed.api_key.created', { expiresAt: row.expires_at });
      } else if (new Date(row.expires_at).getTime() <= now) {
        const currentKey = createKey();
        const rotated = await client.query(
          `UPDATE system.service_secrets
           SET previous_secret = current_secret,
               current_secret = $2,
               rotated_at = $3,
               expires_at = $4,
               previous_valid_until = $5,
               updated_at = NOW()
           WHERE id = $1
           RETURNING current_secret, previous_secret, rotated_at, expires_at, previous_valid_until`,
          [
            SECRET_ID,
            encryptMT5Password(currentKey),
            new Date(now),
            new Date(now + ROTATION_MS),
            new Date(now + PREVIOUS_KEY_GRACE_MS),
          ]
        );
        row = rotated.rows[0];
        console.info('feed.api_key.rotated', { expiresAt: row.expires_at });
      }

      await client.query('COMMIT');
      applyRow(row);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      state.lastError = error.message;
      throw error;
    } finally {
      client.release();
    }
  })().finally(() => {
    state.loadPromise = null;
  });

  return state.loadPromise;
}

async function verifyFeedKey(provided) {
  const now = Date.now();
  try {
    await loadOrRotateKey();
  } catch (error) {
    if (!state.currentKey || now > state.expiresAt + OUTAGE_GRACE_MS) throw error;
  }

  if (safeEqual(state.currentKey, provided)) return true;
  return now <= state.previousValidUntil && safeEqual(state.previousKey, provided);
}

async function verifyFeedSignature(providedSignature, payload) {
  const now = Date.now();
  try {
    await loadOrRotateKey();
  } catch (error) {
    if (!state.currentKey || now > state.expiresAt + OUTAGE_GRACE_MS) throw error;
  }

  if (safeEqual(signPayload(state.currentKey, payload), providedSignature)) return true;
  return now <= state.previousValidUntil
    && Boolean(state.previousKey)
    && safeEqual(signPayload(state.previousKey, payload), providedSignature);
}

function getFeedKeyStatus() {
  return {
    loaded: Boolean(state.currentKey),
    rotatedAt: state.rotatedAt ? new Date(state.rotatedAt).toISOString() : null,
    expiresAt: state.expiresAt ? new Date(state.expiresAt).toISOString() : null,
    previousValidUntil: state.previousValidUntil
      ? new Date(state.previousValidUntil).toISOString()
      : null,
    lastError: state.lastError || null,
  };
}

module.exports = {
  getFeedKeyStatus,
  loadOrRotateKey,
  verifyFeedKey,
  verifyFeedSignature,
};
