const express = require('express');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const app = express();
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
    missingEnv.push('remove backend/server/.env from production deploy and use platform-managed secrets');
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
  process.exit(1);
}

/* =======================
   MIDDLEWARES
======================= */
const corsMiddleware = require('./uploads/middleware/cors');

const cookieParser = require('cookie-parser');
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

/* =======================
   ROUTES
======================= */
const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trade');
const screenshotRoutes = require('./routes/screenshot');
const analyticsRoutes = require('./routes/analytics');
const passwordRoutes = require('./routes/password');
const mt5Routes = require('./routes/mt5');
const metaRoutes = require('./routes/meta');
const wsBroadcast = require('./uploads/middleware/ws-broadcast');
const settingsRoutes = require('./routes/settings');

const apiRoutes = require('./routes/Api');

const binanceRoutes = require('./routes/binance');

const { registerCtraderRoutes, ensureCtraderTokenStore } = require('./routes/ctrader');


// **sab API routes pe automatically apply**
app.use(wsBroadcast);

app.use('/api', authRoutes);
app.use('/api', tradeRoutes);
app.use('/api', screenshotRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', passwordRoutes);
app.use('/api', mt5Routes);
app.use('/api', metaRoutes);
app.use('/api', settingsRoutes);
app.use('/api', binanceRoutes);
app.use('/api', apiRoutes);



app.use(express.static(path.join(__dirname, '../../js')));



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
/* =======================
   HTTP SERVER
======================= */
const server = http.createServer(app);

/* =======================
   WEBSOCKET SERVER
======================= */
const wss = new WebSocket.Server({ server });

// make wss available in all routes
app.set('wss', wss);

wss.on('connection', (ws) => {
  ws.on('close', () => {});
  ws.on('message', () => {});
});

/* =======================
   START SERVER
======================= */
const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    if (typeof tradeRoutes.ensureApiTradeMetadataColumns === 'function') {
      await tradeRoutes.ensureApiTradeMetadataColumns();
    }

    if (typeof ensureCtraderTokenStore === 'function') {
      await ensureCtraderTokenStore();
    }
  } catch {
    process.exit(1);
  }

  server.listen(PORT);
}

startServer();



