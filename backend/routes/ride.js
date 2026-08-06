const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');

// POST /api/ride/book
router.post('/book', async (req, res) => {
    const {
        pickup_address,
        pickup_lat,
        pickup_lng,
        drop_address,
        drop_lat,
        drop_lng,
        vehicle,
        price,
        distance
    } = req.body;

    if (!pickup_address || !drop_address || !vehicle || !price) {
        return res.status(400).json({ success: false, error: 'Missing required booking parameters' });
    }

    try {
        // Ensure we have a valid customer_id to satisfy database constraints
        let customerId = null;
        // Use INSERT IGNORE to handle race conditions if the guest row already exists
        await db.query("INSERT IGNORE INTO customers (phone, name) VALUES ('9999999999', 'Ride Web Guest')");
        const [guest] = await db.query("SELECT id FROM customers WHERE phone = '9999999999' LIMIT 1");
        if (guest.length > 0) {
            customerId = guest[0].id;
        }
        if (!customerId) {
            return res.status(500).json({ success: false, error: 'Failed to resolve guest customer' });
        }

        // Generate unique order ID in format: N2DRD<4 hex chars>
        const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
        const orderId = `N2DRD${randomHex}`;

        const payload = JSON.stringify({
            pickup_address,
            pickup_lat: pickup_lat ? parseFloat(pickup_lat) : null,
            pickup_lng: pickup_lng ? parseFloat(pickup_lng) : null,
            drop_address,
            drop_lat: drop_lat ? parseFloat(drop_lat) : null,
            drop_lng: drop_lng ? parseFloat(drop_lng) : null,
            vehicle,
            price: parseFloat(price),
            distance: parseFloat(distance)
        });

        // Insert into orders table with a non-null customer_id
        await db.query(`
            INSERT INTO orders (
                order_id, engine_type, customer_id, customer_number, customer_name,
                service, status, payment_status, total_amount, created_at, payload
            ) VALUES (?, 'RIDE', ?, '9999999999', 'Guest User', 'Ride', 'DRAFT', 'PENDING', ?, NOW(), ?)
        `, [orderId, customerId, parseFloat(price), payload]);

        res.json({ success: true, orderId });
    } catch (err) {
        console.error('Error creating ride booking:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

module.exports = router;
