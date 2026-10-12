const crypto = require('crypto');

const SERVICE_ENCRYPTED_PREFIX = 'enc:';
const USER_BROKER_ENCRYPTED_PREFIX = 'enc:v1:';
const DEFAULT_KEY_FALLBACK = 'replace-with-32-byte-random-string';

function getServiceCredentialKey() {
  const secret = process.env.CTRADER_ADMIN_CREDENTIALS_KEY;
  if (!secret || secret === DEFAULT_KEY_FALLBACK) return null;
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptServiceCredential(value) {
  if (!value) return value;
  const key = getServiceCredentialKey();
  if (!key) throw new Error('CTRADER_ADMIN_CREDENTIALS_KEY missing or still using placeholder value');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${SERVICE_ENCRYPTED_PREFIX}${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptServiceCredential(value) {
  if (!value) return '';
  if (!String(value).startsWith(SERVICE_ENCRYPTED_PREFIX)) return String(value);
  const key = getServiceCredentialKey();
  if (!key) throw new Error('CTRADER_ADMIN_CREDENTIALS_KEY missing or still using placeholder value');
  const [iv, tag, encrypted] = String(value).slice(SERVICE_ENCRYPTED_PREFIX.length).split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
}

function getUserBrokerCredentialKey() {
  const secret = String(process.env.USER_BROKER_CREDENTIALS_KEY || '');
  if (secret.length < 32) throw new Error('USER_BROKER_CREDENTIALS_KEY must contain at least 32 characters');
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptUserBrokerCredential(value, context) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getUserBrokerCredentialKey(), iv);
  cipher.setAAD(Buffer.from(String(context), 'utf8'));
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${USER_BROKER_ENCRYPTED_PREFIX}${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptUserBrokerCredential(value, context) {
  if (!String(value || '').startsWith(USER_BROKER_ENCRYPTED_PREFIX)) throw new Error('Invalid broker credential envelope');
  const [iv, tag, encrypted] = String(value).slice(USER_BROKER_ENCRYPTED_PREFIX.length).split('.');
  if (!iv || !tag || !encrypted) throw new Error('Invalid broker credential envelope');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getUserBrokerCredentialKey(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(String(context), 'utf8'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = {
  decryptServiceCredential,
  decryptUserBrokerCredential,
  encryptServiceCredential,
  encryptUserBrokerCredential,
};
