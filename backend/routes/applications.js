/**
 * Need2Done (N2D) — Helper & Vendor Registration API Routes
 * Handles public submissions, eligibility evaluation, secure file uploads,
 * admin review workflows, document retrieval, and status updates.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');
const { authenticateAdmin, verifyToken } = require('../middleware/auth');
const cryptoService = require('../services/cryptoService');
const emailService = require('../services/emailService');

// ============================================================
// UPLOAD CONFIGURATION (SECURE STORAGE)
// ============================================================
const UPLOADS_DIR = path.resolve(__dirname, '../uploads/applications');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `doc-${uniqueSuffix}${ext}`);
    }
});

// File Filter: PDF, JPG, JPEG, PNG only, max 5MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png'];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${file.fieldname}. Only PDF, JPG, and PNG are permitted.`));
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
    fileFilter
});

const uploadFields = upload.fields([
    { name: 'aadhaar_pan', maxCount: 1 },
    { name: 'driving_license', maxCount: 1 },
    { name: 'vehicle_rc', maxCount: 1 },
    { name: 'profile_photo', maxCount: 1 },
    { name: 'trade_license', maxCount: 1 },
    { name: 'proprietor_id', maxCount: 1 },
    { name: 'other_doc', maxCount: 1 }
]);

// Helper: Sanitize Phone Number to 10 digits
function sanitizePhone(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits.slice(2);
    }
    return digits.slice(-10);
}

// Helper: Generate Unique Application ID
function generateApplicationId(type) {
    const prefix = type === 'HELPER' ? 'N2D-APP-H' : 'N2D-APP-V';
    const timestampPart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${timestampPart}-${randomPart}`;
}

// Configurable Bike Cutoff Year (Default: 2009)
const BIKE_CUTOFF_YEAR = parseInt(process.env.BIKE_CUTOFF_YEAR || '2009', 10);

// ============================================================
// 1. PUBLIC: POST /api/applications/submit
// Submit Helper or Vendor Application
// ============================================================
router.post('/submit', uploadFields, async (req, res) => {
    try {
        const body = req.body;
        const type = (body.type || 'HELPER').toUpperCase();

        if (type !== 'HELPER' && type !== 'VENDOR') {
            return res.status(400).json({ success: false, error: 'Invalid registration type. Must be HELPER or VENDOR.' });
        }

        const phone = sanitizePhone(body.phone);
        if (!phone || phone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number.' });
        }

        const email = (body.email || '').trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
        }

        const name = (body.name || '').trim();
        if (!name) {
            return res.status(400).json({ success: false, error: 'Full Name or Business Name is required.' });
        }

        const address = (body.address || '').trim();
        const pincode = (body.pincode || '').trim();
        if (!address || !pincode) {
            return res.status(400).json({ success: false, error: 'Complete address and PIN code are required.' });
        }

        // Parse eligibility declarations
        let declarations = {};
        try {
            declarations = typeof body.declarations === 'string' ? JSON.parse(body.declarations) : (body.declarations || {});
        } catch (e) {
            declarations = {};
        }

        // ========================================================
        // HELPER SPECIFIC VALIDATIONS & ELIGIBILITY
        // ========================================================
        let isFlaggedForManualReview = false;
        let vehicleYear = null;
        let drivingExp = null;

        if (type === 'HELPER') {
            // 1. Age Verification (Must be at least 18)
            if (!body.dob) {
                return res.status(400).json({ success: false, error: 'Date of Birth is required for Helper registration.' });
            }
            const dobDate = new Date(body.dob);
            if (isNaN(dobDate.getTime())) {
                return res.status(400).json({ success: false, error: 'Invalid Date of Birth format.' });
            }

            const today = new Date();
            let age = today.getFullYear() - dobDate.getFullYear();
            const m = today.getMonth() - dobDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
                age--;
            }

            if (age < 18) {
                return res.status(400).json({
                    success: false,
                    eligibility_failed: true,
                    error: `Eligibility Requirement Failed: You must be at least 18 years old to register as a Need2Done Helper. Current age: ${age}.`
                });
            }

            // 2. Vehicle & Driving Experience Checks
            const vehicleType = (body.vehicle_type || 'Bicycle').toLowerCase();
            const isMotorized = ['bike', 'two-wheeler', 'auto', 'auto-rickshaw', 'car', 'cab'].some(v => vehicleType.includes(v));

            if (isMotorized) {
                drivingExp = parseInt(body.driving_experience_years || '0', 10);
                if (isNaN(drivingExp) || drivingExp < 2) {
                    return res.status(400).json({
                        success: false,
                        eligibility_failed: true,
                        error: 'Eligibility Requirement Failed: At least 2 years of driving experience is required for motorized transport or delivery services.'
                    });
                }

                if (!body.driving_license_number || body.driving_license_number.trim().length < 5) {
                    return res.status(400).json({
                        success: false,
                        error: 'A valid Driving Licence (DL) number is required for motorized vehicles.'
                    });
                }

                // Check vehicle manufacturing year if provided (for bike policy)
                if (body.vehicle_year) {
                    vehicleYear = parseInt(body.vehicle_year, 10);
                    if (vehicleType.includes('bike') && vehicleYear < BIKE_CUTOFF_YEAR) {
                        return res.status(400).json({
                            success: false,
                            eligibility_failed: true,
                            error: `Vehicle Policy Notice: Two-wheelers manufactured before ${BIKE_CUTOFF_YEAR} are not eligible for active commercial delivery on Need2Done to ensure safety and emission compliance.`
                        });
                    }
                }
            }

            // 3. Legal and Driving Record Declarations Check
            // Applicant must declare accurate info.
            if (declarations.has_dui || declarations.has_criminal_record || declarations.has_active_challans) {
                // Do not reject automatically - flag for authorized human review
                isFlaggedForManualReview = true;
            }

            if (!declarations.agreed_to_terms || !declarations.info_accurate) {
                return res.status(400).json({
                    success: false,
                    error: 'You must confirm that the information provided is accurate and agree to the Need2Done Partner Terms and verification process.'
                });
            }
        }

        // ========================================================
        // VENDOR SPECIFIC VALIDATIONS
        // ========================================================
        if (type === 'VENDOR') {
            if (!body.business_name || body.business_name.trim().length === 0) {
                return res.status(400).json({ success: false, error: 'Shop or Business Name is required.' });
            }
            if (!declarations.agreed_to_terms || !declarations.authorized_representative) {
                return res.status(400).json({
                    success: false,
                    error: 'You must confirm that you are authorized to represent this business and agree to the Need2Done Vendor Terms.'
                });
            }
        }

        // ========================================================
        // PREVENT DUPLICATE RECENT SUBMISSION
        // ========================================================
        const [existing] = await db.query(
            `SELECT application_id, status, created_at FROM registration_applications 
             WHERE (phone = ? OR email = ?) AND status IN ('SUBMITTED', 'PENDING_REVIEW', 'UNDER_VERIFICATION')
             AND created_at > NOW() - INTERVAL 24 HOUR LIMIT 1`,
            [phone, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                duplicate: true,
                application_id: existing[0].application_id,
                status: existing[0].status,
                error: `An active registration application (${existing[0].application_id}) was already submitted within the last 24 hours. Our team is currently reviewing it.`
            });
        }

        // ========================================================
        // SENSITIVE BANK DETAILS ENCRYPTION
        // ========================================================
        let encryptedAccount = null;
        let last4Account = null;
        if (body.account_number) {
            const cleanAcc = String(body.account_number).trim();
            encryptedAccount = cryptoService.encrypt(cleanAcc);
            last4Account = cleanAcc.slice(-4);
        }

        // Determine Initial Status
        const initialStatus = isFlaggedForManualReview ? 'UNDER_VERIFICATION' : 'PENDING_REVIEW';
        const applicationId = generateApplicationId(type);

        // ========================================================
        // INSERT INTO registration_applications
        // ========================================================
        const [insertResult] = await db.query(
            `INSERT INTO registration_applications (
                application_id, type, status, name, owner_name, phone, whatsapp_number, email,
                dob, gender, address, village_town, mandal, district, state, pincode, emergency_contact,
                service_category, vehicle_type, vehicle_reg_number, vehicle_make_model, vehicle_year,
                driving_experience_years, driving_license_number, preferred_area, availability_type, preferred_hours,
                bank_holder_name, bank_name, bank_account_number_encrypted, bank_account_last4, ifsc_code, upi_id,
                business_name, business_category, products_offered, operating_hours, years_in_business, business_description,
                gst_number, eligibility_declarations, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                applicationId,
                type,
                initialStatus,
                name,
                body.owner_name || null,
                phone,
                body.whatsapp_number ? sanitizePhone(body.whatsapp_number) : phone,
                email,
                body.dob || null,
                body.gender || null,
                address,
                body.village_town || null,
                body.mandal || null,
                body.district || null,
                body.state || 'Telangana',
                pincode,
                body.emergency_contact || null,
                body.service_category || (type === 'HELPER' ? 'General Assistance' : 'Retail / Services'),
                body.vehicle_type || null,
                body.vehicle_reg_number || null,
                body.vehicle_make_model || null,
                vehicleYear,
                drivingExp,
                body.driving_license_number || null,
                body.preferred_area || null,
                body.availability_type || 'Full-time',
                body.preferred_hours || null,
                body.bank_holder_name || null,
                body.bank_name || null,
                encryptedAccount,
                last4Account,
                body.ifsc_code ? body.ifsc_code.toUpperCase().trim() : null,
                body.upi_id || null,
                body.business_name || null,
                body.business_category || null,
                body.products_offered || null,
                body.operating_hours || null,
                body.years_in_business ? parseInt(body.years_in_business, 10) : null,
                body.business_description || null,
                body.gst_number || null,
                JSON.stringify(declarations)
            ]
        );

        // ========================================================
        // SAVE UPLOADED DOCUMENTS
        // ========================================================
        const files = req.files || {};
        const documentEntries = [];

        for (const [fieldName, fileArray] of Object.entries(files)) {
            if (fileArray && fileArray.length > 0) {
                const f = fileArray[0];
                documentEntries.push([
                    applicationId,
                    fieldName.toUpperCase(),
                    f.filename,
                    f.originalname,
                    f.path,
                    f.size,
                    f.mimetype
                ]);
            }
        }

        if (documentEntries.length > 0) {
            await db.query(
                `INSERT INTO application_documents 
                 (application_id, doc_type, file_name, original_name, file_path, file_size, mime_type) 
                 VALUES ?`,
                [documentEntries]
            );
        }

        // ========================================================
        // INITIAL STATUS HISTORY
        // ========================================================
        const initialNote = isFlaggedForManualReview
            ? 'Application submitted with declarations flagged for manual administrative review.'
            : 'Application submitted successfully via website registration portal.';

        await db.query(
            `INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, notes) 
             VALUES (?, NULL, ?, 'APPLICANT_PORTAL', ?)`,
            [applicationId, initialStatus, initialNote]
        );

        // ========================================================
        // TRIGGER ASYNC NOTIFICATION EMAILS
        // ========================================================
        const appPayload = {
            application_id: applicationId,
            type,
            name,
            owner_name: body.owner_name,
            phone,
            email,
            service_category: body.service_category || body.business_category,
            village_town: body.village_town,
            mandal: body.mandal,
            district: body.district,
            state: body.state,
            business_name: body.business_name,
            created_at: new Date()
        };

        // Fire and forget - logs error safely without failing HTTP response
        emailService.sendApplicantConfirmation(appPayload).catch(e => console.error('Confirmation email error:', e));
        emailService.sendAdminNewApplicationAlert(appPayload).catch(e => console.error('Admin alert email error:', e));

        return res.status(201).json({
            success: true,
            message: 'Application submitted successfully.',
            application_id: applicationId,
            type,
            status: initialStatus,
            submission_date: new Date().toISOString(),
            documents_uploaded: documentEntries.length,
            next_steps: 'Our team will review your application and documents within 24 to 48 hours. A confirmation email has been sent to your registered address.'
        });
    } catch (err) {
        console.error('Error submitting application:', err);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred while processing your application. Please check your details and try again.'
        });
    }
});

// ============================================================
// 2. ADMIN: GET /api/applications
// List all applications with metrics, search, filters & pagination
// ============================================================
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const {
            type,
            status,
            search,
            startDate,
            endDate,
            page = 1,
            limit = 15,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
        const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

        // Build dynamic WHERE clause
        const conditions = [];
        const params = [];

        if (type && ['HELPER', 'VENDOR'].includes(type.toUpperCase())) {
            conditions.push('type = ?');
            params.push(type.toUpperCase());
        }

        if (status && status !== 'ALL') {
            conditions.push('status = ?');
            params.push(status);
        }

        if (search) {
            const term = `%${search.trim()}%`;
            conditions.push('(application_id LIKE ? OR name LIKE ? OR business_name LIKE ? OR phone LIKE ? OR email LIKE ?)');
            params.push(term, term, term, term, term);
        }

        if (startDate) {
            conditions.push('DATE(created_at) >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('DATE(created_at) <= ?');
            params.push(endDate);
        }

        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Safe sort column
        const allowedSort = ['created_at', 'name', 'status', 'type', 'application_id'];
        const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'created_at';
        const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // 1. Fetch filtered applications
        const [rows] = await db.query(
            `SELECT id, application_id, type, status, name, owner_name, business_name, phone, email,
                    service_category, business_category, village_town, district, state,
                    assigned_reviewer, created_at, updated_at,
                    (SELECT COUNT(*) FROM application_documents WHERE application_id = registration_applications.application_id) AS document_count
             FROM registration_applications
             ${whereSql}
             ORDER BY ${sortColumn} ${direction}
             LIMIT ? OFFSET ?`,
            [...params, pageLimit, offset]
        );

        // 2. Fetch total count for pagination
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM registration_applications ${whereSql}`,
            params
        );

        // 3. Fetch summary metrics cards
        const [[metrics]] = await db.query(`
            SELECT 
                COUNT(*) AS total_applications,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS new_today,
                SUM(CASE WHEN status = 'PENDING_REVIEW' OR status = 'SUBMITTED' THEN 1 ELSE 0 END) AS pending_review,
                SUM(CASE WHEN status = 'UNDER_VERIFICATION' THEN 1 ELSE 0 END) AS under_verification,
                SUM(CASE WHEN status = 'ADDITIONAL_INFO_REQUIRED' THEN 1 ELSE 0 END) AS additional_info_required,
                SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
            FROM registration_applications
        `);

        return res.json({
            success: true,
            metrics: {
                total: metrics.total_applications || 0,
                new_today: metrics.new_today || 0,
                pending_review: metrics.pending_review || 0,
                under_verification: metrics.under_verification || 0,
                additional_info_required: metrics.additional_info_required || 0,
                approved: metrics.approved || 0,
                rejected: metrics.rejected || 0
            },
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: pageLimit,
                totalPages: Math.ceil(total / pageLimit)
            },
            applications: rows
        });
    } catch (err) {
        console.error('Error fetching applications:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching applications' });
    }
});

// ============================================================
// 3. ADMIN: GET /api/applications/:applicationId
// Full Application Details, Documents & History
// ============================================================
router.get('/:applicationId', authenticateAdmin, async (req, res) => {
    try {
        const { applicationId } = req.params;

        const [rows] = await db.query(
            'SELECT * FROM registration_applications WHERE application_id = ?',
            [applicationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const app = rows[0];

        // Mask bank details for security in API response
        delete app.bank_account_number_encrypted;
        app.bank_account_masked = app.bank_account_last4 ? `••••••••${app.bank_account_last4}` : null;

        // Fetch documents
        const [documents] = await db.query(
            'SELECT id, doc_type, file_name, original_name, file_size, mime_type, uploaded_at FROM application_documents WHERE application_id = ?',
            [applicationId]
        );

        // Fetch status history
        const [history] = await db.query(
            'SELECT * FROM application_status_history WHERE application_id = ? ORDER BY created_at DESC',
            [applicationId]
        );

        // Fetch internal notes
        const [notes] = await db.query(
            'SELECT * FROM application_notes WHERE application_id = ? ORDER BY created_at DESC',
            [applicationId]
        );

        return res.json({
            success: true,
            application: app,
            documents,
            history,
            notes
        });
    } catch (err) {
        console.error('Error fetching application details:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching application' });
    }
});

// ============================================================
// 4. ADMIN: GET /api/applications/:applicationId/documents/:documentId
// Secure Document Download & Preview
// Supports Bearer token or URL token parameter (?token=...)
// ============================================================
router.get('/:applicationId/documents/:documentId', async (req, res) => {
    try {
        // Authenticate via header or query token
        const token = (req.headers.authorization && req.headers.authorization.split(' ')[1]) || req.query.token;
        if (!token) {
            return res.status(401).send('Unauthorized: Missing access token');
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).send('Forbidden: Administrative privileges required to access KYC documents');
        }

        const { applicationId, documentId } = req.params;

        const [rows] = await db.query(
            'SELECT * FROM application_documents WHERE id = ? AND application_id = ?',
            [documentId, applicationId]
        );

        if (rows.length === 0) {
            return res.status(404).send('Document not found');
        }

        const doc = rows[0];
        const filePath = doc.file_path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Document file does not exist on storage server');
        }

        res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name)}"`);
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    } catch (err) {
        console.error('Error streaming document:', err);
        res.status(500).send('Error retrieving document');
    }
});

// ============================================================
// 5. ADMIN: PATCH /api/applications/:applicationId/status
// Update Status (Approve, Reject, Request Info)
// ============================================================
router.patch('/:applicationId/status', authenticateAdmin, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status, rejection_reason, additional_info_request, note } = req.body;

        const validStatuses = ['PENDING_REVIEW', 'UNDER_VERIFICATION', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid application status provided.' });
        }

        // Require rejection reason
        if (status === 'REJECTED' && (!rejection_reason || rejection_reason.trim().length === 0)) {
            return res.status(400).json({ success: false, error: 'A rejection reason is mandatory when rejecting an application.' });
        }

        // Require description when requesting additional info
        if (status === 'ADDITIONAL_INFO_REQUIRED' && (!additional_info_request || additional_info_request.trim().length === 0)) {
            return res.status(400).json({ success: false, error: 'Please specify the additional information or documents required.' });
        }

        const [apps] = await db.query(
            'SELECT * FROM registration_applications WHERE application_id = ?',
            [applicationId]
        );

        if (apps.length === 0) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const app = apps[0];
        const oldStatus = app.status;
        const reviewer = req.user.username || req.user.email || 'Admin';

        // Update application
        await db.query(
            `UPDATE registration_applications SET 
                status = ?,
                assigned_reviewer = ?,
                rejection_reason = ?,
                additional_info_request = ?,
                decision_timestamp = NOW(),
                updated_at = NOW()
             WHERE application_id = ?`,
            [
                status,
                reviewer,
                status === 'REJECTED' ? rejection_reason.trim() : app.rejection_reason,
                status === 'ADDITIONAL_INFO_REQUIRED' ? additional_info_request.trim() : app.additional_info_request,
                applicationId
            ]
        );

        // Record status history audit log
        const auditNote = note || rejection_reason || additional_info_request || `Status transitioned from ${oldStatus} to ${status}`;
        await db.query(
            `INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [applicationId, oldStatus, status, reviewer, auditNote]
        );

        // Trigger applicant status update email
        const messageDetails = status === 'REJECTED' ? rejection_reason : (status === 'ADDITIONAL_INFO_REQUIRED' ? additional_info_request : note);
        emailService.sendApplicantStatusUpdate(app, status, messageDetails).catch(e => console.error('Status update email error:', e));

        return res.json({
            success: true,
            message: `Application status updated to ${status}.`,
            application_id: applicationId,
            new_status: status
        });
    } catch (err) {
        console.error('Error updating status:', err);
        return res.status(500).json({ success: false, error: 'Failed to update application status' });
    }
});

// ============================================================
// 6. ADMIN: POST /api/applications/:applicationId/notes
// Add Internal Reviewer Note
// ============================================================
router.post('/:applicationId/notes', authenticateAdmin, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { note } = req.body;

        if (!note || note.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Note text cannot be empty.' });
        }

        const author = req.user.username || req.user.email || 'Admin';

        await db.query(
            'INSERT INTO application_notes (application_id, author, note) VALUES (?, ?, ?)',
            [applicationId, author, note.trim()]
        );

        return res.json({ success: true, message: 'Internal note added.' });
    } catch (err) {
        console.error('Error adding note:', err);
        return res.status(500).json({ success: false, error: 'Failed to add internal note' });
    }
});

module.exports = router;
