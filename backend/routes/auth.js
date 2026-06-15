const express = require('express');
const router = express.Router();

// POST /api/auth/login
// Basic authentication for admin dashboard
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
        console.error('Admin credentials not configured in environment variables.');
        return res.status(500).json({ success: false, error: 'Server misconfiguration' });
    }

    if (username === adminUsername && password === adminPassword) {
        // In a production app, we would return a signed JWT token here.
        // For simple admin dashboard access, returning a hardcoded token flag is sufficient for now,
        // or a simple dummy token that the frontend checks.
        return res.json({ 
            success: true, 
            token: 'N2D_ADMIN_TOKEN_SECURE_2026',
            user: { username: adminUsername, role: 'admin' }
        });
    }

    return res.status(401).json({ success: false, error: 'Invalid username or password' });
});

module.exports = router;
