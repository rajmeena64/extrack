const crypto = require('crypto');

function secretsMatch(providedSecret, expectedSecret) {
    if (!providedSecret || !expectedSecret) return false;

    const providedBuffer = Buffer.from(String(providedSecret));
    const expectedBuffer = Buffer.from(String(expectedSecret));

    if (providedBuffer.length !== expectedBuffer.length) return false;

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function isHash(value) {
    return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function getIngestSecret() {
    return process.env.TRADE_INGEST_SECRET || process.env.MT5_INGEST_SECRET || '';
}

function requireIngestSecret(req, res, next) {
    const expectedSecret = getIngestSecret();
    const providedSecret = req.headers['x-ingest-secret'];

    if (!expectedSecret) {
        return res.status(503).json({
            success: false,
            error: 'Trade ingest is not configured',
        });
    }

    if (!secretsMatch(providedSecret, expectedSecret)) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized ingest request',
        });
    }

    next();
}

module.exports = {
    getIngestSecret,
    hashToken,
    isHash,
    requireIngestSecret,
    secretsMatch,
};
