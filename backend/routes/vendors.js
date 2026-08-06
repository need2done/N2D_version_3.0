const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateAdmin } = require('../middleware/auth');

// All vendor management routes require Admin authorization
router.use(authenticateAdmin);


// ==========================================
// GET /api/vendors — List all vendors
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT v.*, 
                (SELECT COUNT(*) FROM orders o WHERE o.vendor_id = v.id AND o.vendor_status = 'ACCEPTED') AS accepted_orders,
                (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.vendor_id = v.id AND o.vendor_status = 'ACCEPTED') AS total_amount
            FROM vendors v 
            ORDER BY v.id DESC
        `);
        res.json({ success: true, vendors: rows });
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/vendors — Create a new vendor
// ==========================================
router.post('/', async (req, res) => {
    try {
        const { name, phone, service_category, address, auto_assign, status, lat, lng } = req.body;
        const [result] = await db.query(
            `INSERT INTO vendors (name, phone, service_category, address, auto_assign, status, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, phone, service_category, address, auto_assign ? 1 : 0, status || 'Active', lat || null, lng || null]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating vendor:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// PUT /api/vendors/:id — Update a vendor
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, service_category, address, auto_assign, status, lat, lng } = req.body;
        await db.query(
            `UPDATE vendors SET name=?, phone=?, service_category=?, address=?, auto_assign=?, status=?, lat=?, lng=? WHERE id=?`,
            [name, phone, service_category, address, auto_assign ? 1 : 0, status, lat || null, lng || null, req.params.id]
        );
        res.json({ success: true, message: 'Vendor updated' });
    } catch (err) {
        console.error('Error updating vendor:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// DELETE /api/vendors/:id — Delete a vendor
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM vendors WHERE id=?', [req.params.id]);
        res.json({ success: true, message: 'Vendor deleted' });
    } catch (err) {
        console.error('Error deleting vendor:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
