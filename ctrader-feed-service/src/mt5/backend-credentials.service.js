const crypto = require('crypto');

const ENCRYPTED_PREFIX = 'enc:';
const PLACEHOLDER_KEYS = new Set([
  '',
  'change_me',
  'replace-with-32-byte-random-string',
  'replace-with-mt5-credentials-key',
  'your-mt5-credentials-key',
]);

function getKeyMaterial() {
  const secret = String(process.env.MT5_CREDENTIALS_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  if (!secret || PLACEHOLDER_KEYS.has(secret)) return null;

  // Keep this identical to Newapp backend/integrations/mt5/credentials.service.js.
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptMT5Password(plainText) {
  const key = getKeyMaterial();
  if (!plainText) return plainText;
  if (!key) throw new Error('MT5_CREDENTIALS_KEY missing or still using placeholder value');

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptMT5Password(value) {
  const key = getKeyMaterial();
  if (!value) return '';

  const text = String(value);
  if (!text.startsWith(ENCRYPTED_PREFIX)) return text;
  if (!key) throw new Error('MT5_CREDENTIALS_KEY missing or still using placeholder value');

  const [ivBase64, authTagBase64, encryptedBase64] = text
    .slice(ENCRYPTED_PREFIX.length)
    .split('.');
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error('Invalid encrypted cTrader token format');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  decryptMT5Password,
  encryptMT5Password,
};
