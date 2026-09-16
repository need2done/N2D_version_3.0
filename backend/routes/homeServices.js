const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');

const WA_TOKEN = process.env.WA_TOKEN || '';
const WA_PHONE_ID = process.env.WA_PHONE_ID || '';
const WA_API_URL = `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`;
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '917095849056';

async function sendWhatsAppText(to, text) {
    if (!WA_TOKEN || !WA_PHONE_ID) {
        console.log('[WA MOCK] To:', to, 'Text:', text);
        return;
    }
    try {
        await axios.post(WA_API_URL, {
            messaging_product: "whatsapp",
            to: to.replace(/\D/g, ''),
            type: "text",
            text: { body: text }
        }, {
            headers: { 'Authorization': `Bearer ${WA_TOKEN}` }
        });
    } catch (e) {
        console.error('WA Send Error:', e.response?.data || e.message);
    }
}

// ==========================================
// 1. GET ALL SERVICES (WITH CATEGORIES)
// ==========================================
router.get('/services', async (req, res) => {
    try {
        // Ensure tables exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS hs_service_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                icon VARCHAR(100) DEFAULT 'wrench',
                description TEXT,
                is_active TINYINT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS hs_services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL,
                title VARCHAR(150) NOT NULL,
                description TEXT,
                rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                helper_charge DECIMAL(10,2) DEFAULT 0.00,
                platform_fee DECIMAL(10,2) DEFAULT 5.00,
                duration VARCHAR(50) DEFAULT '1 Hour',
                icon VARCHAR(100) DEFAULT 'Wrench',
                is_active TINYINT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if categories empty, insert defaults if so
        const [cats] = await db.query('SELECT COUNT(*) as cnt FROM hs_service_categories');
        if (cats[0].cnt === 0) {
            await db.query(`
                INSERT INTO hs_service_categories (id, name, icon, description) VALUES
                (1, 'Electrician', 'Zap', 'Electrical repair, installation & wiring'),
                (2, 'Plumber', 'Droplet', 'Plumbing leakage, pipe fitting & tap repair'),
                (3, 'AC & Appliance Repair', 'Wind', 'AC servicing, fridge & washing machine repair'),
                (4, 'Cleaning & Pest Control', 'Sparkles', 'Home deep cleaning & pest management'),
                (5, 'Carpenter & Painter', 'Hammer', 'Furniture repair, woodworking & painting')
            `);
            await db.query(`
                INSERT INTO hs_services (category_id, title, description, rate, helper_charge, platform_fee, duration) VALUES
                (1, 'Switch & Socket Repair', 'Fixing loose wiring, faulty switches or sockets', 149.00, 130.00, 19.00, '45 Mins'),
                (1, 'Fan Repair & Installation', 'Ceiling or wall fan installation and regulator fix', 199.00, 175.00, 24.00, '1 Hour'),
                (2, 'Tap & Pipe Leakage Repair', 'Fixing leaking faucets, flush tanks or pipe joints', 199.00, 175.00, 24.00, '1 Hour'),
                (3, 'AC General Service', 'Deep foam filter cleaning & pressure check', 499.00, 435.00, 64.00, '1.5 Hours'),
                (4, 'Full Bathroom Cleaning', 'Tile scrubbing, stain removal & sanitization', 349.00, 300.00, 49.00, '1 Hour')
            `);
        }

        const [services] = await db.query(`
            SELECT s.*, c.name as category_name, c.icon as category_icon
            FROM hs_services s
            JOIN hs_service_categories c ON s.category_id = c.id
            ORDER BY c.id ASC, s.id ASC
        `);
        res.json({ success: true, services });
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ==========================================
// 1B. ADMIN: GET ALL CATEGORIES & SERVICES
// ==========================================
router.get('/admin/services', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM hs_service_categories ORDER BY id ASC');
        const [services] = await db.query(`
            SELECT s.*, c.name as category_name, c.icon as category_icon
            FROM hs_services s
            LEFT JOIN hs_service_categories c ON s.category_id = c.id
            ORDER BY s.id DESC
        `);
        res.json({ success: true, categories, services });
    } catch (err) {
        console.error('Error in admin services fetch:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch admin home services' });
    }
});

// ==========================================
// 1C. ADMIN: ADD NEW HOME SERVICE
// ==========================================
router.post('/admin/services', async (req, res) => {
    const { category_id, title, description, rate, helper_charge, platform_fee, duration, icon } = req.body;
    if (!category_id || !title || rate === undefined) {
        return res.status(400).json({ success: false, error: 'Category, title, and rate are required' });
    }
    try {
        const numRate = parseFloat(rate || 0);
        const numPF = parseFloat(platform_fee || 5);
        const numHC = parseFloat(helper_charge || (numRate > 0 ? numRate - numPF : 0));

        const [result] = await db.query(`
            INSERT INTO hs_services (category_id, title, description, rate, helper_charge, platform_fee, duration, icon, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [category_id, title, description || '', numRate, numHC, numPF, duration || '1 Hour', icon || 'Wrench']);

        res.json({ success: true, message: 'Home service created successfully', id: result.insertId });
    } catch (err) {
        console.error('Error adding home service:', err);
        res.status(500).json({ success: false, error: 'Database insert failed' });
    }
});

// ==========================================
// 1D. ADMIN: UPDATE HOME SERVICE
// ==========================================
router.put('/admin/services/:id', async (req, res) => {
    const { id } = req.params;
    const { category_id, title, description, rate, helper_charge, platform_fee, duration, icon, is_active } = req.body;
    try {
        const numRate = parseFloat(rate || 0);
        const numPF = parseFloat(platform_fee || 5);
        const numHC = parseFloat(helper_charge || (numRate > 0 ? numRate - numPF : 0));
        const activeState = is_active !== undefined ? (is_active ? 1 : 0) : 1;

        await db.query(`
            UPDATE hs_services
            SET category_id = ?, title = ?, description = ?, rate = ?, helper_charge = ?, platform_fee = ?, duration = ?, icon = ?, is_active = ?
            WHERE id = ?
        `, [category_id, title, description, numRate, numHC, numPF, duration, icon, activeState, id]);

        res.json({ success: true, message: 'Home service updated successfully' });
    } catch (err) {
        console.error('Error updating home service:', err);
        res.status(500).json({ success: false, error: 'Database update failed' });
    }
});

// ==========================================
// 1E. ADMIN: TOGGLE HOME SERVICE ACTIVE STATUS
// ==========================================
router.put('/admin/services/:id/toggle', async (req, res) => {
    const { id } = req.params;
    try {
        const [current] = await db.query('SELECT is_active FROM hs_services WHERE id = ?', [id]);
        if (current.length === 0) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }
        const newStatus = current[0].is_active === 1 ? 0 : 1;
        await db.query('UPDATE hs_services SET is_active = ? WHERE id = ?', [newStatus, id]);
        res.json({ success: true, message: `Service ${newStatus ? 'activated' : 'deactivated'}`, is_active: newStatus });
    } catch (err) {
        console.error('Error toggling home service:', err);
        res.status(500).json({ success: false, error: 'Database toggle failed' });
    }
});

// ==========================================
// 1F. ADMIN: DELETE HOME SERVICE
// ==========================================
router.delete('/admin/services/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM hs_services WHERE id = ?', [id]);
        res.json({ success: true, message: 'Service deleted' });
    } catch (err) {
        console.error('Error deleting home service:', err);
        res.status(500).json({ success: false, error: 'Failed to delete service' });
    }
});

// ==========================================
// 2. CHECKOUT & CREATE BOOKING
// ==========================================
router.post('/checkout', async (req, res) => {
    let { customerId, serviceId, duration, bookingDate, bookingSlot, address, estimatedTotal, serviceName } = req.body;

    if (!customerId || !serviceId) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (typeof customerId === 'string' && customerId.startsWith('N2DHS')) {
        customerId = customerId.substring(5);
    }

    if (!/^\d+$/.test(customerId)) {
        try {
            const decoded = Buffer.from(customerId, 'base64').toString('utf-8');
            if (/^\d+$/.test(decoded)) customerId = decoded;
        } catch (e) {}
    }

    try {
        // Find or create customer
        let customer_id;
        const [existing] = await db.query('SELECT id FROM customers WHERE phone = ?', [customerId]);
        if (existing.length > 0) {
            customer_id = existing[0].id;
        } else {
            const [result] = await db.query('INSERT INTO customers (phone, name) VALUES (?, ?)', [customerId, 'Home Service User']);
            customer_id = result.insertId;
        }

        // Generate Order ID
        const orderId = 'N2D_HS_' + Math.floor(Math.random() * 100000);

        // Prepare address text
        const addrText = `${address.houseNo}, ${address.street}, ${address.area}, ${address.city} - ${address.pincode}`;

        // Calculate helper charge & platform fee for Home Services
        const estTotalNum = parseFloat(estimatedTotal || 0);
        let platformFee = parseFloat(process.env.PLATFORM_FEE_HOMESERVICES || process.env.PLATFORM_FEE || '5');
        let helperCharge = Math.max(estTotalNum - platformFee, Math.round(estTotalNum * 0.85));

        // Check if specific service has custom helper charge
        try {
            const [svcRows] = await db.query('SELECT helper_charge, platform_fee FROM hs_services WHERE id = ?', [serviceId]);
            if (svcRows.length > 0) {
                if (svcRows[0].helper_charge > 0) helperCharge = parseFloat(svcRows[0].helper_charge);
                if (svcRows[0].platform_fee > 0) platformFee = parseFloat(svcRows[0].platform_fee);
            }
        } catch (svcErr) {}

        // Build Payload
        const payload = JSON.stringify({
            serviceId,
            serviceName,
            duration,
            bookingDate,
            bookingSlot,
            address: addrText,
            helper_charge: helperCharge,
            platform_fee: platformFee
        });

        // Create Order as "TASK" with explicit helper_charge and platform_fee
        const [orderResult] = await db.query(`
            INSERT INTO orders (
                order_id, engine_type, customer_id, customer_number, customer_name,
                service, status, payment_status, total_amount, platform_fee, helper_charge, created_at, customer_lat, customer_lng, payload
            ) VALUES (?, 'TASK', ?, ?, 'Home Service User', ?, 'CONFIRMED', 'PAID', ?, ?, ?, NOW(), ?, ?, ?)
        `, [orderId, customer_id, customerId, 'Home Services', estimatedTotal, platformFee, helperCharge, null, null, payload]);

        const orderDbId = orderResult.insertId;

        await db.query(`
            INSERT INTO order_tasks (
                order_id, items_text
            ) VALUES (?, ?)
        `, [orderDbId, `Home Service: ${serviceName} (${duration}) on ${bookingDate} at ${bookingSlot}`]);

        // Trigger Python Bot Webhook to send Confirmation Message
        try {
            await axios.post('http://127.0.0.1:8000/webhook/internal', {
                event: "HOME_SERVICE_BOOKED",
                orderId: orderId,
                customerId: customerId,
                serviceName: serviceName,
                bookingDate: bookingDate,
                bookingSlot: bookingSlot,
                amount: estimatedTotal
            });
        } catch (botErr) {
            console.error('Failed to trigger python bot webhook:', botErr.message);
        }

        res.json({ success: true, orderId });
    } catch (err) {
        console.error('Error during checkout:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ==========================================
// 3. GET MY BOOKINGS
// ==========================================
router.get('/my-bookings', async (req, res) => {
    const { customerId, orderId } = req.query;
    if (!customerId && !orderId) {
        return res.status(400).json({ success: false, error: 'Missing customerId or orderId' });
    }

    try {
        let finalCustomerId = customerId;
        if (typeof finalCustomerId === 'string' && finalCustomerId.startsWith('N2DHS')) {
            finalCustomerId = finalCustomerId.substring(5);
        }
        if (finalCustomerId && !/^\d+$/.test(finalCustomerId)) {
            try {
                const decoded = Buffer.from(finalCustomerId, 'base64').toString('utf-8');
                if (/^\d+$/.test(decoded)) finalCustomerId = decoded;
            } catch (e) {}
        }

        if (!finalCustomerId && orderId) {
            const searchId = orderId.startsWith('N2D_HS_') ? orderId : `N2D_HS_${orderId}`;
            const [rows] = await db.query(`
                SELECT customer_number FROM orders WHERE order_id = ?
            `, [searchId]);
            if (rows.length > 0) {
                finalCustomerId = rows[0].customer_number;
            }
        }

        if (!finalCustomerId) {
            return res.json({ success: true, orders: [], customerId: null });
        }

        const [orders] = await db.query(`
            SELECT id, order_id, status, total_amount, created_at, payload
            FROM orders
            WHERE customer_number = ? AND service = 'Home Services'
            ORDER BY created_at DESC
        `, [finalCustomerId]);
        
        res.json({ success: true, orders, customerId: finalCustomerId });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ==========================================
// 4. POST RESCHEDULE BOOKING
// ==========================================
router.post('/reschedule', async (req, res) => {
    const { id, bookingDate, bookingSlot } = req.body;
    if (!id || !bookingDate || !bookingSlot) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    try {
        const [orders] = await db.query('SELECT order_id, payload FROM orders WHERE id = ?', [id]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const order = orders[0];
        let payload = {};
        try {
            payload = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {});
        } catch (e) {}

        const rescheduleCount = payload.rescheduleCount || 0;
        if (rescheduleCount >= 2) {
            return res.status(400).json({ success: false, error: 'Maximum reschedule limit (2) reached' });
        }

        payload.bookingDate = bookingDate;
        payload.bookingSlot = bookingSlot;
        payload.rescheduleCount = rescheduleCount + 1;

        await db.query('UPDATE orders SET payload = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(payload), id]);

        await db.query(`
            UPDATE order_tasks 
            SET items_text = ? 
            WHERE order_id = ?
        `, [`Home Service: ${payload.serviceName || 'Service'} (${payload.duration || '1 Hour'}) on ${bookingDate} at ${bookingSlot}`, id]);

        // Get updated details for notification
        const [updatedOrders] = await db.query(`
            SELECT o.*, h.phone as helper_phone 
            FROM orders o 
            LEFT JOIN helpers h ON o.helper_id = h.id 
            WHERE o.id = ?
        `, [id]);
        
        if (updatedOrders.length > 0) {
            const updOrder = updatedOrders[0];
            
            // Notify Customer
            await sendWhatsAppText(updOrder.customer_number, 
                `✅ *Booking Rescheduled*\n\n` +
                `Order: #${updOrder.order_id}\n` +
                `New Date: ${bookingDate}\n` +
                `New Time: ${bookingSlot}`
            );
            
            // Notify Admin
            await sendWhatsAppText(ADMIN_NUMBER, 
                `⚠️ *Customer Rescheduled Booking*\n\n` +
                `Order: #${updOrder.order_id}\n` +
                `New Date: ${bookingDate}\n` +
                `New Time: ${bookingSlot}`
            );
            
            // Notify Helper (if assigned)
            if (updOrder.helper_phone) {
                await sendWhatsAppText(updOrder.helper_phone, 
                    `⚠️ *Customer Rescheduled Service*\n\n` +
                    `Order: #${updOrder.order_id}\n` +
                    `New Date: ${bookingDate}\n` +
                    `New Time: ${bookingSlot}`
                );
            }
        }

        res.json({ success: true, message: 'Booking rescheduled successfully' });
    } catch (err) {
        console.error('Error rescheduling booking:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

module.exports = router;
