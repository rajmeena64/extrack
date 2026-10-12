function normalizeOrigin(origin) {
  if (!origin || typeof origin !== 'string') return null;
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

function getAllowedOrigins() {
  const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => normalizeOrigin(s))
    .filter(Boolean);
  return new Set(envOrigins);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const allowed = getAllowedOrigins();
  if (allowed.size === 0) return true;
  return allowed.has(normalizeOrigin(origin));
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-trace-id');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

module.exports = {
  corsMiddleware,
  isAllowedOrigin,
  normalizeOrigin
};
