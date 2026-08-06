const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ==========================================
// GET /api/carts/:orderId — Fetch cart items
// ==========================================
router.get('/:orderId', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM cart_items WHERE order_id = ? ORDER BY id',
            [req.params.orderId]
        );
        res.json({ success: true, cart: rows });
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/carts/draft — Create draft order & customer from web
// ==========================================
router.post('/draft', async (req, res) => {
    const { customerPhone, customerName, serviceName } = req.body;
    if (!customerPhone || !customerName) {
        return res.status(400).json({ success: false, error: 'Customer phone and name are required' });
    }

    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Find or insert customer
            let customerId;
            const [custRows] = await connection.query('SELECT id FROM customers WHERE phone = ?', [customerPhone]);
            if (custRows.length > 0) {
                customerId = custRows[0].id;
                await connection.query('UPDATE customers SET name = ? WHERE id = ?', [customerName, customerId]);
            } else {
                const [insResult] = await connection.query('INSERT INTO customers (phone, name) VALUES (?, ?)', [customerPhone, customerName]);
                customerId = insResult.insertId;
            }

            // Create order code with service prefix
            const crypto = require('crypto');
            const sStr = String(serviceName || '').toLowerCase();
            let orderPrefix = 'N2D';
            if (sStr.includes('grocer')) orderPrefix = 'N2DGR';
            else if (sStr.includes('veg') || sStr.includes('fruit')) orderPrefix = 'N2DVF';
            else if (sStr.includes('food')) orderPrefix = 'N2DFD';
            else if (sStr.includes('medicin')) orderPrefix = 'N2DMD';
            else if (sStr.includes('ride')) orderPrefix = 'N2DRD';
            else if (sStr.includes('anywork') || sStr.includes('parcel')) orderPrefix = 'N2DAW';
            else if (sStr.includes('home')) orderPrefix = 'N2DHS';

            const orderCode = `${orderPrefix}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

            // Create draft order
            await connection.query(
                `INSERT INTO orders (order_id, engine_type, customer_id, customer_number, customer_name, service, status, payment_status, total_amount, created_at) 
                 VALUES (?, 'TASK', ?, ?, ?, ?, 'DRAFT', 'PENDING', 0.0, NOW())`,
                [orderCode, customerId, customerPhone, customerName, serviceName || 'Groceries']
            );

            await connection.commit();
            res.json({ success: true, orderId: orderCode });
        } catch (txErr) {
            await connection.rollback();
            throw txErr;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Error creating draft order:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/carts/:orderId — Save/overwrite cart items
// ==========================================
router.post('/:orderId', async (req, res) => {
    const { items } = req.body; // Array of { id, name, qty, price, unit }
    if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    try {
        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Delete old cart items
            await connection.query('DELETE FROM cart_items WHERE order_id = ?', [req.params.orderId]);

            // Insert new cart items
            let totalAmount = 0;
            for (const item of items) {
                const itemId = item.id !== undefined ? item.id : item.product_id;
                const itemName = item.name !== undefined ? item.name : item.product_name;
                const itemQty = item.qty !== undefined ? item.qty : item.quantity;
                const itemPrice = item.price;
                const itemUnit = item.unit;

                const itemTotal = parseFloat(itemPrice) * parseFloat(itemQty);
                totalAmount += itemTotal;
                await connection.query(
                    `INSERT INTO cart_items (order_id, product_id, product_name, quantity, price, unit) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [req.params.orderId, itemId, itemName, itemQty, itemPrice, itemUnit]
                );
            }

            // Sync total amount and restaurant in orders table
            let updateQuery = 'UPDATE orders SET total_amount = ?, bill_amount = ? WHERE order_id = ?';
            let updateParams = [totalAmount, totalAmount, req.params.orderId];
            
            if (req.body.restaurant) {
                updateQuery = 'UPDATE orders SET total_amount = ?, bill_amount = ?, payload = JSON_SET(COALESCE(payload, "{}"), "$.restaurant", ?) WHERE order_id = ?';
                updateParams = [totalAmount, totalAmount, req.body.restaurant, req.params.orderId];
            }

            await connection.query(updateQuery, updateParams);

            await connection.commit();
            res.json({ success: true, message: 'Cart updated successfully', total: totalAmount });
        } catch (txErr) {
            await connection.rollback();
            throw txErr;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Error saving cart:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
