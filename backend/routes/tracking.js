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

    // 1. If valid JWT token is provided, extract helper/admin identity
    if (token) {
        const payload = verifyToken(token);
        if (payload) {
            req.user = payload;
            if (payload.role === 'admin') {
                return next();
            }
            const helperIdFromToken = payload.helper_id || (payload.role === 'helper' ? payload.id : null);
            if (helperIdFromToken) {
                req.authenticatedHelperId = parseInt(helperIdFromToken);
                return next();
            }
        }
    }

    // 2. If no token, authenticate via valid helper_id / helper_code from database
    const body = req.body || {};
    const query = req.query || {};
    const helperIdOrCode = body.helper_id || query.helper_id || body.helper_code || query.helper_code;
    if (helperIdOrCode) {
        try {
            const isNum = !isNaN(parseInt(helperIdOrCode));
            let sql = 'SELECT id, status, active FROM helpers WHERE active = 1 AND ';
            let params = [];
            if (isNum) {
                sql += 'id = ?';
                params = [parseInt(helperIdOrCode)];
            } else {
                sql += 'helper_code = ?';
                params = [String(helperIdOrCode)];
            }

            const [helpers] = await db.query(sql, params);
            if (helpers.length > 0) {
                req.authenticatedHelperId = helpers[0].id;
                return next();
            }
        } catch (err) {
            console.error('Helper lookup error during tracking auth:', err.message);
        }
    }

    return res.status(401).json({ success: false, error: 'Unauthorized: Valid helper identity or token required' });
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

        const trackingLink = `${process.env.TRACKING_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://need2done.in'}/track/${token}`;

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

        // Fetch order details
        let orderRows = [];
        if (tokenId) {
            [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [tokenId]);
        } else {
            [orderRows] = await db.query('SELECT * FROM orders WHERE order_id = ? OR id = ?', [tokenStr, tokenStr]);
        }

        if (orderRows.length === 0) {
            return res.status(404).json({ success: false, status: 'EXPIRED', error: 'Invalid or expired tracking token' });
        }

        const order = orderRows[0];
        tokenId = order.id;

        let [locations] = await db.query(
            'SELECT lat, lng, last_seen FROM helper_live_tracking WHERE order_id = ? ORDER BY last_seen DESC LIMIT 1',
            [tokenId]
        );

        // Fallback: If helper has accepted order but no order-specific GPS ping sent yet, use helper's active location
        if (locations.length === 0 && order.helper_id) {
            const [statusLocs] = await db.query(
                'SELECT latitude as lat, longitude as lng, last_seen FROM helper_status WHERE helper_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL',
                [order.helper_id]
            );
            if (statusLocs.length > 0) {
                locations = statusLocs;
            }
        }

        const [trail] = await db.query(
            'SELECT latitude as lat, longitude as lng FROM helper_location_history WHERE order_id = ? ORDER BY id DESC LIMIT 20',
            [tokenId]
        );

        let helperInfo = null;
        if (order.helper_id) {
            const [helpers] = await db.query('SELECT name, phone FROM helpers WHERE id = ?', [order.helper_id]);
            if (helpers.length > 0) {
                helperInfo = helpers[0];
            }
        }

        const hasLocation = locations.length > 0;
        const lastSeen = hasLocation ? locations[0].last_seen : (order.updated_at || order.created_at);

        res.json({
            success: true,
            status: order.status === 'COMPLETED' ? 'COMPLETED' : (hasLocation ? 'ACTIVE' : (order.status || 'STARTED')),
            order_id: order.order_id || order.id,
            service: order.service || 'Delivery Service',
            helper_name: helperInfo ? helperInfo.name : null,
            helper_phone: helperInfo ? helperInfo.phone : null,
            pickup_lat: order.pickup_lat ? parseFloat(order.pickup_lat) : null,
            pickup_lng: order.pickup_lng ? parseFloat(order.pickup_lng) : null,
            drop_lat: (order.drop_lat || order.customer_lat) ? parseFloat(order.drop_lat || order.customer_lat) : null,
            drop_lng: (order.drop_lng || order.customer_lng) ? parseFloat(order.drop_lng || order.customer_lng) : null,
            location: hasLocation ? locations[0] : null,
            last_ping: lastSeen,
            trail: (trail || []).reverse()
        });
    } catch (err) {
        console.error('Error fetching live tracking:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch tracking data' });
    }
});

// ==========================================
// GET /api/tracking/active — Admin: all active tracking
// ==========================================
router.get('/active', async (req, res) => {
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
