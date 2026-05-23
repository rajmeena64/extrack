const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const appOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://entrack.in',
        'https://www.entrack.in',
    ]
    : [];

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

const getAllowedOrigins = () => [process.env.ALLOWED_ORIGINS, process.env.FRONTEND_URL, ...appOrigins, ...devOrigins]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map(normalizeOrigin)
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) return false;
    return getAllowedOrigins().includes(normalizedOrigin);
};

const corsMiddleware = (req, res, next) => {
    const requestOrigin = normalizeOrigin(req.headers.origin);

    if (requestOrigin) {
        if (!isAllowedOrigin(requestOrigin)) {
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
module.exports.getAllowedOrigins = getAllowedOrigins;
module.exports.isAllowedOrigin = isAllowedOrigin;
module.exports.normalizeOrigin = normalizeOrigin;
