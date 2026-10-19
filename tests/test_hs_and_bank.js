const path = require('path');
require('dotenv').config({ path: '/need2done/app/Need2Done/.env' });
const assert = require('assert');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { generateToken } = require('/need2done/app/Need2Done/backend/middleware/auth');
const db = require('/need2done/app/Need2Done/backend/config/db');

async function run() {
    console.log('🧪 Starting validation tests for Custom Work, Home Services, Medicine Delivery and Declarations...');
    const BASE_URL = 'http://127.0.0.1:5000/api';
    const adminToken = generateToken({ id: 1, username: 'admin_test', role: 'admin' }, 3600);

    // Create dummy files
    const tmpAadhaar = '/tmp/test_aadhaar.pdf';
    const tmpPhoto = '/tmp/test_photo.jpg';
    fs.writeFileSync(tmpAadhaar, '%PDF-1.4 sample aadhaar');
    fs.writeFileSync(tmpPhoto, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    // ─────────────────────────────────────────────────────────
    // TEST 1: Home Services without Vehicle, Area, and Bank Details
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 1] Registering Helper under "Home Services" without vehicle, area & bank info...');
    const form1 = new FormData();
    form1.append('type', 'HELPER');
    form1.append('name', `Sunitha Home Services ${randomSuffix}`);
    form1.append('phone', `9848${randomSuffix}10`);
    form1.append('email', `sunitha_hs_${randomSuffix}@need2done.test`);
    form1.append('dob', '1995-04-10');
    form1.append('address', 'Lane 3, Teachers Colony');
    form1.append('pincode', '508116');
    form1.append('service_category', 'Home Services');
    form1.append('vehicle_type', 'None / Not Required');
    // Neither bank details nor vehicle nor preferred area provided
    form1.append('declarations', JSON.stringify({
        agreed_to_terms: true,
        info_accurate: true,
        has_dui: false,
        has_criminal_record: false,
        has_active_challans: false
    }));
    form1.append('aadhaar_pan', fs.createReadStream(tmpAadhaar));
    form1.append('profile_photo', fs.createReadStream(tmpPhoto));

    const res1 = await axios.post(`${BASE_URL}/applications/submit`, form1, { headers: form1.getHeaders() });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.data.success, true);
    const appId1 = res1.data.application_id;
    console.log(`✅ TEST 1 Passed! Application created for Home Services without vehicle or bank details: ${appId1}`);

    // ─────────────────────────────────────────────────────────
    // TEST 2: Custom Work without Bank Details & Vehicle optional
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 2] Registering Helper under "Custom Work" without bank details...');
    const form2 = new FormData();
    form2.append('type', 'HELPER');
    form2.append('name', `Mahesh Custom Work ${randomSuffix}`);
    form2.append('phone', `9848${randomSuffix}20`);
    form2.append('email', `mahesh_custom_${randomSuffix}@need2done.test`);
    form2.append('dob', '1990-11-12');
    form2.append('address', 'Shop 5, Market Yard');
    form2.append('pincode', '508116');
    form2.append('service_category', 'Custom Work');
    form2.append('vehicle_type', 'None / Not Required');
    form2.append('preferred_area', 'Bhongir Industrial Area');
    form2.append('declarations', JSON.stringify({
        agreed_to_terms: true,
        info_accurate: true,
        has_dui: false,
        has_criminal_record: false,
        has_active_challans: false
    }));
    form2.append('aadhaar_pan', fs.createReadStream(tmpAadhaar));
    form2.append('profile_photo', fs.createReadStream(tmpPhoto));

    const res2 = await axios.post(`${BASE_URL}/applications/submit`, form2, { headers: form2.getHeaders() });
    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.data.success, true);
    const appId2 = res2.data.application_id;
    console.log(`✅ TEST 2 Passed! Application created for Custom Work: ${appId2}`);

    // ─────────────────────────────────────────────────────────
    // TEST 3: Medicine Delivery without Bank Details
    // ─────────────────────────────────────────────────────────
    console.log('\n[TEST 3] Registering Helper under "Medicine Delivery" without bank details...');
    const form3 = new FormData();
    form3.append('type', 'HELPER');
    form3.append('name', `Raju Med Delivery ${randomSuffix}`);
    form3.append('phone', `9848${randomSuffix}30`);
    form3.append('email', `raju_med_${randomSuffix}@need2done.test`);
    form3.append('dob', '1992-08-20');
    form3.append('address', 'Main Road, Hospital Circle');
    form3.append('pincode', '508116');
    form3.append('service_category', 'Medicine Delivery');
    form3.append('vehicle_type', 'Bicycle'); // Non-motorized, no DL/RC needed
    form3.append('preferred_area', 'Hospital & Pharmacy Zone');
    form3.append('declarations', JSON.stringify({
        agreed_to_terms: true,
        info_accurate: true,
        has_dui: false,
        has_criminal_record: false,
        has_active_challans: false
    }));
    form3.append('aadhaar_pan', fs.createReadStream(tmpAadhaar));
    form3.append('profile_photo', fs.createReadStream(tmpPhoto));

    const res3 = await axios.post(`${BASE_URL}/applications/submit`, form3, { headers: form3.getHeaders() });
    assert.strictEqual(res3.status, 201);
    assert.strictEqual(res3.data.success, true);
    const appId3 = res3.data.application_id;
    console.log(`✅ TEST 3 Passed! Application created for Medicine Delivery: ${appId3}`);

    // Clean up temporary files & test rows
    fs.unlinkSync(tmpAadhaar);
    fs.unlinkSync(tmpPhoto);
    await db.query('DELETE FROM application_documents WHERE application_id IN (?, ?, ?)', [appId1, appId2, appId3]);
    await db.query('DELETE FROM application_status_history WHERE application_id IN (?, ?, ?)', [appId1, appId2, appId3]);
    await db.query('DELETE FROM application_notes WHERE application_id IN (?, ?, ?)', [appId1, appId2, appId3]);
    await db.query('DELETE FROM email_notification_logs WHERE application_id IN (?, ?, ?)', [appId1, appId2, appId3]);
    await db.query('DELETE FROM registration_applications WHERE application_id IN (?, ?, ?)', [appId1, appId2, appId3]);

    console.log('\n🎉 ALL 3 TARGETED VALIDATION TESTS PASSED 100%! Cleaned up test database records.');
    process.exit(0);
}

run().catch(err => {
    console.error('Test failure:', err.response?.data || err);
    process.exit(1);
});
