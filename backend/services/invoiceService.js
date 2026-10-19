/**
 * Need2Done (N2D) — Payment Invoice & Receipt Service
 * Generates itemized tax invoices & receipts upon order completion.
 * Dispatches invoice receipts to customers via WhatsApp and Email.
 */

const db = require('../config/db');
const axios = require('axios');
const { sendMailSafe } = require('./emailService');

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

async function sendWhatsAppTextDirect(to, text) {
    const token = getWaToken();
    const phoneId = getWaPhoneId();
    if (!token || !phoneId) {
        console.log('[WA INVOICE MOCK] To:', to, '\nText:\n', text);
        return;
    }
    try {
        await axios.post(getWaApiUrl(), {
            messaging_product: "whatsapp",
            to: String(to).replace(/\D/g, ''),
            type: "text",
            text: { body: text }
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        console.log(`[WA INVOICE] Successfully sent invoice to ${to}`);
    } catch (err) {
        console.error('[WA INVOICE ERROR] Failed to send WhatsApp message:', err.response?.data || err.message);
    }
}

/**
 * Normalizes order record into an itemized invoice data structure
 */
function buildInvoiceData(order) {
    let payload = {};
    try {
        payload = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {});
    } catch (e) {
        payload = {};
    }

    const orderId = order.order_id || `N2D_${order.id}`;
    const invoiceNo = `INV-${orderId}`;
    
    const rawBill = parseFloat(order.bill_amount || 0);
    const rawHelper = parseFloat(order.helper_charge || 0);
    const rawPlatform = parseFloat(order.platform_fee || 0);
    let rawTotal = parseFloat(order.total_amount || 0);
    if (!rawTotal || rawTotal <= 0) {
        rawTotal = rawBill + rawHelper + rawPlatform;
    }

    const serviceTitle = payload.service_title || payload.serviceName || order.service || 'Need2Done Service';
    const customerName = order.customer_name || payload.customer_name || 'Valued Customer';
    const customerPhone = order.customer_number || order.customer_phone || payload.customer_phone || '';
    const customerEmail = payload.customer_email || payload.email || order.customer_email || '';
    const helperName = order.helper_name || payload.helper_name || '';
    const helperPhone = order.helper_phone || payload.helper_phone || '';
    const paymentMethod = (order.payment_method || 'RAZORPAY').toUpperCase();
    const transactionId = order.razorpay_payment_id || `N2D-TXN-${orderId}`;
    
    const completedDate = order.completed_at ? new Date(order.completed_at) : new Date();
    const formattedDate = completedDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return {
        orderId,
        invoiceNo,
        dateTime: formattedDate,
        serviceTitle,
        customerName,
        customerPhone,
        customerEmail,
        helperName,
        helperPhone,
        billAmount: rawBill.toFixed(2),
        helperCharge: rawHelper.toFixed(2),
        platformFee: rawPlatform.toFixed(2),
        totalAmount: rawTotal.toFixed(2),
        paymentMethod,
        paymentStatus: 'PAID',
        transactionId
    };
}

/**
 * Builds WhatsApp formatted invoice message
 */
function buildWhatsAppInvoiceText(inv) {
    const billLine = parseFloat(inv.billAmount) > 0 
        ? `• Store / Item Bill       : ₹${inv.billAmount}\n` 
        : '';
    const helperLine = inv.helperName 
        ? `Helper / Professional     : ${inv.helperName}\n` 
        : '';

    return (
        `🧾 *NEED2DONE — OFFICIAL PAYMENT INVOICE & RECEIPT*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 *Need2Done Services Private Limited*\n` +
        `🌐 Website : https://need2done.in\n` +
        `📞 Support : +91 70958 49056 | support@need2done.in\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *TAX INVOICE DETAILS*\n` +
        `Invoice No   : ${inv.invoiceNo}\n` +
        `Order ID     : #${inv.orderId}\n` +
        `Date & Time  : ${inv.dateTime}\n` +
        `Customer     : ${inv.customerName}\n` +
        `Mobile       : ${inv.customerPhone}\n` +
        `Service      : ${inv.serviceTitle}\n` +
        helperLine +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💵 *ITEMIZED CHARGES*\n` +
        `• Service / Helper Charge : ₹${inv.helperCharge}\n` +
        billLine +
        `• Platform Fee (incl GST) : ₹${inv.platformFee}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *TOTAL PAID : ₹${inv.totalAmount}*\n` +
        `💳 Payment Mode   : ${inv.paymentMethod}\n` +
        `🛡️ Payment Status : ${inv.paymentStatus} ✅\n` +
        `🔖 Transaction ID : ${inv.transactionId}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Thank you for using Need2Done! 🙏\n` +
        `For queries, feedback, or digital invoice copy, contact support@need2done.in.`
    );
}

/**
 * Generates printable HTML invoice for web viewing / PDF / email
 */
function buildHtmlInvoice(inv) {
    const billRow = parseFloat(inv.billAmount) > 0 ? `
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155;">Store / Goods Purchased</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: 600;">₹${inv.billAmount}</td>
        </tr>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Need2Done Invoice #${inv.orderId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; color: #0f172a; }
        .invoice-card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
        .header { background: #0f172a; color: #ffffff; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; }
        .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
        .status-badge { background: #16a34a; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .body { padding: 32px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
        .meta-box h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
        .meta-box p { margin: 2px 0; font-size: 14px; color: #1e293b; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f1f5f9; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
        .total-box { background: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 28px; }
        .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: #0f172a; }
        .footer { text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        @media print { body { background: #ffffff; padding: 0; } .invoice-card { border: none; box-shadow: none; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="invoice-card">
        <div class="header">
            <div>
                <h1>Need2Done</h1>
                <p>Tax Invoice & Payment Receipt</p>
            </div>
            <div>
                <span class="status-badge">PAID ✅</span>
            </div>
        </div>
        <div class="body">
            <div class="meta-grid">
                <div class="meta-box">
                    <h3>Billed To</h3>
                    <p><strong>${inv.customerName}</strong></p>
                    <p>Phone: +${inv.customerPhone}</p>
                    ${inv.customerEmail ? `<p>Email: ${inv.customerEmail}</p>` : ''}
                </div>
                <div class="meta-box" style="text-align: right;">
                    <h3>Invoice Details</h3>
                    <p>Invoice No: <strong>${inv.invoiceNo}</strong></p>
                    <p>Order ID: <strong>#${inv.orderId}</strong></p>
                    <p>Date: ${inv.dateTime}</p>
                    <p>Txn ID: <code style="font-size: 12px; background: #f1f5f9; padding: 2px 4px; border-radius: 4px;">${inv.transactionId}</code></p>
                </div>
            </div>

            <div style="margin-bottom: 20px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; font-size: 14px;">
                <strong>Service:</strong> ${inv.serviceTitle}
                ${inv.helperName ? ` &bull; <strong>Assigned Helper:</strong> ${inv.helperName}` : ''}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item Description</th>
                        <th style="text-align: right;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155;">Service / Helper Labor Charge</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: 600;">₹${inv.helperCharge}</td>
                    </tr>
                    ${billRow}
                    <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155;">Platform & Processing Fee (Incl GST)</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: 600;">₹${inv.platformFee}</td>
                    </tr>
                </tbody>
            </table>

            <div class="total-box">
                <div class="total-row">
                    <span>Total Amount Paid:</span>
                    <span>₹${inv.totalAmount}</span>
                </div>
                <div style="margin-top: 8px; font-size: 13px; color: #64748b; display: flex; justify-content: space-between;">
                    <span>Payment Method: <strong>${inv.paymentMethod}</strong></span>
                    <span>Status: <strong style="color: #16a34a;">PAID</strong></span>
                </div>
            </div>

            <div class="footer">
                <p><strong>Need2Done Services Private Limited</strong> &bull; https://need2done.in</p>
                <p>Need support? Contact us at support@need2done.in or call +91 70958 49056</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Dispatches the payment invoice receipt to the customer via WhatsApp and Email
 */
async function sendOrderInvoiceReceipt(orderOrId) {
    try {
        let order = orderOrId;
        if (typeof orderOrId === 'string' || typeof orderOrId === 'number') {
            const [rows] = await db.query(`
                SELECT o.*, h.name as helper_name, h.phone as helper_phone, c.name as customer_name, c.phone as customer_phone
                FROM orders o
                LEFT JOIN helpers h ON o.helper_id = h.id
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = ? OR o.order_id = ?
            `, [orderOrId, String(orderOrId)]);
            if (rows.length === 0) {
                console.warn(`[Invoice Service] Order not found for identifier: ${orderOrId}`);
                return null;
            }
            order = rows[0];
        }

        const invoiceData = buildInvoiceData(order);
        const waText = buildWhatsAppInvoiceText(invoiceData);
        const html = buildHtmlInvoice(invoiceData);

        // 1. Send via WhatsApp to customer
        if (invoiceData.customerPhone) {
            await sendWhatsAppTextDirect(invoiceData.customerPhone, waText);
        }

        // 2. Send via Email if customer email is available
        if (invoiceData.customerEmail) {
            await sendMailSafe({
                to: invoiceData.customerEmail,
                subject: `🧾 Payment Invoice & Receipt for Order #${invoiceData.orderId} - Need2Done`,
                html,
                text: waText,
                applicationId: invoiceData.orderId,
                role: 'CUSTOMER',
                emailType: 'ORDER_INVOICE'
            });
        }

        // 3. Log timeline event
        try {
            await db.query(
                `INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                 VALUES (?, 'INVOICE_SENT', ?, 'SYSTEM')`,
                [order.id, `Payment invoice ${invoiceData.invoiceNo} dispatched to customer (${invoiceData.customerPhone})`]
            );
        } catch (timelineErr) {
            console.warn('[Invoice Service] Timeline insert warning:', timelineErr.message);
        }

        console.log(`[Invoice Service] Successfully dispatched invoice for order #${invoiceData.orderId}`);
        return invoiceData;
    } catch (err) {
        console.error('[Invoice Service Error]:', err);
        return null;
    }
}

module.exports = {
    buildInvoiceData,
    buildWhatsAppInvoiceText,
    buildHtmlInvoice,
    sendOrderInvoiceReceipt
};
