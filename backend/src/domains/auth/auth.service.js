const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const AppError = require('../../core/errors/AppError');
const env = require('../../core/config/env');
const { hashToken } = require('../../core/utils/security');

const BCRYPT_ROUNDS = 10;
const REFRESH_DAYS = 30;

function formatUser(user) {
  if (!user) return null;
  return {
    ID: user.ID,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    accountType: user.accountType,
    preferred_currency: user.preferred_currency,
    profilePicture: user.profile_picture,
    authProvider: user.auth_provider,
    createdAt: user.createdAt
  };
}

function getCookieConfig(maxAgeMs, path = '/') {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path,
    maxAge: maxAgeMs
  };
}

const authService = {
  signAccessToken(userId) {
    return jwt.sign(
      { userId, sub: String(userId) },
      env.jwt.accessSecret,
      { expiresIn: env.jwt.expiresIn }
    );
  },

  async createSession(user, req, res) {
    const userId = user.ID;
    const accessToken = this.signAccessToken(userId);
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

    await authRepository.saveRefreshToken({
      userId,
      tokenHash,
      token: refreshToken,
      expiresAt,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    res.cookie('accessToken', accessToken, getCookieConfig(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, getCookieConfig(REFRESH_DAYS * 24 * 60 * 60 * 1000, '/api/auth'));

    return { user: formatUser(user), accessToken, refreshToken };
  },

  clearSession(res) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.clearCookie('refreshToken', { path: '/' });
  },

  async signup(data, req, res) {
    const existing = await authRepository.findByEmailOrPhone(data.email);
    if (existing) {
      throw AppError.badRequest('An account with this email already exists', 'USER_EXISTS');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const newUser = await authRepository.createUser({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      preferredCurrency: data.preferred_currency
    });

    return this.createSession(newUser, req, res);
  },

  async login(identifier, password, req, res) {
    const user = await authRepository.findByEmailOrPhone(identifier);
    if (!user) {
      throw AppError.unauthorized('Invalid credentials.', 'INVALID_CREDENTIALS');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw AppError.unauthorized('Invalid credentials.', 'INVALID_CREDENTIALS');
    }

    return this.createSession(user, req, res);
  },

  async refreshToken(req, res) {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw AppError.unauthorized('Refresh token required');

    const tokenHash = hashToken(token);
    const session = await authRepository.findRefreshToken(tokenHash);
    if (!session) throw AppError.unauthorized('Invalid or expired refresh token');

    const user = await authRepository.findById(session.user_id);
    if (!user) throw AppError.unauthorized('User not found');

    await authRepository.deleteRefreshToken(tokenHash);
    return this.createSession(user, req, res);
  },

  async logout(req, res) {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      await authRepository.deleteRefreshToken(hashToken(token)).catch(() => null);
    }
    this.clearSession(res);
  },

  async getMe(userId) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    return formatUser(user);
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw AppError.badRequest('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await authRepository.updatePassword(userId, newHash);
    await authRepository.deleteAllUserRefreshTokens(userId);
  },

  async updateProfile(userId, data) {
    let passwordHash = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    const updated = await authRepository.updateProfile(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      preferredCurrency: data.preferred_currency
    });

    if (!updated) throw AppError.notFound('User not found');
    return formatUser(updated);
  },

  async deleteAccount(userId, password, res) {
    const user = await authRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw AppError.unauthorized('Invalid credentials.');

    await authRepository.softDeleteUser(userId);
    this.clearSession(res);
  }
};

module.exports = authService;
