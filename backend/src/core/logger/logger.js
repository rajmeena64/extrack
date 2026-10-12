const { getContext } = require('./requestContext');

function log(level, message, meta = {}) {
  const context = getContext();
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context.traceId && { traceId: context.traceId }),
    ...(context.userId && { userId: context.userId }),
    ...meta
  };
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') log('debug', msg, meta);
  }
};
