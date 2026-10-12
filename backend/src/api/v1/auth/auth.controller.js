const jwt = require('jsonwebtoken');
const authService = require('../../../domains/auth/auth.service');
const env = require('../../../core/config/env');

const authController = {
  async signup(req, res, next) {
    try {
      const result = await authService.signup(req.body, req, res);
      res.status(201).json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, req, res);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.userId);
      res.json({ success: true, user });
    } catch (err) { next(err); }
  },

  async logout(req, res, next) {
    try {
      await authService.logout(req, res);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) { next(err); }
  },

  async refreshToken(req, res, next) {
    try {
      const result = await authService.refreshToken(req, res);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async changePassword(req, res, next) {
    try {
      await authService.changePassword(req.userId, req.body);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) { next(err); }
  },

  async updateProfile(req, res, next) {
    try {
      const user = await authService.updateProfile(req.userId, req.body);
      res.json({ success: true, user, message: 'Profile updated!' });
    } catch (err) { next(err); }
  },

  async deleteAccount(req, res, next) {
    try {
      await authService.deleteAccount(req.userId, req.body.password, res);
      res.json({ success: true, message: 'Account deleted successfully.' });
    } catch (err) { next(err); }
  },

  getWsToken(req, res) {
    const token = jwt.sign(
      { userId: req.userId, purpose: 'websocket' },
      env.jwt.accessSecret,
      { expiresIn: '60s' }
    );
    res.json({ success: true, token });
  }
};

module.exports = authController;
