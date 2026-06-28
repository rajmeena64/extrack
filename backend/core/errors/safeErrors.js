const crypto = require('crypto');

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
  return {
    name: error.name,
    message: typeof error.message === 'string' ? error.message.slice(0, 512) : String(error).slice(0, 512),
    code: error.code,
    status: error.status || error.statusCode,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
}

function logInternalError(req, error, message = 'Internal request failed', extra = {}) {
  const requestId = req.requestId || getRequestId(req);
  req.requestId = requestId;
  console.error(message, redactValue('log', {
    requestId,
    route: req.originalUrl || req.url,
    method: req.method,
    userId: req.userId || req.user?.id || req.user?.ID,
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
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const code = status === 401
    ? 'AUTH_REQUIRED'
    : status === 403
      ? 'FORBIDDEN'
      : status === 429
        ? 'RATE_LIMITED'
        : status >= 500
          ? 'INTERNAL_ERROR'
          : 'VALIDATION_FAILED';
  return publicError(res, {
    status,
    code,
    req,
    error: err,
  });
}

module.exports = {
  SAFE_ERRORS,
  errorMiddleware,
  getRequestId,
  logInternalError,
  publicError,
  redactValue,
  sanitizeError,
};
