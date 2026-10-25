/**
 * Need2Done (N2D) — Payment Invoice & Receipt Service
 * Generates itemized tax invoices & receipts upon order completion.
 * Dispatches invoice receipts to customers via WhatsApp and Email.
 */

const db = require('../config/db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
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
        console.log(`[WA INVOICE] Successfully sent invoice text to ${to}`);
    } catch (err) {
        console.error('[WA INVOICE ERROR] Failed to send WhatsApp message:', err.response?.data || err.message);
    }
}

async function sendWhatsAppDocumentDirect(to, documentUrl, filename, caption) {
    const token = getWaToken();
    const phoneId = getWaPhoneId();
    if (!token || !phoneId) {
        console.log('[WA INVOICE PDF MOCK] To:', to, '\nDoc URL:', documentUrl);
        return;
    }
    try {
        await axios.post(getWaApiUrl(), {
            messaging_product: "whatsapp",
            to: String(to).replace(/\D/g, ''),
            type: "document",
            document: {
                link: documentUrl,
                filename: filename || 'Invoice.pdf',
                caption: caption || '🧾 Need2Done Official Payment Invoice & Receipt'
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        console.log(`[WA INVOICE PDF] Successfully sent invoice PDF document to ${to}`);
    } catch (err) {
        console.error('[WA INVOICE PDF ERROR] Failed to send WhatsApp document:', err.response?.data || err.message);
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
 * Generates an official, beautifully styled PDF Tax Invoice & Receipt
 * Saves to backend/public/uploads/invoices/Invoice_<orderId>.pdf
 * Accessible publicly at https://need2done.in/uploads/invoices/Invoice_<orderId>.pdf
 */
function generateInvoicePdf(inv) {
    return new Promise((resolve, reject) => {
        try {
            const invoicesDir = path.join(__dirname, '../public/uploads/invoices');
            if (!fs.existsSync(invoicesDir)) {
                fs.mkdirSync(invoicesDir, { recursive: true });
            }

            const fileName = `Invoice_${inv.orderId}.pdf`;
            const filePath = path.join(invoicesDir, fileName);

            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);

            const primaryColor = '#0f172a'; // dark navy
            const textMuted = '#64748b';    // slate
            const lightBg = '#f8fafc';      // light slate

            // Top Header Banner
            doc.rect(0, 0, 595.28, 92).fill(primaryColor);

            // Brand Title
            doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('Need2Done', 40, 24);
            doc.fillColor('#94a3b8').fontSize(9.5).font('Helvetica').text('Everyday Helper & Hyperlocal Services', 40, 54);

            // "TAX INVOICE & RECEIPT" on top-right
            doc.fillColor('#38bdf8').fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', 350, 24, { align: 'right', width: 205 });
            doc.fillColor('#4ade80').fontSize(11).font('Helvetica-Bold').text('STATUS: PAID', 350, 44, { align: 'right', width: 205 });
            doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(`Invoice #: ${inv.invoiceNo}`, 350, 62, { align: 'right', width: 205 });

            // Company Meta Info Bar
            doc.fillColor(textMuted).fontSize(8).font('Helvetica');
            doc.text('Need2Done Platform | Bhongir, Telangana - 508116 | Support: +91 79898 62623 | support@need2done.in | https://need2done.in', 40, 102);

            doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, 118).lineTo(555, 118).stroke();

            // Two-column Order & Customer Info
            const detailsTop = 130;
            // Column 1: Customer Details
            doc.rect(40, detailsTop, 250, 85).fill(lightBg).stroke('#e2e8f0');
            doc.fillColor(textMuted).fontSize(8).font('Helvetica-Bold').text('BILLED TO (CUSTOMER)', 52, detailsTop + 10);
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(inv.customerName || 'Valued Customer', 52, detailsTop + 24);
            doc.fillColor('#334155').fontSize(9.5).font('Helvetica').text(`Phone: +${inv.customerPhone || 'N/A'}`, 52, detailsTop + 40);
            if (inv.customerEmail) {
                doc.text(`Email: ${inv.customerEmail}`, 52, detailsTop + 54);
            }

            // Column 2: Order & Service Details
            doc.rect(305, detailsTop, 250, 85).fill(lightBg).stroke('#e2e8f0');
            doc.fillColor(textMuted).fontSize(8).font('Helvetica-Bold').text('ORDER INFORMATION', 317, detailsTop + 10);
            doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold').text(`Order ID: #${inv.orderId}`, 317, detailsTop + 24);
            doc.fillColor('#334155').fontSize(9).font('Helvetica').text(`Date & Time: ${inv.dateTime}`, 317, detailsTop + 40);
            doc.text(`Service: ${inv.serviceTitle}`, 317, detailsTop + 54);
            if (inv.helperName) {
                doc.text(`Assigned Helper: ${inv.helperName}`, 317, detailsTop + 68);
            }

            // Table Header
            const tableTop = 235;
            doc.rect(40, tableTop, 515, 26).fill('#f1f5f9');
            doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
            doc.text('DESCRIPTION', 55, tableTop + 8);
            doc.text('CATEGORY', 340, tableTop + 8);
            doc.text('AMOUNT (INR)', 450, tableTop + 8, { align: 'right', width: 90 });

            // Table Rows
            let currentY = tableTop + 26;
            const rowHeight = 28;

            const items = [
                { desc: 'Service / Helper Convenience Charge', type: 'Labor & Delivery', amount: `₹${inv.helperCharge}` }
            ];

            if (parseFloat(inv.billAmount) > 0) {
                items.push({ desc: 'Store Bill / Goods Purchase (Actuals)', type: 'Merchandise', amount: `₹${inv.billAmount}` });
            }

            items.push({ desc: 'Platform & Technology Fee (Inclusive of Taxes)', type: 'Platform Fee', amount: `₹${inv.platformFee}` });

            items.forEach((item) => {
                doc.strokeColor('#f1f5f9').lineWidth(1).moveTo(40, currentY + rowHeight).lineTo(555, currentY + rowHeight).stroke();
                doc.fillColor('#1e293b').fontSize(9.5).font('Helvetica').text(item.desc, 55, currentY + 8);
                doc.fillColor(textMuted).fontSize(8.5).font('Helvetica').text(item.type, 340, currentY + 8);
                doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(item.amount, 450, currentY + 8, { align: 'right', width: 90 });
                currentY += rowHeight;
            });

            // Total Summary Box
            currentY += 15;
            doc.rect(305, currentY, 250, 85).fill('#ecfdf5').stroke('#a7f3d0');
            doc.fillColor('#065f46').fontSize(10).font('Helvetica-Bold').text('TOTAL AMOUNT PAID', 320, currentY + 14);
            doc.fillColor('#047857').fontSize(18).font('Helvetica-Bold').text(`₹${inv.totalAmount}`, 430, currentY + 10, { align: 'right', width: 110 });

            doc.fillColor('#047857').fontSize(8.5).font('Helvetica').text(`Payment Mode: ${inv.paymentMethod}`, 320, currentY + 40);
            doc.text(`Payment Status: ${inv.paymentStatus}`, 320, currentY + 54);
            doc.text(`Transaction Ref: ${inv.transactionId}`, 320, currentY + 68);

            // Receipt Guarantee Box
            doc.rect(40, currentY, 250, 85).fill(lightBg).stroke('#e2e8f0');
            doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('PAYMENT RECEIPT GUARANTEE', 52, currentY + 12);
            doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Payment has been verified and booked into our merchant ledger. Thank you for choosing Need2Done as your trusted neighborhood concierge partner!', 52, currentY + 28, { width: 226, lineGap: 2 });

            // Bottom Footer
            const footerY = 745;
            doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, footerY).lineTo(555, footerY).stroke();
            doc.fillColor(textMuted).fontSize(8).font('Helvetica');
            doc.text('This is an electronically generated tax invoice & payment receipt. No physical signature required.', 40, footerY + 10, { align: 'center', width: 515 });
            doc.text('© 2026 Need2Done Services. All Rights Reserved. | support@need2done.in | https://need2done.in', 40, footerY + 22, { align: 'center', width: 515 });

            doc.end();

            writeStream.on('finish', () => {
                const publicUrl = `https://need2done.in/uploads/invoices/${fileName}`;
                resolve({ fileName, filePath, publicUrl });
            });

            writeStream.on('error', (err) => {
                reject(err);
            });
        } catch (err) {
            reject(err);
        }
    });
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
    const pdfUrl = inv.pdfUrl || `https://need2done.in/uploads/invoices/Invoice_${inv.orderId}.pdf`;

    return (
        `🧾 *NEED2DONE — OFFICIAL PAYMENT INVOICE & RECEIPT*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 *Need2Done Services*\n` +
        `🌐 Website : https://need2done.in\n` +
        `📞 Support : +91 79898 62623 | support@need2done.in\n` +
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
        `📥 *Download Invoice (PDF):*\n${pdfUrl}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Thank you for using Need2Done! 🙏\n` +
        `For queries or feedback, contact support@need2done.in.`
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

    const pdfUrl = inv.pdfUrl || `https://need2done.in/uploads/invoices/Invoice_${inv.orderId}.pdf`;

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
        .download-btn { display: inline-block; background: #0284c7; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 15px; }
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

            <div style="text-align: center; margin-bottom: 25px;" class="no-print">
                <a href="${pdfUrl}" target="_blank" class="download-btn">📥 Download Official PDF Invoice</a>
            </div>

            <div class="footer">
                <p><strong>Need2Done Services</strong> &bull; https://need2done.in</p>
                <p>Need support? Contact us at support@need2done.in or call +91 79898 62623</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Dispatches the payment invoice receipt to the customer via WhatsApp (PDF document + text) and Email
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

        // 1. Generate real PDF invoice file
        let pdfResult = null;
        try {
            pdfResult = await generateInvoicePdf(invoiceData);
            invoiceData.pdfUrl = pdfResult.publicUrl;
            console.log(`[Invoice Service] Generated PDF Invoice at: ${pdfResult.publicUrl}`);
        } catch (pdfErr) {
            console.error('[Invoice Service] Failed to generate PDF:', pdfErr.message);
        }

        const waText = buildWhatsAppInvoiceText(invoiceData);
        const html = buildHtmlInvoice(invoiceData);

        // 2. Send via WhatsApp to customer (Document PDF + formatted text summary)
        if (invoiceData.customerPhone) {
            if (pdfResult && pdfResult.publicUrl) {
                const docCaption = `🧾 Official Tax Invoice & Payment Receipt for Order #${invoiceData.orderId}\nTotal: ₹${invoiceData.totalAmount} (PAID ✅)\nThank you for choosing Need2Done!`;
                await sendWhatsAppDocumentDirect(
                    invoiceData.customerPhone,
                    pdfResult.publicUrl,
                    `Invoice_${invoiceData.orderId}.pdf`,
                    docCaption
                );
            }
            // Also send itemized text receipt with click-to-download link
            await sendWhatsAppTextDirect(invoiceData.customerPhone, waText);
        }

        // 3. Send via Email if customer email is available (with PDF attached)
        if (invoiceData.customerEmail) {
            const emailAttachments = [];
            if (pdfResult && pdfResult.filePath && fs.existsSync(pdfResult.filePath)) {
                emailAttachments.push({
                    filename: `Invoice_${invoiceData.orderId}.pdf`,
                    path: pdfResult.filePath
                });
            }
            await sendMailSafe({
                to: invoiceData.customerEmail,
                subject: `🧾 Payment Invoice & Receipt for Order #${invoiceData.orderId} - Need2Done`,
                html,
                text: waText,
                applicationId: invoiceData.orderId,
                role: 'CUSTOMER',
                emailType: 'ORDER_INVOICE',
                attachments: emailAttachments
            });
        }

        // 4. Log timeline event
        try {
            await db.query(
                `INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by) 
                 VALUES (?, 'INVOICE_SENT', ?, 'SYSTEM')`,
                [order.id, `Payment invoice PDF (${invoiceData.invoiceNo}) dispatched to customer WhatsApp (${invoiceData.customerPhone})`]
            );
        } catch (timelineErr) {
            console.warn('[Invoice Service] Timeline insert warning:', timelineErr.message);
        }

        console.log(`[Invoice Service] Successfully dispatched PDF invoice for order #${invoiceData.orderId}`);
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
    generateInvoicePdf,
    sendOrderInvoiceReceipt
};
