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
router.get('/', async (req, res) => {

    try {
        const { status, engine_type, date, service, search, q } = req.query;
        const searchQueryParam = search || q;

        let query = `
            SELECT o.*, c.phone as customer_phone,
                   h.name as helper_name,
                   COALESCE(h.device_type, 'SMARTPHONE') as helper_device_type,
                   h.phone as helper_phone_db,
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
            const rawQ = searchQueryParam.trim().replace(/^#/, '');
            const strippedQ = rawQ.replace(/[^a-zA-Z0-9]/g, '');
            const s = '%' + rawQ + '%';
            const sStripped = '%' + (strippedQ || rawQ) + '%';
            query += ` AND (o.order_id LIKE ? OR REPLACE(o.order_id, '-', '') LIKE ? OR o.customer_name LIKE ? OR o.customer_number LIKE ? OR ot.items_text LIKE ? OR o.status LIKE ? OR h.name LIKE ? OR v.name LIKE ? OR o.service LIKE ?)`;
            params.push(s, sStripped, s, s, s, s, s, s, s);
        } else {
            if (date) {
                query += ` AND (DATE(DATE_ADD(o.created_at, INTERVAL 330 MINUTE)) = ? OR DATE(o.created_at) = ?)`;
                params.push(date, date);
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
            const sLower = service.toLowerCase();
            if (sLower.includes('anywork') || sLower.includes('custom') || sLower.includes('work')) {
                query += ` AND (o.service LIKE '%Anywork%' OR o.service LIKE '%Custom%' OR o.service = 'Service' OR o.order_id LIKE 'N2DCW_%')`;
            } else {
                query += ` AND o.service LIKE ?`;
                params.push('%' + service + '%');
            }
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
// GET /api/orders/:id — Single order detail with full timeline & media
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const orderIdParam = String(req.params.id || '').trim();
        const cleanParam = orderIdParam.replace(/^#/, '');
        const strippedParam = cleanParam.replace(/[^a-zA-Z0-9]/g, '');
        const isNumeric = /^\d+$/.test(cleanParam);

        let query = `
            SELECT o.*, c.phone as customer_phone, c.name as customer_db_name,
                   h.name as helper_name, h.phone as helper_phone,
                   COALESCE(h.device_type, 'SMARTPHONE') as helper_device_type,
                   v.name as vendor_name, v.phone as vendor_phone,
                   ot.items_text,
                   (SELECT GROUP_CONCAT(media_id) FROM order_images WHERE order_id = o.id AND image_type = 'ITEM') as item_media_ids,
                   (SELECT media_id FROM order_images WHERE order_id = o.id AND image_type = 'BILL' LIMIT 1) as bill_media_id,
                   orid.vehicle_type as ride_vehicle, orid.pickup_lat, orid.pickup_lng, 
                   orid.drop_lat, orid.drop_lng, orid.locked as ride_locked
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN helpers h ON o.helper_id = h.id
            LEFT JOIN vendors v ON o.vendor_id = v.id
            LEFT JOIN order_tasks ot ON o.id = ot.order_id
            LEFT JOIN order_rides orid ON o.id = orid.order_id
            WHERE ${isNumeric ? 'o.id = ? OR' : ''} o.order_id = ? OR REPLACE(o.order_id, '-', '') = ? OR REPLACE(o.order_id, '_', '') = ?
        `;

        const queryParams = isNumeric 
            ? [parseInt(cleanParam, 10), orderIdParam, cleanParam, strippedParam]
            : [orderIdParam, cleanParam, strippedParam];

        const [rows] = await db.query(query, queryParams);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });

        const order = rows[0];

        // Fetch timeline logs
        try {
            const [timeline] = await db.query('SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
            order.timeline = timeline || [];
        } catch (tErr) {
            order.timeline = [];
        }

        // Parse payload JSON safely
        try {
            if (order.payload && typeof order.payload === 'string') {
                order.parsed_payload = JSON.parse(order.payload);
            }
        } catch (e) {}

        res.json({ success: true, order });
    } catch (err) {
        console.error('Error fetching order details:', err);
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

        const isAnyWork = order.service === 'AnyWork' || (order.order_id && order.order_id.startsWith('N2DCW_'));
        let calculatedEarning = order.helper_charge;
        if (!calculatedEarning || parseFloat(calculatedEarning) === 0 || (isAnyWork && parseFloat(calculatedEarning) === 20.0)) {
            calculatedEarning = isAnyWork ? 25.0 : (calculatedEarning || 20.0);
        }
        const helperEarning = calculatedEarning ? `💰 *Earnings:* ₹${parseFloat(calculatedEarning).toFixed(2)}\n` : '';
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
        res.status(500).json({ success: false, error: err.message || 'DB error' });
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

        let HELPER_CHARGE = order.helper_charge ? parseFloat(order.helper_charge) : parseFloat(process.env[helperChargeKey] || process.env.HELPER_CHARGE || '20');
        if (svcLower.includes('anywork') || svcLower.includes('any work') || (order.order_id && order.order_id.startsWith('N2DCW_'))) {
            if (!HELPER_CHARGE || HELPER_CHARGE === 20.0) {
                HELPER_CHARGE = 25.0;
            }
        }
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

// ==========================================
// ASSISTED WORKFLOW (KEYPAD / OLD PHONE HELPERS)
// ==========================================

// 1. POST /api/orders/:id/assisted/assign — Admin confirms keypad helper & notifies customer
router.post('/:id/assisted/assign', authenticateAdmin, async (req, res) => {
    try {
        const { helper_id } = req.body;
        const [helpers] = await db.query('SELECT id, phone, name, helper_code, COALESCE(device_type, "SMARTPHONE") as device_type FROM helpers WHERE id = ?', [helper_id]);
        if (helpers.length === 0) return res.status(404).json({ success: false, error: 'Helper not found' });
        const helper = helpers[0];

        const [orders] = await db.query(`
            SELECT o.*, c.name as customer_name, c.phone as customer_phone
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [req.params.id]);
        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        // Update order status and assigned helper
        await db.query(`
            UPDATE orders 
            SET helper_id = ?, helper_phone = ?, status = 'HELPER_ASSIGNED', assigned_at = NOW(), tracking_status = 'ASSIGNED'
            WHERE id = ?
        `, [helper.id, helper.phone, order.id]);

        // Helper status to BUSY
        await db.query('UPDATE helpers SET status = "BUSY" WHERE id = ?', [helper.id]);

        // Add timeline log
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'HELPER_ASSIGNED', ?, 'ADMIN')`, 
                        [order.id, `Admin confirmed & assigned keypad helper ${helper.name} (${helper.phone})`]);

        // Parse payload
        let payload = {};
        try {
            payload = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {});
        } catch(e) {}

        const serviceName = payload.serviceName || order.service || 'Home Service';
        const bookingDate = payload.bookingDate || 'Scheduled date';
        const bookingSlot = payload.bookingSlot || '';
        const scheduledTimeStr = bookingSlot ? ` (${bookingDate} at ${bookingSlot})` : '';

        // Notify Customer via WhatsApp
        const customerPhone = order.customer_number || order.customer_phone;
        if (customerPhone) {
            const customerMsg = 
                `✅ *Helper Assigned!*\n\n` +
                `Your service order *${order.order_id}* has been confirmed.\n\n` +
                `👤 *Assigned Professional:* ${helper.name}\n` +
                `📞 *Contact:* ${helper.phone}\n` +
                `🛠️ *Service:* ${serviceName}${scheduledTimeStr}\n\n` +
                `Our professional will arrive at your address as scheduled. Need2Done support is coordinating your request.`;
            await sendWhatsAppText(customerPhone, customerMsg);
        }

        res.json({ success: true, message: `Helper ${helper.name} assigned and customer notified!`, helper_name: helper.name });
    } catch (err) {
        console.error('Error in assisted assign:', err);
        res.status(500).json({ success: false, error: err.message || 'DB error' });
    }
});

// 2. POST /api/orders/:id/assisted/arrived — Helper reaches location and calls Admin
// Admin triggers "Helper Arrived" -> Customer receives arrival + Start OTP + Request Time message
router.post('/:id/assisted/arrived', authenticateAdmin, async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, h.name as helper_name, h.phone as helper_phone, c.phone as customer_phone
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [req.params.id]);
        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        let payload = {};
        try {
            payload = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {});
        } catch(e) {}

        // Ensure 4-digit start OTP
        if (!payload.start_otp) {
            payload.start_otp = String(Math.floor(1000 + Math.random() * 9000));
        }
        const startOtp = payload.start_otp;
        const durationStr = payload.duration || '1 Hour';

        // Update order status to ARRIVED
        await db.query(`
            UPDATE orders 
            SET status = 'ARRIVED', tracking_status = 'ARRIVED', payload = ?, delivery_otp = ?
            WHERE id = ?
        `, [JSON.stringify(payload), startOtp, order.id]);

        // Add timeline log
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'HELPER_ARRIVED', ?, 'ADMIN')`, 
                        [order.id, `Admin marked helper ${order.helper_name || ''} as arrived at customer location`]);

        // Notify Customer via WhatsApp
        const customerPhone = order.customer_number || order.customer_phone;
        if (customerPhone) {
            const customerMsg = 
                `📍 *Helper is at your location!*\n\n` +
                `Your service professional *${order.helper_name || 'Helper'}* has arrived at your address.\n\n` +
                `🔐 Please reply with your *START OTP* directly on this WhatsApp chat to start the service:\n` +
                `*START OTP: ${startOtp}*\n\n` +
                `⏱️ *Scheduled Duration:* ${durationStr}\n` +
                `_(If extra time is required during or after work, you can request an extension.)_`;
            await sendWhatsAppText(customerPhone, customerMsg);
        }

        if (ADMIN_NUMBER) {
            await sendWhatsAppText(ADMIN_NUMBER, `🔔 *Order #${order.order_id}*: Helper arrived at customer location. Start OTP: *${startOtp}*`);
        }

        res.json({ success: true, message: 'Helper marked as arrived and Start OTP sent to customer WhatsApp!', start_otp: startOtp });
    } catch (err) {
        console.error('Error in assisted arrived:', err);
        res.status(500).json({ success: false, error: err.message || 'DB error' });
    }
});

// 3. POST /api/orders/:id/assisted/verify-start-otp — Admin verifies Start OTP
router.post('/:id/assisted/verify-start-otp', authenticateAdmin, async (req, res) => {
    try {
        const { otp } = req.body;
        const [orders] = await db.query(`
            SELECT o.*, h.name as helper_name, c.phone as customer_phone
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [req.params.id]);
        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        let payload = {};
        try {
            payload = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {});
        } catch(e) {}

        const expectedOtp = payload.start_otp || order.delivery_otp;
        if (otp && expectedOtp && String(otp).trim() !== String(expectedOtp).trim()) {
            return res.status(400).json({ success: false, error: `Invalid Start OTP. Expected ${expectedOtp}` });
        }

        const durationStr = payload.duration || '1 Hour';
        let minutes = 60;
        if (durationStr.includes('1.5')) minutes = 90;
        else if (durationStr.includes('2')) minutes = 120;
        else if (durationStr.includes('3')) minutes = 180;
        else if (durationStr.includes('45')) minutes = 45;

        // Update status to SERVICE_STARTED
        await db.query(`
            UPDATE orders 
            SET status = 'SERVICE_STARTED', tracking_status = 'STARTED', 
                service_start_time = NOW(), service_end_time = DATE_ADD(NOW(), INTERVAL ? MINUTE)
            WHERE id = ?
        `, [minutes, order.id]);

        // Timeline
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'SERVICE_STARTED', ?, 'ADMIN')`, 
                        [order.id, `Admin verified Start OTP (${expectedOtp || otp}). Service timer started.`]);

        // Notify Customer via WhatsApp
        const customerPhone = order.customer_number || order.customer_phone;
        if (customerPhone) {
            await sendWhatsAppText(customerPhone, 
                `🛠️ *Service Started!* 🎉\n\n` +
                `Your service professional has begun the work.\n` +
                `Scheduled duration: *${durationStr}*.\n\n` +
                `Once completed, you will receive an End OTP to verify completion.`
            );
        }

        res.json({ success: true, message: 'Start OTP verified! Service is now IN_PROGRESS.' });
    } catch (err) {
        console.error('Error verifying start otp:', err);
        res.status(500).json({ success: false, error: err.message || 'DB error' });
    }
});

// 4. POST /api/orders/:id/assisted/request-end-otp — Admin triggers End OTP to customer
router.post('/:id/assisted/request-end-otp', authenticateAdmin, async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, h.name as helper_name, c.phone as customer_phone
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [req.params.id]);
        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        let payload = {};
        try {
            payload = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {});
        } catch(e) {}

        if (!payload.end_otp) {
            payload.end_otp = String(Math.floor(1000 + Math.random() * 9000));
        }
        const endOtp = payload.end_otp;

        await db.query('UPDATE orders SET payload = ? WHERE id = ?', [JSON.stringify(payload), order.id]);

        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'END_OTP_REQUESTED', ?, 'ADMIN')`, 
                        [order.id, `Admin triggered End OTP (${endOtp}) to customer`]);

        const customerPhone = order.customer_number || order.customer_phone;
        if (customerPhone) {
            await sendWhatsAppText(customerPhone, 
                `🏁 *Service Completion Verification*\n\n` +
                `Your service is wrapping up! Please reply with your *END OTP* directly on this WhatsApp chat to confirm completion:\n\n` +
                `*END OTP: ${endOtp}*`
            );
        }

        if (ADMIN_NUMBER) {
            await sendWhatsAppText(ADMIN_NUMBER, `🔔 *Order #${order.order_id}*: End OTP triggered. Customer End OTP is *${endOtp}*`);
        }

        res.json({ success: true, message: 'End OTP sent to customer WhatsApp!', end_otp: endOtp });
    } catch (err) {
        console.error('Error in request end otp:', err);
        res.status(500).json({ success: false, error: err.message || 'DB error' });
    }
});

// 5. POST /api/orders/:id/assisted/verify-end-otp — Admin enters End OTP to complete job
router.post('/:id/assisted/verify-end-otp', authenticateAdmin, async (req, res) => {
    try {
        const { otp } = req.body;
        const [orders] = await db.query(`
            SELECT o.*, h.name as helper_name, c.phone as customer_phone
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [req.params.id]);
        if (orders.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orders[0];

        let payload = {};
        try {
            payload = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {});
        } catch(e) {}

        const expectedOtp = payload.end_otp;
        if (otp && expectedOtp && String(otp).trim() !== String(expectedOtp).trim()) {
            return res.status(400).json({ success: false, error: `Invalid End OTP. Expected ${expectedOtp}` });
        }

        // Mark COMPLETED, payout tagged as Physical Cash
        await db.query(`
            UPDATE orders 
            SET status = 'COMPLETED', tracking_status = 'COMPLETED', completed_at = NOW(),
                payout_method = 'PHYSICAL_CASH', payout_settled = 0
            WHERE id = ?
        `, [order.id]);

        if (order.helper_id) {
            await db.query('UPDATE helpers SET status = "ONLINE" WHERE id = ?', [order.helper_id]);
            await db.query('UPDATE helper_status SET status = "AVAILABLE" WHERE helper_id = ?', [order.helper_id]);
        }

        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'COMPLETED', ?, 'ADMIN')`, 
                        [order.id, `Admin verified End OTP (${expectedOtp || otp}). Job completed. Payout tagged as Physical Cash.`]);

        const customerPhone = order.customer_number || order.customer_phone;
        if (customerPhone) {
            await sendWhatsAppText(customerPhone, 
                `🎉 *Service Completed Successfully!*\n\n` +
                `Thank you for using Need2Done Home Services. We hope your experience was wonderful!\n\n` +
                `Rate your service (1-5) by replying directly with a number.`
            );
        }

        if (ADMIN_NUMBER) {
            await sendWhatsAppText(ADMIN_NUMBER, 
                `✅ *Job Completed!* Order #${order.order_id} completed.\n` +
                `Helper: ${order.helper_name || 'N/A'}\n` +
                `Physical Payout: ₹${order.helper_charge || 0} (Pending Settlement)`
            );
        }

        res.json({ success: true, message: 'Order completed successfully! Helper payout tagged as Physical Cash.' });
    } catch (err) {
        console.error('Error verifying end otp:', err);
        res.status(500).json({ success: false, error: err.message || 'DB error' });
    }
});

// 6. POST /api/orders/:id/assisted/settle-cash — Admin marks physical cash paid
router.post('/:id/assisted/settle-cash', authenticateAdmin, async (req, res) => {
    try {
        await db.query('UPDATE orders SET payout_settled = 1 WHERE id = ?', [req.params.id]);
        await db.query(`INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                        VALUES (?, 'PAYOUT_SETTLED', 'Admin marked physical cash payout as handed over to helper', 'ADMIN')`, 
                        [req.params.id]);
        res.json({ success: true, message: 'Cash payout marked as settled!' });
    } catch (err) {
        console.error('Error settling cash payout:', err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// ==========================================
// 7. POST /api/orders/call-order — Admin places phone order
// Body: { customer_phone, customer_name, service, engine_type, vehicle_type,
//         service_title, pickup_location, drop_location, distance_km,
//         total_amount, helper_charge, platform_fee, bill_amount,
//         payment_method, helper_id, notes, booking_date, booking_slot }
// ==========================================
router.post('/call-order', authenticateAdmin, async (req, res) => {
    try {
        const {
            customer_phone,
            customer_name,
            service = 'Service',
            engine_type = 'TASK',
            vehicle_type = 'BIKE',
            service_title = 'Phone Booking',
            pickup_location = '',
            drop_location = '',
            distance_km = 0,
            total_amount = 0,
            helper_charge = 0,
            platform_fee = 5,
            bill_amount = 0,
            payment_method = 'CASH',
            helper_id = null,
            notes = '',
            booking_date = null,
            booking_slot = null
        } = req.body;

        if (!customer_phone) {
            return res.status(400).json({ success: false, error: 'Customer phone number is required' });
        }

        // Normalize phone number
        let rawPhone = String(customer_phone).replace(/\D/g, '');
        if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
        const normalizedPhone = rawPhone;

        // 1. Get or create customer
        let [custRows] = await db.query('SELECT id FROM customers WHERE phone = ?', [normalizedPhone]);
        let customerId;
        const finalCustomerName = customer_name && customer_name.trim() ? customer_name.trim() : 'Phone Caller';

        if (custRows.length === 0) {
            const [newCust] = await db.query('INSERT INTO customers (phone, name) VALUES (?, ?)', [normalizedPhone, finalCustomerName]);
            customerId = newCust.insertId;
        } else {
            customerId = custRows[0].id;
            if (customer_name && customer_name.trim()) {
                await db.query('UPDATE customers SET name = ? WHERE id = ?', [customer_name.trim(), customerId]);
            }
        }

        // 2. Determine Order ID code based on engine/service
        const cleanService = (service || '').toLowerCase();
        let prefix = 'N2D_CALL_';
        if (engine_type === 'RIDE' || cleanService.includes('ride')) {
            prefix = 'N2DRD_CALL_';
        } else if (cleanService.includes('custom') || cleanService.includes('anywork') || cleanService.includes('errand')) {
            prefix = 'N2DCW_CALL_';
        } else if (cleanService.includes('home')) {
            prefix = 'N2DHS_CALL_';
        }

        const timestampCode = Date.now().toString().slice(-6);
        const randomNum = Math.floor(100 + Math.random() * 900);
        const orderIdStr = `${prefix}${timestampCode}${randomNum}`;

        const startOtp = String(Math.floor(1000 + Math.random() * 9000));
        const endOtp = String(Math.floor(1000 + Math.random() * 9000));

        const payloadObj = {
            call_order: true,
            source: 'PHONE_CALL',
            created_by: 'ADMIN',
            service_title,
            pickup_location,
            drop_location,
            distance_km: parseFloat(distance_km) || 0,
            vehicle_type: engine_type === 'RIDE' ? vehicle_type : null,
            notes: notes || '',
            start_otp: startOtp,
            end_otp: endOtp,
            bookingDate: booking_date,
            bookingSlot: booking_slot
        };

        const initialStatus = helper_id ? 'HELPER_ACCEPTED' : 'CONFIRMED';
        const parsedTotal = parseFloat(total_amount) || 0;
        const parsedHelper = parseFloat(helper_charge) || 0;
        const parsedPlatform = parseFloat(platform_fee) || 0;
        const parsedBill = parseFloat(bill_amount) || 0;

        // 3. Insert into orders table
        const [orderResult] = await db.query(`
            INSERT INTO orders (
                order_id, engine_type, customer_id, customer_number, customer_name,
                service, status, payment_method, payment_status,
                total_amount, helper_charge, platform_fee, bill_amount,
                helper_id, assigned_at, payload, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ${helper_id ? 'NOW()' : 'NULL'}, ?, NOW())
        `, [
            orderIdStr,
            engine_type,
            customerId,
            normalizedPhone,
            finalCustomerName,
            service,
            initialStatus,
            payment_method || 'CASH',
            parsedTotal,
            parsedHelper,
            parsedPlatform,
            parsedBill,
            helper_id ? parseInt(helper_id) : null,
            JSON.stringify(payloadObj)
        ]);

        const orderDbId = orderResult.insertId;

        // 4. Engine Specific tables
        if (engine_type === 'RIDE') {
            await db.query(`
                INSERT INTO order_rides (
                    order_id, vehicle_type, start_otp, end_otp, otp_attempts, locked
                ) VALUES (?, ?, ?, ?, 0, 0)
            `, [orderDbId, vehicle_type || 'BIKE', startOtp, endOtp]);
        }

        const itemsSummaryText = `📞 [Call Order] ${service_title}\n` +
            (pickup_location ? `📍 Pickup: ${pickup_location}\n` : '') +
            (drop_location ? `🏁 Drop: ${drop_location}\n` : '') +
            (distance_km > 0 ? `📏 Distance: ${distance_km} km\n` : '') +
            (notes ? `📝 Note: ${notes}` : '');

        await db.query(`
            INSERT INTO order_tasks (order_id, items_text, bill_amount)
            VALUES (?, ?, ?)
        `, [orderDbId, itemsSummaryText, parsedBill > 0 ? parsedBill : parsedTotal]);

        await db.query(`
            INSERT INTO order_items (order_id, item_text)
            VALUES (?, ?)
        `, [orderDbId, `${service_title}${distance_km > 0 ? ` (${distance_km} km)` : ''}`]);

        // 5. Timeline
        await db.query(`
            INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by)
            VALUES (?, 'CALL_ORDER_CREATED', ?, 'ADMIN')
        `, [orderDbId, `Order #${orderIdStr} created by Admin via Phone Call for ${finalCustomerName} (${normalizedPhone})`]);

        // 6. Handle Helper Assignment if helper_id provided
        let helperInfo = null;
        if (helper_id) {
            const [hRows] = await db.query('SELECT id, name, phone, device_type FROM helpers WHERE id = ?', [helper_id]);
            if (hRows.length > 0) {
                helperInfo = hRows[0];
                await db.query('UPDATE helpers SET status = "BUSY" WHERE id = ?', [helper_id]);
                await db.query('UPDATE helper_status SET status = "UNAVAILABLE" WHERE helper_id = ?', [helper_id]);

                await db.query(`
                    INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by)
                    VALUES (?, 'HELPER_ASSIGNED', ?, 'ADMIN')
                `, [orderDbId, `Directly assigned to Helper ${helperInfo.name} (${helperInfo.device_type})`]);

                // Send assignment notification to helper WhatsApp if smartphone
                if (helperInfo.device_type !== 'KEYPAD' && helperInfo.phone) {
                    const helperMsg = `📣 *New Assigned Call Order!* 🛵\n\n` +
                        `🆔 *Order:* #${orderIdStr}\n` +
                        `🛠 *Service:* ${service_title}\n` +
                        `👤 *Customer:* ${finalCustomerName}\n` +
                        `📞 *Phone:* ${normalizedPhone}\n` +
                        (pickup_location ? `📍 *Pickup:* ${pickup_location}\n` : '') +
                        (drop_location ? `🏁 *Drop:* ${drop_location}\n` : '') +
                        `💰 *Your Payout:* ₹${parsedHelper}\n` +
                        `💵 *Payment Mode:* ${payment_method === 'CASH' ? 'Collect Cash from Customer' : 'Customer paying online'}\n\n` +
                        `Please proceed to serve this customer immediately!`;
                    
                    await sendWhatsAppText(helperInfo.phone, helperMsg);
                }
            }
        }

        // 7. Send WhatsApp Confirmation to Customer
        const trackUrl = `https://need2done.in/track/${orderIdStr}`;
        const payText = payment_method === 'CASH' ? '💵 Cash to Helper on Delivery' : '💳 Online Payment (UPI)';
        
        const customerMsg = `🎉 *Need2Done Order Confirmed!*\n\n` +
            `Hello *${finalCustomerName}*, your booking made by phone call is confirmed.\n\n` +
            `🆔 *Order ID:* #${orderIdStr}\n` +
            `🛠️ *Service:* ${service_title}\n` +
            (pickup_location ? `📍 *Pickup:* ${pickup_location}\n` : '') +
            (drop_location ? `🏁 *Drop:* ${drop_location}\n` : '') +
            `💰 *Total Amount:* ₹${parsedTotal}\n` +
            `💳 *Payment Mode:* ${payText}\n` +
            (helperInfo ? `🛵 *Assigned Helper:* ${helperInfo.name}\n` : `🛵 *Helper:* Assigning shortly...\n`) +
            `\n📲 *Live Tracking Link:*\n${trackUrl}\n\n` +
            `📞 Need help? Call Support: 7095849056\n` +
            `Thank you for choosing Need2Done!`;

        await sendWhatsAppText(normalizedPhone, customerMsg);

        // 8. Notify Admin WhatsApp
        if (ADMIN_NUMBER) {
            await sendWhatsAppText(ADMIN_NUMBER, 
                `🔔 *New Call Order Placed!* #${orderIdStr}\n` +
                `👤 Customer: ${finalCustomerName} (${normalizedPhone})\n` +
                `🛠️ Service: ${service_title}\n` +
                `💰 Fare: ₹${parsedTotal} | Helper: ₹${parsedHelper} | N2D: ₹${parsedPlatform}\n` +
                `🛵 Assigned: ${helperInfo ? helperInfo.name : 'Auto-Broadcast'}`
            );
        }

        res.json({
            success: true,
            order_id: orderDbId,
            display_id: orderIdStr,
            customer_name: finalCustomerName,
            customer_phone: normalizedPhone,
            total_amount: parsedTotal,
            helper_charge: parsedHelper,
            platform_fee: parsedPlatform,
            message: 'Call order created successfully and customer intimated via WhatsApp!'
        });
    } catch (err) {
        console.error('Error creating call order:', err);
        res.status(500).json({ success: false, error: err.message || 'DB error' });
    }
});

module.exports = router;
