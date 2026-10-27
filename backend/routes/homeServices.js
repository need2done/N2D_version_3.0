const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');
const { sendSlackNotification } = require('../services/slackService');

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

async function ensureHsTablesExist() {
    try {
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
        await db.query(`
            CREATE TABLE IF NOT EXISTS hs_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value JSON,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        // Check if legacy dummy categories exist and clean them up
        const [dummyCats] = await db.query('SELECT COUNT(*) as cnt FROM hs_service_categories WHERE name IN ("Electrician", "Plumber", "AC & Appliance Repair", "Carpenter & Painter")');
        if (dummyCats[0].cnt > 0) {
            await db.query('DELETE FROM hs_services WHERE category_id IN (SELECT id FROM hs_service_categories WHERE name IN ("Electrician", "Plumber", "AC & Appliance Repair", "Carpenter & Painter")) OR 1=1');
            await db.query('DELETE FROM hs_service_categories WHERE name IN ("Electrician", "Plumber", "AC & Appliance Repair", "Cleaning & Pest Control", "Carpenter & Painter") OR 1=1');
        }

        const [cats] = await db.query('SELECT COUNT(*) as cnt FROM hs_service_categories');
        if (cats[0].cnt === 0) {
            await db.query(`
                INSERT INTO hs_service_categories (id, name, icon, description) VALUES
                (1, 'Kitchen Cleaning', 'Utensils', 'Dishes washing, sink scrub, counter slab wipe & vessel stacking'),
                (2, 'Laundry & Clothes', 'Shirt', 'Doorstep laundry, separate clothes wash, drying & steam iron'),
                (3, 'Floor Care', 'Layers', 'Broom sweeping, tile scrubbing & wet disinfectant mopping'),
                (4, 'Deep Cleaning', 'Home', 'Full house deep cleaning: bathrooms, fans, window mesh & cobwebs'),
                (5, 'Custom Chores', 'CheckSquare', 'Personalized chore checklist & flexible bundles')
            `);
            await db.query(`
                INSERT INTO hs_services (category_id, title, description, rate, helper_charge, platform_fee, duration, icon, is_active) VALUES
                (1, 'Kitchen Cleaning', 'Daily kitchen care: wash all used plates & cooking vessels, scrub sink clean, wipe cooking slabs and stack dishes neatly in racks.', 299.00, 260.00, 39.00, '1.5 - 2 Hours', 'Utensils', 1),
                (2, 'Laundry Help', 'Doorstep laundry service: 100% separate wash, drying, crisp steam ironing and neat wardrobe folding. Returned in 12 - 48 hours.', 299.00, 260.00, 39.00, 'Return in 12 - 48 Hours', 'Shirt', 1),
                (2, 'Cloth Washing', 'Everyday clothes washing at your home using your washing machine or bucket, and neatly hanging on drying stands or lines.', 230.00, 200.00, 30.00, '1 Hour', 'Shirt', 1),
                (3, 'Floor Maintenance', 'Complete floor sweeping across hall, bedrooms, kitchen, scrubbing stubborn spots, and deep wet mopping with disinfectant cleaner.', 299.00, 260.00, 39.00, '1.5 - 2 Hours', 'Layers', 1),
                (5, 'Custom Package', 'Design your own home chores package! Pick dish washing, clothes wash, broom sweep or deep floor washing. Pay only for chores chosen.', 349.00, 300.00, 49.00, 'Custom Duration', 'CheckSquare', 1),
                (4, 'Full House Deep Clean (2BHK / House)', 'Total house deep clean: bathroom acid scrub & commode shine, ceiling fans & switchboards, window glass & mesh, and full house floor scrubbing.', 1199.00, 1050.00, 149.00, '4 - 5 Hours', 'Home', 1)
            `);
        }

        const [servConfigRows] = await db.query("SELECT setting_value FROM hs_settings WHERE setting_key = 'services_config'");
        if (servConfigRows.length === 0) {
            const defaultInitialServices = [
                {
                    id: 1,
                    name: 'Kitchen Cleaning',
                    image: '/home-services/images/kitchen.png',
                    base_price: 299,
                    duration: '1.5 - 2 Hours',
                    description: 'Complete kitchen care: Dish washing, deep cleaning sink areas & drain, and orderly arranging all dishes in their place.',
                    rating: 4.8,
                    reviewCount: 310,
                    whats_included: [
                        'Thorough washing of all utensils and cookware',
                        'Deep cleaning of the kitchen sink and drain area',
                        'Wiping and sanitizing kitchen counter slabs',
                        'Orderly arranging all cleaned dishes in racks and cabinets'
                    ],
                    whats_not_included: [
                        'Chimney interior deep degreasing',
                        'Appliance electrical motor repairs'
                    ]
                },
                {
                    id: 2,
                    name: 'Laundry Help',
                    image: '/home-services/images/laundry.png',
                    base_price: 249,
                    duration: 'Return in 12 - 48 Hours',
                    is_custom: true,
                    description: 'Complete end-to-end laundry care: Washing everyday clothes, clean drying, crisp steam pressing/ironing, and neat wardrobe folding. Transparent per-piece pricing with scheduled doorstep pickup and prompt return within 12hr to 48hr!',
                    rating: 4.8,
                    reviewCount: 240,
                    custom_options: [
                        { id: 'opt_laundry_wash', name: 'Washing Everyday Clothes (Bucket / Machine)', price: 8, duration: 'Machine / Bucket Wash' },
                        { id: 'opt_laundry_dry', name: 'Proper Clothes Drying (Hangers / Lines)', price: 4, duration: 'Sun & Stand Drying' },
                        { id: 'opt_laundry_iron', name: 'Crisp Pressing / Steam Ironing', price: 10, duration: 'Crisp Steam Press' },
                        { id: 'opt_laundry_fold', name: 'Neat Wardrobe Folding & Stacking', price: 5, duration: 'Wardrobe Stacking' }
                    ],
                    whats_included: [
                        'Doorstep pickup & return at your convenient time slot (12 - 48 hrs)',
                        '100% separate & hygienic wash (never mixed with other households)',
                        'Gentle fabric wash with quality skin-safe detergent & fabric softener',
                        'Clean stand / tumble drying protecting color vibrance and threads',
                        'Professional temperature-controlled steam pressing for wrinkle-free finish',
                        'Neat wardrobe folding and dust-proof protective packaging'
                    ],
                    whats_not_included: [
                        'Heavy commercial rugs, thick carpets, or doormats cleaning',
                        'Dry-cleaning delicate bridal lehengas or heavy zari wedding sarees',
                        'Genuine leather, suede, or velvet chemical restoration',
                        'Corrosive chemical bleaching or non-colorfast dye restoration'
                    ]
                },
                {
                    id: 3,
                    name: 'Cloth Washing',
                    image: '/home-services/images/cloth_washing_v2.png',
                    base_price: 149,
                    duration: '1 Hour',
                    description: 'Focused everyday clothes washing and hanging them neatly to dry on hangers or clotheslines.',
                    rating: 4.7,
                    reviewCount: 185,
                    whats_included: [
                        'Washing everyday wearable clothes & linens',
                        'Using detergent and fabric softener carefully',
                        'Hanging clothes neatly on hangers and clotheslines to dry',
                        'Separating whites and colored fabrics'
                    ],
                    whats_not_included: [
                        'Pressing and ironing',
                        'Dry-cleaning delicate wedding sarees/suits'
                    ]
                },
                {
                    id: 4,
                    name: 'Floor Maintenance',
                    image: '/home-services/images/floor_cleaning_v2.png',
                    base_price: 299,
                    duration: '1.5 - 2 Hours',
                    description: 'Thorough floor care covering both dry/wet floor cleaning, sweeping, and deep water floor scrubbing.',
                    rating: 4.9,
                    reviewCount: 420,
                    whats_included: [
                        'Full floor sweeping and dust removal across all rooms',
                        'Deep water floor washing with disinfectant and tile cleaner',
                        'Tile joint & floor scrub to remove stubborn dirt',
                        'Thorough wet and dry mopping for a spotless shine'
                    ],
                    whats_not_included: [
                        'Full house bathroom acid wash (included in Full House Deep Clean)',
                        'Ceiling fan degreasing (included in Full House Deep Clean)'
                    ]
                },
                {
                    id: 5,
                    name: 'Custom Package',
                    image: '/home-services/images/custom_service_v2.png',
                    base_price: 349,
                    duration: 'Custom Duration',
                    is_custom: true,
                    description: 'Choose your own services! Mix and match Kitchen Cleaning, Cloth Washing, Floor Cleaning, and Floor Washing according to your exact requirement.',
                    rating: 4.9,
                    reviewCount: 512,
                    custom_options: [
                        { id: 'opt_kitchen', name: 'Kitchen Cleaning (Dishes, Sink & Arrange)', price: 199, duration: '45 mins' },
                        { id: 'opt_clothes', name: 'Cloth Washing (Wash & Hang on Hangers)', price: 149, duration: '30 mins' },
                        { id: 'opt_floor_clean', name: 'Floor Cleaning (Broom Sweep & Mop)', price: 149, duration: '45 mins' },
                        { id: 'opt_floor_wash', name: 'Floor Washing (Deep Water Scrub & Wash)', price: 199, duration: '45 mins' }
                    ],
                    whats_included: [
                        'Interactive checklist to select only the chores you need',
                        'Real-time price calculation matching your exact selection',
                        'Background-verified professional helper tailored to your tasks'
                    ],
                    whats_not_included: [
                        'Chores not selected in your personalized checklist'
                    ]
                },
                {
                    id: 6,
                    name: 'Full House Deep Clean (2BHK / House)',
                    image: '/home-services/images/bathroom.png',
                    base_price: 1199,
                    duration: '4 - 5 Hours',
                    description: 'Complete full-house deep cleaning: Exclusive bathroom deep scrub & sanitization, ceiling fans, window glass & mesh grills, cobweb removal, and thorough floor scrubbing.',
                    rating: 4.9,
                    reviewCount: 650,
                    whats_included: [
                        '🚿 Bathroom Deep Cleaning (Exclusive to this package: tile descaling, commode acid scrub, taps & floor sanitization)',
                        '🪭 Ceiling Fans & Fixtures (Thorough degreasing, tube lights and switchboards wipe-down)',
                        '🪟 Windows & Grills (Glass wiped spotless, mosquito net mesh and grills dusted)',
                        '🕸️ Cobweb Removal (Complete removal of all cobwebs/బూజులు from ceilings and corners)',
                        '🧹 Full House Floor Deep Scrubbing (Hall, bedrooms, kitchen, balcony wet washed and scrubbed)'
                    ],
                    whats_not_included: [
                        'Exterior facade painting or wall plastering',
                        'Heavy furniture shifting outside the house'
                    ]
                }
            ];
            await db.query(`
                INSERT INTO hs_settings (setting_key, setting_value)
                VALUES ('services_config', ?)
            `, [JSON.stringify(defaultInitialServices)]);
        }
    } catch (e) {
        console.error('Error in ensureHsTablesExist:', e);
    }
}

// ==========================================
// 1. GET ALL SERVICES (WITH CATEGORIES)
// ==========================================
router.get('/services', async (req, res) => {
    try {
        await ensureHsTablesExist();
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
        await ensureHsTablesExist();
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
    let { category_id, new_category_name, title, description, rate, helper_charge, platform_fee, duration, icon } = req.body;
    
    try {
        if ((category_id === 'NEW' || !category_id) && new_category_name && new_category_name.trim()) {
            const [catRes] = await db.query(
                'INSERT INTO hs_service_categories (name, icon, description, is_active) VALUES (?, ?, ?, 1)',
                [new_category_name.trim(), icon || 'CheckSquare', new_category_name.trim()]
            );
            category_id = catRes.insertId;
        }

        if (!category_id || !title || rate === undefined) {
            return res.status(400).json({ success: false, error: 'Category, service name, and rate are required' });
        }

        const numRate = parseFloat(rate || 0);
        const numPF = parseFloat(platform_fee || 39);
        const numHC = parseFloat(helper_charge || (numRate > 0 ? numRate - numPF : 0));

        const [result] = await db.query(`
            INSERT INTO hs_services (category_id, title, description, rate, helper_charge, platform_fee, duration, icon, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [category_id, title.trim(), description || '', numRate, numHC, numPF, duration || '1.5 - 2 Hours', icon || 'Utensils']);

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
    let { category_id, new_category_name, title, description, rate, helper_charge, platform_fee, duration, icon, is_active } = req.body;
    try {
        if ((category_id === 'NEW' || !category_id) && new_category_name && new_category_name.trim()) {
            const [catRes] = await db.query(
                'INSERT INTO hs_service_categories (name, icon, description, is_active) VALUES (?, ?, ?, 1)',
                [new_category_name.trim(), icon || 'CheckSquare', new_category_name.trim()]
            );
            category_id = catRes.insertId;
        }

        const numRate = parseFloat(rate || 0);
        const numPF = parseFloat(platform_fee || 39);
        const numHC = parseFloat(helper_charge || (numRate > 0 ? numRate - numPF : 0));
        const activeState = is_active !== undefined ? (is_active ? 1 : 0) : 1;

        await db.query(`
            UPDATE hs_services
            SET category_id = ?, title = ?, description = ?, rate = ?, helper_charge = ?, platform_fee = ?, duration = ?, icon = ?, is_active = ?
            WHERE id = ?
        `, [category_id, title ? title.trim() : '', description || '', numRate, numHC, numPF, duration || '1.5 - 2 Hours', icon || 'Utensils', activeState, id]);

        res.json({ success: true, message: 'Home service updated globally successfully' });
    } catch (err) {
        console.error('Error updating home service:', err);
        res.status(500).json({ success: false, error: 'Database update failed' });
    }
});

// ==========================================
// 1E. ADMIN: CREATE CATEGORY
// ==========================================
router.post('/admin/categories', async (req, res) => {
    const { name, icon, description } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Category name is required' });
    }
    try {
        const [result] = await db.query(
            'INSERT INTO hs_service_categories (name, icon, description, is_active) VALUES (?, ?, ?, 1)',
            [name.trim(), icon || 'CheckSquare', description || name.trim()]
        );
        res.json({ success: true, id: result.insertId, name: name.trim() });
    } catch (err) {
        console.error('Error adding category:', err);
        res.status(500).json({ success: false, error: 'Failed to add category' });
    }
});

// ==========================================
// 1F. ADMIN: TOGGLE HOME SERVICE ACTIVE STATUS
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
// 1G. ADMIN: DELETE HOME SERVICE
// ==========================================
router.delete('/admin/services/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM hs_services WHERE id = ?', [id]);
        res.json({ success: true, message: 'Service deleted globally' });
    } catch (err) {
        console.error('Error deleting home service:', err);
        res.status(500).json({ success: false, error: 'Failed to delete service' });
    }
});

// ==========================================
// 2. CHECKOUT & CREATE BOOKING
// ==========================================
router.post('/checkout', async (req, res) => {
    let { customerId, serviceId, duration, bookingDate, bookingSlot, address, estimatedTotal, serviceName, couponCode, discountAmount } = req.body;

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
            coupon_code: couponCode || null,
            discount_amount: parseFloat(discountAmount || 0),
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

        const discountTag = (couponCode && discountAmount > 0) ? ` [${couponCode} -₹${discountAmount}]` : '';
        await db.query(`
            INSERT INTO order_tasks (
                order_id, items_text
            ) VALUES (?, ?)
        `, [orderDbId, `Home Service: ${serviceName} (${duration}) on ${bookingDate} at ${bookingSlot}${discountTag}`]);

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

        // 🚀 Slack Notification for Home Services
        try {
            sendSlackNotification(orderDbId, 'NEW_ORDER', `New Home Service Booked: ${serviceName}`);
        } catch (slackErr) {
            console.error('Slack notify error:', slackErr.message);
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

// ==========================================
// 6. GET BANNER & COUPON CONFIGURATION
// ==========================================
router.get('/banner-config', async (req, res) => {
    try {
        await ensureHsTablesExist();
        const [rows] = await db.query('SELECT setting_key, setting_value FROM hs_settings WHERE setting_key IN (?, ?, ?)', ['banner_config', 'coupon_config', 'services_config']);
        
        let bannerConfig = {
            isActive: true,
            badgeText: '🪔 FESTIVE SPECIAL • DUSSEHRA DHAMAKA 🏹',
            title: 'Celebrate Dussehra with a Sparkling Clean Home',
            subtitle: 'Get FLAT 20% OFF on all professional cleaning, repairs, and kitchen deep-clean services. Code DUSSEHRA is automatically applied at checkout!',
            discountBadge: '20% OFF',
            couponCode: 'DUSSEHRA',
            discountPercent: 20,
            ctaText: 'Book Service with 20% OFF',
            theme: 'amber'
        };

        let couponConfig = {
            autoApply: true,
            defaultCoupon: 'DUSSEHRA',
            coupons: [
                { code: 'DUSSEHRA', discountPercent: 20, description: 'Festive 20% Discount' },
                { code: 'DASARA', discountPercent: 20, description: 'Festive 20% Discount' },
                { code: 'FESTIVE20', discountPercent: 20, description: 'Festive 20% Discount' },
                { code: 'WELCOME10', discountPercent: 10, description: 'New User 10% Discount' }
            ]
        };

        let servicesConfig = null;

        rows.forEach(r => {
            let val = r.setting_value;
            if (typeof val === 'string') {
                try { val = JSON.parse(val); } catch (e) {}
            }
            if (r.setting_key === 'banner_config' && val) bannerConfig = { ...bannerConfig, ...val };
            if (r.setting_key === 'coupon_config' && val) couponConfig = { ...couponConfig, ...val };
            if (r.setting_key === 'services_config' && val) servicesConfig = val;
        });

        // 🌟 LIVE GLOBAL MERGE FROM hs_services TABLE
        // Any price, name, duration, or active status modified in admin reflects immediately across customer app!
        const [liveDbServices] = await db.query(`
            SELECT s.*, c.name as category_name, c.icon as category_icon
            FROM hs_services s
            LEFT JOIN hs_service_categories c ON s.category_id = c.id
            ORDER BY s.id ASC
        `);

        let finalServices = [];
        if (liveDbServices && liveDbServices.length > 0) {
            const configArray = Array.isArray(servicesConfig) ? servicesConfig : [];

            finalServices = liveDbServices.map(s => {
                const match = configArray.find(cfg => cfg.id === s.id || (cfg.name && cfg.name.toLowerCase() === s.title.toLowerCase()));

                let defaultImg = '/home-services/images/kitchen.png';
                const catLower = (s.category_name || '').toLowerCase();
                const titleLower = (s.title || '').toLowerCase();
                if (catLower.includes('laundry') || titleLower.includes('laundry')) defaultImg = '/home-services/images/laundry.png';
                else if (catLower.includes('cloth') || titleLower.includes('cloth')) defaultImg = '/home-services/images/cloth_washing_v2.png';
                else if (catLower.includes('floor') || titleLower.includes('floor')) defaultImg = '/home-services/images/floor_cleaning_v2.png';
                else if (catLower.includes('deep') || titleLower.includes('deep')) defaultImg = '/home-services/images/bathroom.png';
                else if (catLower.includes('custom') || titleLower.includes('custom')) defaultImg = '/home-services/images/custom_service_v2.png';

                return {
                    id: s.id,
                    name: s.title,
                    base_price: parseFloat(s.rate),
                    helper_charge: parseFloat(s.helper_charge),
                    platform_fee: parseFloat(s.platform_fee),
                    duration: s.duration || '1.5 - 2 Hours',
                    description: s.description || match?.description || 'Professional home service by verified helpers',
                    image: match?.image || defaultImg,
                    rating: match?.rating || 4.8,
                    reviewCount: match?.reviewCount || 120,
                    is_custom: match?.is_custom || Boolean(catLower.includes('custom') || titleLower.includes('custom')),
                    custom_options: match?.custom_options || undefined,
                    short_summary: match?.short_summary || (s.description ? s.description.slice(0, 60) + '...' : undefined),
                    whats_included: match?.whats_included || [
                        `Verified helper for ${s.title}`,
                        'All necessary cleaning tasks completed',
                        'Customer satisfaction guaranteed'
                    ],
                    whats_not_included: match?.whats_not_included || [
                        'Repairs outside the scope of this chore',
                        'Appliance or motor rewiring'
                    ],
                    is_active: s.is_active === 1
                };
            }).filter(s => s.is_active);
        } else if (servicesConfig) {
            finalServices = servicesConfig;
        }

        res.json({ success: true, banner: bannerConfig, coupons: couponConfig, services: finalServices });
    } catch (err) {
        console.error('Error fetching banner-config:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch banner config' });
    }
});

// ==========================================
// 6B. GET & UPDATE SERVICES CONFIG (ADMIN)
// ==========================================
router.get('/services-config', async (req, res) => {
    try {
        await ensureHsTablesExist();
        const [liveDbServices] = await db.query(`
            SELECT s.*, c.name as category_name, c.icon as category_icon
            FROM hs_services s
            LEFT JOIN hs_service_categories c ON s.category_id = c.id
            ORDER BY s.id ASC
        `);
        res.json({ success: true, services: liveDbServices });
    } catch (err) {
        console.error('Error fetching services-config:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch services config' });
    }
});

router.post('/admin/services-config', async (req, res) => {
    const { services } = req.body;
    if (!services || !Array.isArray(services)) {
        return res.status(400).json({ success: false, error: 'Invalid services array' });
    }
    try {
        await ensureHsTablesExist();
        await db.query(`
            INSERT INTO hs_settings (setting_key, setting_value)
            VALUES ('services_config', ?)
            ON DUPLICATE KEY UPDATE setting_value = ?
        `, [JSON.stringify(services), JSON.stringify(services)]);
        res.json({ success: true, message: 'Services configuration updated in database successfully' });
    } catch (err) {
        console.error('Error updating services-config:', err);
        res.status(500).json({ success: false, error: 'Failed to save services config in database' });
    }
});

// ==========================================
// 7. ADMIN: UPDATE BANNER & COUPON CONFIG
// ==========================================
router.post('/admin/banner-config', async (req, res) => {
    const { banner, coupons, services } = req.body;
    try {
        await ensureHsTablesExist();
        if (banner) {
            await db.query(`
                INSERT INTO hs_settings (setting_key, setting_value)
                VALUES ('banner_config', ?)
                ON DUPLICATE KEY UPDATE setting_value = ?
            `, [JSON.stringify(banner), JSON.stringify(banner)]);
        }
        if (coupons) {
            await db.query(`
                INSERT INTO hs_settings (setting_key, setting_value)
                VALUES ('coupon_config', ?)
                ON DUPLICATE KEY UPDATE setting_value = ?
            `, [JSON.stringify(coupons), JSON.stringify(coupons)]);
        }
        if (services && Array.isArray(services)) {
            await db.query(`
                INSERT INTO hs_settings (setting_key, setting_value)
                VALUES ('services_config', ?)
                ON DUPLICATE KEY UPDATE setting_value = ?
            `, [JSON.stringify(services), JSON.stringify(services)]);
        }
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
        console.error('Error updating banner-config:', err);
        res.status(500).json({ success: false, error: 'Database update failed' });
    }
});

module.exports = router;
