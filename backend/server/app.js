const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
require('dotenv').config();

const app = express();

/* =======================
   ENV CHECK
======================= */
if (!process.env.JWT_SECRET) {
  // console.error("❌ FATAL: JWT_SECRET missing in environment");
  process.exit(1);
}

/* =======================
   MIDDLEWARES
======================= */
const corsMiddleware = require('./uploads/middleware/cors');

const cookieParser = require('cookie-parser');
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());

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

// const apiRoutes = require('./routes/Api');

const binanceRoutes = require('./routes/binance');

const { registerCtraderRoutes } = require('./routes/ctrader');


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

// app.use('/api', apiRoutes);


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
  // console.log('🟢 WebSocket client connected');

  ws.on('close', () => {
    // console.log('🔴 WebSocket client disconnected');
  });

  ws.on('message', (msg) => {
    // console.log('📩 WS message:', msg.toString());
  });
});

/* =======================
   START SERVER
======================= */
server.listen(5000, () => {
  console.log('🚀 Backend (REST + WebSocket) running on http://localhost:5000');
});


