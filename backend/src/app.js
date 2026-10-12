const express = require('express');
const cookieParser = require('cookie-parser');
const Sentry = require('@sentry/node');
const env = require('./core/config/env');
const traceMiddleware = require('./api/middleware/trace.middleware');
const { corsMiddleware } = require('./api/middleware/cors.middleware');
const errorHandler = require('./core/errors/errorHandler');
const apiRouter = require('./api');

if (env.sentryDsn) {
  Sentry.init({ dsn: env.sentryDsn, environment: env.env });
}

const app = express();

app.use(traceMiddleware);
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Frame-Options', 'DENY');
  if (env.isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

app.use('/api', apiRouter);

if (env.sentryDsn) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(errorHandler);

module.exports = app;
