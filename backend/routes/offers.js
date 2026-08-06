const express = require('express');
const router = express.Router();
const db = require('../config/db');

const { authenticateAdmin } = require('../middleware/auth');
const isAdmin = authenticateAdmin;


// ==========================================
// GET /api/offers — List all offers
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM offers ORDER BY created_at DESC');
        res.json({ success: true, offers: rows });
    } catch (err) {
        console.error('Error fetching offers:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/offers — Create new offer
// ==========================================
router.post('/', isAdmin, async (req, res) => {
    try {
        const { name, type, value, description, banner_url, start_date, end_date, status } = req.body;
        if (!name || !type) {
            return res.status(400).json({ success: false, error: 'Name and type are required' });
        }
        
        // Date checks
        if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
            return res.status(400).json({ success: false, error: 'End Date must be after Start Date' });
        }

        const [result] = await db.query(
            'INSERT INTO offers (name, type, value, description, banner_url, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, type, value || 0.0, description || '', banner_url || null, start_date || null, end_date || null, status || 'Active']
        );
        res.json({ success: true, offer_id: result.insertId });
    } catch (err) {
        console.error('Error creating offer:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// PUT /api/offers/:id — Update offer
// ==========================================
router.put('/:id', isAdmin, async (req, res) => {
    try {
        const { name, type, value, description, banner_url, start_date, end_date, status } = req.body;
        
        // Date checks
        if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
            return res.status(400).json({ success: false, error: 'End Date must be after Start Date' });
        }

        await db.query(
            `UPDATE offers 
             SET name = COALESCE(?, name), 
                 type = COALESCE(?, type), 
                 value = COALESCE(?, value), 
                 description = COALESCE(?, description), 
                 banner_url = COALESCE(?, banner_url), 
                 start_date = COALESCE(?, start_date), 
                 end_date = COALESCE(?, end_date), 
                 status = COALESCE(?, status)
             WHERE id = ?`,
            [name, type, value, description, banner_url, start_date, end_date, status, req.params.id]
        );
        res.json({ success: true, message: 'Offer updated successfully' });
    } catch (err) {
        console.error('Error updating offer:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// DELETE /api/offers/:id — Remove offer
// ==========================================
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM offers WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Offer deleted successfully' });
    } catch (err) {
        console.error('Error deleting offer:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
