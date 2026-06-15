const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ==========================================
// GET /api/helpers — List all active helpers
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT h.id, h.name, h.phone, h.helper_code, h.status, h.category, h.active,
                   hs.latitude, hs.longitude, hs.last_seen
            FROM helpers h
            LEFT JOIN helper_status hs ON h.id = hs.helper_id
            WHERE h.active = 1
        `);
        res.json({ success: true, helpers: rows });
    } catch (err) {
        console.error('Error fetching helpers:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/helpers — Register a new helper
// Body: { name, phone, helper_code }
// ==========================================
router.post('/', async (req, res) => {
    try {
        const { name, phone, helper_code } = req.body;

        const [result] = await db.query(
            'INSERT INTO helpers (name, phone, helper_code, status, active) VALUES (?, ?, ?, "OFFLINE", 1)',
            [name, phone, helper_code || `N2D-${Date.now().toString().slice(-4)}`]
        );
        const helperId = result.insertId;

        // Initialize helper status
        await db.query('INSERT INTO helper_status (helper_id, status) VALUES (?, "UNAVAILABLE")', [helperId]);

        res.json({ success: true, helper_id: helperId });
    } catch (err) {
        console.error('Error creating helper:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/helpers/:id/status — Toggle ONLINE/OFFLINE
// Body: { status: "ONLINE" | "OFFLINE" | "BUSY" }
// ==========================================
router.post('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.query('UPDATE helpers SET status = ? WHERE id = ?', [status, req.params.id]);
        
        // Also update helper_status availability
        const availability = status === 'ONLINE' ? 'AVAILABLE' : 'UNAVAILABLE';
        await db.query('UPDATE helper_status SET status = ? WHERE helper_id = ?', [availability, req.params.id]);

        res.json({ success: true, message: `Helper is now ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// PATCH /api/helpers/:id/category — Update Category
// Body: { category: "TASK" | "RIDE" | "BOTH" }
// ==========================================
router.patch('/:id/category', async (req, res) => {
    try {
        const { category } = req.body;
        if (!['TASK', 'RIDE', 'BOTH'].includes(category)) {
            return res.status(400).json({ success: false, error: 'Invalid category' });
        }
        await db.query('UPDATE helpers SET category = ? WHERE id = ?', [category, req.params.id]);
        res.json({ success: true, message: `Helper category updated to ${category}` });
    } catch (err) {
        console.error('Error updating helper category:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// PUT /api/helpers/:id — Update helper details
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        const { name, phone } = req.body;
        await db.query(
            'UPDATE helpers SET name = ?, phone = ? WHERE id = ?',
            [name, phone, req.params.id]
        );
        res.json({ success: true, message: 'Helper updated successfully' });
    } catch (err) {
        console.error('Error updating helper:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// DELETE /api/helpers/:id — Soft Delete Helper
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        await db.query('UPDATE helpers SET active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Helper removed successfully' });
    } catch (err) {
        console.error('Error deleting helper:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/helpers/notify-surge — Notify all helpers about surge pricing
// ==========================================
router.post('/notify-surge', async (req, res) => {
    try {
        const { amount, service } = req.body;
        if (!amount) {
            return res.status(400).json({ success: false, error: 'Amount is required' });
        }
        
        // Proxy this request to the Python bot which handles WhatsApp
        const botResponse = await fetch('http://localhost:8000/api/bot/notify-surge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, service })
        });
        
        if (botResponse.ok) {
            res.json({ success: true, message: 'Surge notification sent via bot' });
        } else {
            res.status(500).json({ success: false, error: 'Bot failed to send notifications' });
        }
    } catch (err) {
        console.error('Error notifying surge:', err);
        res.status(500).json({ success: false, error: 'Internal server error while notifying' });
    }
});

module.exports = router;
