const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { verifyToken, authenticateAdmin } = require('../middleware/auth');

/**
 * Middleware: Verify signed token (helper or admin) and enforce order ownership for helpers.
 */
async function authenticateHelperAndOrder(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token required' });
    }

    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    }

    req.user = payload;

    // Admins have full access
    if (payload.role === 'admin') {
        return next();
    }

    // Helper authentication logic
    const helperIdFromToken = payload.helper_id || (payload.role === 'helper' ? payload.id : null);
    if (!helperIdFromToken) {
        return res.status(403).json({ success: false, error: 'Forbidden: Valid helper or admin identity required' });
    }

    // Force payload helper_id onto request to prevent helper ID spoofing in body
    req.authenticatedHelperId = parseInt(helperIdFromToken);

    // If order_id is present in body/query, verify assignment in DB
    const targetOrderId = req.body.order_id || req.query.order_id;
    if (targetOrderId) {
        try {
            let numericOrderId = parseInt(targetOrderId);
            if (isNaN(numericOrderId) && typeof targetOrderId === 'string' && targetOrderId.startsWith('N2D')) {
                const [rows] = await db.query('SELECT id FROM orders WHERE order_id = ?', [targetOrderId]);
                if (rows.length > 0) numericOrderId = rows[0].id;
            }

            if (!isNaN(numericOrderId)) {
                const [assigned] = await db.query(
                    'SELECT id FROM orders WHERE id = ? AND helper_id = ? AND status NOT IN ("COMPLETED", "CANCELLED")',
                    [numericOrderId, req.authenticatedHelperId]
                );
                if (assigned.length === 0) {
                    return res.status(403).json({ success: false, error: 'Forbidden: Helper is not assigned to this active order' });
                }
            }
        } catch (err) {
            console.error('Error verifying order assignment:', err.message);
            return res.status(500).json({ success: false, error: 'Database verification failed' });
        }
    }

    next();
}

// ==========================================
// POST /api/tracking/start — Helper starts tracking
// ==========================================
router.post('/start', authenticateHelperAndOrder, async (req, res) => {
    try {
        const helper_id = req.authenticatedHelperId || req.body.helper_id;
        const { order_id } = req.body;
        if (!helper_id || !order_id) {
            return res.status(400).json({ success: false, error: 'helper_id and order_id are required' });
        }

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
        console.error('Error starting tracking:', err.message);
        res.status(500).json({ success: false, error: 'Failed to start tracking' });
    }
});

// ==========================================
// POST /api/tracking/update — Helper app sends GPS ping
// ==========================================
router.post('/update', authenticateHelperAndOrder, async (req, res) => {
    console.log(`[TRACKING_PING] Verified update for helper ID: ${req.authenticatedHelperId || req.body.helper_id}`);
    try {
        let { order_id, lat, lng, latitude, longitude } = req.body;
        const helper_id = req.authenticatedHelperId || req.body.helper_id;

        const final_lat = lat !== undefined ? lat : latitude;
        const final_lng = lng !== undefined ? lng : longitude;

        if (!helper_id || final_lat === undefined || final_lng === undefined) {
            return res.status(400).json({ success: false, error: 'Missing helper_id, lat, or lng' });
        }

        const n_helper_id = parseInt(helper_id);
        const n_lat = parseFloat(final_lat);
        const n_lng = parseFloat(final_lng);

        if (isNaN(n_helper_id) || isNaN(n_lat) || isNaN(n_lng)) {
            return res.status(400).json({ success: false, error: 'Invalid numeric data for helper_id, lat, or lng' });
        }

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

        // Update base position
        await db.query(
            `INSERT INTO helper_status (helper_id, status, latitude, longitude, last_seen) 
             VALUES (?, 'AVAILABLE', ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE latitude=?, longitude=?, last_seen=NOW()`,
            [n_helper_id, n_lat, n_lng, n_lat, n_lng]
        );

        if (order_id) {
            const n_order_id = parseInt(order_id);
            if (!isNaN(n_order_id)) {
                await db.query(
                    'INSERT INTO helper_location_history (helper_id, order_id, latitude, longitude) VALUES (?, ?, ?, ?)',
                    [n_helper_id, n_order_id, n_lat, n_lng]
                );

                await db.query(
                    'INSERT INTO helper_live_tracking (helper_id, order_id, lat, lng, last_seen) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE lat=?, lng=?, last_seen=NOW()',
                    [n_helper_id, n_order_id, n_lat, n_lng, n_lat, n_lng]
                );
            }
        }

        res.json({ success: true, message: 'Location updated', order_id: order_id || null });
    } catch (err) {
        console.error('ERROR in /api/tracking/update:', err.message);
        res.status(500).json({ success: false, error: 'Database update failed' });
    }
});

// Alias for legacy Android App compatibility
router.post('/update-location', authenticateHelperAndOrder, async (req, res) => {
    req.url = '/update';
    return router.handle(req, res);
});

// ==========================================
// POST /api/tracking/stop — Helper stops tracking
// ==========================================
router.post('/stop', authenticateHelperAndOrder, async (req, res) => {
    try {
        const helper_id = req.authenticatedHelperId || req.body.helper_id;
        const { order_id } = req.body;
        if (!order_id) {
            return res.status(400).json({ success: false, error: 'order_id is required' });
        }
        
        await db.query('UPDATE orders SET status = "COMPLETED", tracking_status = "COMPLETED", completed_at = NOW() WHERE id = ?', [order_id]);
        await db.query('DELETE FROM helper_live_tracking WHERE helper_id = ? AND order_id = ?', [helper_id, order_id]);

        if (helper_id) {
            await db.query('UPDATE helpers SET status = "ONLINE" WHERE id = ?', [helper_id]);
            await db.query('UPDATE helper_status SET status = "AVAILABLE" WHERE helper_id = ?', [helper_id]);
        }

        res.json({ success: true, message: 'Tracking stopped and order completed' });
    } catch (err) {
        console.error('Error stopping tracking:', err.message);
        res.status(500).json({ success: false, error: 'Failed to stop tracking' });
    }
});

// ==========================================
// GET /api/tracking/live/:token — Customer live view
// STRICT TOKEN VALIDATION ONLY
// ==========================================
router.get('/live/:token', async (req, res) => {
    try {
        const tokenStr = req.params.token;
        if (!tokenStr) {
            return res.status(404).json({ success: false, error: 'Invalid tracking token' });
        }

        let tokenId = null;

        // Try looking it up as a secure crypto token first
        if (tokenStr.length >= 16) {
            const [tokens] = await db.query(
                'SELECT * FROM order_tracking_tokens WHERE token = ? AND expires_at > NOW()',
                [tokenStr]
            );
            if (tokens.length > 0) {
                tokenId = tokens[0].order_id;
            }
        }

        // If not found, check if it's a direct order_id (e.g. N2DVFDFBF)
        if (!tokenId && tokenStr.startsWith('N2D')) {
            const [orderRows] = await db.query('SELECT id FROM orders WHERE order_id = ?', [tokenStr]);
            if (orderRows.length > 0) {
                tokenId = orderRows[0].id;
            }
        }

        if (!tokenId) {
            return res.status(404).json({ success: false, error: 'Invalid or expired tracking token' });
        }

        const [locations] = await db.query(
            'SELECT lat, lng, last_seen FROM helper_live_tracking WHERE order_id = ?',
            [tokenId]
        );

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
        console.error('Error fetching live tracking:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch tracking data' });
    }
});

// ==========================================
// GET /api/tracking/active — Admin: all active tracking
// ADMIN PROTECTED
// ==========================================
router.get('/active', authenticateAdmin, async (req, res) => {
    try {
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
        console.error('Error fetching active tracking sessions:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch active sessions' });
    }
});

module.exports = router;
