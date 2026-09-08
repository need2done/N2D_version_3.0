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

// Test 1: Direct Pickup 6 km Charger (Worked Example 9.1 from Policy)
// Formula max(99, 49 + 6*8 = 97) -> Minimum ₹99 applied. Helper Payout -> max(65, 45 + 6*5 = 75) = ₹75
const test1 = calculateCustomWorkPrice({
    taskType: 'direct_pickup',
    distanceKm: 6.0
});
assert(test1.success === true, 'Test 1: Direct Pickup request executed successfully');
assert(test1.summary.serviceFee === 99, `Test 1: Service Fee is ₹99 (Got ₹${test1.summary.serviceFee})`);
assert(test1.summary.guaranteedHelperPayout === 75, `Test 1: Helper Payout is ₹75 (Got ₹${test1.summary.guaranteedHelperPayout})`);

// Test 2: Retrieve from Home 6 km (Worked Example 9.1 with Access Coord)
// Formula max(119, 49 + 20 + 48 = 117) -> Minimum ₹119 applied. Helper Payout -> max(75, 45+10+30 = 85) = ₹85
const test2 = calculateCustomWorkPrice({
    taskType: 'retrieve',
    distanceKm: 6.0,
    hasAccessCoordination: true
});
assert(test2.summary.serviceFee === 119, `Test 2: Retrieve Service Fee is ₹119 (Got ₹${test2.summary.serviceFee})`);
assert(test2.summary.guaranteedHelperPayout === 85, `Test 2: Helper Payout is ₹85 (Got ₹${test2.summary.guaranteedHelperPayout})`);

// Test 3: Buy & Bring Grocery (Worked Example 9.3)
// 3 km, 9 lines, 18 mins. Goods = ₹1432.
// Service Fee = max(119, 49 + 45 + 24 = 118) -> ₹119. Total customer pay = 119 + 1432 = ₹1551
const test3 = calculateCustomWorkPrice({
    taskType: 'buy_and_bring',
    distanceKm: 3.0,
    itemLines: 9,
    goodsInvoiceAmount: 1432
});
assert(test3.summary.serviceFee === 119, `Test 3: Buy & Bring Service Fee is ₹119 (Got ₹${test3.summary.serviceFee})`);
assert(test3.summary.totalCustomerPayment === 1551, `Test 3: Total Customer Payment is ₹1551 (Got ₹${test3.summary.totalCustomerPayment})`);

// Test 4: Busy Market Grocery Order (+1 approved 15m block) (Worked Example 9.4)
// Original 119 + 30 extra block = ₹149 service fee.
const test4 = calculateCustomWorkPrice({
    taskType: 'buy_and_bring',
    distanceKm: 3.0,
    itemLines: 9,
    extraTimeBlocks: 1,
    goodsInvoiceAmount: 1432
});
assert(test4.summary.serviceFee === 149, `Test 4: Busy Market Service Fee is ₹149 (Got ₹${test4.summary.serviceFee})`);

// Test 5: Multi-Stop Errand (Home -> Market -> Office, 6 km)
// Base 49 + 6*8 (48) + Extra Stop (20) + Access (20) + Shopping (45) = 182
const test5 = calculateCustomWorkPrice({
    taskType: 'multi_stop',
    distanceKm: 6.0,
    extraStops: 1,
    hasAccessCoordination: true,
    hasShopping: true
});
assert(test5.summary.serviceFee === 182, `Test 5: Multi-Stop Errand Fee is ₹182 (Got ₹${test5.summary.serviceFee})`);

// Test 6: Cargo Auto (Heavy Item, 8 km)
// Base 120 + 8*14 (112) = 232. Min 199. Service Fee = ₹232. Helper Payout = 90 + 8*10 (80) = ₹170
const test6 = calculateCustomWorkPrice({
    taskType: 'heavy_cargo_auto',
    distanceKm: 8.0
});
assert(test6.summary.serviceFee === 232, `Test 6: Cargo Auto Fee is ₹232 (Got ₹${test6.summary.serviceFee})`);
assert(test6.summary.guaranteedHelperPayout === 170, `Test 6: Cargo Auto Helper Payout is ₹170 (Got ₹${test6.summary.guaranteedHelperPayout})`);

// Test 7: Unique Custom Task (General Errand 5 km, 30 mins work)
// Base 129 (incl 3km, 15m). Extra 2km = 16. Extra 15m = 30. Total = 129 + 16 + 30 = ₹175
const test7 = calculateCustomWorkPrice({
    taskType: 'unique_custom_task',
    distanceKm: 5.0,
    activeWorkMins: 30
});
assert(test7.summary.serviceFee === 175, `Test 7: Unique Custom Task Fee is ₹175 (Got ₹${test7.summary.serviceFee})`);

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
