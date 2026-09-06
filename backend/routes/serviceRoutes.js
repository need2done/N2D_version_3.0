const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ==========================================
// GET /api/services — List all services with status
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT service_id, service_key, title, description, icon, category, is_active, updated_at FROM service_config ORDER BY service_id ASC');
        res.json({ success: true, services: rows });
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch service configuration' });
    }
});

// ==========================================
// GET /api/services/active — Public endpoint returning active service IDs
// ==========================================
router.get('/active', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT service_id, service_key, title, icon, category FROM service_config WHERE is_active = 1 ORDER BY service_id ASC');
        const activeIds = rows.map(r => r.service_id);
        res.json({ success: true, activeServiceIds: activeIds, activeServices: rows });
    } catch (err) {
        console.error('Error fetching active services:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch active services' });
    }
});

// ==========================================
// PUT /api/services/:service_id/toggle — Toggle or set service active status
// ==========================================
router.put('/:service_id/toggle', async (req, res) => {
    try {
        const serviceId = parseInt(req.params.service_id, 10);
        let { is_active } = req.body;

        if (isNaN(serviceId)) {
            return res.status(400).json({ success: false, error: 'Invalid service ID' });
        }

        if (is_active === undefined || is_active === null) {
            // Toggle existing value if not explicitly provided
            const [current] = await db.query('SELECT is_active FROM service_config WHERE service_id = ?', [serviceId]);
            if (current.length === 0) {
                return res.status(404).json({ success: false, error: 'Service not found' });
            }
            is_active = current[0].is_active === 1 ? 0 : 1;
        } else {
            is_active = is_active ? 1 : 0;
        }

        await db.query('UPDATE service_config SET is_active = ? WHERE service_id = ?', [is_active, serviceId]);
        
        const [updated] = await db.query('SELECT service_id, service_key, title, is_active FROM service_config WHERE service_id = ?', [serviceId]);

        res.json({
            success: true,
            message: `Service ${updated[0]?.title || serviceId} is now ${is_active ? 'ACTIVE' : 'INACTIVE'}`,
            service: updated[0]
        });

    } catch (err) {
        console.error('Error toggling service status:', err);
        res.status(500).json({ success: false, error: 'Failed to update service status' });
    }
});

module.exports = router;
