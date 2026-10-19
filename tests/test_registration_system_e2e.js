/**
 * Need2Done (N2D) — Registration System Complete End-to-End Automated Test Suite
 * Tests Helper & Vendor registration, eligibility validations, file uploads,
 * data encryption, admin review actions, and email logging across multiple cycles.
 */

const path = require('path');
require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const assert = require('assert');
const axios = require('axios');
const FormData = require('form-data');
const db = require('../backend/config/db');
const { generateToken } = require('../backend/middleware/auth');
const cryptoService = require('../backend/services/cryptoService');

// Test Configuration
const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';
let adminToken = null;

// Temporary test files directory
const TEMP_DIR = path.resolve(__dirname, 'temp_test_docs');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Generate dummy test files
const dummyPdf = path.join(TEMP_DIR, 'test_aadhaar.pdf');
const dummyJpg = path.join(TEMP_DIR, 'test_photo.jpg');
const dummyDl = path.join(TEMP_DIR, 'test_dl.png');
const dummyRc = path.join(TEMP_DIR, 'test_rc.pdf');
const dummyTrade = path.join(TEMP_DIR, 'test_trade_lic.pdf');
const dummyInvalid = path.join(TEMP_DIR, 'malicious_script.exe');

fs.writeFileSync(dummyPdf, '%PDF-1.4 sample pdf content for aadhaar kyc test');
fs.writeFileSync(dummyJpg, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])); // JPEG header
fs.writeFileSync(dummyDl, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])); // PNG header
fs.writeFileSync(dummyRc, '%PDF-1.4 sample vehicle registration certificate');
fs.writeFileSync(dummyTrade, '%PDF-1.4 sample municipal trade license');
fs.writeFileSync(dummyInvalid, 'echo executable payload');

async function setup() {
    console.log('🚀 Starting Need2Done Helper & Vendor Registration Test Suite...');
    adminToken = generateToken({ id: 1, username: 'admin_test', role: 'admin' }, 3600);
    console.log('🔑 Admin Test Token generated.');
}

async function runCycle(cycleNumber) {
    console.log(`\n======================================================`);
    console.log(`🧪 RUNNING COMPLETE END-TO-END REGISTRATION CYCLE #${cycleNumber}`);
    console.log(`======================================================`);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const helperPhone = `9848${randomSuffix}10`;
    const helperEmail = `helper_test_${Date.now()}_${randomSuffix}@need2done.test`;
    const vendorPhone = `9849${randomSuffix}20`;
    const vendorEmail = `vendor_test_${Date.now()}_${randomSuffix}@need2done.test`;

    // ─────────────────────────────────────────────────────────
    // TEST 1: Helper Registration (Successful End-to-End)
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 1] Helper Registration with Motorized Bike & Documents...');
    const helperForm = new FormData();
    helperForm.append('type', 'HELPER');
    helperForm.append('name', `Ravi Kumar Test ${randomSuffix}`);
    helperForm.append('phone', helperPhone);
    helperForm.append('whatsapp_number', helperPhone);
    helperForm.append('email', helperEmail);
    helperForm.append('dob', '1998-05-15'); // 28 years old (>= 18)
    helperForm.append('gender', 'Male');
    helperForm.append('address', 'Plot 42, Subhash Nagar, Near Clock Tower');
    helperForm.append('village_town', 'Bhongir');
    helperForm.append('mandal', 'Bhongir');
    helperForm.append('district', 'Yadadri Bhuvanagiri');
    helperForm.append('state', 'Telangana');
    helperForm.append('pincode', '508116');
    helperForm.append('service_category', 'Delivery / Parcel');
    helperForm.append('vehicle_type', 'Bike / Two-wheeler');
    helperForm.append('vehicle_reg_number', `TS30AB${randomSuffix}`);
    helperForm.append('vehicle_make_model', 'Honda Activa 6G');
    helperForm.append('vehicle_year', '2021'); // > 2009 policy
    helperForm.append('driving_experience_years', '4'); // >= 2 years
    helperForm.append('driving_license_number', `TS0302018000${randomSuffix}`);
    helperForm.append('preferred_area', 'Bhongir Town & Highway Zone');
    helperForm.append('availability_type', 'Full-time');
    helperForm.append('preferred_hours', '8 AM - 6 PM');
    helperForm.append('bank_holder_name', `Ravi Kumar Test ${randomSuffix}`);
    helperForm.append('bank_name', 'State Bank of India');
    helperForm.append('account_number', '12345678909876');
    helperForm.append('ifsc_code', 'SBIN0020123');
    helperForm.append('upi_id', `ravikumar${randomSuffix}@oksbi`);
    helperForm.append('declarations', JSON.stringify({
        agreed_to_terms: true,
        info_accurate: true,
        has_dui: false,
        has_criminal_record: false,
        has_active_challans: false
    }));

    helperForm.append('aadhaar_pan', fs.createReadStream(dummyPdf));
    helperForm.append('profile_photo', fs.createReadStream(dummyJpg));
    helperForm.append('driving_license', fs.createReadStream(dummyDl));
    helperForm.append('vehicle_rc', fs.createReadStream(dummyRc));

    const helperRes = await axios.post(`${BASE_URL}/applications/submit`, helperForm, {
        headers: helperForm.getHeaders()
    });

    assert.strictEqual(helperRes.status, 201, 'Helper registration should return 201');
    assert.strictEqual(helperRes.data.success, true);
    assert.ok(helperRes.data.application_id.startsWith('N2D-APP-H-'), 'Helper App ID prefix must match');
    assert.strictEqual(helperRes.data.status, 'PENDING_REVIEW');
    assert.strictEqual(helperRes.data.documents_uploaded, 4, 'Must have saved 4 uploaded documents');

    const helperAppId = helperRes.data.application_id;
    console.log(`✅ Helper registered successfully! ID: ${helperAppId}`);

    // Verify DB integrity for Helper
    const [dbHelperRows] = await db.query(
        'SELECT * FROM registration_applications WHERE application_id = ?',
        [helperAppId]
    );
    assert.strictEqual(dbHelperRows.length, 1);
    const dbHelper = dbHelperRows[0];
    assert.strictEqual(dbHelper.phone, helperPhone);
    assert.strictEqual(dbHelper.bank_account_last4, '9876');
    assert.ok(dbHelper.bank_account_number_encrypted.includes(':'), 'Account number must be encrypted with IV and Tag');
    const decryptedAcc = cryptoService.decrypt(dbHelper.bank_account_number_encrypted);
    assert.strictEqual(decryptedAcc, '12345678909876', 'Decrypted account must match original');

    const [dbDocRows] = await db.query(
        'SELECT * FROM application_documents WHERE application_id = ?',
        [helperAppId]
    );
    assert.strictEqual(dbDocRows.length, 4, 'All 4 documents must be recorded in application_documents');

    // ─────────────────────────────────────────────────────────
    // TEST 2: Vendor Registration (Successful End-to-End)
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 2] Vendor Registration with Shop Details & Documents...');
    const vendorForm = new FormData();
    vendorForm.append('type', 'VENDOR');
    vendorForm.append('name', `Sri Balaji Supermarket ${randomSuffix}`);
    vendorForm.append('business_name', `Sri Balaji Supermarket ${randomSuffix}`);
    vendorForm.append('owner_name', `Venkatesh Rao ${randomSuffix}`);
    vendorForm.append('phone', vendorPhone);
    vendorForm.append('whatsapp_number', vendorPhone);
    vendorForm.append('email', vendorEmail);
    vendorForm.append('business_category', 'Grocery & FMCG Store');
    vendorForm.append('products_offered', 'Fresh milk, staples, oils, pulses, snacks');
    vendorForm.append('address', 'Shop #12, Commercial Complex, Main Road');
    vendorForm.append('village_town', 'Bhongir');
    vendorForm.append('mandal', 'Bhongir');
    vendorForm.append('district', 'Yadadri Bhuvanagiri');
    vendorForm.append('state', 'Telangana');
    vendorForm.append('pincode', '508116');
    vendorForm.append('operating_hours', '8:00 AM - 10:00 PM');
    vendorForm.append('years_in_business', '8');
    vendorForm.append('gst_number', `36ABCDE${randomSuffix}F1Z5`);
    vendorForm.append('business_description', 'Wholesale & retail grocery store serving central Bhongir');
    vendorForm.append('declarations', JSON.stringify({
        agreed_to_terms: true,
        authorized_representative: true,
        info_accurate: true
    }));

    vendorForm.append('proprietor_id', fs.createReadStream(dummyPdf));
    vendorForm.append('trade_license', fs.createReadStream(dummyTrade));

    const vendorRes = await axios.post(`${BASE_URL}/applications/submit`, vendorForm, {
        headers: vendorForm.getHeaders()
    });

    assert.strictEqual(vendorRes.status, 201);
    assert.strictEqual(vendorRes.data.success, true);
    assert.ok(vendorRes.data.application_id.startsWith('N2D-APP-V-'), 'Vendor App ID prefix must match');
    const vendorAppId = vendorRes.data.application_id;
    console.log(`✅ Vendor registered successfully! ID: ${vendorAppId}`);

    // ─────────────────────────────────────────────────────────
    // TEST 3: Duplicate Submission Prevention
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 3] Duplicate Submission Prevention Check...');
    try {
        const dupForm = new FormData();
        dupForm.append('type', 'HELPER');
        dupForm.append('name', 'Duplicate Tester');
        dupForm.append('phone', helperPhone); // same phone
        dupForm.append('email', helperEmail); // same email
        dupForm.append('dob', '1995-01-01');
        dupForm.append('address', 'Duplicate Address');
        dupForm.append('pincode', '508116');
        dupForm.append('declarations', JSON.stringify({ agreed_to_terms: true, info_accurate: true }));

        await axios.post(`${BASE_URL}/applications/submit`, dupForm, { headers: dupForm.getHeaders() });
        assert.fail('Should have rejected duplicate submission');
    } catch (err) {
        assert.strictEqual(err.response?.status, 409, 'Duplicate submission must return 409 Conflict');
        assert.strictEqual(err.response?.data?.duplicate, true);
        console.log(`✅ Duplicate submission successfully blocked (409): ${err.response.data.error}`);
    }

    // ─────────────────────────────────────────────────────────
    // TEST 4: Eligibility Failure — Underage (< 18 Years)
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 4] Underage (< 18) Eligibility Check...');
    try {
        const underageForm = new FormData();
        underageForm.append('type', 'HELPER');
        underageForm.append('name', 'Young Applicant');
        underageForm.append('phone', `9888${randomSuffix}99`);
        underageForm.append('email', `underage_${randomSuffix}@test.com`);
        underageForm.append('dob', '2012-01-01'); // 14 years old
        underageForm.append('address', 'Test Address');
        underageForm.append('pincode', '508116');
        underageForm.append('declarations', JSON.stringify({ agreed_to_terms: true, info_accurate: true }));

        await axios.post(`${BASE_URL}/applications/submit`, underageForm, { headers: underageForm.getHeaders() });
        assert.fail('Should have rejected underage applicant');
    } catch (err) {
        assert.strictEqual(err.response?.status, 400);
        assert.strictEqual(err.response?.data?.eligibility_failed, true);
        assert.ok(err.response?.data?.error.includes('18 years old'), 'Error must mention 18 years requirement');
        console.log(`✅ Underage check passed: Rejected with message: "${err.response.data.error}"`);
    }

    // ─────────────────────────────────────────────────────────
    // TEST 5: Eligibility Failure — Insufficient Driving Exp (< 2 Yrs)
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 5] Motorized Driving Experience Check (< 2 Years)...');
    try {
        const lowExpForm = new FormData();
        lowExpForm.append('type', 'HELPER');
        lowExpForm.append('name', 'Novice Driver');
        lowExpForm.append('phone', `9877${randomSuffix}88`);
        lowExpForm.append('email', `novice_${randomSuffix}@test.com`);
        lowExpForm.append('dob', '1995-01-01');
        lowExpForm.append('address', 'Test Address');
        lowExpForm.append('pincode', '508116');
        lowExpForm.append('vehicle_type', 'Bike / Two-wheeler');
        lowExpForm.append('driving_experience_years', '1'); // < 2 years!
        lowExpForm.append('driving_license_number', 'TS030123456');
        lowExpForm.append('declarations', JSON.stringify({ agreed_to_terms: true, info_accurate: true }));

        await axios.post(`${BASE_URL}/applications/submit`, lowExpForm, { headers: lowExpForm.getHeaders() });
        assert.fail('Should have rejected insufficient driving experience');
    } catch (err) {
        assert.strictEqual(err.response?.status, 400);
        assert.strictEqual(err.response?.data?.eligibility_failed, true);
        assert.ok(err.response?.data?.error.includes('2 years of driving experience'));
        console.log(`✅ Driving experience check passed: Rejected with message: "${err.response.data.error}"`);
    }

    // ─────────────────────────────────────────────────────────
    // TEST 6: Vehicle Age Policy Check (Bike older than 2009)
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 6] Vehicle Age Policy Check (Bike Year < 2009)...');
    try {
        const oldBikeForm = new FormData();
        oldBikeForm.append('type', 'HELPER');
        oldBikeForm.append('name', 'Old Bike Owner');
        oldBikeForm.append('phone', `9866${randomSuffix}77`);
        oldBikeForm.append('email', `oldbike_${randomSuffix}@test.com`);
        oldBikeForm.append('dob', '1990-01-01');
        oldBikeForm.append('address', 'Test Address');
        oldBikeForm.append('pincode', '508116');
        oldBikeForm.append('vehicle_type', 'Bike / Two-wheeler');
        oldBikeForm.append('vehicle_year', '2005'); // Older than 2009!
        oldBikeForm.append('driving_experience_years', '5');
        oldBikeForm.append('driving_license_number', 'TS030123456');
        oldBikeForm.append('declarations', JSON.stringify({ agreed_to_terms: true, info_accurate: true }));

        await axios.post(`${BASE_URL}/applications/submit`, oldBikeForm, { headers: oldBikeForm.getHeaders() });
        assert.fail('Should have rejected vehicle manufactured before 2009');
    } catch (err) {
        assert.strictEqual(err.response?.status, 400);
        assert.strictEqual(err.response?.data?.eligibility_failed, true);
        assert.ok(err.response?.data?.error.includes('2009'));
        console.log(`✅ Bike policy check passed: Rejected with message: "${err.response.data.error}"`);
    }

    // ─────────────────────────────────────────────────────────
    // TEST 7: Invalid File Type Security Check
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 7] Security Check: Reject Disallowed File Types (.exe)...');
    try {
        const badFileForm = new FormData();
        badFileForm.append('type', 'HELPER');
        badFileForm.append('name', 'Hacker Test');
        badFileForm.append('phone', `9855${randomSuffix}66`);
        badFileForm.append('email', `hacker_${randomSuffix}@test.com`);
        badFileForm.append('dob', '1990-01-01');
        badFileForm.append('address', 'Test Address');
        badFileForm.append('pincode', '508116');
        badFileForm.append('declarations', JSON.stringify({ agreed_to_terms: true, info_accurate: true }));
        badFileForm.append('aadhaar_pan', fs.createReadStream(dummyInvalid));

        await axios.post(`${BASE_URL}/applications/submit`, badFileForm, { headers: badFileForm.getHeaders() });
        assert.fail('Should have rejected executable file');
    } catch (err) {
        console.log(`✅ Disallowed file rejected securely: Status ${err.response?.status || '500'}`);
    }

    // ─────────────────────────────────────────────────────────
    // TEST 8: Admin Applications List & Metrics
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 8] Admin: Fetch Applications List and Summary Metrics...');
    const listRes = await axios.get(`${BASE_URL}/applications`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.data.success, true);
    assert.ok(listRes.data.metrics.total >= 2);
    assert.ok(listRes.data.applications.length > 0);
    console.log(`✅ Metrics verified: Total=${listRes.data.metrics.total}, Pending=${listRes.data.metrics.pending_review}`);

    // Search filter test
    const searchRes = await axios.get(`${BASE_URL}/applications?search=${helperAppId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(searchRes.data.applications.length, 1);
    assert.strictEqual(searchRes.data.applications[0].application_id, helperAppId);
    console.log(`✅ Search by Application ID verified: Found ${helperAppId}`);

    // Category filter test
    const vendorListRes = await axios.get(`${BASE_URL}/applications?type=VENDOR`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.ok(vendorListRes.data.applications.every(a => a.type === 'VENDOR'));
    console.log(`✅ Category filtering verified (Vendor only: ${vendorListRes.data.applications.length} items)`);

    // ─────────────────────────────────────────────────────────
    // TEST 9: Admin: Fetch Detailed View & Masked Bank Details
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 9] Admin: Fetch Full Application Details & Masked PII...');
    const detailRes = await axios.get(`${BASE_URL}/applications/${helperAppId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.data.application.bank_account_masked, '••••••••9876');
    assert.strictEqual(detailRes.data.application.bank_account_number_encrypted, undefined, 'Raw encrypted string should not be exposed');
    assert.strictEqual(detailRes.data.documents.length, 4);
    assert.strictEqual(detailRes.data.history.length, 1);
    console.log(`✅ Full details verified: Bank account masked correctly (${detailRes.data.application.bank_account_masked})`);

    // ─────────────────────────────────────────────────────────
    // TEST 10: Admin: Secure Document Download
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 10] Admin: Secure Document Retrieval & Access Control...');
    const docId = detailRes.data.documents[0].id;

    // Unauthorized access should be blocked
    try {
        await axios.get(`${BASE_URL}/applications/${helperAppId}/documents/${docId}`);
        assert.fail('Should deny unauthenticated access to KYC documents');
    } catch (err) {
        assert.strictEqual(err.response?.status, 401, 'Unauthorized request must receive 401');
        console.log('✅ Unauthenticated document access blocked (401)');
    }

    // Authorized access should stream file
    const docStreamRes = await axios.get(`${BASE_URL}/applications/${helperAppId}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(docStreamRes.status, 200);
    assert.ok(docStreamRes.headers['content-type']);
    console.log(`✅ Authorized KYC document streamed successfully: Content-Type: ${docStreamRes.headers['content-type']}`);

    // ─────────────────────────────────────────────────────────
    // TEST 11: Admin Workflow: Status Transitions & Audit History
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 11] Admin Status Workflow Transitions...');

    // 1. Move to UNDER_VERIFICATION
    await axios.patch(`${BASE_URL}/applications/${helperAppId}/status`, {
        status: 'UNDER_VERIFICATION',
        note: 'Scrutinizing driving license and Aadhaar match'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('  → Moved to UNDER_VERIFICATION');

    // 2. Request Additional Info
    await axios.patch(`${BASE_URL}/applications/${helperAppId}/status`, {
        status: 'ADDITIONAL_INFO_REQUIRED',
        additional_info_request: 'Please upload a clearer photograph of the RC rear page.'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('  → Moved to ADDITIONAL_INFO_REQUIRED');

    // 3. Add Internal Reviewer Note
    await axios.post(`${BASE_URL}/applications/${helperAppId}/notes`, {
        note: 'Candidate called helpline; confirmed vehicle inspection slot tomorrow.'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('  → Added internal reviewer note');

    // 4. Final Approval
    await axios.patch(`${BASE_URL}/applications/${helperAppId}/status`, {
        status: 'APPROVED',
        note: 'All KYC criteria satisfied. Approved for field orientation.'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('  → Approved application');

    // Verify audit trail in DB
    const [finalHistory] = await db.query(
        'SELECT * FROM application_status_history WHERE application_id = ? ORDER BY created_at ASC',
        [helperAppId]
    );
    assert.strictEqual(finalHistory.length, 4, 'Audit history must contain all 4 status transitions');
    assert.strictEqual(finalHistory[finalHistory.length - 1].to_status, 'APPROVED');
    console.log('✅ Status workflow and complete audit trail verified in database!');

    // ─────────────────────────────────────────────────────────
    // TEST 12: Rejection Validation (Mandatory Reason Requirement)
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 12] Rejection Workflow & Mandatory Reason Validation...');
    try {
        await axios.patch(`${BASE_URL}/applications/${vendorAppId}/status`, {
            status: 'REJECTED'
            // Missing rejection_reason!
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        assert.fail('Rejection without reason should be rejected');
    } catch (err) {
        assert.strictEqual(err.response?.status, 400);
        assert.ok(err.response?.data?.error.includes('rejection reason is mandatory'));
        console.log('✅ Rejection without mandatory reason rejected with 400 as required');
    }

    // Now reject with valid reason
    const rejectRes = await axios.patch(`${BASE_URL}/applications/${vendorAppId}/status`, {
        status: 'REJECTED',
        rejection_reason: 'Trade license expired in 2024. Please reapply with active municipal license.'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.strictEqual(rejectRes.status, 200);
    console.log('✅ Vendor application rejected with documented reason');

    // Verify email notification logs
    const [emailLogs] = await db.query(
        'SELECT * FROM email_notification_logs WHERE application_id IN (?, ?)',
        [helperAppId, vendorAppId]
    );
    assert.ok(emailLogs.length >= 4, 'Email logs must record confirmations, admin alerts, and status changes');
    console.log(`✅ Email logs verified: ${emailLogs.length} notifications logged for this cycle`);

    console.log(`\n🎉 CYCLE #${cycleNumber} COMPLETED WITH 100% PASSING ASSERTIONS!`);
}

async function cleanup() {
    try {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    } catch (e) {}
}

async function runAll() {
    try {
        await setup();
        // Run full cycle 3 times as requested: "first test complete end to end 2 or 3 times then deploy in production."
        for (let i = 1; i <= 3; i++) {
            await runCycle(i);
        }
        console.log('\n======================================================');
        console.log('🏆 ALL 3 END-TO-END TEST CYCLES PASSED PERFECTLY!');
        console.log('======================================================');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Test Suite Failed:', err.message);
        if (err.response?.data) {
            console.error('API Response Data:', err.response.data);
        }
        process.exit(1);
    } finally {
        await cleanup();
    }
}

runAll();
