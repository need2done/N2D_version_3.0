const express = require('express');
const router = express.Router();
const { generateToken } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login
// Secure authentication for admin dashboard
router.post('/login', loginRateLimiter, (req, res) => {
    const { username, password } = req.body;

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
        console.error('CRITICAL: ADMIN_USERNAME or ADMIN_PASSWORD is not set in environment variables.');
        return res.status(500).json({ success: false, error: 'Authentication service misconfigured' });
    }

    if (username === adminUsername && password === adminPassword) {
        const token = generateToken({ username: adminUsername, role: 'admin' }, 86400); // 24h token
        return res.json({ 
            success: true, 
            token,
            user: { username: adminUsername, role: 'admin' }
        });
    }

    return res.status(401).json({ success: false, error: 'Invalid username or password' });
});

module.exports = router;

