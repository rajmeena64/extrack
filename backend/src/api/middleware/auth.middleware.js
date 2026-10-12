const jwt = require('jsonwebtoken');
const AppError = require('../../core/errors/AppError');
const env = require('../../core/config/env');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = req.cookies ? req.cookies.accessToken : null;
  const token = bearerToken || cookieToken;

  if (!token) {
    return next(AppError.unauthorized('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    req.user = decoded;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Token expired', 'TOKEN_EXPIRED'));
    }
    return next(AppError.unauthorized('Invalid authentication token', 'TOKEN_INVALID'));
  }
}

module.exports = authMiddleware;
