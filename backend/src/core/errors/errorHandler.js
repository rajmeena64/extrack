const Sentry = require('@sentry/node');
const logger = require('../logger/logger');
const AppError = require('./AppError');

function errorHandler(err, req, res, next) {
  const isAppError = err instanceof AppError;
  const status = isAppError ? err.statusCode : (err.status || 500);
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = (isAppError || process.env.NODE_ENV !== 'production') 
    ? err.message 
    : 'Something went wrong. Please try again later.';

  logger.error('request.failed', {
    code,
    status,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  if (!isAppError && status >= 500 && process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details && { details: err.details })
    }
  });
}

module.exports = errorHandler;
