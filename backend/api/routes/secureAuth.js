const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fetch = require('node-fetch');
const pool = require('../../infra/db/database');
const { logAuthTableUse, TABLES, USER_SELECT } = require('../../config/tables');
const { createRateLimiter } = require('../../core/rateLimiter/index');
const { secretsMatch } = require('../../shared/utils/security');
const {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  parseBody,
  resetPasswordSchema,
  resetOtpSchema,
  signupSchema,
  tokenSchema,
} = require('../../domains/auth/validator');
const {
  clearAuthCookies,
  generateRawToken,
  hashToken,
  issueSession,
  verifyAccessToken,
} = require('../../domains/auth/service');
const {
  sendLoginNotificationEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} = require('../../domains/auth/email.service');
const { sanitizeError } = require('../../core/errors/safeErrors');

const router = express.Router();
const configuredBcryptCost = Number.parseInt(process.env.BCRYPT_COST || '12', 10);
const BCRYPT_COST = Number.isFinite(configuredBcryptCost) && configuredBcryptCost >= 12
  ? configuredBcryptCost
  : 12;
const VERIFY_TOKEN_MINUTES = Number.parseInt(process.env.EMAIL_VERIFY_TOKEN_MINUTES || '60', 10);
const RESET_OTP_MINUTES = Number.parseInt(process.env.PASSWORD_RESET_OTP_MINUTES || '5', 10);
const RESET_OTP_RESEND_SECONDS = Number.parseInt(process.env.PASSWORD_RESET_OTP_RESEND_SECONDS || '60', 10);
const GENERIC_LOGIN_ERROR = 'Invalid credentials.';
const GENERIC_RESET_MESSAGE = "If this account exists, we'll send reset instructions.";

const ME_USER_SELECT = `
  id AS "ID",
  first_name AS "firstName",
  last_name AS "lastName",
  email,
  email_original,
  phone,
  mobile_normalized,
  account_type AS "accountType",
  preferred_currency,
  name,
  email_verified_at,
  profile_picture,
  auth_provider,
  created_at AS "createdAt",
  created_at
`;

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const commonPasswords = new Set([
  'password1234',
  'password12345',
  '123456789012',
  'qwerty123456',
  'letmein123456',
  'adminpassword',
]);

const signupLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || req.body?.mobile || req.body?.phone || '').trim().toLowerCase()}`,
  message: 'Too many signup attempts. Please try again later.',
});
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || req.body?.phone || '').trim().toLowerCase()}`,
  message: 'Too many login attempts. Please try again later.',
});
const resendLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`,
  message: 'Too many verification email requests. Please try again later.',
});
const forgotLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`,
  message: 'Too many password reset requests. Please try again later.',
});
const resetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) => req.ip,
  message: 'Too many password reset attempts. Please try again later.',
});
const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip,
  message: 'Too many refresh attempts. Please try again later.',
});

const ok = (res, message, data, code) => res.json({ success: true, message, data, code });
const fail = (res, status, message, code, data) => res.status(status).json({ success: false, message, code, data });

function getDisplayName(input) {
  if (input.name) return input.name;
  const providedName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
  if (providedName) return providedName;

  return 'Entrack User';
}

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' '),
  };
}

function safeUser(user) {
  const fullName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ');
  const firstName = user.firstName || splitName(fullName).firstName;
  const lastName = user.lastName || splitName(fullName).lastName;
  const isPlaceholderProfile = fullName === 'Entrack User'
    || (firstName === 'Entrack' && lastName === 'User');

  return {
    ID: user.ID,
    id: user.ID,
    name: fullName,
    firstName,
    lastName,
    email: user.email_original || user.email,
    phone: user.mobile_normalized || user.phone || null,
    accountType: user.accountType || 'manual',
    preferred_currency: user.preferred_currency || 'USD',
    profileComplete: Boolean(!isPlaceholderProfile && String(firstName || '').trim() && String(lastName || '').trim()),
    email_verified_at: user.email_verified_at || null,
    profilePicture: user.profile_picture || null,
    authProvider: user.auth_provider || 'local',
    createdAt: user.createdAt || user.created_at || null,
  };
}

function getLoginNotificationContext(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 512),
    loginTime: new Date(),
  };
}

function queueLoginNotification({ user, req, method }) {
  const email = user?.email_original || user?.email;
  if (!email) return;

  const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.first_name || 'there';

  sendLoginNotificationEmail({
    email,
    name,
    method,
    ...getLoginNotificationContext(req),
  }).catch((error) => {
    console.warn('auth.login_notification_failed', { userId: user?.ID || user?.id, error: sanitizeError(error) });
  });
}

function isWeakPassword(password) {
  return commonPasswords.has(String(password || '').toLowerCase());
}

function generatePasswordResetOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function getPasswordResetCooldownSeconds(resetOtp) {
  if (!resetOtp?.created_at) return 0;
  const createdAtMs = new Date(resetOtp.created_at).getTime();
  if (Number.isNaN(createdAtMs)) return 0;

  return Math.max(0, RESET_OTP_RESEND_SECONDS - Math.floor((Date.now() - createdAtMs) / 1000));
}

function getPasswordHash(row) {
  return row.password_hash || row.password;
}

async function findUserByEmail(emailNormalized) {
  const result = await pool.query(
    `SELECT ${USER_SELECT} FROM ${TABLES.users}
     WHERE COALESCE(email_normalized, lower(email)) = $1
       AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'`,
    [emailNormalized]
  );
  return result.rows[0] || null;
}

async function findUserByLogin(input) {
  if (input.email) return findUserByEmail(input.email);

  const phone = input.phone;
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  const indianPhone = phoneDigits.startsWith('91') && phoneDigits.length === 12
    ? phoneDigits.slice(2)
    : phoneDigits;
  const phoneCandidates = Array.from(new Set([
    phone,
    phoneDigits,
    indianPhone,
    indianPhone ? `+91${indianPhone}` : null,
    phoneDigits ? `+${phoneDigits}` : null,
  ].filter(Boolean)));
  const result = await pool.query(
    `SELECT ${USER_SELECT} FROM ${TABLES.users}
     WHERE (mobile_normalized = ANY($1::text[]) OR phone = ANY($1::text[]))
       AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'`,
    [phoneCandidates]
  );
  return result.rows[0] || null;
}

async function findLatestPasswordResetOtp(client, emailNormalized, { lock = false } = {}) {
  const result = await client.query(
    `SELECT prt.*, u.email_original, u.email, u.name, u.first_name AS "firstName"
     FROM ${TABLES.passwordResets} prt
     JOIN ${TABLES.users} u ON u.id = prt.user_id
     WHERE COALESCE(u.email_normalized, lower(u.email)) = $1
       AND prt.used_at IS NULL
     ORDER BY prt.created_at DESC
     LIMIT 1
     ${lock ? 'FOR UPDATE' : ''}`,
    [emailNormalized]
  );
  return result.rows[0] || null;
}

async function verifyPasswordResetOtp(client, emailNormalized, otp, options) {
  const resetOtp = await findLatestPasswordResetOtp(client, emailNormalized, options);
  if (!resetOtp || new Date(resetOtp.expires_at) <= new Date()) return null;

  const otpOk = await bcrypt.compare(otp, resetOtp.otp_hash || '');
  return otpOk ? resetOtp : null;
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getFrontendUrl() {
  return normalizeUrl(process.env.FRONTEND_URL || 'http://localhost:5173');
}

function getGoogleCallbackUrl() {
  return String(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback').trim();
}

function redirectOAuthError(res, code) {
  console.warn('auth.google_redirect_error', { code });
  const url = new URL('/', getFrontendUrl());
  return res.redirect(url.toString());
}

function getOAuthCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: String(process.env.COOKIE_SECURE || (process.env.NODE_ENV === 'production')) === 'true',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/api/auth',
    maxAge: maxAgeMs,
  };
}

function clearGoogleStateCookie(res) {
  const options = getOAuthCookieOptions(0);
  res.clearCookie('googleOAuthState', { ...options, maxAge: undefined });
  res.cookie('googleOAuthState', '', { ...options, expires: new Date(0), maxAge: 0 });
}

function requireGoogleOAuthConfig() {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const callbackUrl = getGoogleCallbackUrl();

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error('Google OAuth is not configured');
  }

  return { clientId, clientSecret, callbackUrl };
}

function parseGoogleEmailVerified(value) {
  return value === true || value === 'true';
}

async function exchangeGoogleCode(code) {
  const { clientId, clientSecret, callbackUrl } = requireGoogleOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }

  return data;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(profile.error_description || profile.error || 'Google profile fetch failed');
  }

  return {
    googleId: profile.sub,
    email: String(profile.email || '').trim(),
    emailVerified: parseGoogleEmailVerified(profile.email_verified),
    name: String(profile.name || '').trim(),
    profilePicture: String(profile.picture || '').trim() || null,
  };
}

async function findUserByGoogleId(client, googleId) {
  const result = await client.query(
    `SELECT ${USER_SELECT} FROM ${TABLES.users}
     WHERE google_id = $1
       AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'`,
    [googleId]
  );
  return result.rows[0] || null;
}

async function upsertGoogleUser(profile) {
  const emailNormalized = profile.email.toLowerCase();
  const emailOriginal = profile.email;
  const displayName = profile.name || emailOriginal.split('@')[0];
  const { firstName, lastName } = splitName(displayName);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const byGoogleId = await findUserByGoogleId(client, profile.googleId);
    if (byGoogleId) {
      await client.query(
        `UPDATE ${TABLES.users}
         SET profile_picture = COALESCE($2, profile_picture),
             email_verified_at = COALESCE(email_verified_at, NOW()),
             last_login_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [byGoogleId.ID, profile.profilePicture]
      );
      await client.query('COMMIT');
      return byGoogleId.ID;
    }

    const existingByEmail = await client.query(
      `SELECT ${USER_SELECT} FROM ${TABLES.users}
       WHERE COALESCE(email_normalized, lower(email)) = $1
         AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'
       FOR UPDATE`,
      [emailNormalized]
    );
    const existingUser = existingByEmail.rows[0];

    if (existingUser) {
      if (existingUser.google_id && existingUser.google_id !== profile.googleId) {
        await client.query('ROLLBACK');
        throw new Error('GOOGLE_ACCOUNT_CONFLICT');
      }

      await client.query(
        `UPDATE ${TABLES.users}
         SET google_id = COALESCE(google_id, $2),
             auth_provider = CASE
               WHEN auth_provider = 'local' OR auth_provider IS NULL THEN 'local_google'
               ELSE auth_provider
             END,
             profile_picture = COALESCE($3, profile_picture),
             email_verified_at = COALESCE(email_verified_at, NOW()),
             last_login_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [existingUser.ID, profile.googleId, profile.profilePicture]
      );
      await client.query('COMMIT');
      return existingUser.ID;
    }

    const insertResult = await client.query(
      `INSERT INTO ${TABLES.users} (
         first_name, last_name, email, phone, password,
         preferred_currency, is_deleted, name, email_normalized, email_original,
         password_hash, mobile_normalized, email_verified_at, status, created_at,
         updated_at, last_login_at, google_id, auth_provider, profile_picture
       ) VALUES ($1, $2, $3, '', NULL, 'USD', false, $4, $5, $6, NULL, NULL,
         NOW(), 'active', NOW(), NOW(), NOW(), $7, 'google', $8)
       RETURNING id AS "ID"`,
      [
        firstName,
        lastName,
        emailOriginal,
        displayName,
        emailNormalized,
        emailOriginal,
        profile.googleId,
        profile.profilePicture,
      ]
    );

    await client.query('COMMIT');
    return insertResult.rows[0].ID;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

function authRequired(req, res, next) {
  try {
    const bearer = String(req.headers.authorization || '').startsWith('Bearer ')
      ? String(req.headers.authorization).slice(7)
      : null;
    const token = req.cookies?.accessToken || bearer;
    if (!token) return fail(res, 401, 'Please sign in to continue.', 'AUTH_REQUIRED');
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId || decoded.sub;
    return next();
  } catch (error) {
    const code = error.name === 'TokenExpiredError' ? 'ACCESS_TOKEN_EXPIRED' : 'INVALID_ACCESS_TOKEN';
    return fail(
      res,
      401,
      error.name === 'TokenExpiredError' ? 'Session expired. Please sign in again.' : 'Please sign in to continue.',
      code === 'ACCESS_TOKEN_EXPIRED' ? 'SESSION_EXPIRED' : 'AUTH_REQUIRED'
    );
  }
}

router.post('/signup', signupLimiter, async (req, res) => {
  const parsed = parseBody(signupSchema, req.body);
  if (parsed.error) return fail(res, 400, parsed.error, 'VALIDATION_ERROR', { field: parsed.field });

  const input = parsed.data;
  const emailNormalized = input.email || null;
  const emailOriginal = String(req.body.email || '').trim();
  const mobileNormalized = input.mobile || input.phone || null;
  const name = getDisplayName(input);

  if (isWeakPassword(input.password)) {
    return fail(res, 400, 'Choose a stronger password', 'WEAK_PASSWORD');
  }

  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const rawToken = generateRawToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_MINUTES * 60 * 1000);

    await client.query('BEGIN');

    const existingUser = emailNormalized
      ? await client.query(
          `SELECT id AS "ID" FROM ${TABLES.users}
           WHERE COALESCE(email_normalized, lower(email)) = $1
             AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'`,
          [emailNormalized]
        )
      : await client.query(
          `SELECT id AS "ID" FROM ${TABLES.users}
           WHERE (mobile_normalized = $1 OR phone = $1 OR phone = $2)
             AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'`,
          [mobileNormalized, String(mobileNormalized || '').replace(/\D/g, '')]
        );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return fail(res, 409, 'Please check the details and try again.', 'VALIDATION_FAILED');
    }

    if (!emailNormalized) {
      await client.query('ROLLBACK');
      return fail(res, 400, 'Mobile signup requires verification code.', 'MOBILE_VERIFICATION_REQUIRED');
    }

    const pendingResult = await client.query(
      `SELECT * FROM ${TABLES.emailVerifications} WHERE email_normalized = $1 FOR UPDATE`,
      [emailNormalized]
    );
    const existingPending = pendingResult.rows[0];

    if (existingPending) {
      await client.query(
        `UPDATE ${TABLES.emailVerifications}
         SET name = $1,
             email_original = $2,
             mobile_normalized = $3,
             password_hash = $4,
             verification_token_hash = $5,
             verification_expires_at = $6,
             created_at = NOW()
         WHERE id = $7`,
        [name, emailOriginal, mobileNormalized, passwordHash, tokenHash, expiresAt, existingPending.id]
      );
    } else {
      await client.query(
        `INSERT INTO ${TABLES.emailVerifications} (
           name, email_normalized, email_original, mobile_normalized,
           password_hash, verification_token_hash, verification_expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [name, emailNormalized, emailOriginal, mobileNormalized, passwordHash, tokenHash, expiresAt]
      );
    }

    await sendVerificationEmail({ email: emailOriginal, name, token: rawToken });
    await client.query('COMMIT');
    console.info('auth.signup_requested', { email: emailNormalized });
    return ok(res, 'Verification link sent to your email', null, 'VERIFICATION_SENT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('auth.signup_failed', { error: sanitizeError(error) });
    if (/email service|frontend_url/i.test(error.message)) {
      return fail(res, 503, 'Email verification service is not configured', 'EMAIL_NOT_CONFIGURED');
    }
    if (/email_verifications|relation .* does not exist/i.test(error.message)) {
      return fail(res, 503, 'Service is temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE');
    }
    return fail(res, 500, 'Signup failed', 'SIGNUP_FAILED');
  } finally {
    client.release();
  }
});

router.get('/verify-email', async (req, res) => {
  const parsed = tokenSchema.safeParse(req.query.token);
  if (!parsed.success) return fail(res, 400, 'Invalid verification link', 'INVALID_TOKEN');

  const tokenHash = hashToken(parsed.data);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const pendingResult = await client.query(
      `SELECT * FROM ${TABLES.emailVerifications} WHERE verification_token_hash = $1 FOR UPDATE`,
      [tokenHash]
    );
    const pending = pendingResult.rows[0];

    if (!pending) {
      await client.query('ROLLBACK');
      return fail(res, 400, 'Invalid or already used verification link', 'INVALID_TOKEN');
    }

    if (new Date(pending.verification_expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      return fail(res, 410, 'Verification link expired. Please request a new one.', 'TOKEN_EXPIRED');
    }

    const existingUser = await client.query(
      `SELECT id AS "ID" FROM ${TABLES.users} WHERE COALESCE(email_normalized, lower(email)) = $1`,
      [pending.email_normalized]
    );
    if (existingUser.rows.length > 0) {
      await client.query(`DELETE FROM ${TABLES.emailVerifications} WHERE id = $1`, [pending.id]);
      await client.query('COMMIT');
      return fail(res, 409, 'Please check the details and try again.', 'VALIDATION_FAILED');
    }

    const { firstName, lastName } = splitName(pending.name);
    const insertResult = await client.query(
      `INSERT INTO ${TABLES.users} (
         first_name, last_name, email, phone, password,
         preferred_currency, is_deleted, name, email_normalized, email_original,
         password_hash, mobile_normalized, email_verified_at, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'USD', false, $6, $7, $8, $9, $10, NOW(), 'active', NOW(), NOW())
       RETURNING ${USER_SELECT}`,
      [
        firstName,
        lastName,
        pending.email_original,
        pending.mobile_normalized || '',
        pending.password_hash,
        pending.name,
        pending.email_normalized,
        pending.email_original,
        pending.password_hash,
        pending.mobile_normalized,
      ]
    );

    await client.query(`DELETE FROM ${TABLES.emailVerifications} WHERE id = $1`, [pending.id]);
    await client.query('COMMIT');
    console.info('auth.email_verified', { email: pending.email_normalized });
    return ok(res, 'Email verified. Your account is ready.', { user: safeUser(insertResult.rows[0]) }, 'EMAIL_VERIFIED');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('auth.verify_failed', { error: sanitizeError(error) });
    return fail(res, 500, 'Email verification failed', 'VERIFY_FAILED');
  } finally {
    client.release();
  }
});

router.post('/resend-verification', resendLimiter, async (req, res) => {
  const parsed = parseBody(emailOnlySchema, req.body);
  if (parsed.error) return fail(res, 400, parsed.error, 'VALIDATION_ERROR', { field: parsed.field });

  try {
    const pendingResult = await pool.query(
      `SELECT * FROM ${TABLES.emailVerifications} WHERE email_normalized = $1`,
      [parsed.data.email]
    );
    const pending = pendingResult.rows[0];

    if (pending) {
      const rawToken = generateRawToken(32);
      const expiresAt = new Date(Date.now() + VERIFY_TOKEN_MINUTES * 60 * 1000);
      await pool.query(
        `UPDATE ${TABLES.emailVerifications}
         SET verification_token_hash = $1, verification_expires_at = $2, created_at = NOW()
         WHERE id = $3`,
        [hashToken(rawToken), expiresAt, pending.id]
      );
      await sendVerificationEmail({ email: pending.email_original, name: pending.name, token: rawToken });
    }

    return ok(res, 'If verification is pending, a new email has been sent', null, 'RESEND_ACCEPTED');
  } catch (error) {
    console.error('auth.resend_failed', { error: sanitizeError(error) });
    return fail(res, 500, 'Could not resend verification email', 'RESEND_FAILED');
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = parseBody(loginSchema, req.body);
  if (parsed.error) return fail(res, 400, GENERIC_LOGIN_ERROR, 'INVALID_CREDENTIALS');
  if (parsed.data.phone && !parsed.data.email) {
    return fail(res, 503, 'Phone login is currently unavailable.', 'PHONE_LOGIN_UNAVAILABLE');
  }

  try {
    logAuthTableUse('login_user_lookup', TABLES.users);

    const user = await findUserByLogin(parsed.data);
    if (!user || !getPasswordHash(user)) {
      console.info('auth.login_failed', { method: parsed.data.email ? 'email' : 'phone', reason: 'not_found' });
      return fail(res, 401, GENERIC_LOGIN_ERROR, 'INVALID_CREDENTIALS');
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, getPasswordHash(user));
    if (!passwordOk) {
      console.info('auth.login_failed', { method: parsed.data.email ? 'email' : 'phone', reason: 'bad_password' });
      return fail(res, 401, GENERIC_LOGIN_ERROR, 'INVALID_CREDENTIALS');
    }

    if (parsed.data.email && !user.email_verified_at) {
      return fail(res, 403, 'Please verify your email before logging in.', 'EMAIL_NOT_VERIFIED');
    }

    const session = await issueSession(pool, res, user.ID, req);
    await pool.query(`UPDATE ${TABLES.users} SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [user.ID]);
    queueLoginNotification({ user, req, method: 'password' });
    console.info('auth.login_success', { userId: user.ID });
    return ok(res, 'Login successful', {
      user: safeUser(user),
      accessToken: session.accessToken,
      refreshExpiresAt: session.expiresAt,
    }, 'LOGIN_SUCCESS');
  } catch (error) {
    console.error('auth.login_error', { error: sanitizeError(error) });
    return fail(res, 500, 'Something went wrong. Please try again.', 'INTERNAL_ERROR');
  }
});

router.get('/google', async (req, res) => {
  try {
    const { clientId, callbackUrl } = requireGoogleOAuthConfig();
    const state = generateRawToken(24);
    const authUrl = new URL(GOOGLE_AUTH_URL);

    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');

    res.cookie('googleOAuthState', state, getOAuthCookieOptions(10 * 60 * 1000));
    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error('auth.google_start_failed', { error: sanitizeError(error) });
    return redirectOAuthError(res, 'google_not_configured');
  }
});

router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    clearGoogleStateCookie(res);
    return redirectOAuthError(res, error === 'access_denied' ? 'cancelled' : 'google_callback_failed');
  }

  if (!code || !state || !secretsMatch(state, req.cookies?.googleOAuthState)) {
    clearGoogleStateCookie(res);
    return redirectOAuthError(res, 'invalid_callback');
  }

  clearGoogleStateCookie(res);

  try {
    const tokens = await exchangeGoogleCode(String(code));
    const profile = await fetchGoogleProfile(tokens.access_token);

    if (!profile.email) return redirectOAuthError(res, 'email_missing');
    if (!profile.emailVerified) return redirectOAuthError(res, 'email_not_verified');
    if (!profile.googleId) return redirectOAuthError(res, 'invalid_profile');

    const userId = await upsertGoogleUser(profile);
    await issueSession(pool, res, userId, req);
    await pool.query(`UPDATE ${TABLES.users} SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [userId]);
    queueLoginNotification({
      user: {
        ID: userId,
        email: profile.email,
        email_original: profile.email,
        name: profile.name || profile.email.split('@')[0],
      },
      req,
      method: 'google',
    });
    const redirectUrl = new URL('/dashboard', getFrontendUrl());
    return res.redirect(redirectUrl.toString());
  } catch (callbackError) {
    console.error('auth.google_callback_failed', { error: callbackError.message });
    if (callbackError.message === 'GOOGLE_ACCOUNT_CONFLICT') {
      return redirectOAuthError(res, 'account_conflict');
    }
    if (/oauth_login_codes|google_id|auth_provider|profile_picture|relation .* does not exist/i.test(callbackError.message)) {
      return redirectOAuthError(res, 'oauth_migration_required');
    }
    return redirectOAuthError(res, 'google_callback_failed');
  }
});

router.post('/refresh-token', refreshLimiter, async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return fail(res, 401, 'Session expired. Please sign in again.', 'SESSION_EXPIRED');

  const tokenHash = hashToken(refreshToken);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    logAuthTableUse('refresh_token_read', TABLES.refreshTokens);

    const tokenResult = await client.query(
      `SELECT * FROM ${TABLES.refreshTokens} WHERE token_hash = $1 OR token = $1 FOR UPDATE`,
      [tokenHash]
    );
    const stored = tokenResult.rows[0];

    if (!stored || new Date(stored.expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      clearAuthCookies(res);
      return fail(res, 401, 'Session expired. Please sign in again.', 'SESSION_EXPIRED');
    }

    if (stored.revoked_at) {
      await client.query(`UPDATE ${TABLES.refreshTokens} SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [stored.user_id]);
      await client.query('COMMIT');
      clearAuthCookies(res);
      console.warn('auth.refresh_reuse_detected', { userId: stored.user_id });
      return fail(res, 401, 'Session expired. Please sign in again.', 'SESSION_EXPIRED');
    }

    await client.query(`UPDATE ${TABLES.refreshTokens} SET revoked_at = NOW() WHERE token_hash = $1 OR token = $1`, [tokenHash]);
    await client.query('COMMIT');

    const session = await issueSession(pool, res, stored.user_id, req);
    return ok(res, 'Token refreshed', {
      accessToken: session.accessToken,
      refreshExpiresAt: session.expiresAt,
    }, 'TOKEN_REFRESHED');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('auth.refresh_failed', { error: sanitizeError(error) });
    clearAuthCookies(res);
    return fail(res, 401, 'Refresh failed', 'REFRESH_FAILED');
  } finally {
    client.release();
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  try {
    if (refreshToken) {
      await pool.query(`UPDATE ${TABLES.refreshTokens} SET revoked_at = NOW() WHERE token_hash = $1 OR token = $1`, [hashToken(refreshToken)]);
    }
    clearAuthCookies(res);
    return ok(res, 'Logged out successfully', null, 'LOGOUT_SUCCESS');
  } catch (error) {
    clearAuthCookies(res);
    return ok(res, 'Logged out successfully', null, 'LOGOUT_SUCCESS');
  }
});

router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const parsed = parseBody(emailOnlySchema, req.body);
  if (parsed.error) return ok(res, GENERIC_RESET_MESSAGE, { resendAfterSeconds: RESET_OTP_RESEND_SECONDS }, 'RESET_REQUEST_ACCEPTED');

  try {
    const user = await findUserByEmail(parsed.data.email);
    if (user) {
      const activeOtp = await findLatestPasswordResetOtp(pool, parsed.data.email);
      const cooldownSeconds = getPasswordResetCooldownSeconds(activeOtp);

      if (cooldownSeconds > 0) {
        console.info('auth.password_reset_resend_blocked', { email: parsed.data.email, cooldownSeconds });
        return ok(
          res,
          'A password reset OTP was already sent. Please wait before requesting another one.',
          { resendAfterSeconds: cooldownSeconds },
          'RESET_OTP_COOLDOWN'
        );
      }

      const rawOtp = generatePasswordResetOtp();
      const otpHash = await bcrypt.hash(rawOtp, BCRYPT_COST);
      await pool.query(
        `UPDATE ${TABLES.passwordResets}
         SET used_at = NOW()
         WHERE user_id = $1
           AND used_at IS NULL`,
        [user.ID]
      );
      await pool.query(
        `INSERT INTO ${TABLES.passwordResets} (user_id, otp_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.ID, otpHash, new Date(Date.now() + RESET_OTP_MINUTES * 60 * 1000)]
      );
      await sendPasswordResetEmail({
        email: user.email_original || user.email,
        name: user.name || user.firstName || 'there',
        otp: rawOtp,
      });
    }
    console.info('auth.password_reset_requested', { email: parsed.data.email });
    return ok(res, GENERIC_RESET_MESSAGE, { resendAfterSeconds: RESET_OTP_RESEND_SECONDS }, 'RESET_REQUEST_ACCEPTED');
  } catch (error) {
    console.error('auth.forgot_failed', { error: sanitizeError(error) });
    return ok(res, GENERIC_RESET_MESSAGE, { resendAfterSeconds: RESET_OTP_RESEND_SECONDS }, 'RESET_REQUEST_ACCEPTED');
  }
});

router.post('/verify-reset-otp', resetLimiter, async (req, res) => {
  const parsed = parseBody(resetOtpSchema, req.body);
  if (parsed.error) return fail(res, 400, parsed.error, 'VALIDATION_ERROR', { field: parsed.field });

  try {
    const resetOtp = await verifyPasswordResetOtp(pool, parsed.data.email, parsed.data.otp);
    if (!resetOtp) return fail(res, 400, 'Invalid or expired reset OTP', 'INVALID_RESET_OTP');

    return ok(res, 'OTP verified. You can set a new password now.', null, 'RESET_OTP_VERIFIED');
  } catch (error) {
    console.error('auth.reset_otp_verify_failed', { error: sanitizeError(error) });
    return fail(res, 500, 'OTP verification failed', 'RESET_OTP_VERIFY_FAILED');
  }
});

router.post('/reset-password', resetLimiter, async (req, res) => {
  const parsed = parseBody(resetPasswordSchema, req.body);
  if (parsed.error) return fail(res, 400, parsed.error, 'VALIDATION_ERROR', { field: parsed.field });

  const newPassword = parsed.data.newPassword || parsed.data.password;
  if (isWeakPassword(newPassword)) return fail(res, 400, 'Choose a stronger password', 'WEAK_PASSWORD');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const token = await verifyPasswordResetOtp(client, parsed.data.email, parsed.data.otp, { lock: true });
    if (!token) {
      await client.query('ROLLBACK');
      return fail(res, 400, 'Invalid or expired reset OTP', 'INVALID_RESET_OTP');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await client.query(
      `UPDATE ${TABLES.users}
       SET password_hash = $1, password = $2, updated_at = NOW()
       WHERE id = $3`,
      [passwordHash, passwordHash, token.user_id]
    );
    await client.query(
      `UPDATE ${TABLES.passwordResets}
       SET used_at = NOW()
       WHERE user_id = $1
         AND used_at IS NULL`,
      [token.user_id]
    );
    await client.query(`UPDATE ${TABLES.refreshTokens} SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [token.user_id]);
    await client.query('COMMIT');
    clearAuthCookies(res);
    sendPasswordChangedEmail({
      email: token.email_original || token.email,
      name: token.name || token.firstName || 'there',
    }).catch(() => null);
    console.info('auth.password_reset_completed', { userId: token.user_id });
    return ok(res, 'Password reset successful. Please login again.', null, 'PASSWORD_RESET');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    console.error('auth.reset_failed', { error: sanitizeError(error) });
    return fail(res, 500, 'Password reset failed', 'RESET_FAILED');
  } finally {
    client.release();
  }
});

router.post('/change-password', authRequired, async (req, res) => {
  const parsed = parseBody(changePasswordSchema, req.body);
  if (parsed.error) return fail(res, 400, parsed.error, 'VALIDATION_ERROR', { field: parsed.field });
  if (isWeakPassword(parsed.data.newPassword)) return fail(res, 400, 'Choose a stronger password', 'WEAK_PASSWORD');

  try {
    const userResult = await pool.query(`SELECT ${USER_SELECT} FROM ${TABLES.users} WHERE id = $1`, [req.userId]);
    const user = userResult.rows[0];
    if (!user || !(await bcrypt.compare(parsed.data.currentPassword, getPasswordHash(user)))) {
      return fail(res, 401, 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
    await pool.query(
      `UPDATE ${TABLES.users} SET password_hash = $1, password = $2, updated_at = NOW() WHERE id = $3`,
      [passwordHash, passwordHash, req.userId]
    );
    await pool.query(`UPDATE ${TABLES.refreshTokens} SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [req.userId]);
    clearAuthCookies(res);
    sendPasswordChangedEmail({
      email: user.email_original || user.email,
      name: user.name || user.firstName || 'there',
    }).catch(() => null);
    console.info('auth.password_changed', { userId: req.userId });
    return ok(res, 'Password changed. Please login again.', null, 'PASSWORD_CHANGED');
  } catch (error) {
    console.error('auth.change_password_failed', { error: sanitizeError(error) });
    return fail(res, 500, 'Password change failed', 'CHANGE_PASSWORD_FAILED');
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${ME_USER_SELECT} FROM ${TABLES.users}
       WHERE id = $1
         AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'`,
      [req.userId]
    );
    if (result.rows.length === 0) return fail(res, 404, 'User not found', 'USER_NOT_FOUND');
    return ok(res, 'Profile loaded', { user: safeUser(result.rows[0]) }, 'ME_LOADED');
  } catch (error) {
    return fail(res, 500, 'Could not load profile', 'ME_FAILED');
  }
});

router.post('/profile', authRequired, async (req, res) => {
  const firstName = String(req.body?.firstName || '').trim().replace(/\s+/g, ' ');
  const lastName = String(req.body?.lastName || '').trim().replace(/\s+/g, ' ');
  const phone = String(req.body?.phone || '').trim();
  const preferredCurrency = String(req.body?.preferred_currency || req.body?.currency || 'USD')
    .trim()
    .toUpperCase();

  if (firstName.length < 2 || firstName.length > 80) {
    return fail(res, 400, 'First name must be between 2 and 80 characters', 'INVALID_FIRST_NAME');
  }

  if (lastName.length < 1 || lastName.length > 80) {
    return fail(res, 400, 'Last name is required', 'INVALID_LAST_NAME');
  }

  if (!/^[\p{L} .'-]+$/u.test(firstName) || !/^[\p{L} .'-]+$/u.test(lastName)) {
    return fail(res, 400, 'Name contains unsupported characters', 'INVALID_NAME');
  }

  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return fail(res, 400, 'Use phone in E.164 format, for example +919876543210', 'INVALID_PHONE');
  }

  if (!/^[A-Z]{3}$/.test(preferredCurrency)) {
    return fail(res, 400, 'Invalid preferred currency', 'INVALID_CURRENCY');
  }

  try {
    const fullName = [firstName, lastName].join(' ');
    const result = await pool.query(
      `UPDATE ${TABLES.users}
       SET first_name = $1,
           last_name = $2,
           name = $3,
           phone = COALESCE(NULLIF($4, ''), phone),
           mobile_normalized = COALESCE(NULLIF($4, ''), mobile_normalized),
           preferred_currency = $5,
           updated_at = NOW()
       WHERE id = $6
         AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'
       RETURNING ${USER_SELECT}`,
      [firstName, lastName, fullName, phone, preferredCurrency, req.userId]
    );

    if (result.rows.length === 0) return fail(res, 404, 'User not found', 'USER_NOT_FOUND');
    return ok(res, 'Profile updated', { user: safeUser(result.rows[0]) }, 'PROFILE_UPDATED');
  } catch (error) {
    console.error('auth.profile_update_failed', { error: sanitizeError(error) });
    return fail(res, 500, 'Could not update profile', 'PROFILE_UPDATE_FAILED');
  }
});

router.post('/cleanup-expired', authRequired, async (req, res) => {
  await pool.query(`DELETE FROM ${TABLES.emailVerifications} WHERE verification_expires_at <= NOW()`);
  await pool.query(`DELETE FROM ${TABLES.passwordResets} WHERE expires_at <= NOW() OR used_at IS NOT NULL`);
  return ok(res, 'Expired auth records cleaned up', null, 'CLEANUP_DONE');
});

module.exports = router;
module.exports.authRequired = authRequired;
