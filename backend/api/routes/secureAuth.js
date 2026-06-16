const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../../infra/db/database');
const { logAuthTableUse, TABLES, USER_SELECT } = require('../../config/tables');
const { createRateLimiter } = require('../../core/rateLimiter/index');
const {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  parseBody,
  resetPasswordSchema,
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
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} = require('../../domains/auth/email.service');

const router = express.Router();
const configuredBcryptCost = Number.parseInt(process.env.BCRYPT_COST || '12', 10);
const BCRYPT_COST = Number.isFinite(configuredBcryptCost) && configuredBcryptCost >= 12
  ? configuredBcryptCost
  : 12;
const VERIFY_TOKEN_MINUTES = Number.parseInt(process.env.EMAIL_VERIFY_TOKEN_MINUTES || '60', 10);
const RESET_TOKEN_MINUTES = Number.parseInt(process.env.PASSWORD_RESET_TOKEN_MINUTES || '30', 10);
const GENERIC_LOGIN_ERROR = 'Invalid email or password';
const GENERIC_RESET_MESSAGE = 'If an account exists, password reset instructions have been sent';
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
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`,
  message: 'Too many signup attempts. Please try again later.',
});
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`,
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
  return [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
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
  return {
    ID: user.ID,
    id: user.ID,
    name: fullName,
    firstName: user.firstName || splitName(fullName).firstName,
    lastName: user.lastName || splitName(fullName).lastName,
    email: user.email_original || user.email,
    phone: user.mobile_normalized || user.phone || null,
    accountType: user.accountType || 'manual',
    preferred_currency: user.preferred_currency || 'USD',
    email_verified_at: user.email_verified_at || null,
    createdAt: user.createdAt || user.created_at || null,
  };
}

function isWeakPassword(password) {
  return commonPasswords.has(String(password || '').toLowerCase());
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

function authRequired(req, res, next) {
  try {
    const bearer = String(req.headers.authorization || '').startsWith('Bearer ')
      ? String(req.headers.authorization).slice(7)
      : null;
    const token = req.cookies?.accessToken || bearer;
    if (!token) return fail(res, 401, 'Authentication required', 'AUTH_REQUIRED');
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId || decoded.sub;
    return next();
  } catch (error) {
    const code = error.name === 'TokenExpiredError' ? 'ACCESS_TOKEN_EXPIRED' : 'INVALID_ACCESS_TOKEN';
    return fail(res, 401, 'Authentication required', code);
  }
}

router.post('/signup', signupLimiter, async (req, res) => {
  const parsed = parseBody(signupSchema, req.body);
  if (parsed.error) return fail(res, 400, parsed.error, 'VALIDATION_ERROR', { field: parsed.field });

  const input = parsed.data;
  const emailNormalized = input.email;
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

    const existingUser = await client.query(
      `SELECT id AS "ID" FROM ${TABLES.users}
       WHERE COALESCE(email_normalized, lower(email)) = $1
         AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'`,
      [emailNormalized]
    );
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return fail(res, 409, 'This email is already registered. Please login.', 'EMAIL_REGISTERED');
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
    console.error('auth.signup_failed', { error: error.message });
    if (/email service|frontend_url/i.test(error.message)) {
      return fail(res, 503, 'Email verification service is not configured', 'EMAIL_NOT_CONFIGURED');
    }
    if (/email_verifications|relation .* does not exist/i.test(error.message)) {
      return fail(res, 500, 'Auth database migration has not been applied', 'AUTH_MIGRATION_REQUIRED');
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
      return fail(res, 409, 'This email is already registered. Please login.', 'EMAIL_REGISTERED');
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
    console.error('auth.verify_failed', { error: error.message });
    if (process.env.NODE_ENV !== 'production') {
      return fail(res, 500, `Email verification failed: ${error.message}`, 'VERIFY_FAILED');
    }
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
    console.error('auth.resend_failed', { error: error.message });
    return fail(res, 500, 'Could not resend verification email', 'RESEND_FAILED');
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = parseBody(loginSchema, req.body);
  if (parsed.error) return fail(res, 400, GENERIC_LOGIN_ERROR, 'INVALID_CREDENTIALS');

  try {
    logAuthTableUse('login_user_lookup', TABLES.users);

    const user = await findUserByEmail(parsed.data.email);
    if (!user || !getPasswordHash(user)) {
      console.info('auth.login_failed', { email: parsed.data.email, reason: 'not_found' });
      return fail(res, 401, GENERIC_LOGIN_ERROR, 'INVALID_CREDENTIALS');
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, getPasswordHash(user));
    if (!passwordOk) {
      console.info('auth.login_failed', { email: parsed.data.email, reason: 'bad_password' });
      return fail(res, 401, GENERIC_LOGIN_ERROR, 'INVALID_CREDENTIALS');
    }

    if (!user.email_verified_at) {
      return fail(res, 403, 'Please verify your email before logging in.', 'EMAIL_NOT_VERIFIED');
    }

    const session = await issueSession(pool, res, user.ID, req);
    await pool.query(`UPDATE ${TABLES.users} SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [user.ID]);
    console.info('auth.login_success', { userId: user.ID });
    return ok(res, 'Login successful', {
      user: safeUser(user),
      accessToken: session.accessToken,
      refreshExpiresAt: session.expiresAt,
    }, 'LOGIN_SUCCESS');
  } catch (error) {
    console.error('auth.login_error', { error: error.message });
    return fail(res, 500, 'Login failed', 'LOGIN_FAILED');
  }
});

router.post('/refresh-token', refreshLimiter, async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return fail(res, 401, 'Refresh token required', 'REFRESH_REQUIRED');

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
      return fail(res, 401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (stored.revoked_at) {
      await client.query(`UPDATE ${TABLES.refreshTokens} SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [stored.user_id]);
      await client.query('COMMIT');
      clearAuthCookies(res);
      console.warn('auth.refresh_reuse_detected', { userId: stored.user_id });
      return fail(res, 401, 'Invalid refresh token', 'REFRESH_REUSE_DETECTED');
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
    console.error('auth.refresh_failed', { error: error.message });
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
  if (parsed.error) return ok(res, GENERIC_RESET_MESSAGE, null, 'RESET_REQUEST_ACCEPTED');

  try {
    const user = await findUserByEmail(parsed.data.email);
    if (user) {
      const rawToken = generateRawToken(32);
      await pool.query(
        `INSERT INTO ${TABLES.passwordResets} (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.ID, hashToken(rawToken), new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000)]
      );
      await sendPasswordResetEmail({
        email: user.email_original || user.email,
        name: user.name || user.firstName || 'there',
        token: rawToken,
      });
    }
    console.info('auth.password_reset_requested', { email: parsed.data.email });
    return ok(res, GENERIC_RESET_MESSAGE, null, 'RESET_REQUEST_ACCEPTED');
  } catch (error) {
    console.error('auth.forgot_failed', { error: error.message });
    return ok(res, GENERIC_RESET_MESSAGE, null, 'RESET_REQUEST_ACCEPTED');
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
    const tokenResult = await client.query(
      `SELECT prt.*, u.email_original, u.email, u.name, u.first_name AS "firstName"
       FROM ${TABLES.passwordResets} prt
       JOIN ${TABLES.users} u ON u.id = prt.user_id
       WHERE prt.token_hash = $1 FOR UPDATE`,
      [hashToken(parsed.data.token)]
    );
    const token = tokenResult.rows[0];

    if (!token || token.used_at || new Date(token.expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      return fail(res, 400, 'Invalid or expired reset link', 'INVALID_RESET_TOKEN');
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
    console.error('auth.reset_failed', { error: error.message });
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
    console.error('auth.change_password_failed', { error: error.message });
    return fail(res, 500, 'Password change failed', 'CHANGE_PASSWORD_FAILED');
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${USER_SELECT} FROM ${TABLES.users}
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

router.post('/cleanup-expired', authRequired, async (req, res) => {
  await pool.query(`DELETE FROM ${TABLES.emailVerifications} WHERE verification_expires_at <= NOW()`);
  await pool.query(`DELETE FROM ${TABLES.passwordResets} WHERE expires_at <= NOW() OR used_at IS NOT NULL`);
  return ok(res, 'Expired auth records cleaned up', null, 'CLEANUP_DONE');
});

module.exports = router;
module.exports.authRequired = authRequired;
