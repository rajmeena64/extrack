const corsMiddleware = (req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
    const requestOrigin = req.headers.origin;

    if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        res.header('Access-Control-Allow-Origin', requestOrigin || allowedOrigins[0] || '*');
    }
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true'); // ← ye important hai
    res.header('Vary', 'Origin');

    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
};

module.exports = corsMiddleware;




// const corsMiddleware = (req, res, next) => {
//     const allowedOrigins = [
//         "http://localhost:3000",
//         "http://10.203.185.251:3000"
//     ];

//     const origin = req.headers.origin;

//     if (allowedOrigins.includes(origin)) {
//         res.header('Access-Control-Allow-Origin', origin);
//     }

//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Credentials', 'true');

//     if (req.method === 'OPTIONS') return res.sendStatus(200);
//     next();
// };

// module.exports = corsMiddleware; // 👈 ye missing tha
