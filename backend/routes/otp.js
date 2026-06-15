const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ==========================================
// POST /api/otp/generate — Generate OTP for order
// Body: { order_id, otp_type: "DELIVERY" | "RIDE_START" | "RIDE_END" }
// ==========================================
router.post('/generate', async (req, res) => {
    try {
        const { order_id, otp_type } = req.body;
        const otp = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP

        if (otp_type === 'RIDE_START') {
            await db.query('UPDATE order_rides SET start_otp = ? WHERE order_id = ?', [otp, order_id]);
        } else if (otp_type === 'RIDE_END') {
            await db.query('UPDATE order_rides SET end_otp = ? WHERE order_id = ?', [otp, order_id]);
        } else {
            // DELIVERY OTP — store in orders table
            await db.query('UPDATE orders SET delivery_otp = ? WHERE order_id = ?', [otp, order_id]);
        }

        res.json({ success: true, otp, otp_type });
    } catch (err) {
        console.error('Error generating OTP:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/otp/verify — Verify OTP submitted by helper/driver
// Body: { order_id, otp, otp_type }
// 3-attempt lockout as per requirements
// ==========================================

// In-memory attempt tracker (reset on server restart — sufficient for MVP)
const otpAttempts = {};

router.post('/verify', async (req, res) => {
    try {
        const { order_id, otp, otp_type } = req.body;
        const attemptKey = `${order_id}_${otp_type}`;

        // Check lockout
        if (otpAttempts[attemptKey] && otpAttempts[attemptKey] >= 3) {
            return res.status(403).json({
                success: false,
                error: 'OTP locked after 3 failed attempts. Contact admin.',
                locked: true
            });
        }

        let correctOtp = null;
        let realOrderId = null;

        if (otp_type === 'RIDE_START') {
            const [rows] = await db.query('SELECT id, start_otp FROM order_rides WHERE order_id = ?', [order_id]);
            correctOtp = rows.length > 0 ? rows[0].start_otp : null;
            realOrderId = rows.length > 0 ? rows[0].id : null;
        } else if (otp_type === 'RIDE_END') {
            const [rows] = await db.query('SELECT id, end_otp FROM order_rides WHERE order_id = ?', [order_id]);
            correctOtp = rows.length > 0 ? rows[0].end_otp : null;
            realOrderId = rows.length > 0 ? rows[0].id : null;
        } else {
            // DELIVERY OTP — use orders table
            const [rows] = await db.query('SELECT id, delivery_otp FROM orders WHERE order_id = ?', [order_id]);
            correctOtp = rows.length > 0 ? rows[0].delivery_otp : null;
            realOrderId = rows.length > 0 ? rows[0].id : null;
        }

        console.log(`[OTP DEBUG] Order: ${order_id}, ID: ${realOrderId}, Input: ${otp}, DB: ${correctOtp}, Type: ${otp_type}`);

        if (otp && correctOtp && String(otp).trim() === String(correctOtp).trim()) {
            delete otpAttempts[attemptKey];

            if (otp_type === 'RIDE_START') {
                await db.query('UPDATE orders SET status = "RIDE_STARTED" WHERE id = ?', [realOrderId]);
            } else {
                // Get order info to find assigned helper
                const [orders] = await db.query('SELECT helper_id FROM orders WHERE id = ?', [realOrderId]);
                const helperId = orders.length > 0 ? orders[0].helper_id : null;

                await db.query('UPDATE orders SET status = "COMPLETED", completed_at = NOW() WHERE id = ?', [realOrderId]);
                await db.query('DELETE FROM helper_live_tracking WHERE order_id = ?', [realOrderId]);

                if (helperId) {
                    await db.query('UPDATE helpers SET status = "ONLINE" WHERE id = ?', [helperId]);
                    await db.query('UPDATE helper_status SET status = "AVAILABLE" WHERE helper_id = ?', [helperId]);
                }
            }

            return res.json({ success: true, message: 'OTP verified' });
        } else {
            otpAttempts[attemptKey] = (otpAttempts[attemptKey] || 0) + 1;
            const remaining = 3 - otpAttempts[attemptKey];

            return res.status(400).json({
                success: false,
                error: `Wrong OTP. ${remaining} attempts remaining.`,
                attempts_remaining: remaining
            });
        }
    } catch (err) {
        console.error('Error verifying OTP:', err);
        return res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
