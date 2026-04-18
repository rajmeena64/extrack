const corsMiddleware = (req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    const requestOrigin = req.headers.origin;

    if (requestOrigin) {
        if (!allowedOrigins.includes(requestOrigin)) {
            return res.status(403).json({
                success: false,
                error: 'Origin not allowed',
            });
        }

        res.header('Access-Control-Allow-Origin', requestOrigin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Ingest-Secret');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
};

module.exports = corsMiddleware;
