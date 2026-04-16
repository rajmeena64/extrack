const crypto = require('crypto');

const ENCRYPTED_PREFIX = 'enc:';
const DEFAULT_KEY_FALLBACK = 'replace-with-32-byte-random-string';

function getKeyMaterial() {
  const secret = process.env.MT5_CREDENTIALS_KEY;

  if (!secret || secret === DEFAULT_KEY_FALLBACK) {
    return null;
  }

  return crypto.createHash('sha256').update(secret).digest();
}

function encryptMT5Password(plainText) {
  const key = getKeyMaterial();

  if (!plainText) {
    return plainText;
  }

  if (!key) {
    throw new Error('MT5_CREDENTIALS_KEY missing or still using placeholder value');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptMT5Password(value) {
  const key = getKeyMaterial();

  if (!value) {
    return '';
  }

  if (!String(value).startsWith(ENCRYPTED_PREFIX)) {
    return String(value);
  }

  if (!key) {
    throw new Error('MT5_CREDENTIALS_KEY missing or still using placeholder value');
  }

  const payload = String(value).slice(ENCRYPTED_PREFIX.length);
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split('.');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivBase64, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function verifyMT5Password(candidate, storedValue) {
  return decryptMT5Password(storedValue) === String(candidate);
}

module.exports = {
  decryptMT5Password,
  encryptMT5Password,
  verifyMT5Password,
};
