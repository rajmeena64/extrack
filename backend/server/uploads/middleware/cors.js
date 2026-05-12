const corsMiddleware = (req, res, next) => {
    const devOrigins = process.env.NODE_ENV === 'production'
        ? []
        : [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5174',
        ];
    const allowedOrigins = [process.env.ALLOWED_ORIGINS, process.env.FRONTEND_URL, ...devOrigins]
        .filter(Boolean)
        .flatMap((value) => String(value).split(','))
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
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
};

module.exports = corsMiddleware;
