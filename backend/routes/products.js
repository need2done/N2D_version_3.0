const express = require('express');
const router = express.Router();
const db = require('../config/db');

const { authenticateAdmin } = require('../middleware/auth');
const isAdmin = authenticateAdmin;


// ==========================================
// GET /api/products — Fetch catalog (public)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products WHERE available = 1 ORDER BY category, name');
        res.json({ 
            success: true, 
            products: rows,
            bot_phone: process.env.ADMIN_PHONE_NUMBER || '15556349916' // Fallback to config admin/bot phone
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/products/admin — Fetch all (incl. out of stock)
// ==========================================
router.get('/admin', isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY category, name');
        res.json({ success: true, products: rows });
    } catch (err) {
        console.error('Error fetching admin products:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/products — Create new product
// ==========================================
router.post('/', isAdmin, async (req, res) => {
    try {
        const { name, category, price, unit, available, image_url, mrp, stock, brand } = req.body;
        if (!name || price === undefined) {
            return res.status(400).json({ success: false, error: 'Name and price are required' });
        }
        const [result] = await db.query(
            'INSERT INTO products (name, category, price, unit, available, image_url, mrp, stock, brand) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, category || 'General', price, unit || 'kg', available !== false, image_url || null, mrp || null, stock !== undefined ? stock : 100, brand || '']
        );
        res.json({ success: true, product_id: result.insertId });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// PUT /api/products/:id — Update product details
// ==========================================
router.put('/:id', isAdmin, async (req, res) => {
    try {
        const { name, category, price, unit, available, image_url, mrp, stock, brand } = req.body;
        const [result] = await db.query(
            `UPDATE products 
             SET name = COALESCE(?, name), 
                 category = COALESCE(?, category), 
                 price = COALESCE(?, price), 
                 unit = COALESCE(?, unit), 
                 available = COALESCE(?, available), 
                 image_url = COALESCE(?, image_url),
                 mrp = ?,
                 stock = ?,
                 brand = ?
             WHERE id = ?`,
            [name, category, price, unit, available, image_url, mrp !== undefined ? mrp : null, stock !== undefined ? stock : 0, brand !== undefined ? brand : '', req.params.id]
        );
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// DELETE /api/products/:id — Remove product
// ==========================================
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
