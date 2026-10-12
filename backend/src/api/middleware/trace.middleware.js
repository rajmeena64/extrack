const crypto = require('crypto');
const { runWithContext } = require('../../core/logger/requestContext');

function traceMiddleware(req, res, next) {
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  res.setHeader('x-trace-id', traceId);
  req.traceId = traceId;

  const context = {
    traceId,
    startTime: Date.now()
  };

  runWithContext(context, () => next());
}

module.exports = traceMiddleware;
