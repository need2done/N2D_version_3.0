const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set before server start!');
}

function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Generate a JWT token using HMAC SHA-256
 */
function generateToken(payload, expiresInSeconds = 86400) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify a JWT token
 */
function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    try {
        const sigBuf = Buffer.from(signature);
        const expSigBuf = Buffer.from(expectedSignature);
        if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
            return null;
        }
    } catch (e) {
        return null;
    }

    try {
        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null; // Expired
        }
        return payload;
    } catch (e) {
        return null;
    }
}

/**
 * Express Middleware: Authenticate Admin Token
 */
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
        token = req.cookies.admin_token;
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing authentication token' });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired admin token' });
    }

    req.user = payload;
    next();
}

/**
 * Express Middleware: Authenticate Any Valid User/Helper/Admin Token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
    }

    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    }

    req.user = payload;
    next();
}

/**
 * Express Middleware: Authenticate Internal Bot Service or Valid Token
 */
function authenticateInternalOrToken(req, res, next) {
    const internalSecret = process.env.INTERNAL_SECRET;
    const providedSecret = req.headers['x-internal-secret'];

    if (internalSecret && providedSecret === internalSecret) {
        req.isBot = true;
        return next();
    }

    // Otherwise check JWT token
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
        token = req.cookies.admin_token;
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    }

    req.user = payload;
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authenticateAdmin,
    authenticateToken,
    authenticateInternalOrToken
};
