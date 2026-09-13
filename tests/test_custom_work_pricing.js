/**
 * Unit Test Suite for Need2Done Custom Work Pricing Engine
 */

const { calculateCustomWorkPrice } = require('../backend/services/customWorkPricing');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
        passCount++;
    } else {
        console.error(`[FAIL] ${message}`);
        failCount++;
    }
}

console.log('==================================================');
console.log('  NEED2DONE CUSTOM WORK PRICING ENGINE UNIT TESTS ');
console.log('==================================================\n');

// Test 1: Direct Parcel Pickup (Local 2 km)
const test1 = calculateCustomWorkPrice({
    taskType: 'direct_pickup',
    distanceKm: 2.0
});
assert(test1.success === true, 'Test 1: Direct Pickup request executed successfully');
assert(test1.summary.serviceFee === 59, `Test 1: Direct Pickup Service Fee is ₹59 (Got ₹${test1.summary.serviceFee})`);
assert(test1.summary.guaranteedHelperPayout === 40, `Test 1: Direct Pickup Helper Payout is ₹40 (Got ₹${test1.summary.guaranteedHelperPayout})`);

// Test 2: Retrieve Forgotten Item (Local 2 km)
const test2 = calculateCustomWorkPrice({
    taskType: 'retrieve',
    distanceKm: 2.0
});
assert(test2.summary.serviceFee === 59, `Test 2: Retrieve Service Fee is ₹59 (Got ₹${test2.summary.serviceFee})`);
assert(test2.summary.guaranteedHelperPayout === 40, `Test 2: Helper Payout is ₹40 (Got ₹${test2.summary.guaranteedHelperPayout})`);

// Test 3: Micro Errand / Small Buy (Coconut & Agarbatti / 1L Oil < ₹250)
const test3 = calculateCustomWorkPrice({
    taskType: 'buy_and_bring',
    description: 'Naku oka kobarikayya and agarabhakti kavali',
    distanceKm: 2.5,
    goodsInvoiceAmount: 150
});
assert(test3.summary.serviceFee === 39, `Test 3: Micro Errand Service Fee is ₹39 (Got ₹${test3.summary.serviceFee})`);
assert(test3.summary.guaranteedHelperPayout === 25, `Test 3: Micro Errand Helper Payout is ₹25 (Got ₹${test3.summary.guaranteedHelperPayout})`);
assert(test3.summary.totalCustomerPayment === 189, `Test 3: Total Customer Payment is ₹189 (Got ₹${test3.summary.totalCustomerPayment})`);

// Test 4: Standard Shopping Order (Full Grocery 3 km)
const test4 = calculateCustomWorkPrice({
    taskType: 'buy_and_bring',
    description: 'Weekly full family grocery list 10 items',
    distanceKm: 3.0,
    goodsInvoiceAmount: 1500
});
assert(test4.summary.serviceFee === 79, `Test 4: Standard Shopping Service Fee is ₹79 (Got ₹${test4.summary.serviceFee})`);
assert(test4.summary.guaranteedHelperPayout === 55, `Test 4: Standard Shopping Helper Payout is ₹55 (Got ₹${test4.summary.guaranteedHelperPayout})`);

// Test 5: Multi-Stop Errand (Home -> Market -> Office, 1 extra stop)
const test5 = calculateCustomWorkPrice({
    taskType: 'multi_stop',
    distanceKm: 3.0,
    extraStops: 1
});
assert(test5.summary.serviceFee === 149, `Test 5: Multi-Stop Errand Fee is ₹149 (Got ₹${test5.summary.serviceFee})`);

// Test 6: Cargo Auto (Heavy Cargo 3 km)
const test6 = calculateCustomWorkPrice({
    taskType: 'heavy_cargo_auto',
    distanceKm: 3.0
});
assert(test6.summary.serviceFee === 149, `Test 6: Cargo Auto Fee is ₹149 (Got ₹${test6.summary.serviceFee})`);
assert(test6.summary.guaranteedHelperPayout === 110, `Test 6: Cargo Auto Helper Payout is ₹110 (Got ₹${test6.summary.guaranteedHelperPayout})`);

// Test 7: Unique Custom Task (Bike Breakdown Repair)
const test7 = calculateCustomWorkPrice({
    taskType: 'unique_custom_task',
    distanceKm: 2.0
});
assert(test7.summary.serviceFee === 99, `Test 7: Bike Breakdown Repair Fee is ₹99 (Got ₹${test7.summary.serviceFee})`);
assert(test7.summary.guaranteedHelperPayout === 75, `Test 7: Bike Breakdown Repair Helper Payout is ₹75 (Got ₹${test7.summary.guaranteedHelperPayout})`);

// Test 8: Safety Exclusion Trigger
const test8 = calculateCustomWorkPrice({
    taskType: 'direct_pickup',
    description: 'Please go to bank and handle cash transfer withdrawal'
});
assert(test8.success === false, 'Test 8: Cash transfer request correctly blocked by safety rules');
assert(test8.requiresAdminReview === true, 'Test 8: Triggered admin review flag');

console.log('\n--------------------------------------------------');
console.log(` RESULTS: ${passCount} Passed, ${failCount} Failed.`);
console.log('--------------------------------------------------\n');

if (failCount > 0) {
    process.exit(1);
}
