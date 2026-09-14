const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const axios = require('axios');
const pool = require('../config/db');

// Helper to notify Python bot of payment success
const notifyBotPaymentSuccess = async (orderId, paymentId) => {
  try {
    const internalSecret = process.env.INTERNAL_SECRET || 'n2d_internal_2026_secure';
    const botUrl = process.env.BOT_INTERNAL_URL || 'http://127.0.0.1:8000/internal/payment-success';
    await axios.post(botUrl, {
      order_code: orderId,
      payment_method: 'Razorpay',
      transaction_id: paymentId,
      secret: internalSecret
    });
    console.log(`[Razorpay Bot Notify]: Successfully notified bot for order ${orderId}`);
  } catch (err) {
    console.error(`[Razorpay Bot Notify Error]: ${err.message}`);
  }
};

// Initialize Razorpay instance
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay API keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing in environment configuration.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * POST /api/payments/create-order
 * Body: { amount (in INR), orderId, customerName, customerPhone }
 */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, orderId, customerName, customerPhone } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid payment amount is required.' });
    }

    const instance = getRazorpayInstance();
    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId || `receipt_${Date.now()}`,
      notes: {
        orderId: orderId || '',
        customerName: customerName || '',
        customerPhone: customerPhone || ''
      }
    };

    const order = await instance.orders.create(options);

    return res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    });
  } catch (error) {
    console.error('[Razorpay Create Order Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create Razorpay payment order'
    });
  }
});

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId }
 */
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing required Razorpay verification payload.' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const bodyData = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyData.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Update order status in DB if orderId provided
      if (orderId) {
        if (pool) {
          try {
            await pool.query(
              `UPDATE orders 
               SET payment_status = 'PAID', 
                   payment_method = 'RAZORPAY', 
                   razorpay_payment_id = ?, 
                   updated_at = NOW() 
               WHERE id = ? OR order_id = ?`,
              [razorpay_payment_id, orderId, orderId]
            );
          } catch (dbErr) {
            console.warn('[Razorpay DB Update Warning]:', dbErr.message);
          }
        }
        // Notify Python Bot automatically to complete order flow / invoice receipt
        notifyBotPaymentSuccess(orderId, razorpay_payment_id);
      }

      return res.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature verification failed.'
      });
    }
  } catch (error) {
    console.error('[Razorpay Verification Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Payment verification failed'
    });
  }
});

/**
 * POST /api/payments/webhook
 * Webhook handler for async payment events from Razorpay server
 */
router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (signature && secret) {
      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const receiptId = paymentEntity?.notes?.orderId || paymentEntity?.receipt;

      if (receiptId) {
        if (pool) {
          await pool.query(
            `UPDATE orders SET payment_status = 'PAID', updated_at = NOW() WHERE id = ? OR order_id = ?`,
            [receiptId, receiptId]
          );
        }
        notifyBotPaymentSuccess(receiptId, paymentEntity?.id);
      }
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Razorpay Webhook Error]:', err);
    return res.status(500).json({ status: 'error' });
  }
});

module.exports = router;
