const express = require('express');
const router = express.Router();
const { generateToken } = require('../../../../../backend/middleware/auth');
const { loginRateLimiter } = require('../../../../../backend/middleware/rateLimiter');

router.post('/login', loginRateLimiter, (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminUsername || !adminPassword) {
    return res.status(500).json({ success: false, message: 'Admin authentication misconfigured' });
  }

  if (username === adminUsername && password === adminPassword) {
    const token = generateToken({ username: adminUsername, role: 'admin' }, 86400);
    res.json({
      success: true,
      token,
      message: 'Login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

module.exports = router;

