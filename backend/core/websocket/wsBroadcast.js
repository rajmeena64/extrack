module.exports = function wsBroadcast(req, res, next) {
  if (req.originalUrl.includes('.') || req.originalUrl === '/') {
    return next();
  }

  res.on('finish', () => {
    const wss = req.app.get('wss');
    if (!wss) return;

    const isMutatingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const isTradeMutation =
      req.originalUrl.includes('trade') ||
      req.originalUrl.includes('api') ||
      req.originalUrl.includes('mt5');
    const shouldBroadcast = Boolean(req.broadcastUserIds) || (isMutatingRequest && isTradeMutation);

    if (shouldBroadcast) {
      const targetUserIds = new Set(
        []
          .concat(req.broadcastUserIds || [])
          .concat(req.userId || [])
          .filter(Boolean)
          .map((value) => String(value))
      );

      if (targetUserIds.size === 0) return;

      wss.clients.forEach(client => {
        if (client.readyState === 1 && targetUserIds.has(String(client.userId))) {
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
