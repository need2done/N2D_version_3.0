/**
 * In-memory Rate Limiter Middleware
 */

function createRateLimiter(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    const max = options.max || 100; // max requests per windowMs
    const message = options.message || 'Too many requests, please try again later.';
    
    const requests = new Map();

    // Periodic cleanup every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of requests.entries()) {
            const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
            if (validTimestamps.length === 0) {
                requests.delete(ip);
            } else {
                requests.set(ip, validTimestamps);
            }
        }
    }, 5 * 60 * 1000).unref();

    return function rateLimiter(req, res, next) {
        // Express req.ip handles trust proxy safely without header spoofing
        const ip = req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
        const now = Date.now();


        let timestamps = requests.get(ip) || [];
        timestamps = timestamps.filter(ts => now - ts < windowMs);

        if (timestamps.length >= max) {
            return res.status(429).json({
                success: false,
                error: message
            });
        }

        timestamps.push(now);
        requests.set(ip, timestamps);
        next();
    };
}

const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please try again after 15 minutes.'
});

const otpRateLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Too many OTP requests. Please try again after 10 minutes.'
});

const apiRateLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000,
    max: 120,
    message: 'Too many requests. Please slow down.'
});

module.exports = {
    createRateLimiter,
    loginRateLimiter,
    otpRateLimiter,
    apiRateLimiter
};
