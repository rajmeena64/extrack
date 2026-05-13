module.exports = function wsBroadcast(req, res, next) {
  if (req.originalUrl.includes('.') || req.originalUrl === '/') {
    return next();
  }

  res.on('finish', () => {
    const wss = req.app.get('wss');
    if (!wss) return;

    if (req.originalUrl.includes('trade')) {
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
