const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');

// WhatsApp Configs
const WA_TOKEN = process.env.WA_TOKEN;
const WA_PHONE_ID = process.env.WA_PHONE_ID || '';
const ADMIN_NUMBER = process.env.ADMIN_PHONE_NUMBER || '917981072623';
const WA_API_URL = `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`;

async function notifyAdminSupportResolved(customerName, customerPhone, id) {
    if (!WA_TOKEN || !WA_PHONE_ID) {
        console.log('[WA MOCK] Support Resolved to Admin:', ADMIN_NUMBER, `Issue #${id} for ${customerName} resolved.`);
        return;
    }
    try {
        const text = `✅ *Support Request Resolved* 🎉\n\n` +
                     `🆔 Request ID: #${id}\n` +
                     `👤 Customer  : ${customerName}\n` +
                     `📱 Phone     : ${customerPhone}\n\n` +
                     `The issue has been successfully marked as *RESOLVED* on the dashboard.`;

        await axios.post(WA_API_URL, {
            messaging_product: "whatsapp",
            to: ADMIN_NUMBER.replace(/\D/g, ''),
            type: "text",
            text: { body: text }
        }, {
            headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' }
        });
        console.log(`[SUPPORT] Resolved notification sent to admin for request #${id}`);
    } catch (err) {
        console.error('[WA ERROR] Failed to send support resolved message to admin:', err.response?.data || err.message);
    }
}

async function notifyCustomerSupportResolved(customerName, customerPhone, id) {
    if (!WA_TOKEN || !WA_PHONE_ID) {
        console.log('[WA MOCK] Support Resolved to Customer:', customerPhone, `Issue #${id} resolved.`);
        return;
    }
    try {
        const text = `✅ *Need2Done Support Request Resolved* 🛠️\n\n` +
                     `Dear ${customerName},\n` +
                     `Your support request (Ticket #${id}) has been successfully marked as *RESOLVED* by our team.\n\n` +
                     `Thank you for contacting Need2Done! Let us know if you need anything else. 👋`;

        await axios.post(WA_API_URL, {
            messaging_product: "whatsapp",
            to: customerPhone.replace(/\D/g, ''),
            type: "text",
            text: { body: text }
        }, {
            headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' }
        });
        console.log(`[SUPPORT] Resolved notification sent to customer ${customerPhone}`);
    } catch (err) {
        console.error('[WA ERROR] Failed to send support resolved message to customer:', err.response?.data || err.message);
    }
}

// ==========================================
// GET /api/support — List all support requests
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, customer_name, customer_phone, status, created_at
            FROM support_requests
            ORDER BY created_at DESC
        `);
        res.json({ success: true, requests: rows });
    } catch (err) {
        console.error('Error fetching support requests:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/support/:id/resolve — Mark as resolved & notify
// ==========================================
router.post('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch details before resolving
        const [requests] = await db.query(
            'SELECT customer_name, customer_phone FROM support_requests WHERE id = ?',
            [id]
        );

        await db.query(
            'UPDATE support_requests SET status = "RESOLVED" WHERE id = ?',
            [id]
        );

        if (requests.length > 0) {
            const { customer_name, customer_phone } = requests[0];
            // Trigger notifications asynchronously
            notifyAdminSupportResolved(customer_name, customer_phone, id);
            notifyCustomerSupportResolved(customer_name, customer_phone, id);
        }

        res.json({ success: true, message: 'Request marked as resolved and notifications sent' });
    } catch (err) {
        console.error('Error resolving support request:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
