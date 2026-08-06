const express = require('express');
const router = express.Router();
const db = require('../config/db');

const { authenticateAdmin } = require('../middleware/auth');
const isAdmin = authenticateAdmin;


// ==========================================
// GET /api/categories — Fetch categories
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM categories ORDER BY display_order');
        res.json({ success: true, categories: rows });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/categories — Create category
// ==========================================
router.post('/', isAdmin, async (req, res) => {
    try {
        const { name, image_url, description, display_order, status } = req.body;
        if (!name || display_order === undefined) {
            return res.status(400).json({ success: false, error: 'Name and display order are required' });
        }
        const [result] = await db.query(
            'INSERT INTO categories (name, image_url, description, display_order, status) VALUES (?, ?, ?, ?, ?)',
            [name, image_url || null, description || '', display_order, status || 'Active']
        );
        res.json({ success: true, category_id: result.insertId });
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ success: false, error: 'DB error (unique constraint failed)' });
    }
});

// ==========================================
// PUT /api/categories/:id — Update category
// ==========================================
router.put('/:id', isAdmin, async (req, res) => {
    try {
        const { name, image_url, description, display_order, status } = req.body;
        await db.query(
            `UPDATE categories 
             SET name = COALESCE(?, name), 
                 image_url = COALESCE(?, image_url), 
                 description = COALESCE(?, description), 
                 display_order = COALESCE(?, display_order), 
                 status = COALESCE(?, status)
             WHERE id = ?`,
            [name, image_url, description, display_order, status, req.params.id]
        );
        res.json({ success: true, message: 'Category updated successfully' });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// DELETE /api/categories/:id — Remove category (only if no products belong to it!)
// ==========================================
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        // Fetch category name
        const [catRows] = await db.query('SELECT name FROM categories WHERE id = ?', [req.params.id]);
        if (catRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        const catName = catRows[0].name;

        // Check if products count is > 0
        const [prodRows] = await db.query('SELECT COUNT(*) as count FROM products WHERE category = ?', [catName]);
        if (prodRows[0].count > 0) {
            return res.status(400).json({ success: false, error: 'Category contains products. Move products before deleting.' });
        }

        await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
