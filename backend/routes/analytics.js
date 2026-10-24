const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/db');

async function sendWhatsAppText(to, text) {
    const token = process.env.WA_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
    const phoneId = process.env.WA_PHONE_ID || process.env.WHATSAPP_PHONE_ID || '';
    if (!token || !phoneId || !to) return;
    try {
        await axios.post(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
            messaging_product: "whatsapp",
            to: to.replace(/\D/g, ''),
            type: "text",
            text: { body: text }
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('[WA ERROR IN ANALYTICS] Failed to send message:', err.response?.data || err.message);
    }
}

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
            SELECT o.order_id, o.total_amount, o.bill_amount, o.platform_fee, o.helper_charge, o.completed_at, o.updated_at, o.payment_method, o.payment_status, o.verified_by_owner, o.owner_verified_at, o.service, o.engine_type, o.customer_name, o.customer_number, h.name as helper_name
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

// GET /api/analytics/medicine-transactions (Owner Direct UPI Transactions)
router.get('/medicine-transactions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                o.id,
                o.order_id, 
                o.customer_name, 
                o.customer_number, 
                o.service, 
                COALESCE(o.bill_amount, 0) as bill_amount,
                COALESCE(o.helper_charge, 0) as helper_charge,
                COALESCE(o.platform_fee, 0) as platform_fee,
                o.total_amount, 
                o.payment_method, 
                o.payment_status, 
                COALESCE(o.verified_by_owner, 0) as verified_by_owner, 
                o.owner_verified_at,
                o.status,
                o.created_at,
                o.updated_at,
                h.name as helper_name
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            WHERE o.service = 'Medicines' OR o.order_id LIKE 'N2DMD_%'
            ORDER BY o.id DESC LIMIT 100
        `);

        const totalOrders = rows.length;
        const totalAmount = rows.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
        const pendingVerification = rows.filter(r => !r.verified_by_owner).length;
        const verified = rows.filter(r => r.verified_by_owner).length;

        const summary = {
            total_orders: totalOrders,
            total_amount: totalAmount,
            pending_verification: pendingVerification,
            verified: verified,
            merchant_vpa: 'Q21351640@ybl',
            kotak_vpa: 'Q21351640@ybl (PhonePe Merchant)'
        };

        res.json({ success: true, summary, transactions: rows });
    } catch (err) {
        console.error('Error fetching medicine transactions:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// POST /api/analytics/verify-medicine-payment/:orderId
router.post('/verify-medicine-payment/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const isNumeric = /^\d+$/.test(orderId);
        const query = isNumeric
            ? `UPDATE orders 
               SET verified_by_owner = 1, 
                   owner_verified_at = NOW(), 
                   payment_status = 'PAID',
                   status = CASE WHEN status = 'PAYMENT_GENERATED' THEN 'COMPLETED' ELSE status END
               WHERE order_id = ? OR id = ?`
            : `UPDATE orders 
               SET verified_by_owner = 1, 
                   owner_verified_at = NOW(), 
                   payment_status = 'PAID',
                   status = CASE WHEN status = 'PAYMENT_GENERATED' THEN 'COMPLETED' ELSE status END
               WHERE order_id = ?`;
        const params = isNumeric ? [orderId, parseInt(orderId, 10)] : [orderId];

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // Fetch order details for WhatsApp notification
        const selectQuery = isNumeric
            ? `SELECT o.*, h.phone as helper_phone FROM orders o LEFT JOIN helpers h ON o.helper_id = h.id WHERE o.order_id = ? OR o.id = ?`
            : `SELECT o.*, h.phone as helper_phone FROM orders o LEFT JOIN helpers h ON o.helper_id = h.id WHERE o.order_id = ?`;
        const [orders] = await db.query(selectQuery, params);

        if (orders.length > 0) {
            const order = orders[0];
            // Notify customer
            if (order.customer_number) {
                const customerMsg = `✅ *Payment Verified!*\n\nYour UPI payment of ₹${order.total_amount} for Order *#${order.order_id}* has been verified.\n\nYour order is confirmed. Thank you for choosing Need2Done!`;
                await sendWhatsAppText(order.customer_number, customerMsg);
            }
            // Notify helper
            if (order.helper_phone) {
                const helperMsg = `✅ *Payment Confirmed by Owner!*\n\nOrder *#${order.order_id}*: UPI payment of ₹${order.total_amount} is verified in business statement.\nYou can now safely hand over the package to the customer.`;
                await sendWhatsAppText(order.helper_phone, helperMsg);
            }
        }

        res.json({ success: true, message: 'Payment successfully marked as verified! Customer & Helper intimated via WhatsApp.' });
    } catch (err) {
        console.error('Error verifying medicine payment:', err);
        res.status(500).json({ success: false, error: 'Failed to verify payment' });
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
