const corsMiddleware = (req, res, next) => {
    const allowedOrigin ='http://localhost:3000'; // React app ka URL
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true'); // ← ye important hai

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