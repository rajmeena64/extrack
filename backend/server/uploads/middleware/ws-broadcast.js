module.exports = function wsBroadcast(req, res, next) {
  if (req.originalUrl.includes('.') || req.originalUrl === '/') {
    return next();
  }

  res.on('finish', () => {
    const wss = req.app.get('wss');
    if (!wss) return;

    // ✅ PURE TRADE ROUTES (tumhare actual paths ke hisaab se)
    if (req.originalUrl.includes('trade')) {
      // console.log("🔥 BROADCASTING:", req.originalUrl);

      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'TRADE_UPDATED',
            route: req.originalUrl
          }));
        }
      });
    }
  });

  next();
};    