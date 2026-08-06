const express = require('express');
const router = express.Router();
const db = require('../config/db');

const { authenticateAdmin } = require('../middleware/auth');
const isAdmin = authenticateAdmin;


// ==========================================
// GET /api/inventory — Fetch listing with reserved stock calculations
// ==========================================
router.get('/', isAdmin, async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.name, p.category, p.stock as current_stock, p.brand, p.unit,
                   COALESCE((
                       SELECT SUM(ci.quantity) 
                       FROM cart_items ci 
                       JOIN orders o ON ci.order_id = o.order_id 
                       WHERE ci.product_id = p.id AND o.status IN ('DRAFT', 'CONFIRMED')
                   ), 0) as reserved_stock
            FROM products p
            ORDER BY p.category, p.name
        `;
        const [rows] = await db.query(query);
        
        // Map rows to include available stock, min_stock, status
        const items = rows.map(r => {
            const current = r.current_stock;
            const reserved = parseFloat(r.reserved_stock);
            const available = Math.max(0, current - reserved);
            const min_stock = 5;
            
            let status = 'In Stock';
            if (current === 0) status = 'Out of Stock';
            else if (current <= min_stock) status = 'Low Stock';
            
            return {
                id: r.id,
                name: r.name,
                category: r.category,
                brand: r.brand,
                unit: r.unit,
                current_stock: current,
                reserved_stock: reserved,
                available_stock: available,
                min_stock,
                status
            };
        });
        
        res.json({ success: true, inventory: items });
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/inventory/adjust — Manual stock adjustments with log
// ==========================================
router.post('/adjust', isAdmin, async (req, res) => {
    const { productId, adjustment, reason } = req.body;
    if (!productId || adjustment === undefined || !reason) {
        return res.status(400).json({ success: false, error: 'Product ID, adjustment value and reason are required' });
    }

    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Get previous stock
            const [rows] = await connection.query('SELECT stock, name FROM products WHERE id = ?', [productId]);
            if (rows.length === 0) {
                connection.release();
                return res.status(404).json({ success: false, error: 'Product not found' });
            }
            
            const prevStock = rows[0].stock;
            const newStock = prevStock + parseInt(adjustment);
            
            if (newStock < 0) {
                connection.release();
                return res.status(400).json({ success: false, error: 'Adjustment would result in negative stock' });
            }

            // Update product stock
            await connection.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, productId]);

            // Insert inventory log
            await connection.query(
                'INSERT INTO inventory_logs (product_id, previous_stock, new_stock, reason, updated_by) VALUES (?, ?, ?, ?, "Admin")',
                [productId, prevStock, newStock, reason]
            );

            await connection.commit();
            res.json({ success: true, message: 'Stock adjusted successfully', previous_stock: prevStock, new_stock: newStock });
        } catch (txErr) {
            await connection.rollback();
            throw txErr;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Error adjusting inventory:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/inventory/logs — Fetch logs
// ==========================================
router.get('/logs', isAdmin, async (req, res) => {
    try {
        const query = `
            SELECT il.*, p.name as product_name, p.category
            FROM inventory_logs il
            JOIN products p ON il.product_id = p.id
            ORDER BY il.created_at DESC LIMIT 100
        `;
        const [rows] = await db.query(query);
        res.json({ success: true, logs: rows });
    } catch (err) {
        console.error('Error fetching inventory logs:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
