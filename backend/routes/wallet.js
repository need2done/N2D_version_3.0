const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateAdmin } = require('../middleware/auth');

// All helper wallet administration routes require Admin authorization
router.use(authenticateAdmin);


// ==========================================
// GET /api/wallet/helpers — Get all helper balances
// ==========================================
router.get('/helpers', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, phone, wallet_balance, status, helper_code FROM helpers ORDER BY name ASC');
        res.json({ success: true, helpers: rows });
    } catch (err) {
        console.error('Error fetching helper wallets:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/wallet/ledger-all — Get full ledger transactions for all helpers
// ==========================================
router.get('/ledger-all', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT hl.id, hl.helper_id, h.name as helper_name, h.phone as helper_phone, h.helper_code,
                   hl.amount, hl.type, hl.description, hl.reference_id, hl.created_at, hl.order_id,
                   o.order_id as display_order_id, o.service, o.payment_method, o.total_amount, o.bill_amount,
                   o.helper_charge, o.platform_fee
            FROM helper_ledger hl
            JOIN helpers h ON hl.helper_id = h.id
            LEFT JOIN orders o ON hl.order_id = o.id
            ORDER BY hl.created_at DESC
        `);

        const enriched = rows.map(r => {
            const custPaid = parseFloat(r.total_amount || r.bill_amount || 0);
            const hCharge = parseFloat(r.helper_charge || (custPaid * 0.85));
            const pFee = parseFloat(r.platform_fee || (custPaid - hCharge));
            return {
                ...r,
                display_order_id: r.display_order_id || (r.order_id ? `#${r.order_id}` : '-'),
                service: r.service || 'General Service',
                payment_method: (r.payment_method || 'UPI').toUpperCase(),
                customer_paid: custPaid,
                helper_received: hCharge,
                platform_fee: pFee
            };
        });

        res.json({ success: true, ledger: enriched });
    } catch (err) {
        console.error('Error fetching all ledger transactions:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/wallet/ledger/:helper_id — Get detailed ledger for a helper
// ==========================================
router.get('/ledger/:helper_id', async (req, res) => {
    try {
        const helperId = req.params.helper_id;

        // 1. Fetch raw helper_ledger transactions
        const [ledgerRows] = await db.query(
            'SELECT * FROM helper_ledger WHERE helper_id = ? ORDER BY created_at DESC LIMIT 200',
            [helperId]
        );

        // 2. Fetch all completed/processed orders for this helper
        const [orderRows] = await db.query(`
            SELECT id, order_id, service, status, payment_method, payment_status, total_amount, bill_amount, helper_charge, platform_fee, created_at, completed_at
            FROM orders
            WHERE helper_id = ? AND status IN ('COMPLETED', 'PAID', 'SERVICE_STARTED', 'ADMIN_APPROVED_BILL', 'PAYMENT_GENERATED', 'DELIVERED', 'CONFIRMED')
            ORDER BY id DESC
        `, [helperId]);

        const ledgerByOrderId = new Map();
        for (const item of ledgerRows) {
            if (item.order_id) {
                ledgerByOrderId.set(String(item.order_id), item);
            }
        }

        const combined = [...ledgerRows];

        for (const ord of orderRows) {
            const ordDbId = String(ord.id);
            if (!ledgerByOrderId.has(ordDbId)) {
                const custPaid = parseFloat(ord.total_amount || ord.bill_amount || 0);
                const hCharge = parseFloat(ord.helper_charge || (custPaid * 0.85));
                const pFee = parseFloat(ord.platform_fee || (custPaid - hCharge));
                const isCod = (ord.payment_method || '').toUpperCase() === 'COD';
                
                const txnType = isCod ? 'DEBIT' : 'CREDIT';
                const txnAmount = isCod ? Math.max(0, custPaid - hCharge) : hCharge;
                const desc = isCod
                    ? `COD Collection for Order ${ord.order_id}`
                    : `Earnings for Order ${ord.order_id}`;

                combined.push({
                    id: `synth_${ord.id}`,
                    helper_id: parseInt(helperId),
                    amount: txnAmount,
                    type: txnType,
                    description: desc,
                    order_id: ord.id,
                    display_order_id: ord.order_id,
                    service: ord.service,
                    payment_method: ord.payment_method || 'UPI',
                    customer_paid: custPaid,
                    helper_received: hCharge,
                    platform_fee: pFee,
                    created_at: ord.completed_at || ord.created_at
                });
            }
        }

        const orderMap = new Map();
        for (const ord of orderRows) {
            orderMap.set(String(ord.id), ord);
        }

        const finalLedger = combined.map(item => {
            const ord = item.order_id ? orderMap.get(String(item.order_id)) : null;
            const custPaid = item.customer_paid ?? (ord ? parseFloat(ord.total_amount || ord.bill_amount || 0) : 0);
            const hCharge = item.helper_received ?? (ord ? parseFloat(ord.helper_charge || (custPaid * 0.85)) : parseFloat(item.amount || 0));
            const pFee = item.platform_fee ?? (ord ? parseFloat(ord.platform_fee || (custPaid - hCharge)) : 0);
            
            return {
                ...item,
                display_order_id: item.display_order_id || (ord ? ord.order_id : (item.order_id ? `#${item.order_id}` : '-')),
                service: item.service || (ord ? ord.service : 'General Service'),
                payment_method: (item.payment_method || (ord ? (ord.payment_method || 'UPI') : 'UPI')).toUpperCase(),
                customer_paid: custPaid,
                helper_received: hCharge,
                platform_fee: pFee
            };
        });

        finalLedger.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({ success: true, ledger: finalLedger });
    } catch (err) {
        console.error('Error fetching ledger:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/wallet/recharge — Add funds to helper wallet
// ==========================================
router.post('/recharge', async (req, res) => {
    try {
        const { helper_id, amount, description } = req.body;
        
        if (!helper_id || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid input' });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Insert into ledger
            await conn.query(
                'INSERT INTO helper_ledger (helper_id, amount, type, description) VALUES (?, ?, ?, ?)',
                [helper_id, amount, 'CREDIT', description || 'Manual Recharge']
            );

            // Update balance
            await conn.query(
                'UPDATE helpers SET wallet_balance = wallet_balance + ? WHERE id = ?',
                [amount, helper_id]
            );

            await conn.commit();
            res.json({ success: true, message: 'Recharge successful' });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error('Error recharging wallet:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
