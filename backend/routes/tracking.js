const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

// ==========================================
// POST /api/tracking/start — Helper starts tracking
// Body: { helper_id, order_id }
// Returns: { token } — used for customer tracking link
// ==========================================
// ==========================================
// POST /api/tracking/start — Helper starts tracking
// Body: { helper_id, order_id }
// Returns: { token } — used for customer tracking link
// ==========================================
router.post('/start', async (req, res) => {
    try {
        const { helper_id, order_id } = req.body;
        const token = crypto.randomBytes(32).toString('hex');

        // Create token for customer (expires in 24h)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.query(
            'INSERT INTO order_tracking_tokens (order_id, token, role, expires_at) VALUES (?, ?, "CUSTOMER", ?)',
            [order_id, token, expiresAt]
        );

        // Update order tracking status
        await db.query('UPDATE orders SET tracking_status = "STARTED", status = "HELPER_ARRIVED" WHERE id = ?', [order_id]);

        const trackingLink = `${process.env.API_BASE_URL || 'http://localhost:5000'}/track/${token}`;

        res.json({ success: true, token, tracking_link: trackingLink });
    } catch (err) {
        console.error('Error starting tracking:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/tracking/update — Helper app sends GPS ping
// Body: { helper_id, order_id, lat, lng }
// ==========================================
router.post('/update', async (req, res) => {
    console.log(`[TRACKING_PING] Received from ${req.ip}:`, JSON.stringify(req.body));
    try {
        let { helper_id, order_id, lat, lng, latitude, longitude } = req.body;

        // Support both lat/lng and latitude/longitude field names
        const final_lat = lat !== undefined ? lat : latitude;
        const final_lng = lng !== undefined ? lng : longitude;

        // --- VALIDATION ---
        if (!helper_id || final_lat === undefined || final_lng === undefined) {
            console.error('Invalid payload received in tracking/update:', req.body);
            return res.status(400).json({ success: false, error: 'Missing helper_id, lat, or lng' });
        }

        // Ensure numeric types for SQL
        const n_helper_id = parseInt(helper_id);
        const n_lat = parseFloat(final_lat);
        const n_lng = parseFloat(final_lng);

        if (isNaN(n_helper_id) || isNaN(n_lat) || isNaN(n_lng)) {
            return res.status(400).json({ success: false, error: 'Invalid numeric data for helper_id, lat, or lng' });
        }

        // --- ORDER LOOKUP FALLBACK ---
        // If order_id is a string (e.g., N2D-XXXXXX), find the internal integer id.
        if (order_id && typeof order_id === 'string' && order_id.startsWith('N2D')) {
            const [rows] = await db.query('SELECT id FROM orders WHERE order_id = ?', [order_id]);
            if (rows.length > 0) {
                order_id = rows[0].id;
            }
        }

        if (!order_id) {
            const [activeOrders] = await db.query(
                'SELECT id FROM orders WHERE helper_id = ? AND status NOT IN ("COMPLETED", "CANCELLED") ORDER BY id DESC LIMIT 1',
                [n_helper_id]
            );
            if (activeOrders.length > 0) {
                order_id = activeOrders[0].id;
            }
        }

        // --- UPDATE HELPER STATUS (Base position) ---
        await db.query(
            `INSERT INTO helper_status (helper_id, status, latitude, longitude, last_seen) 
             VALUES (?, 'AVAILABLE', ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE latitude=?, longitude=?, last_seen=NOW()`,
            [n_helper_id, n_lat, n_lng, n_lat, n_lng]
        );

        // --- IF ORDER EXISTS, UPDATE TRACKING TABLES ---
        if (order_id) {
            const n_order_id = parseInt(order_id);
            if (!isNaN(n_order_id)) {
                // Store location in history
                await db.query(
                    'INSERT INTO helper_location_history (helper_id, order_id, latitude, longitude) VALUES (?, ?, ?, ?)',
                    [n_helper_id, n_order_id, n_lat, n_lng]
                );

                // Update live tracking
                await db.query(
                    'INSERT INTO helper_live_tracking (helper_id, order_id, lat, lng, last_seen) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE lat=?, lng=?, last_seen=NOW()',
                    [n_helper_id, n_order_id, n_lat, n_lng, n_lat, n_lng]
                );
            }
        }

        res.json({ success: true, message: 'Location updated', order_id: order_id || null });
    } catch (err) {
        console.error('CRITICAL ERROR in /api/tracking/update:', err);
        console.error('Payload was:', req.body);
        res.status(500).json({ success: false, error: 'DB error', details: err.message });
    }
});

// Alias for legacy Android App compatibility
router.post('/update-location', async (req, res) => {
    // Forward to the standard update handler
    req.url = '/update';
    return router.handle(req, res);
});


// ==========================================
// POST /api/tracking/stop — Helper stops tracking
// Body: { helper_id, order_id }
// ==========================================
router.post('/stop', async (req, res) => {
    try {
        const { helper_id, order_id } = req.body;
        
        // Finalize order status
        await db.query('UPDATE orders SET status = "COMPLETED", tracking_status = "COMPLETED", completed_at = NOW() WHERE id = ?', [order_id]);
        
        // Remove from live tracking
        await db.query('DELETE FROM helper_live_tracking WHERE helper_id = ? AND order_id = ?', [helper_id, order_id]);

        // Bring helper back ONLINE and AVAILABLE
        if (helper_id) {
            await db.query('UPDATE helpers SET status = "ONLINE" WHERE id = ?', [helper_id]);
            await db.query('UPDATE helper_status SET status = "AVAILABLE" WHERE helper_id = ?', [helper_id]);
        }

        res.json({ success: true, message: 'Tracking stopped and order completed' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/tracking/live/:token — Customer polls this
// ==========================================
router.get('/live/:token', async (req, res) => {
    try {
        const [tokens] = await db.query(
            'SELECT * FROM order_tracking_tokens WHERE token = ? AND expires_at > NOW()',
            [req.params.token]
        );

        if (tokens.length === 0) {
            return res.status(404).json({ success: false, error: 'Invalid or expired tracking token' });
        }

        const tokenId = tokens[0].order_id;

        // Get live location
        const [locations] = await db.query(
            'SELECT lat, lng, last_seen FROM helper_live_tracking WHERE order_id = ?',
            [tokenId]
        );

        // Get trail (last 20 points)
        const [trail] = await db.query(
            'SELECT latitude as lat, longitude as lng FROM helper_location_history WHERE order_id = ? ORDER BY id DESC LIMIT 20',
            [tokenId]
        );

        res.json({
            success: true,
            location: locations.length > 0 ? locations[0] : null,
            trail: trail.reverse()
        });
    } catch (err) {
        console.error('Error fetching live tracking:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/tracking/active — Admin: all active tracking
// ==========================================
router.get('/active', async (req, res) => {
    try {
        // Fetch:
        // 1. Helpers on active orders (from helper_live_tracking)
        // 2. Available helpers who are NOT on an active order (from helper_status)
        const [rows] = await db.query(`
            SELECT 
                hs.helper_id,
                hs.latitude as lat, 
                hs.longitude as lng,
                hs.last_seen,
                o.id as order_db_id,
                o.order_id as display_id, 
                o.service, 
                o.status as order_status,
                o.customer_lat, 
                o.customer_lng, 
                h.name as helper_name,
                h.phone as helper_phone,
                hs.status as helper_online_status
            FROM helper_status hs
            JOIN helpers h ON hs.helper_id = h.id
            LEFT JOIN helper_live_tracking lt ON hs.helper_id = lt.helper_id
            LEFT JOIN orders o ON lt.order_id = o.id
            WHERE hs.status = 'AVAILABLE' 
               OR (lt.order_id IS NOT NULL AND o.status NOT IN ('COMPLETED', 'CANCELLED'))
        `);
        res.json({ success: true, sessions: rows });
    } catch (err) {
        console.error('Error fetching active tracking sessions:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
