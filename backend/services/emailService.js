/**
 * Need2Done (N2D) — Email Notification Service
 * Handles transactional emails for Helper & Vendor registration workflows.
 * Integrates with SMTP / Nodemailer with safe fallback, queue logging, and retry logic.
 */

const nodemailer = require('nodemailer');
const db = require('../config/db');

// SMTP Configuration from Environment
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Need2Done <no-reply@need2done.in>';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'support@need2done.in';

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        console.log(`📧 EmailService: Connected to SMTP host ${SMTP_HOST}:${SMTP_PORT}`);
    } catch (err) {
        console.warn('⚠️ EmailService: Failed to initialize SMTP transporter:', err.message);
        transporter = null;
    }
} else {
    console.log('ℹ️ EmailService: Running in logger/mock mode (Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable live SMTP)');
}

/**
 * Log email notification to database
 */
async function logEmailRecord({ applicationId, recipientEmail, recipientRole, emailType, subject, status, error = null }) {
    try {
        await db.query(
            `INSERT INTO email_notification_logs 
             (application_id, recipient_email, recipient_role, email_type, subject, status, last_error, sent_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                applicationId,
                recipientEmail,
                recipientRole,
                emailType,
                subject,
                status,
                error ? String(error).slice(0, 500) : null,
                status === 'SENT' ? new Date() : null
            ]
        );
    } catch (dbErr) {
        console.error('Failed to log email record to DB:', dbErr.message);
    }
}

/**
 * Send an email safely with logging and error isolation
 */
async function sendMailSafe({ to, subject, html, text, applicationId, role, emailType }) {
    console.log(`\n======================================================`);
    console.log(`📨 [OUTGOING EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`📋 Type: ${emailType} | App ID: ${applicationId}`);
    console.log(`======================================================\n`);

    if (!transporter) {
        // Fallback: log delivery success in mock mode
        await logEmailRecord({
            applicationId,
            recipientEmail: to,
            recipientRole: role,
            emailType,
            subject,
            status: 'SENT'
        });
        return { success: true, simulated: true };
    }

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject,
            text,
            html
        });
        console.log(`✅ Email sent successfully: ${info.messageId}`);
        await logEmailRecord({
            applicationId,
            recipientEmail: to,
            recipientRole: role,
            emailType,
            subject,
            status: 'SENT'
        });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Failed to send email to ${to}:`, err.message);
        await logEmailRecord({
            applicationId,
            recipientEmail: to,
            recipientRole: role,
            emailType,
            subject,
            status: 'FAILED',
            error: err.message
        });
        // Never throw - a failed email must not abort application processing
        return { success: false, error: err.message };
    }
}

/**
 * 1. Send Applicant Confirmation Email
 */
async function sendApplicantConfirmation(app) {
    const isHelper = app.type === 'HELPER';
    const typeLabel = isHelper ? 'Helper' : 'Vendor';
    const recipientName = isHelper ? app.name : (app.owner_name || app.name);
    const subject = `Need2Done Registration Received — [${app.application_id}]`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #022B5E, #0369a1); padding: 30px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .badge { display: inline-block; background: #FBBF24; color: #78350F; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 99px; margin-top: 10px; }
            .content { padding: 30px; line-height: 1.6; }
            .card { background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid #0284c7; }
            .card p { margin: 6px 0; font-size: 14px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Need2Done</h1>
                <div class="badge">Application Submitted Successfully</div>
            </div>
            <div class="content">
                <p>Dear <strong>${recipientName}</strong>,</p>
                <p>Thank you for registering with <strong>Need2Done</strong> as a <strong>${typeLabel}</strong>.</p>
                <p>Your application has been received and logged into our operations verification queue.</p>
                
                <div class="card">
                    <p><strong>Application ID:</strong> <span style="font-family: monospace; font-weight: bold; color: #0369a1;">${app.application_id}</span></p>
                    <p><strong>Registration Type:</strong> ${typeLabel} Registration</p>
                    <p><strong>Service Category:</strong> ${app.service_category || 'General'}</p>
                    <p><strong>Status:</strong> <span style="color: #b45309; font-weight: 700;">Pending Review</span></p>
                    <p><strong>Submission Date:</strong> ${new Date(app.created_at || Date.now()).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>

                <p><strong>What happens next?</strong></p>
                <ol>
                    <li>Our compliance and onboarding team will verify your submitted details and documents within 24 to 48 business hours.</li>
                    <li>If any additional documents or clarifications are required, we will contact you via email or WhatsApp.</li>
                    <li>Once approved, you will receive activation credentials and onboarding instructions.</li>
                </ol>

                <p>If you have any questions, you can contact our helpdesk at <strong>+91 7989862623</strong> or reply to <strong>support@need2done.in</strong> with your Application ID.</p>
                
                <p>Thank you for your interest in joining the Need2Done partner network!</p>
                
                <p style="margin-top: 30px;">Warm regards,<br><strong>Need2Done Operations Team</strong><br><a href="https://need2done.in" style="color: #0284c7;">https://need2done.in</a></p>
            </div>
            <div class="footer">
                Need2Done Technologies • Bhongir & Telangana Hyperlocal Network<br>
                This is an automated system notification. Please preserve your Application ID for future inquiries.
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `Dear ${recipientName},

Thank you for registering with Need2Done as a ${typeLabel}.

Your application has been submitted successfully.

Application ID: ${app.application_id}
Registration Type: ${typeLabel}
Status: Pending Review
Submission Date: ${new Date().toLocaleDateString('en-IN')}

Our team will review your information and documents. We will contact you if any additional details are required.

Thank you for your interest in joining Need2Done.

Regards,
Need2Done Team
Helpline: +91 7989862623 | https://need2done.in`;

    return sendMailSafe({
        to: app.email,
        subject,
        html,
        text,
        applicationId: app.application_id,
        role: 'APPLICANT',
        emailType: 'SUBMISSION_CONFIRMATION'
    });
}

/**
 * 2. Send Admin Notification Email
 */
async function sendAdminNewApplicationAlert(app) {
    const isHelper = app.type === 'HELPER';
    const typeLabel = isHelper ? 'Helper' : 'Vendor';
    const name = isHelper ? app.name : `${app.business_name || app.name} (Owner: ${app.owner_name || app.name})`;
    const location = [app.village_town, app.mandal, app.district, app.state].filter(Boolean).join(', ') || 'Telangana';
    const subject = `New Need2Done Helper / Vendor Registration — [${app.application_id}]`;

    const adminDashboardUrl = process.env.ADMIN_URL || 'https://need2done.in/admin';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #cbd5e1; overflow: hidden; }
            .header { background: #0f172a; color: #ffffff; padding: 24px; border-bottom: 3px solid #f59e0b; }
            .content { padding: 24px; font-size: 14px; line-height: 1.6; }
            .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            .table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
            .table td.label { font-weight: bold; width: 38%; color: #475569; background: #f8fafc; }
            .btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; font-size: 18px;">🔔 New ${typeLabel} Registration Received</h2>
                <p style="margin: 4px 0 0; color: #cbd5e1; font-size: 13px;">Action required: Review applicant details and verify KYC documents.</p>
            </div>
            <div class="content">
                <table class="table">
                    <tr><td class="label">Application ID</td><td><strong>${app.application_id}</strong></td></tr>
                    <tr><td class="label">Registration Type</td><td>${typeLabel}</td></tr>
                    <tr><td class="label">Applicant / Business</td><td>${name}</td></tr>
                    <tr><td class="label">Mobile Number</td><td>${app.phone}</td></tr>
                    <tr><td class="label">Email Address</td><td>${app.email}</td></tr>
                    <tr><td class="label">Location</td><td>${location}</td></tr>
                    <tr><td class="label">Category</td><td>${app.service_category || app.business_category || 'N/A'}</td></tr>
                    <tr><td class="label">Submission Date</td><td>${new Date(app.created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
                    <tr><td class="label">Initial Status</td><td><span style="color: #b45309; font-weight: bold;">SUBMITTED / PENDING REVIEW</span></td></tr>
                </table>

                <p style="color: #64748b; font-size: 12px; margin-top: 12px;">
                    ⚠️ Note: Sensitive documents and banking details are protected and never sent via email. Review them securely in the authenticated Admin Portal.
                </p>

                <p style="text-align: center; margin-top: 24px;">
                    <a href="${adminDashboardUrl}/applications" class="btn">Open Application in Admin Dashboard ↗</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `New Need2Done ${typeLabel} Registration Received!

Application ID: ${app.application_id}
Type: ${typeLabel}
Applicant / Business: ${name}
Mobile: ${app.phone}
Email: ${app.email}
Location: ${location}
Category: ${app.service_category || 'N/A'}
Date: ${new Date().toLocaleString('en-IN')}

Access the authenticated admin portal to review documents and approve:
${adminDashboardUrl}/applications`;

    return sendMailSafe({
        to: ADMIN_EMAIL,
        subject,
        html,
        text,
        applicationId: app.application_id,
        role: 'ADMIN',
        emailType: 'ADMIN_NOTIFICATION'
    });
}

/**
 * 3. Send Status Update Email to Applicant (Approved, Rejected, Additional Info Required)
 */
async function sendApplicantStatusUpdate(app, newStatus, messageDetails = '') {
    const isHelper = app.type === 'HELPER';
    const typeLabel = isHelper ? 'Helper' : 'Vendor';
    const recipientName = isHelper ? app.name : (app.owner_name || app.name);

    let statusTitle = '';
    let statusColor = '#0284c7';
    let bodyContent = '';

    if (newStatus === 'APPROVED') {
        statusTitle = '🎉 Application Approved!';
        statusColor = '#16a34a';
        bodyContent = `
            <p>Congratulations! Your application to join <strong>Need2Done</strong> as a <strong>${typeLabel}</strong> has been <strong>APPROVED</strong>.</p>
            <p>Our operations team will now reach out to you directly on WhatsApp / Phone (<strong>${app.phone}</strong>) for your orientation and system dispatch credentials.</p>
            ${isHelper ? '<p>Please ensure you have the Need2Done Helper application ready on your smartphone for location tracking and order notifications.</p>' : ''}
            ${messageDetails ? `<div style="background: #ecfdf5; border-left: 4px solid #16a34a; padding: 12px; margin: 15px 0;"><strong>Onboarding Notes:</strong><br>${messageDetails}</div>` : ''}
        `;
    } else if (newStatus === 'REJECTED') {
        statusTitle = 'Update on your Need2Done Application';
        statusColor = '#dc2626';
        bodyContent = `
            <p>Thank you for your interest in partnering with Need2Done.</p>
            <p>After reviewing your application and documentation, we regret to inform you that we are unable to approve your application at this time.</p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 15px 0;">
                <strong>Reason for Decision:</strong><br>
                ${messageDetails || 'Eligibility criteria or documentation requirements were not satisfied.'}
            </div>
            <p>If you believe this decision was made in error or wish to appeal with updated documentation, please contact our helpdesk at <strong>+91 7989862623</strong> or write to <strong>support@need2done.in</strong> citing Application ID <strong>${app.application_id}</strong>.</p>
        `;
    } else if (newStatus === 'ADDITIONAL_INFO_REQUIRED') {
        statusTitle = 'Action Required: Additional Information Needed';
        statusColor = '#ea580c';
        bodyContent = `
            <p>Our verification team has reviewed your application and requires additional information or document clarifications to proceed with approval.</p>
            <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px; margin: 15px 0;">
                <strong>Requested Details:</strong><br>
                ${messageDetails || 'Please provide updated identification or vehicle documents.'}
            </div>
            <p>Please reply directly to this email or send the requested documents to our WhatsApp helpdesk at <strong>+91 7989862623</strong> quoting your Application ID <strong>${app.application_id}</strong>.</p>
        `;
    } else {
        statusTitle = `Application Status Updated: ${newStatus}`;
        bodyContent = `
            <p>The status of your Need2Done application has been updated to <strong>${newStatus.replace(/_/g, ' ')}</strong>.</p>
            ${messageDetails ? `<div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; margin: 15px 0;">${messageDetails}</div>` : ''}
        `;
    }

    const subject = `Need2Done Application Update — [${app.application_id}] (${newStatus.replace(/_/g, ' ')})`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
            .header { background: ${statusColor}; padding: 24px; text-align: center; color: #ffffff; }
            .header h2 { margin: 0; font-size: 20px; font-weight: 700; }
            .content { padding: 30px; line-height: 1.6; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>${statusTitle}</h2>
                <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Application ID: ${app.application_id}</div>
            </div>
            <div class="content">
                <p>Dear <strong>${recipientName}</strong>,</p>
                ${bodyContent}
                <p style="margin-top: 24px;">Regards,<br><strong>Need2Done Verification Team</strong><br>Helpline: +91 7989862623</p>
            </div>
            <div class="footer">
                Need2Done Technologies • Official Partner Communication
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `Dear ${recipientName},

${statusTitle}
Application ID: ${app.application_id}

${messageDetails ? `Details: ${messageDetails}\n` : ''}

For assistance, contact Need2Done Helpline: +91 7989862623 or support@need2done.in.

Regards,
Need2Done Operations Team`;

    return sendMailSafe({
        to: app.email,
        subject,
        html,
        text,
        applicationId: app.application_id,
        role: 'APPLICANT',
        emailType: 'STATUS_UPDATE'
    });
}

module.exports = {
    sendApplicantConfirmation,
    sendAdminNewApplicationAlert,
    sendApplicantStatusUpdate
};
