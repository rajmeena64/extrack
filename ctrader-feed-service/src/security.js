const crypto = require('crypto');
const { verifyFeedSignature } = require('./security/feed-key.service');

const EMPTY_BODY_SHA256 = crypto.createHash('sha256').update('').digest('hex');
const SIGNATURE_MAX_AGE_MS = boundedNumber(process.env.FEED_SIGNATURE_MAX_AGE_MS, 30000, 5000, 300000);
const MAX_NONCES = boundedNumber(process.env.FEED_MAX_NONCES, 20000, 1000, 100000);
const allowedClientIds = new Set(
  String(process.env.FEED_ALLOWED_CLIENT_IDS || 'newapp-backend')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const usedNonces = new Map();
let lastNonceCleanup = 0;

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function cleanupNonces(now) {
  if (now - lastNonceCleanup < SIGNATURE_MAX_AGE_MS && usedNonces.size < MAX_NONCES) return;
  const cutoff = now - SIGNATURE_MAX_AGE_MS;
  for (const [key, timestamp] of usedNonces.entries()) {
    if (timestamp < cutoff) usedNonces.delete(key);
  }
  while (usedNonces.size >= MAX_NONCES) {
    usedNonces.delete(usedNonces.keys().next().value);
  }
  lastNonceCleanup = now;
}

async function requireBackendSignature(req, res, next) {
  const clientId = String(req.get('x-feed-client-id') || '');
  const timestampText = String(req.get('x-feed-timestamp') || '');
  const nonce = String(req.get('x-feed-nonce') || '');
  const signature = String(req.get('x-feed-signature') || '');
  const timestamp = Number(timestampText);
  const now = Date.now();

  if (
    !allowedClientIds.has(clientId)
    || !/^\d{13}$/.test(timestampText)
    || !Number.isFinite(timestamp)
    || Math.abs(now - timestamp) > SIGNATURE_MAX_AGE_MS
    || !/^[a-f0-9]{32,64}$/i.test(nonce)
    || !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const payload = [
    timestampText,
    nonce,
    clientId,
    req.method.toUpperCase(),
    req.originalUrl,
    EMPTY_BODY_SHA256,
  ].join('\n');

  try {
    if (!(await verifyFeedSignature(signature, payload))) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    cleanupNonces(now);
    const nonceKey = `${clientId}:${nonce}`;
    if (usedNonces.has(nonceKey)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    usedNonces.set(nonceKey, timestamp);

    return next();
  } catch (error) {
    return res.status(503).json({ success: false, error: 'Feed authentication unavailable' });
  }
}

function requireSecureTransport(req, res, next) {
  const required = process.env.FEED_REQUIRE_HTTPS === undefined
    ? true
    : String(process.env.FEED_REQUIRE_HTTPS) === 'true';
  if (!required || req.secure || req.socket.encrypted) return next();
  return res.status(426).json({ success: false, error: 'HTTPS is required' });
}

module.exports = {
  requireBackendSignature,
  requireSecureTransport,
};
