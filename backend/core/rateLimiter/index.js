const buckets = new Map();

function normalizeWindowMs(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeMax(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanupBucket(key, now) {
    const bucket = buckets.get(key);
    if (!bucket) return null;

    if (bucket.expiresAt <= now) {
        buckets.delete(key);
        return null;
    }

    return bucket;
}

function createRateLimiter(options = {}) {
    const windowMs = normalizeWindowMs(options.windowMs, 15 * 60 * 1000);
    const max = normalizeMax(options.max, 5);
    const keyGenerator = typeof options.keyGenerator === 'function'
        ? options.keyGenerator
        : (req) => req.ip || req.socket?.remoteAddress || 'unknown';
    const message = options.message || 'Too many requests. Please try again later.';

    return (req, res, next) => {
        const now = Date.now();
        const baseKey = keyGenerator(req) || 'unknown';
        const key = `${req.path}:${baseKey}`;

        let bucket = cleanupBucket(key, now);

        if (!bucket) {
            bucket = {
                count: 0,
                expiresAt: now + windowMs,
            };
            buckets.set(key, bucket);
        }

        bucket.count += 1;

        if (bucket.count > max) {
            const retryAfterSeconds = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
            res.set('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
                success: false,
                error: message,
                retryAfter: retryAfterSeconds,
            });
        }

        next();
    };
}

module.exports = {
    createRateLimiter,
};
