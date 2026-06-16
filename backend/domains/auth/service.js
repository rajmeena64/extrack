const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { hashToken } = require('../../shared/utils/security');
const { logAuthTableUse, TABLES } = require('../../config/tables');

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const refreshTokenDays = Number.parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);

function requireAccessSecret() {
  if (!accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is required');
  }
}

function generateRawToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function getRefreshExpiry() {
  const days = Number.isFinite(refreshTokenDays) && refreshTokenDays > 0 ? refreshTokenDays : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function signAccessToken(userId) {
  requireAccessSecret();
  return jwt.sign(
    {
      sub: String(userId),
      userId,
      typ: 'access',
      iss: process.env.JWT_ISSUER || 'entrack-api',
      aud: process.env.JWT_AUDIENCE || 'entrack-web',
    },
    accessSecret,
    { expiresIn: accessExpiresIn }
  );
}

function verifyAccessToken(token) {
  requireAccessSecret();
  return jwt.verify(token, accessSecret, {
    issuer: process.env.JWT_ISSUER || 'entrack-api',
    audience: process.env.JWT_AUDIENCE || 'entrack-web',
  });
}

function getCookieBaseOptions() {
  return {
    httpOnly: true,
    secure: String(process.env.COOKIE_SECURE || (process.env.NODE_ENV === 'production')) === 'true',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
  };
}

function getRefreshCookieOptions(expiresAt) {
  return {
    ...getCookieBaseOptions(),
    path: '/api/auth',
    expires: expiresAt,
  };
}

function getAccessCookieOptions() {
  return {
    ...getCookieBaseOptions(),
    path: '/',
    maxAge: 15 * 60 * 1000,
  };
}

function clearAuthCookies(res) {
  const base = getCookieBaseOptions();
  [
    { name: 'refreshToken', path: '/api/auth' },
    { name: 'refreshToken', path: '/' },
    { name: 'accessToken', path: '/' },
  ].forEach(({ name, path }) => {
    res.clearCookie(name, { ...base, path });
    res.cookie(name, '', { ...base, path, expires: new Date(0), maxAge: 0 });
  });
}

async function issueSession(pool, res, userId, req) {
  const accessToken = signAccessToken(userId);
  const refreshToken = generateRawToken(48);
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpiry();

  logAuthTableUse('refresh_token_save', TABLES.refreshTokens);

  await pool.query(
    `INSERT INTO ${TABLES.refreshTokens} (user_id, token_hash, token, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $2, $3, $4, $5)`,
    [
      userId,
      refreshTokenHash,
      expiresAt,
      String(req.headers['user-agent'] || '').slice(0, 512),
      req.ip || req.socket?.remoteAddress || null,
    ]
  );

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(expiresAt));
  res.cookie('accessToken', accessToken, getAccessCookieOptions());

  return { accessToken, refreshTokenHash, expiresAt };
}

module.exports = {
  clearAuthCookies,
  generateRawToken,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  hashToken,
  issueSession,
  signAccessToken,
  verifyAccessToken,
};
