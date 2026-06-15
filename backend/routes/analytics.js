const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/analytics/earnings
router.get('/earnings', async (req, res) => {
    try {
        const { from, to } = req.query;
        let dateCondition = '';
        let params = [];
        
        if (from && to) {
            dateCondition = ' AND DATE(o.created_at) BETWEEN ? AND ? ';
            params.push(from, to);
        } else if (from) {
            dateCondition = ' AND DATE(o.created_at) >= ? ';
            params.push(from);
        } else if (to) {
            dateCondition = ' AND DATE(o.created_at) <= ? ';
            params.push(to);
        }

        const [rows] = await db.query(`
            SELECT 
                SUM(total_amount) as total_revenue, 
                SUM(platform_fee) as platform_profit, 
                SUM(o.helper_charge) as helper_payouts 
            FROM orders o
            WHERE o.status IN ('COMPLETED', 'PAID')
            ${dateCondition}
        `, params);
        
        const [recentPaid] = await db.query(`
            SELECT o.order_id, o.total_amount, o.platform_fee, o.helper_charge, o.completed_at, o.updated_at, o.payment_method, o.payment_status, o.service, o.engine_type, h.name as helper_name
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            WHERE o.status IN ('COMPLETED', 'PAID')
            ${dateCondition}
            ORDER BY COALESCE(o.completed_at, o.updated_at) DESC LIMIT 50
        `, params);

        res.json({ success: true, summary: rows[0], recent: recentPaid });
    } catch (err) {

        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// GET /api/analytics/orders
router.get('/orders', async (req, res) => {
    try {
        const { from, to } = req.query;
        let dateCondition = '';
        let params = [];
        
        if (from && to) {
            dateCondition = ' WHERE DATE(created_at) BETWEEN ? AND ? ';
            params.push(from, to);
        } else if (from) {
            dateCondition = ' WHERE DATE(created_at) >= ? ';
            params.push(from);
        } else if (to) {
            dateCondition = ' WHERE DATE(created_at) <= ? ';
            params.push(to);
        }

        const [statusRows] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM orders 
            ${dateCondition}
            GROUP BY status
        `, params);

        let volumeCondition = ' WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) ';
        let volumeParams = [];
        if (from && to) {
            volumeCondition = ' WHERE DATE(created_at) BETWEEN ? AND ? ';
            volumeParams.push(from, to);
        } else if (from) {
            volumeCondition = ' WHERE DATE(created_at) >= ? ';
            volumeParams.push(from);
        } else if (to) {
            volumeCondition = ' WHERE DATE(created_at) <= ? ';
            volumeParams.push(to);
        }

        // Last 7 days orders (or specified range)
        const [dailyRows] = await db.query(`
            SELECT DATE(created_at) as date, COUNT(*) as orders 
            FROM orders 
            ${volumeCondition}
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, volumeParams);

        const [engineRows] = await db.query(`
            SELECT engine_type, COUNT(*) as count
            FROM orders
            ${dateCondition}
            GROUP BY engine_type
        `, params);

        res.json({ success: true, statusDistribution: statusRows, dailyVolume: dailyRows, engineDistribution: engineRows });
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

module.exports = router;
