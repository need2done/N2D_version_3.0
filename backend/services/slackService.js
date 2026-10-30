/**
 * =============================================================================
 * Need2Done – Multi-Channel Slack Order Status Dispatcher (Node.js)
 * =============================================================================
 * Dispatches real-time order alerts to dedicated Slack channels:
 *   1. #orders-medicine       (SLACK_WEBHOOK_MEDICINE)
 *   2. #orders-home-services   (SLACK_WEBHOOK_HOME_SERVICES)
 *   3. #orders-custom-work     (SLACK_WEBHOOK_CUSTOM_WORK)
 *   4. Master Feed (optional) (SLACK_WEBHOOK_ALL)
 */

const axios = require('axios');
const db = require('../config/db');

function maskPhone(phoneStr) {
    if (!phoneStr) return 'N/A';
    const digits = String(phoneStr).replace(/\D/g, '');
    if (digits.length >= 10) {
        const c10 = digits.slice(-10);
        return `+91 ${c10.slice(0, 2)}*** **${c10.slice(-3)}`;
    }
    return phoneStr;
}

function getMapsLink(lat, lng, addressText) {
    if (lat && lng && Number(lat) !== 0 && Number(lng) !== 0) {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if (addressText && String(addressText).trim()) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(addressText).trim())}`;
    }
    return '';
}

function determineSlackWebhook(serviceName = '', orderCode = '') {
    const svc = String(serviceName).toUpperCase().trim();
    const code = String(orderCode).toUpperCase().trim();

    // 1. Medicine
    if (['MEDICINE', 'MEDICINES', 'PHARMACY', 'DRUG'].some(k => svc.includes(k)) || code.startsWith('MED')) {
        return {
            webhook: process.env.SLACK_WEBHOOK_MEDICINE || '',
            category: 'Medicine'
        };
    }

    // 2. Home Services
    if (['HOME SERVICE', 'HOME_SERVICE', 'HOMESERVICE', 'CLEANING', 'KITCHEN', 'LAUNDRY', 'CLOTH', 'FLOOR', 'CUSTOM PACKAGE', 'DEEP CLEAN'].some(k => svc.includes(k)) || code.startsWith('N2D_HS') || code.startsWith('HS')) {
        return {
            webhook: process.env.SLACK_WEBHOOK_HOME_SERVICES || '',
            category: 'Home Services'
        };
    }

    // 3. Custom Work / AnyWork / Delivery / Ride
    return {
        webhook: process.env.SLACK_WEBHOOK_CUSTOM_WORK || '',
        category: 'Custom Work'
    };
}

function getStatusBadge(statusCode = '', eventType = '') {
    const s = String(statusCode).toUpperCase();
    const evt = String(eventType).toUpperCase();

    if (s.includes('CANCEL') || evt.includes('CANCEL')) {
        return { emoji: '🔴', title: 'Order Cancelled' };
    }
    if (['COMPLETED', 'PAID'].includes(s) || ['COMPLETED', 'PAID'].includes(evt)) {
        return { emoji: '🟢', title: 'Order Completed & Paid' };
    }
    if (s.includes('ARRIVED_AT_CUSTOMER') || s.includes('HELPER_ARRIVED') || evt.includes('ARRIVED_AT_CUSTOMER')) {
        return { emoji: '🏠', title: 'Arrived at Customer Doorstep' };
    }
    if (s.includes('BILL_IMAGE_UPLOADED') || evt.includes('BILL')) {
        return { emoji: '🧾', title: 'Bill Uploaded' };
    }
    if (s.includes('ITEMS_PICKED_UP') || evt.includes('PICKED_UP')) {
        return { emoji: '🛍️', title: 'Items Picked Up' };
    }
    if (s.includes('ARRIVED_AT_STORE') || evt.includes('ARRIVED_AT_STORE')) {
        return { emoji: '🏬', title: 'Arrived at Store / Pickup' };
    }
    if (s.includes('HELPER_ACCEPTED') || s.includes('ASSIGNED') || evt.includes('ACCEPTED')) {
        return { emoji: '🛵', title: 'Helper Assigned & En Route' };
    }
    if (['SERVICE_STARTED', 'RIDE_STARTED'].includes(s) || evt.includes('STARTED')) {
        return { emoji: '⏳', title: 'Service / Ride in Progress' };
    }
    if (['CONFIRMED', 'PLACED', 'DRAFT'].includes(s) || ['ORDER_CREATED', 'NEW_ORDER'].includes(evt)) {
        return { emoji: '🆕', title: 'New Order Placed' };
    }

    return { emoji: '🔔', title: s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) };
}

async function sendSlackNotification(orderIdOrCode, eventType = null, eventNote = null) {
    try {
        let rows = [];
        if (/^\d+$/.test(String(orderIdOrCode))) {
            const [r] = await db.query(`
                SELECT o.*, h.name as helper_name, ot.items_text
                FROM orders o
                LEFT JOIN helpers h ON o.helper_id = h.id
                LEFT JOIN order_tasks ot ON o.id = ot.order_id
                WHERE o.id = ?
            `, [orderIdOrCode]);
            rows = r;
        } else {
            const [r] = await db.query(`
                SELECT o.*, h.name as helper_name, ot.items_text
                FROM orders o
                LEFT JOIN helpers h ON o.helper_id = h.id
                LEFT JOIN order_tasks ot ON o.id = ot.order_id
                WHERE o.order_id = ?
            `, [orderIdOrCode]);
            rows = r;
        }

        if (!rows || rows.length === 0) return;
        const order = rows[0];

        const { webhook: targetWebhook, category } = determineSlackWebhook(order.service, order.order_id);
        const masterWebhook = process.env.SLACK_WEBHOOK_ALL || '';

        // If no webhooks configured at all, skip safely
        if (!targetWebhook && !masterWebhook) return;

        const { emoji, title: statusTitle } = getStatusBadge(order.status, eventType);

        // Parse Payload
        let payload = {};
        if (typeof order.payload === 'string') {
            try { payload = JSON.parse(order.payload); } catch (e) {}
        } else if (typeof order.payload === 'object' && order.payload !== null) {
            payload = order.payload;
        }

        // Customer & Helper
        const customerName = order.customer_name || 'Customer';
        const maskedPhone = maskPhone(order.customer_number);
        const helperStr = order.helper_name ? `${order.helper_name} (Assigned 🛵)` : 'Auto-Broadcast / Searching for Helper 🔍';

        // Task details
        const taskDetails = [];
        const items = payload.items || order.items_text;
        if (items) {
            if (Array.isArray(items)) {
                taskDetails.push(items.slice(0, 6).join(', '));
            } else if (typeof items === 'string') {
                const clean = items.split('\n').map(l => l.trim()).filter(Boolean);
                taskDetails.push(clean.slice(0, 6).join(', '));
            }
        }
        if (payload.serviceName) {
            let svcDetail = payload.serviceName;
            if (payload.duration) svcDetail += ` (${payload.duration})`;
            if (payload.bookingDate && payload.bookingSlot) {
                svcDetail += ` • ${payload.bookingDate} [${payload.bookingSlot}]`;
            }
            taskDetails.unshift(svcDetail);
        }
        if (payload.description) {
            taskDetails.push(`Notes: ${payload.description}`);
        }
        const taskStr = taskDetails.length > 0 ? taskDetails.join(' | ') : (order.service || 'Custom Work');

        // Locations
        const pickupStr = payload.pickup_location || payload.pickup || payload.restaurant || payload.shop_name;
        const dropStr = payload.drop_location || payload.drop || payload.address;
        const cLat = order.customer_lat || payload.customer_lat || payload.drop_lat;
        const cLng = order.customer_lng || payload.customer_lng || payload.drop_lng;
        const pLat = payload.pickup_lat;
        const pLng = payload.pickup_lng;

        const locationLines = [];
        if (pickupStr) {
            const pMap = getMapsLink(pLat, pLng, pickupStr);
            locationLines.push(pMap ? `   📍 *Store/Pickup:* <${pMap}|${pickupStr}>` : `   📍 *Store/Pickup:* ${pickupStr}`);
        }
        if (dropStr) {
            const dMap = getMapsLink(cLat, cLng, dropStr);
            locationLines.push(dMap ? `   📍 *Customer/Drop:* <${dMap}|${dropStr}>` : `   📍 *Customer/Drop:* ${dropStr}`);
        } else if (cLat && cLng) {
            const dMap = getMapsLink(cLat, cLng);
            locationLines.push(`   📍 *Customer Location:* <${dMap}|Open in Google Maps>`);
        }
        const locationSection = locationLines.length > 0 ? locationLines.join('\n') : '   📍 Location: Provided via GPS / In-chat';

        // URLs & Breakdown
        const trackBase = (process.env.TRACKING_BASE_URL || 'https://need2done.in').replace(/\/$/, '');
        const trackUrl = `${trackBase}/track/${order.order_id}`;

        let header = `${emoji} *[${statusTitle.toUpperCase()}]* \`#${order.order_id}\``;
        if (eventNote && eventNote !== statusTitle) {
            header += ` — _${eventNote}_`;
        }

        const lines = [
            header,
            `• *Service:* ${order.service || category}`,
            `• *Task Details:* ${taskStr}`,
            `• *Customer:* ${customerName} (Masked: ${maskedPhone})`,
            `• *Helper:* ${helperStr}`,
            `• *Status:* ${emoji} ${statusTitle}`,
            `• *Location:*\n${locationSection}`,
            `• *Fare:* ₹${order.total_amount || 0} (Helper: ₹${order.helper_charge || 0} | Platform: ₹${order.platform_fee || 0})`,
            `🔗 *Live Track:* <${trackUrl}|${trackUrl}>`
        ];

        const textBody = lines.join('\n');

        // Post to target webhook
        const webhooksToSend = [];
        if (targetWebhook && targetWebhook.startsWith('http')) webhooksToSend.push(targetWebhook);
        if (masterWebhook && masterWebhook.startsWith('http') && masterWebhook !== targetWebhook) webhooksToSend.push(masterWebhook);

        for (const url of webhooksToSend) {
            axios.post(url, { text: textBody }, { timeout: 4000 }).catch(err => {
                console.error(`[SLACK ERROR] Failed to post to ${category}:`, err.message);
            });
        }
    } catch (err) {
        console.error('[SLACK DISPATCH ERROR]', err.message);
    }
}

module.exports = {
    sendSlackNotification,
    determineSlackWebhook,
    maskPhone
};
