const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');

const { authenticateAdmin, authenticateToken, authenticateInternalOrToken } = require('../middleware/auth');


// ==========================================
// WhatsApp API Configuration (for helper notifications)
// ==========================================

const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '917095849056';

function getWaToken() {
    return process.env.WA_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
}

function getWaPhoneId() {
    return process.env.WA_PHONE_ID || process.env.WHATSAPP_PHONE_ID || '';
}

function getWaApiUrl() {
    const phoneId = getWaPhoneId();
    return `https://graph.facebook.com/v19.0/${phoneId}/messages`;
}

async function sendWhatsAppText(to, text) {
    const token = getWaToken();
    const phoneId = getWaPhoneId();
    if (!token || !phoneId) {
        console.log('[WA MOCK] To:', to, 'Text:', text);
        return;
    }
    try {
        await axios.post(getWaApiUrl(), {
            messaging_product: "whatsapp",
            to: to.replace(/\D/g, ''),
            type: "text",
            text: { body: text }
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('[WA ERROR] Failed to send message:', err.response?.data || err.message);
    }
}

async function sendWhatsAppButton(to, body, buttons) {
    const token = getWaToken();
    const phoneId = getWaPhoneId();
    if (!token || !phoneId) {
        console.log('[WA MOCK] Button to:', to, 'Body:', body);
        return;
    }
    try {
        const safeButtons = buttons.slice(0, 3).map(b => ({
            type: "reply",
            reply: { id: String(b.id).substring(0, 256), title: String(b.title).substring(0, 20) }
        }));
        await axios.post(getWaApiUrl(), {
            messaging_product: "whatsapp",
            to: to.replace(/\D/g, ''),
            type: "interactive",
            interactive: {
                type: "button",
                body: { text: body.substring(0, 1024) },
                action: { buttons: safeButtons }
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('[WA ERROR] Failed to send button:', err.response?.data || err.message);
    }
}

// ==========================================
// GET /api/orders — List all orders (Admin Dashboard)
// Supports ?engine_type=TASK or ?engine_type=RIDE filter, and ?date=YYYY-MM-DD
// ==========================================
router.get('/', authenticateAdmin, async (req, res) => {

    try {
        const { status, engine_type, date, service, search, q } = req.query;
        const searchQueryParam = search || q;

        let query = `
            SELECT o.*, c.phone as customer_phone,
                   h.name as helper_name,
                   v.name as vendor_name,
                   ot.items_text, 
                   (SELECT GROUP_CONCAT(media_id) FROM order_images WHERE order_id = o.id AND image_type = 'ITEM') as item_media_ids,
                   (SELECT media_id FROM order_images WHERE order_id = o.id AND image_type = 'BILL' LIMIT 1) as bill_media_id,
                   orid.vehicle_type, orid.pickup_lat, orid.pickup_lng, 
                   orid.drop_lat, orid.drop_lng,
                   orid.locked as ride_locked
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN helpers h ON o.helper_id = h.id
            LEFT JOIN vendors v ON o.vendor_id = v.id
            LEFT JOIN order_tasks ot ON o.id = ot.order_id
            LEFT JOIN order_rides orid ON o.id = orid.order_id
            WHERE 1=1
        `;
        const params = [];

        if (searchQueryParam && searchQueryParam.trim()) {
            const s = '%' + searchQueryParam.trim().replace(/^#/, '') + '%';
            query += ` AND (o.order_id LIKE ? OR o.customer_name LIKE ? OR o.customer_number LIKE ? OR ot.items_text LIKE ? OR o.status LIKE ? OR h.name LIKE ? OR v.name LIKE ? OR o.service LIKE ?)`;
            params.push(s, s, s, s, s, s, s, s);
        } else {
            if (date) {
                query += ` AND DATE(o.created_at) = ?`;
                params.push(date);
            }
        }

        if (status) {
            query += ` AND o.status = ?`;
            params.push(status);
        }
        if (engine_type) {
            query += ` AND o.engine_type = ?`;
            params.push(engine_type);
        }
        if (service) {
            query += ` AND o.service LIKE ?`;
            params.push('%' + service + '%');
        }

        query += ` ORDER BY o.created_at DESC LIMIT 500`;

        const [rows] = await db.query(query, params);
        res.json({ success: true, orders: rows });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// GET /api/orders/:id — Single order detail (Protected)
// ==========================================
router.get('/:id', authenticateInternalOrToken, async (req, res) => {

    try {
        const [rows] = await db.query(`
            SELECT o.*, c.phone as customer_phone,
                   h.name as helper_name, h.phone as helper_phone
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN helpers h ON o.helper_id = h.id
            WHERE o.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, order: rows[0] });
    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/orders — Create new order (Protected)
// Body: { customer_phone, customer_name, service, bill_amount }
// ==========================================
router.post('/', authenticateInternalOrToken, async (req, res) => {

    try {
        const { customer_phone, customer_name, service, bill_amount } = req.body;

        // Find or create customer
        let [custRows] = await db.query('SELECT id FROM customers WHERE phone = ?', [customer_phone]);
        let customerId;
        if (custRows.length === 0) {
            const [result] = await db.query('INSERT INTO customers (phone, name) VALUES (?, ?)', [customer_phone, customer_name || 'Guest']);
            customerId = result.insertId;
        } else {
            customerId = custRows[0].id;
        }

        // Generate unique order_id string
        const orderIdStr = `N2D-${Date.now().toString().slice(-6)}`;

        // Create order
        const [orderResult] = await db.query(
            `INSERT INTO orders (order_id, customer_id, customer_number, customer_name, service, status, bill_amount) 
             VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?)`,
            [orderIdStr, customerId, customer_phone, customer_name || 'Guest', service || 'General', bill_amount || 0]
        );
        
        const orderDbId = orderResult.insertId;

        // Add to timeline
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'CREATED', 'Order confirmed by customer', 'CUSTOMER')`, [orderDbId]);

        res.json({ success: true, order_id: orderDbId, display_id: orderIdStr });
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/orders/:id/approve — Admin approves bill
// Notifies helper to proceed to customer
// ==========================================
router.post('/:id/approve', authenticateAdmin, async (req, res) => {

    try {
        // Get order + helper details before updating
        const [orders] = await db.query(`
            SELECT o.*, h.phone as helper_phone, h.name as helper_name
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            WHERE o.id = ?
        `, [req.params.id]);

        await db.query('UPDATE orders SET status = "ADMIN_APPROVED_BILL", approved_at = NOW() WHERE id = ?', [req.params.id]);
        
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'BILL_APPROVED', 'Admin approved the bill', 'ADMIN')`, [req.params.id]);

        // 📢 Notify helper to proceed
        if (orders.length > 0 && orders[0].helper_phone) {
            const order = orders[0];
            const deliveryLink = order.customer_lat ? `https://www.google.com/maps/dir/?api=1&destination=${order.customer_lat},${order.customer_lng}` : 'Shared via WhatsApp';
            const msg = 
                `✅ *Bill Approved – Need2Done*\n\n` +
                `🆔 Order : ${order.order_id}\n` +
                `💰 Amount: ₹${order.bill_amount || 0}\n\n` +
                `🛍️ Pick up items from the store, then tap *Picked Up*.`;
            
            await sendWhatsAppButton(order.helper_phone, msg, [
                { id: `PICKED_UP|${order.id}`, title: '🛍️ Picked Up' }
            ]);
            console.log(`[APPROVE] Notification sent to helper ${order.helper_name}`);
        }

        res.json({ success: true, message: 'Order bill approved' });
    } catch (err) {
        console.error('Error approving order:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// POST /api/orders/:id/assign — Admin assigns helper
// Body: { helper_id }
// Sends WhatsApp notification to helper with full order details
// ==========================================
router.post('/:id/assign', authenticateAdmin, async (req, res) => {
    try {
        const { helper_id } = req.body;
        
        // Get helper details
        const [helpers] = await db.query('SELECT id, phone, name, helper_code FROM helpers WHERE id = ?', [helper_id]);
        if (helpers.length === 0) return res.status(404).json({ success: false, error: 'Helper not found' });
        
        const helper = helpers[0];

        // Get order details for the notification
        const [orders] = await db.query(`
            SELECT o.*, c.name as customer_name, c.phone as customer_phone, ot.items_text
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN order_tasks ot ON o.id = ot.order_id
            WHERE o.id = ?
        `, [req.params.id]);
        
        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        // Add timeline entry
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'OFFER_SENT', ?, 'ADMIN')`, 
                        [req.params.id, `Offer sent to helper ${helper.name}`]);

        // Fetch cart items or task description
        const [cartItems] = await db.query('SELECT product_name, quantity, unit FROM cart_items WHERE order_id = ?', [order.order_id]);
        
        let itemsText = "";
        if (cartItems && cartItems.length > 0) {
            itemsText = cartItems.map(i => `• ${i.quantity}x ${i.product_name} (${i.unit})`).join('\n');
        } else if (order.items_text) {
            itemsText = order.items_text;
        }

        const itemsBlock = itemsText ? `🛍️ *Items / Details:*\n${itemsText}\n\n` : '';
        const helperEarning = order.helper_charge ? `💰 *Earnings:* ₹${order.helper_charge}\n` : '';
        const serviceName = order.service || 'General Service';

        // ==========================================
        // 💬 SEND ASSIGNMENT OFFER TO HELPER
        // ==========================================
        
        const offerMessage = 
            `📣 *New Order Assignment*\n\n` +
            `You have been assigned to order *${order.order_id}*.\n\n` +
            `🛠️ *Service:* ${serviceName}\n` +
            `👤 *Customer:* ${order.customer_name || 'Customer'}\n` +
            `${helperEarning}` +
            `📍 *Location:* ${order.customer_lat ? 'Available' : 'TBD'}\n\n` +
            `Please accept or reject this assignment.`;

        try {
            await sendWhatsAppButton(helper.phone, offerMessage, [
                { id: `ACCEPT_ORDER|${order.order_id}`, title: '✅ Accept' },
                { id: `REJECT_ORDER|${order.order_id}`, title: '❌ Reject' }
            ]);
            console.log(`[ASSIGN] Sent assignment offer to helper ${helper.name} (${helper.phone}) for order ${order.order_id}`);
            res.json({ success: true, message: 'Assignment offer sent to helper via WhatsApp' });
        } catch (err) {
            console.error('[ASSIGN ERROR] Failed to send offer via WhatsApp:', err.message);
            res.status(500).json({ success: false, error: 'Failed to send offer to helper' });
        }
    } catch (err) {
        console.error('Error assigning helper:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/orders/:id/assign-vendor — Admin assigns vendor
// ==========================================
router.post('/:id/assign-vendor', authenticateAdmin, async (req, res) => {

    try {
        const { vendor_id } = req.body;
        
        const [vendors] = await db.query('SELECT * FROM vendors WHERE id = ?', [vendor_id]);
        if (vendors.length === 0) return res.status(404).json({ success: false, error: 'Vendor not found' });
        const vendor = vendors[0];

        const [orders] = await db.query(`
            SELECT o.*, c.name as customer_name, h.name as helper_name, h.phone as helper_phone, ot.items_text
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN helpers h ON o.helper_id = h.id
            LEFT JOIN order_tasks ot ON o.id = ot.order_id
            WHERE o.id = ?
        `, [req.params.id]);
        
        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        // Update order
        await db.query('UPDATE orders SET vendor_id = ?, vendor_status = "PENDING" WHERE id = ?', [vendor_id, req.params.id]);
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'VENDOR_ASSIGNED', ?, 'ADMIN')`, 
                        [req.params.id, `Vendor ${vendor.name} assigned to order.`]);

        // Send WhatsApp to Vendor (ONLY Order ID and Item details)
        const [cartItems] = await db.query('SELECT product_name, quantity, unit FROM cart_items WHERE order_id = ?', [order.order_id]);
        let itemsText = "No items specified.";
        if (cartItems.length > 0) {
            itemsText = cartItems.map(i => `• ${i.quantity}x ${i.product_name} (${i.unit})`).join('\n');
        } else if (order.items_text) {
            itemsText = order.items_text;
        } else {
            try {
                const payload = JSON.parse(order.payload || '{}');
                if (payload.items && payload.items.length > 0) {
                    itemsText = payload.items.map(i => `• ${i}`).join('\n');
                }
            } catch(e) {}
        }

        const vendorMsg = 
            `📦 *New Order Pickup!*\n\n` +
            `🆔 *Order ID:* ${order.order_id}\n` +
            `🛠️ *Service:* ${order.service || 'Groceries'}\n\n` +
            `🛍️ *Items to Pack:*\n${itemsText}\n\n` +
            `Please accept or reject to confirm item availability.`;

        await sendWhatsAppButton(vendor.phone, vendorMsg, [
            { id: `VENDOR_ACCEPT|${order.order_id}`, title: '✅ Accept' },
            { id: `VENDOR_REJECT|${order.order_id}`, title: '❌ Reject' }
        ]);

        res.json({ success: true, message: 'Vendor assigned successfully' });
    } catch (err) {
        console.error('Error assigning vendor:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/orders/:id/verify-items — Admin verifies item photos
// ==========================================
router.post('/:id/verify-items', authenticateAdmin, async (req, res) => {
    try {
        const UPI_ID = process.env.UPI_ID || '';

        // Get order details
        const [orders] = await db.query(`
            SELECT o.*, h.phone as helper_phone, h.name as helper_name,
                   c.phone as customer_phone
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [req.params.id]);

        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        const service = order.service || 'General';
        let helperChargeKey = 'HELPER_CHARGE';
        let platformFeeKey = 'PLATFORM_FEE';

        const svcLower = service.toLowerCase();
        if (svcLower.includes('groceries')) {
            helperChargeKey = 'HELPER_CHARGE_GROCERIES';
            platformFeeKey = 'PLATFORM_FEE_GROCERIES';
        } else if (svcLower.includes('medicine')) {
            helperChargeKey = 'HELPER_CHARGE_MEDICINES';
            platformFeeKey = 'PLATFORM_FEE_MEDICINES';
        } else if (svcLower.includes('anywork') || svcLower.includes('any work')) {
            helperChargeKey = 'HELPER_CHARGE_ANYWORK';
            platformFeeKey = 'PLATFORM_FEE_ANYWORK';
        } else if (svcLower.includes('ride')) {
            helperChargeKey = 'HELPER_CHARGE_RIDE';
            platformFeeKey = 'PLATFORM_FEE_RIDE';
        } else if (svcLower.includes('veg') || svcLower.includes('fruit')) {
            helperChargeKey = 'HELPER_CHARGE_VEG_FRUITS';
            platformFeeKey = 'PLATFORM_FEE_VEG_FRUITS';
        } else if (svcLower.includes('food')) {
            helperChargeKey = 'HELPER_CHARGE_FOOD';
            platformFeeKey = 'PLATFORM_FEE_FOOD';
        } else if (svcLower.includes('home')) {
            helperChargeKey = 'HELPER_CHARGE_HOMESERVICES';
            platformFeeKey = 'PLATFORM_FEE_HOMESERVICES';
        }

        const HELPER_CHARGE = parseFloat(process.env[helperChargeKey] || process.env.HELPER_CHARGE || '20');
        const PLATFORM_FEE = parseFloat(process.env[platformFeeKey] || process.env.PLATFORM_FEE || '5');

        if (order.status !== 'ITEM_PHOTO_UPLOADED') {
            return res.status(400).json({ success: false, error: `Order not in verifiable state (current: ${order.status})` });
        }

        const billAmount = parseFloat(order.bill_amount || 0);
        const total = billAmount + HELPER_CHARGE + PLATFORM_FEE;

        await db.query('UPDATE orders SET status = "ADMIN_VERIFY_ITEMS", updated_at = NOW() WHERE id = ?', [req.params.id]);

        await db.query(
            'UPDATE orders SET status = "PAYMENT_GENERATED", total_amount = ?, platform_fee = ?, helper_charge = ?, payment_status = "PENDING", updated_at = NOW() WHERE id = ?',
            [total, PLATFORM_FEE, HELPER_CHARGE, req.params.id]
        );

        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'ITEMS_VERIFIED', 'Admin verified items and generated payment', 'ADMIN')`, [req.params.id]);

        const customerPhone = order.customer_number || order.customer_phone;
        if (customerPhone) {
            const paymentMsg = 
                `💰 *Payment Required – Need2Done*\n\n` +
                `🆔 Order : ${order.order_id}\n` +
                `🧾 Bill  : ₹${billAmount}\n` +
                `🚚 Delivery: ₹${HELPER_CHARGE}\n` +
                `📋 Platform: ₹${PLATFORM_FEE}\n` +
                `━━━━━━━━━━━━━━━\n` +
                `💳 *Total : ₹${total}*\n\n` +
                `Choose payment method:`;

            await sendWhatsAppButton(customerPhone, paymentMsg, [
                { id: `PAY_UPI_${req.params.id}`, title: '💳 UPI' },
                { id: `PAY_COD_${req.params.id}`, title: '💵 Cash on Delivery' }
            ]);
            console.log(`[VERIFY] Payment options sent to customer ${customerPhone}`);
        }

        if (order.helper_phone) {
            await sendWhatsAppText(order.helper_phone, 
                `✅ Items verified for Order ${order.order_id}.\n⏳ Waiting for customer payment (₹${total}).`
            );
        }

    } catch (err) {
        console.error('Error verifying items:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/orders/:id/cancel — Admin forcefully cancels order
// ==========================================
router.post('/:id/cancel', authenticateAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        
        const [orders] = await db.query(`
            SELECT o.*, h.phone as helper_phone, h.name as helper_name
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            WHERE o.id = ?
        `, [req.params.id]);

        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
            return res.status(400).json({ success: false, error: 'Order is already ' + order.status });
        }

        await db.query('UPDATE orders SET status = "CANCELLED", updated_at = NOW() WHERE id = ?', [req.params.id]);

        if (order.helper_id) {
            await db.query('UPDATE helper_status SET status = "AVAILABLE" WHERE helper_id = ?', [order.helper_id]);
            await db.query('UPDATE helpers SET status = "ONLINE" WHERE id = ?', [order.helper_id]);
        }

        const reasonText = reason ? reason.trim() : 'No reason provided';

        const isCustomer = reason === 'Cancelled by customer';
        const actor = isCustomer ? 'CUSTOMER' : 'ADMIN';
        const timelineMsg = isCustomer ? `Customer cancelled the booking.` : `Admin forcefully cancelled the order. Reason: ${reasonText}`;

        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'CANCELLED', ?, ?)`, 
                        [req.params.id, timelineMsg, actor]);

        await sendWhatsAppText(ADMIN_NUMBER, 
            `⚠️ *Order Cancelled*\n\n` +
            `Order: #${order.order_id}\n` +
            `Cancelled By: ${isCustomer ? 'Customer' : 'Admin'}\n` +
            `Reason: ${reasonText}`
        );

        await sendWhatsAppText(order.customer_number, 
            `❌ *Booking Cancelled*\n\n` +
            `Your order #${order.order_id} has been cancelled.\n` +
            `Reason: ${reasonText}`
        );

        if (order.helper_phone) {
            await sendWhatsAppText(order.helper_phone, 
                `❌ Order ${order.order_id} has been cancelled by ${isCustomer ? 'the customer' : 'admin'}. You are now free to accept new orders.`
            );
        }

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (err) {
        console.error('Error cancelling order:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// PATCH /api/orders/:id/rating  – sync feedback from bot (Protected)
// ==========================================
router.patch('/:id/rating', authenticateInternalOrToken, async (req, res) => {

    try {
        const { rating } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'Rating must be 1–5' });
        }
        await db.query('UPDATE orders SET rating = ?, updated_at = NOW() WHERE id = ?', [rating, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving rating:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// POST /api/orders/:id/unlock — Admin unlocks a locked ride
// ==========================================
router.post('/:id/unlock', authenticateAdmin, async (req, res) => {

    try {
        await db.query('UPDATE order_rides SET locked = 0, otp_attempts = 0 WHERE order_id = ?', [req.params.id]);
        
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'RIDE_UNLOCKED', 'Admin unlocked the ride', 'ADMIN')`, [req.params.id]);

        res.json({ success: true, message: 'Ride unlocked successfully' });
    } catch (err) {
        console.error('Error unlocking ride:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

module.exports = router;
