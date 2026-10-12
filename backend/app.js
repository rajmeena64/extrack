const express = require('express');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { performance } = require('perf_hooks');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const Sentry = require('@sentry/node');
const { errorMiddleware, publicError, safeResponseMiddleware, sanitizeError } = require('./core/errors/safeErrors');
const pool = require('./infra/db/supabase');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

const app = express();
app.use(safeResponseMiddleware);
const missingEnv = [];

/* =======================
   ENV CHECK
======================= */
if (!process.env.JWT_ACCESS_SECRET && !process.env.JWT_SECRET) {
  missingEnv.push('JWT_ACCESS_SECRET or JWT_SECRET');
}

if (!process.env.JWT_REFRESH_SECRET) {
  missingEnv.push('JWT_REFRESH_SECRET');
}

if (process.env.NODE_ENV === 'production') {
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    missingEnv.push('remove backend .env files from production deploy and use platform-managed secrets');
  }

  if (!process.env.MT5_INGEST_SECRET && !process.env.TRADE_INGEST_SECRET) {
    missingEnv.push('MT5_INGEST_SECRET or TRADE_INGEST_SECRET');
  }

  if (!process.env.ALLOWED_ORIGINS && !process.env.FRONTEND_URL) {
    missingEnv.push('ALLOWED_ORIGINS or FRONTEND_URL');
  }

  // if (String(process.env.DB_SSL_ENABLED || 'true') === 'true'
  //   && String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true') !== 'true') {
  //   missingEnv.push('DB_SSL_REJECT_UNAUTHORIZED=false');
  // }
  if (
      String(process.env.DB_SSL_ENABLED || 'true') === 'true' &&
      process.env.DB_SSL_REJECT_UNAUTHORIZED === undefined
    ) {
      missingEnv.push('DB_SSL_REJECT_UNAUTHORIZED');
    }
}

if (missingEnv.length > 0) {
  console.error('startup.missing_env', { missingEnv });
  process.exit(1);
}

/* =======================
   MIDDLEWARES
======================= */
const corsMiddleware = require('./api/middleware/cors');

const cookieParser = require('cookie-parser');
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));


function isTrustedOrigin(req) {
  const origin = corsMiddleware.normalizeOrigin(req.headers.origin);
  if (!origin) return true;
  return corsMiddleware.isAllowedOrigin(origin);
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https:",
      "script-src 'self' https://www.tradays.com",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' http: https: ws: wss:",
    ].join('; ')
  );

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
});

app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  if (!isTrustedOrigin(req)) {
    return publicError(res, {
      status: 403,
      code: 'FORBIDDEN',
      message: "You don't have permission to perform this action.",
      req,
    });
  }

  next();
});

/* =======================
   ROUTES
======================= */
const wsBroadcast = require('./core/websocket/wsBroadcast');
const {
  routes,
  tradeRoutes,
  settingsRoutes,
  registerCtraderRoutes,
  ensureCtraderTokenStore,
} = require('./api/routes');
const { refreshInstrumentCache } = require('./instruments/instrumentRegistry');
const redis = require('./infra/db/redis');

// **sab API routes pe automatically apply**
app.use(wsBroadcast);

for (const [routePath, router] of routes) app.use(routePath, router);


app.use(express.static(path.join(__dirname, '../js')));



/* =======================
   HEALTH CHECK
======================= */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running!',
  });
});

registerCtraderRoutes(app);
Sentry.setupExpressErrorHandler(app);
app.use(errorMiddleware);

/* =======================
   HTTP SERVER
======================= */
const server = http.createServer(app);

/* =======================
   WEBSOCKET SERVER
======================= */
const wss = new WebSocket.Server({ noServer: true });
const {
  attachDatafeedStream,
  stopDatafeedStream,
} = require('./integrations/datafeed/datafeed');
const brokerRegistry = require('./brokers/connectors/registry');

// make wss available in all routes
app.set('wss', wss);
attachDatafeedStream(wss);

wss.on('connection', (ws, req, userId) => {
  ws.userId = userId;
  ws.isAlive = true;
  brokerRegistry.sendAllSnapshots(userId);
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  ws.on('close', () => {});
  ws.on('message', (message) => {
    if (Buffer.byteLength(message) > 2048) {
      ws.close(1009, 'Message too large');
    }
  });
});

server.on('upgrade', (req, socket, head) => {
  const origin = corsMiddleware.normalizeOrigin(req.headers.origin);
  if (origin && !corsMiddleware.isAllowedOrigin(origin)) {
    socket.destroy();
    return;
  }

  const cookies = Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');
        return separatorIndex === -1
          ? [part, '']
          : [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)];
      })
  );

  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const queryToken = requestUrl.searchParams.get('token');
    const accessToken = queryToken || decodeURIComponent(cookies.accessToken || '');
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);

    if (queryToken && decoded.purpose !== 'websocket') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, decoded.userId);
    });
  } catch {
    socket.destroy();
  }
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000).unref();

function stopStreams() {
  stopMarketStreamRelay();
  brokerRegistry.stopAllLiveSync();
}

process.once('SIGTERM', stopStreams);
process.once('SIGINT', stopStreams);

/* =======================
   START SERVER
======================= */
const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await pool.warmPool();
    await Promise.all([
      typeof tradeRoutes.ensureApiTradeMetadataColumns === 'function' ? tradeRoutes.ensureApiTradeMetadataColumns() : null,
      typeof ensureCtraderTokenStore === 'function' ? ensureCtraderTokenStore() : null,
      typeof settingsRoutes.ensureUserSettingsTable === 'function' ? settingsRoutes.ensureUserSettingsTable() : null,
      refreshInstrumentCache({ force: true }).catch(() => null),
      redis.ping().catch(() => null),
    ]);
    brokerRegistry.startAllLiveSync(wss);
  } catch (error) {
    console.error('startup.ensure_failed', { error: sanitizeError(error) });
    process.exit(1);
  }
  server.listen(PORT, () => console.log(`server is strated on port ${PORT}`));
}

startServer();

