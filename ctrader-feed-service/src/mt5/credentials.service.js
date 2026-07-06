const crypto = require('crypto');

const PLACEHOLDER_KEYS = new Set([
  '',
  'change_me',
  'replace-with-32-byte-random-string',
  'replace-with-mt5-credentials-key',
  'your-mt5-credentials-key',
]);

function getKeyMaterial() {
  const raw = String(process.env.MT5_CREDENTIALS_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw || PLACEHOLDER_KEYS.has(raw)) {
    throw new Error('MT5_CREDENTIALS_KEY is required to decrypt cTrader tokens from database');
  }

  // Must match Newapp backend/integrations/mt5/credentials.service.js exactly.
  return crypto.createHash('sha256').update(raw).digest();
}

function looksPlainText(value) {
  const text = String(value || '');
  if (!text) return true;

  // cTrader tokens normally look URL-safe/base64-ish and do not use our encrypted separators.
  if (!/[.:|{}]/.test(text)) return true;

  // If it starts like an encrypted payload, treat as encrypted.
  if (/^(enc|aes|v1)[:.]/i.test(text)) return false;
  if (text.trim().startsWith('{')) return false;

  // colon/pipe-separated 3+ parts may be encrypted.
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

function decryptWithParts(parts) {
  const key = getKeyMaterial();
  const cleaned = parts.filter(Boolean);

  const candidates = [];

  // Common format: iv:tag:ciphertext
  if (cleaned.length >= 3) {
    candidates.push({ iv: cleaned[0], tag: cleaned[1], encrypted: cleaned.slice(2).join(':') });
    // Other common format: iv:ciphertext:tag
    candidates.push({ iv: cleaned[0], encrypted: cleaned[1], tag: cleaned[2] });
    // Some helpers store ciphertext:iv:tag
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

function parseJsonPayload(text) {
  const parsed = JSON.parse(text);
  return {
    iv: parsed.iv || parsed.nonce,
    tag: parsed.tag || parsed.authTag || parsed.auth_tag,
    encrypted: parsed.encrypted || parsed.ciphertext || parsed.data || parsed.value,
  };
}

function decryptMT5Password(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';

  if (looksPlainText(text)) return text;

  const withoutPrefix = text.replace(/^(enc|aes|v1)[:.]/i, '');

  // Newapp backend format: enc:iv.authTag.ciphertext
  const dotParts = withoutPrefix.split('.').filter(Boolean);
  if (dotParts.length === 3) {
    return decryptWithParts(dotParts);
  }

  // JSON format or base64 JSON format.
  try {
    const payload = withoutPrefix.trim().startsWith('{')
      ? parseJsonPayload(withoutPrefix)
      : parseJsonPayload(Buffer.from(withoutPrefix, 'base64').toString('utf8'));
    return decryptWithParts([payload.iv, payload.tag, payload.encrypted]);
  } catch {}

  // Separator formats: iv:tag:ciphertext, enc:v1:iv:tag:ciphertext, etc.
  const parts = withoutPrefix.split(/[:|]/g).filter(Boolean);
  if (parts.length >= 3) {
    return decryptWithParts(parts.slice(-3));
  }

  // If not recognized, keep plaintext migration behavior instead of crashing.
  return text;
}

function encryptMT5Password(value) {
  if (!value) return null;
  const key = getKeyMaterial();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `enc:${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

module.exports = {
  decryptMT5Password,
  encryptMT5Password,
};
