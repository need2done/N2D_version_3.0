const path = require('path');
require('dotenv').config({ path: '/need2done/app/Need2Done/.env' });
const assert = require('assert');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { generateToken } = require('/need2done/app/Need2Done/backend/middleware/auth');
const db = require('/need2done/app/Need2Done/backend/config/db');

async function run() {
    console.log('🧪 Starting validation tests for Home Services / Helper Service / Custom Work and Optional Bank Details...');
    const BASE_URL = 'http://127.0.0.1:5000/api';
    const adminToken = generateToken({ id: 1, username: 'admin_test', role: 'admin' }, 3600);

    // Create dummy files
    const tmpAadhaar = '/tmp/test_aadhaar.pdf';
    const tmpPhoto = '/tmp/test_photo.jpg';
    fs.writeFileSync(tmpAadhaar, '%PDF-1.4 sample aadhaar');
    fs.writeFileSync(tmpPhoto, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

    // ─────────────────────────────────────────────────────────
    // TEST 1: Home Services without Vehicle and without Bank Details
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 1] Registering Helper under "Home Services (Cleaning & Tech)" without vehicle and without bank info...');
    const form1 = new FormData();
    form1.append('type', 'HELPER');
    form1.append('name', 'Sunitha Home Services');
    form1.append('phone', '9848551122');
    form1.append('email', 'sunitha_hs@need2done.test');
    form1.append('dob', '1995-04-10');
    form1.append('address', 'Lane 3, Teachers Colony');
    form1.append('pincode', '508116');
    form1.append('service_category', 'Home Services (Cleaning & Tech)');
    form1.append('vehicle_type', 'None / Not Required');
    form1.append('declarations', JSON.stringify({ agreed_to_terms: true, info_accurate: true }));
    form1.append('aadhaar_pan', fs.createReadStream(tmpAadhaar));
    form1.append('profile_photo', fs.createReadStream(tmpPhoto));

    const res1 = await axios.post(`${BASE_URL}/applications/submit`, form1, { headers: form1.getHeaders() });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.data.success, true);
    const appId1 = res1.data.application_id;
    console.log(`✅ TEST 1 Passed! Application created without vehicle or bank details: ${appId1}`);

    // ─────────────────────────────────────────────────────────
    // TEST 2: Helper Service without Vehicle and without Bank Details
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 2] Registering Helper under "Helper Service" without vehicle and without bank info...');
    const form2 = new FormData();
    form2.append('type', 'HELPER');
    form2.append('name', 'Raju Helper Service');
    form2.append('phone', '9848552233');
    form2.append('email', 'raju_helper@need2done.test');
    form2.append('dob', '1992-08-20');
    form2.append('address', 'Main Road, Old City');
    form2.append('pincode', '508116');
    form2.append('service_category', 'Helper Service');
    form2.append('vehicle_type', 'None / Not Required');
    form2.append('declarations', JSON.stringify({ agreed_to_terms: true, info_accurate: true }));
    form2.append('aadhaar_pan', fs.createReadStream(tmpAadhaar));
    form2.append('profile_photo', fs.createReadStream(tmpPhoto));

    const res2 = await axios.post(`${BASE_URL}/applications/submit`, form2, { headers: form2.getHeaders() });
    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.data.success, true);
    console.log(`✅ TEST 2 Passed! Application created for Helper Service: ${res2.data.application_id}`);

    // ─────────────────────────────────────────────────────────
    // TEST 3: Custom Work without Vehicle and without Bank Details
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 3] Registering Helper under "Custom Work" without vehicle and without bank info...');
    const form3 = new FormData();
    form3.append('type', 'HELPER');
    form3.append('name', 'Mahesh Custom Work');
    form3.append('phone', '9848553344');
    form3.append('email', 'mahesh_custom@need2done.test');
    form3.append('dob', '1990-11-12');
    form3.append('address', 'Shop 5, Market Yard');
    form3.append('pincode', '508116');
    form3.append('service_category', 'Custom Work');
    form3.append('vehicle_type', 'None / Not Required');
    form3.append('declarations', JSON.stringify({ agreed_to_terms: true, info_accurate: true }));
    form3.append('aadhaar_pan', fs.createReadStream(tmpAadhaar));
    form3.append('profile_photo', fs.createReadStream(tmpPhoto));

    const res3 = await axios.post(`${BASE_URL}/applications/submit`, form3, { headers: form3.getHeaders() });
    assert.strictEqual(res3.status, 201);
    assert.strictEqual(res3.data.success, true);
    console.log(`✅ TEST 3 Passed! Application created for Custom Work: ${res3.data.application_id}`);

    // ─────────────────────────────────────────────────────────
    // TEST 4: Admin Updates Bank Details post-onboarding
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 4] Admin updating Bank Details for Application ' + appId1 + '...');
    const updateBankRes = await axios.put(`${BASE_URL}/applications/${appId1}/bank`, {
        bank_holder_name: 'Sunitha Devi',
        bank_name: 'HDFC Bank',
        account_number: '50100234567890',
        ifsc_code: 'HDFC0001234',
        upi_id: 'sunitha@okhdfc'
    }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    assert.strictEqual(updateBankRes.status, 200);
    assert.strictEqual(updateBankRes.data.success, true);
    assert.strictEqual(updateBankRes.data.bank_details.bank_account_masked, '••••••••7890');
    console.log('✅ TEST 4 Passed! Bank details securely updated in database, masked value:', updateBankRes.data.bank_details.bank_account_masked);

    // Clean up temporary files and test rows
    fs.unlinkSync(tmpAadhaar);
    fs.unlinkSync(tmpPhoto);
    await db.query('DELETE FROM application_documents WHERE application_id IN (?, ?, ?)', [appId1, res2.data.application_id, res3.data.application_id]);
    await db.query('DELETE FROM application_status_history WHERE application_id IN (?, ?, ?)', [appId1, res2.data.application_id, res3.data.application_id]);
    await db.query('DELETE FROM application_notes WHERE application_id IN (?, ?, ?)', [appId1, res2.data.application_id, res3.data.application_id]);
    await db.query('DELETE FROM email_notification_logs WHERE application_id IN (?, ?, ?)', [appId1, res2.data.application_id, res3.data.application_id]);
    await db.query('DELETE FROM registration_applications WHERE application_id IN (?, ?, ?)', [appId1, res2.data.application_id, res3.data.application_id]);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Cleaned up test database records.');
    process.exit(0);
}

run().catch(err => {
    console.error('Test failure:', err.response?.data || err);
    process.exit(1);
});
