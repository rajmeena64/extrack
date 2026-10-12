const crypto = require('crypto');
const Layer = require('express/lib/router/layer');

const SAFE_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid credentials.',
  SESSION_EXPIRED: 'Session expired. Please sign in again.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission to perform this action.",
  VALIDATION_FAILED: 'Please check the details and try again.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again.',
  MARKET_DATA_UNAVAILABLE: 'Unable to load market data right now.',
  CHART_DATA_UNAVAILABLE: 'Chart data is temporarily unavailable. Please try again.',
  LIVE_FEED_UNAVAILABLE: 'Live prices are temporarily unavailable.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
};

const SENSITIVE_KEY_PATTERN = /(password|token|authorization|api[-_ ]?key|secret|cookie|credential|database_url|db_url|connectionstring|accesskey|refresh)/i;

class AppError extends Error {
  constructor(message, status = 400, code = 'VALIDATION_FAILED') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.isCustom = true;
  }
}

function getRequestId(req) {
  const existing = req?.headers?.['x-request-id'];
  return typeof existing === 'string' && existing.trim()
    ? existing.trim().slice(0, 128)
    : crypto.randomUUID();
}

function redactValue(key, value, depth = 0) {
  if (SENSITIVE_KEY_PATTERN.test(String(key || ''))) return '[REDACTED]';
  if (depth > 4) return '[TRUNCATED]';
  if (value instanceof Error) return sanitizeError(value);
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => redactValue(key, item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryKey, entryValue, depth + 1),
      ])
    );
  }
  if (typeof value === 'string' && value.length > 512) return `${value.slice(0, 512)}...`;
  return value;
}

function sanitizeError(error) {
  if (!error) return null;
  const { status, statusCode } = error;
  return {
    name: error.name,
    message: typeof error.message === 'string' ? error.message.slice(0, 512) : String(error).slice(0, 512),
    code: error.code,
    status: status ?? statusCode,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
}

function logInternalError(req, error, message = 'Internal request failed', extra = {}) {
  const requestId = req?.requestId || getRequestId(req);
  if (req) req.requestId = requestId;
  console.error(message, redactValue('log', {
    requestId,
    route: req?.originalUrl,
    method: req?.method,
    userId: req?.userId || null,
    error: sanitizeError(error),
    ...extra,
  }));
  return requestId;
}

function publicError(res, {
  status = 500,
  code = 'INTERNAL_ERROR',
  message,
  req,
  error,
  logMessage,
  extra,
} = {}) {
  const safeCode = SAFE_ERRORS[code] ? code : 'INTERNAL_ERROR';
  const safeMessage = message || SAFE_ERRORS[safeCode] || SAFE_ERRORS.INTERNAL_ERROR;
  const requestId = req ? (req.requestId || getRequestId(req)) : undefined;
  if (req) req.requestId = requestId;
  if (error && req) logInternalError(req, error, logMessage, extra);
  return res.status(status).json({
    success: false,
    code: safeCode,
    message: safeMessage,
    error: safeMessage,
    ...(requestId ? { requestId } : {}),
  });
}

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err?.isCustom) {
    return res.status(err.status || 400).json({
      success: false,
      error: err.message,
      message: err.message,
      code: err.code || 'VALIDATION_FAILED',
      requestId: req?.requestId || getRequestId(req),
    });
  }
  const requestId = logInternalError(req, err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: SAFE_ERRORS.INTERNAL_ERROR,
    error: SAFE_ERRORS.INTERNAL_ERROR,
    requestId,
  });
}

function safeResponseMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (data && typeof data === 'object') {
      if (data.error instanceof Error) {
        if (!data.error.isCustom) {
          logInternalError(req, data.error);
          data.error = SAFE_ERRORS.INTERNAL_ERROR;
          data.message = SAFE_ERRORS.INTERNAL_ERROR;
          data.code = 'INTERNAL_ERROR';
          res.statusCode = 500;
        } else {
          data.error = data.error.message;
        }
      }
      if (res.statusCode >= 500 && !data.code && (!data.error || data.error !== SAFE_ERRORS.INTERNAL_ERROR)) {
        logInternalError(req, data.error || data);
        data.error = SAFE_ERRORS.INTERNAL_ERROR;
        data.message = SAFE_ERRORS.INTERNAL_ERROR;
        data.code = 'INTERNAL_ERROR';
      }
    }
    return originalJson(data);
  };
  next();
}

const originalHandleRequest = Layer.prototype.handle_request;
Layer.prototype.handle_request = function (req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) return originalHandleRequest.call(this, req, res, next);
  try {
    const result = fn.call(this, req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  AppError,
  SAFE_ERRORS,
  errorMiddleware,
  safeResponseMiddleware,
  getRequestId,
  logInternalError,
  publicError,
  redactValue,
  sanitizeError,
};
