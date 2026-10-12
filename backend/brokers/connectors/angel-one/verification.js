const crypto = require('crypto');
const { smartApiRequest } = require('./signedRequest');
const { firstValue } = require('../../../domains/trading/trade.normalization');

function generateTOTP(secret) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const cleanSecret = String(secret || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  for (let i = 0; i < cleanSecret.length; i++) {
    const val = base32chars.indexOf(cleanSecret.charAt(i));
    if (val !== -1) {
      bits += val.toString(2).padStart(5, '0');
    }
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  const key = Buffer.from(bytes);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

async function authenticateAngelOneCredentials(credentials) {
  const { apiKey, clientCode, password, totpSecret } = credentials;
  const totp = generateTOTP(totpSecret);

  const authData = await smartApiRequest('/rest/auth/angelbroking/user/v1/loginByPassword', {
    method: 'POST',
    apiKey,
    body: {
      clientcode: clientCode,
      password,
      totp,
    },
  });

  const jwtToken = firstValue(authData, 'jwtToken', 'jwttoken') || firstValue(authData?.data, 'jwtToken', 'jwttoken');
  if (!jwtToken) {
    const error = new Error('Failed to acquire session token from Angel One');
    error.code = 'INVALID_CREDENTIALS';
    error.details = authData?.message || 'Failed to acquire session token from Angel One. Please check API Key, Client Code, Password and TOTP Secret.';
    throw error;
  }

  const profileData = await smartApiRequest('/rest/secure/angelbroking/user/v1/getProfile', {
    method: 'GET',
    apiKey,
    jwtToken,
  }).catch(() => ({ clientcode: clientCode, name: clientCode }));

  return {
    jwtToken,
    refreshToken: firstValue(authData, 'refreshToken', 'refreshtoken'),
    feedToken: firstValue(authData, 'feedToken', 'feedtoken'),
    clientCode: profileData.clientcode || clientCode,
    name: firstValue(profileData, 'name', 'clientcode') || 'Angel One Account',
    email: profileData.email || null,
    broker: profileData.broker || 'Angel One',
  };
}

module.exports = { authenticateAngelOneCredentials, generateTOTP };
