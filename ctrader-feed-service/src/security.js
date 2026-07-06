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

async function authenticateBackendSignature({
  clientId,
  timestampText,
  nonce,
  signature,
  method = 'GET',
  requestPath,
}) {
  const normalizedClientId = String(clientId || '');
  const normalizedTimestamp = String(timestampText || '');
  const normalizedNonce = String(nonce || '');
  const normalizedSignature = String(signature || '');
  const timestamp = Number(normalizedTimestamp);
  const now = Date.now();

  if (
    !allowedClientIds.has(normalizedClientId)
    || !/^\d{13}$/.test(normalizedTimestamp)
    || !Number.isFinite(timestamp)
    || Math.abs(now - timestamp) > SIGNATURE_MAX_AGE_MS
    || !/^[a-f0-9]{32,64}$/i.test(normalizedNonce)
    || !/^[a-f0-9]{64}$/i.test(normalizedSignature)
    || typeof requestPath !== 'string'
  ) {
    return false;
  }

  const payload = [
    normalizedTimestamp,
    normalizedNonce,
    normalizedClientId,
    String(method).toUpperCase(),
    requestPath,
    EMPTY_BODY_SHA256,
  ].join('\n');

  if (!(await verifyFeedSignature(normalizedSignature, payload))) return false;

  cleanupNonces(now);
  const nonceKey = `${normalizedClientId}:${normalizedNonce}`;
  if (usedNonces.has(nonceKey)) return false;
  usedNonces.set(nonceKey, timestamp);
  return true;
}

async function requireBackendSignature(req, res, next) {
  try {
    const authenticated = await authenticateBackendSignature({
      clientId: req.get('x-feed-client-id'),
      timestampText: req.get('x-feed-timestamp'),
      nonce: req.get('x-feed-nonce'),
      signature: req.get('x-feed-signature'),
      method: req.method,
      requestPath: req.originalUrl,
    });

    return authenticated
      ? next()
      : res.status(401).json({ success: false, error: 'Unauthorized' });
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
  authenticateBackendSignature,
  requireBackendSignature,
  requireSecureTransport,
};
