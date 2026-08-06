const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateAdmin } = require('../middleware/auth');

// All helper wallet administration routes require Admin authorization
router.use(authenticateAdmin);


// ==========================================
// GET /api/wallet/helpers — Get all helper balances
// ==========================================
router.get('/helpers', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, phone, wallet_balance, status, helper_code FROM helpers ORDER BY name ASC');
        res.json({ success: true, helpers: rows });
    } catch (err) {
        console.error('Error fetching helper wallets:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/wallet/ledger-all — Get full ledger transactions for all helpers
// ==========================================
router.get('/ledger-all', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT hl.id, hl.helper_id, h.name as helper_name, h.phone as helper_phone, h.helper_code,
                   hl.amount, hl.type, hl.description, hl.reference_id, hl.created_at
            FROM helper_ledger hl
            JOIN helpers h ON hl.helper_id = h.id
            ORDER BY hl.created_at DESC
        `);
        res.json({ success: true, ledger: rows });
    } catch (err) {
        console.error('Error fetching all ledger transactions:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/wallet/ledger/:helper_id — Get ledger for a helper
// ==========================================
router.get('/ledger/:helper_id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM helper_ledger WHERE helper_id = ? ORDER BY created_at DESC LIMIT 100',
            [req.params.helper_id]
        );
        res.json({ success: true, ledger: rows });
    } catch (err) {
        console.error('Error fetching ledger:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/wallet/recharge — Add funds to helper wallet
// ==========================================
router.post('/recharge', async (req, res) => {
    try {
        const { helper_id, amount, description } = req.body;
        
        if (!helper_id || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid input' });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Insert into ledger
            await conn.query(
                'INSERT INTO helper_ledger (helper_id, amount, type, description) VALUES (?, ?, ?, ?)',
                [helper_id, amount, 'CREDIT', description || 'Manual Recharge']
            );

            // Update balance
            await conn.query(
                'UPDATE helpers SET wallet_balance = wallet_balance + ? WHERE id = ?',
                [amount, helper_id]
            );

            await conn.commit();
            res.json({ success: true, message: 'Recharge successful' });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error('Error recharging wallet:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
