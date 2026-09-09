/**
 * Need2Done Custom Work Pricing Engine
 * Bhongir Telangana Pilot Rate Card (v1.0)
 */

const CONFIG = {
    SERVICE_BASE: 49,
    PER_KM_BIKE: 8,
    PER_KM_BIKE_HELPER: 5,
    EXTRA_STOP: 20,
    EXTRA_STOP_HELPER: 12,
    ACCESS_COORDINATION: 20,
    ACCESS_COORDINATION_HELPER: 10,
    SHOPPING_EFFORT: 45,
    SHOPPING_EFFORT_HELPER: 15,
    SHOPPING_11_20_LINES: 25,
    SHOPPING_11_20_LINES_HELPER: 10,
    EXTRA_TIME_BLOCK: 30, // per 15 mins block
    EXTRA_TIME_BLOCK_HELPER: 20, // per 15 mins block to helper
    
    // Cargo Vehicle Rates
    CARGO_AUTO_BASE: 120,
    CARGO_AUTO_MIN: 199,
    CARGO_AUTO_PER_KM: 14,
    CARGO_AUTO_HELPER_BASE: 90,
    CARGO_AUTO_HELPER_MIN: 140,
    CARGO_AUTO_HELPER_PER_KM: 10,

    MINI_TRUCK_BASE: 250,
    MINI_TRUCK_MIN: 399,
    MINI_TRUCK_PER_KM: 18,
    MINI_TRUCK_HELPER_BASE: 190,
    MINI_TRUCK_HELPER_MIN: 280,
    MINI_TRUCK_HELPER_PER_KM: 13,

    // Safety Exclusions
    RESTRICTED_KEYWORDS: [
        'cash transfer', 'bank deposit', 'withdrawal', 'weapon', 'gun', 
        'explosive', 'illegal', 'drug', 'prescription missing', 'childcare', 
        'baby sitting', 'nursing', 'medical care', 'unattended key access'
    ]
};

/**
 * Calculates pricing and helper earnings for Custom Work tasks.
 * 
 * @param {Object} params Task specification parameters
 * @returns {Object} Calculated customer fare, helper payout, breakdown, and safety status
 */
function calculateCustomWorkPrice(params) {
    const {
        taskType = 'direct_pickup',
        distanceKm = 0,
        extraStops = 0,
        hasAccessCoordination = false,
        itemLines = 0,
        extraStores = 0,
        extraTimeBlocks = 0, // approved 15m blocks
        activeWorkMins = 0, // for general/unique errand
        goodsInvoiceAmount = 0,
        tipAmount = 0,
        description = ''
    } = params;

    // 1. Safety Check
    const descLower = (description || '').toLowerCase();
    const isExcluded = CONFIG.RESTRICTED_KEYWORDS.some(keyword => descLower.includes(keyword));
    if (isExcluded) {
        return {
            success: false,
            error: 'Task contains safety-restricted activities and cannot be auto-assigned.',
            requiresAdminReview: true
        };
    }

    let customerFare = 0;
    let helperPayout = 0;
    let minFare = 99;
    let minPayout = 65;
    let breakdown = [];

    const dist = Math.max(0, parseFloat(distanceKm) || 0);
    const stops = Math.max(0, parseInt(extraStops) || 0);
    const timeBlocks = Math.max(0, parseInt(extraTimeBlocks) || 0);
    const lines = Math.max(0, parseInt(itemLines) || 0);
    const stores = Math.max(0, parseInt(extraStores) || 0);
    const tip = Math.max(0, parseFloat(tipAmount) || 0);
    const goods = Math.max(0, parseFloat(goodsInvoiceAmount) || 0);

    switch (taskType) {
        case 'micro_errand':
            minFare = 69;
            minPayout = 45;
            customerFare = Math.max(minFare, CONFIG.SERVICE_BASE + (dist * CONFIG.PER_KM_BIKE));
            helperPayout = Math.max(minPayout, 35 + (dist * CONFIG.PER_KM_BIKE_HELPER));
            breakdown.push({ label: 'Service Base', amount: CONFIG.SERVICE_BASE });
            breakdown.push({ label: `Route Distance (${dist} km)`, amount: dist * CONFIG.PER_KM_BIKE });
            break;

        case 'direct_pickup':
            minFare = 99;
            minPayout = 65;
            const baseDirect = Math.max(minFare, CONFIG.SERVICE_BASE + (dist * CONFIG.PER_KM_BIKE));
            customerFare = baseDirect + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = Math.max(minPayout, 45 + (dist * CONFIG.PER_KM_BIKE_HELPER)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Base Fare', amount: baseDirect });
            if (timeBlocks > 0) breakdown.push({ label: `Extra Time (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'retrieve':
            minFare = 119;
            minPayout = 75;
            const accessFee = CONFIG.ACCESS_COORDINATION;
            const baseRetrieve = Math.max(minFare, CONFIG.SERVICE_BASE + accessFee + (dist * CONFIG.PER_KM_BIKE));
            customerFare = baseRetrieve + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = Math.max(minPayout, 45 + CONFIG.ACCESS_COORDINATION_HELPER + (dist * CONFIG.PER_KM_BIKE_HELPER)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Base Fare', amount: baseRetrieve });
            if (timeBlocks > 0) breakdown.push({ label: `Extra Time (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'prepaid_pickup':
            minFare = 99;
            minPayout = 65;
            const basePrepaid = Math.max(minFare, CONFIG.SERVICE_BASE + (dist * CONFIG.PER_KM_BIKE));
            customerFare = basePrepaid + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = Math.max(minPayout, 45 + (dist * CONFIG.PER_KM_BIKE_HELPER)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Base Fare', amount: basePrepaid });
            if (timeBlocks > 0) breakdown.push({ label: `Store Wait (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'buy_and_bring':
            minFare = 119;
            minPayout = 80;
            let shopFee = CONFIG.SHOPPING_EFFORT;
            let shopHelper = CONFIG.SHOPPING_EFFORT_HELPER;

            if (lines > 10) {
                shopFee += CONFIG.SHOPPING_11_20_LINES;
                shopHelper += CONFIG.SHOPPING_11_20_LINES_HELPER;
            }

            const extraStoreFee = stores * CONFIG.EXTRA_STOP;
            const extraStoreHelper = stores * CONFIG.EXTRA_STOP_HELPER;

            const baseBuy = Math.max(minFare, CONFIG.SERVICE_BASE + shopFee + extraStoreFee + (dist * CONFIG.PER_KM_BIKE));
            customerFare = baseBuy + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = Math.max(minPayout, 45 + shopHelper + extraStoreHelper + (dist * CONFIG.PER_KM_BIKE_HELPER)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            
            breakdown.push({ label: 'Base Shopping Errand Fee', amount: CONFIG.SERVICE_BASE });
            breakdown.push({ label: 'Shopping & Purchasing Effort', amount: shopFee });
            if (stores > 0) breakdown.push({ label: `Additional Stores (${stores} extra @ ₹20)`, amount: extraStoreFee });
            if (dist > 0) breakdown.push({ label: `Route Distance (${dist} km @ ₹8/km)`, amount: dist * CONFIG.PER_KM_BIKE });
            if (timeBlocks > 0) breakdown.push({ label: `Extra Shopping Time (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'queue_paperwork':
            minFare = 99;
            minPayout = 65;
            const baseQueue = Math.max(minFare, CONFIG.SERVICE_BASE + (dist * CONFIG.PER_KM_BIKE));
            customerFare = baseQueue + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = Math.max(minPayout, 45 + (dist * CONFIG.PER_KM_BIKE_HELPER)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Base Fare', amount: baseQueue });
            if (timeBlocks > 0) breakdown.push({ label: `Queue Time (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'multi_stop':
            minFare = 119;
            minPayout = 75;
            const stopFeeTotal = stops * CONFIG.EXTRA_STOP;
            const stopHelperTotal = stops * CONFIG.EXTRA_STOP_HELPER;
            const accessAddon = hasAccessCoordination ? CONFIG.ACCESS_COORDINATION : 0;
            const accessHelperAddon = hasAccessCoordination ? CONFIG.ACCESS_COORDINATION_HELPER : 0;
            const shoppingAddon = (params.hasShopping || lines > 0) ? CONFIG.SHOPPING_EFFORT : 0;
            const shoppingHelperAddon = (params.hasShopping || lines > 0) ? CONFIG.SHOPPING_EFFORT_HELPER : 0;

            const baseMulti = Math.max(minFare, CONFIG.SERVICE_BASE + stopFeeTotal + accessAddon + shoppingAddon + (dist * CONFIG.PER_KM_BIKE));
            customerFare = baseMulti + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = Math.max(minPayout, 45 + stopHelperTotal + accessHelperAddon + shoppingHelperAddon + (dist * CONFIG.PER_KM_BIKE_HELPER)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            
            breakdown.push({ label: 'Base Multi-Stop Service Fee', amount: CONFIG.SERVICE_BASE });
            if (stops > 0) breakdown.push({ label: `Additional Stop Fee (${stops} extra @ ₹20)`, amount: stopFeeTotal });
            if (shoppingAddon > 0) breakdown.push({ label: 'Shopping & Purchasing Effort', amount: shoppingAddon });
            if (accessAddon > 0) breakdown.push({ label: 'Access & Coordination Fee', amount: accessAddon });
            if (dist > 0) breakdown.push({ label: `Route Distance (${dist} km @ ₹8/km)`, amount: dist * CONFIG.PER_KM_BIKE });
            if (timeBlocks > 0) breakdown.push({ label: `Extra Time (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'heavy_cargo_auto':
            minFare = CONFIG.CARGO_AUTO_MIN;
            minPayout = CONFIG.CARGO_AUTO_HELPER_MIN;
            customerFare = Math.max(minFare, CONFIG.CARGO_AUTO_BASE + (dist * CONFIG.CARGO_AUTO_PER_KM)) + (timeBlocks * 60);
            helperPayout = Math.max(minPayout, CONFIG.CARGO_AUTO_HELPER_BASE + (dist * CONFIG.CARGO_AUTO_HELPER_PER_KM)) + (timeBlocks * 40);
            breakdown.push({ label: 'Cargo Auto Base', amount: CONFIG.CARGO_AUTO_BASE });
            breakdown.push({ label: `Distance (${dist} km)`, amount: dist * CONFIG.CARGO_AUTO_PER_KM });
            break;

        case 'heavy_mini_truck':
            minFare = CONFIG.MINI_TRUCK_MIN;
            minPayout = CONFIG.MINI_TRUCK_HELPER_MIN;
            customerFare = Math.max(minFare, CONFIG.MINI_TRUCK_BASE + (dist * CONFIG.MINI_TRUCK_PER_KM)) + (timeBlocks * 60);
            helperPayout = Math.max(minPayout, CONFIG.MINI_TRUCK_HELPER_BASE + (dist * CONFIG.MINI_TRUCK_HELPER_PER_KM)) + (timeBlocks * 40);
            breakdown.push({ label: 'Mini Truck Base', amount: CONFIG.MINI_TRUCK_BASE });
            breakdown.push({ label: `Distance (${dist} km)`, amount: dist * CONFIG.MINI_TRUCK_PER_KM });
            break;

        case 'unique_custom_task':
        case 'general_errand':
        default:
            minFare = 129;
            minPayout = 85;
            const includedKm = 3.0;
            const extraKm = Math.max(0, dist - includedKm);
            const extraKmFee = extraKm * CONFIG.PER_KM_BIKE;
            const extraKmHelper = extraKm * CONFIG.PER_KM_BIKE_HELPER;

            const workMins = Math.max(0, parseInt(activeWorkMins) || 0);
            const extraMins = Math.max(0, workMins - 15);
            const extraWorkBlocks = Math.ceil(extraMins / 15);
            const extraWorkFee = extraWorkBlocks * CONFIG.EXTRA_TIME_BLOCK;
            const extraWorkHelper = extraWorkBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER;

            customerFare = Math.max(minFare, 129 + extraKmFee) + extraWorkFee;
            helperPayout = Math.max(minPayout, 85 + extraKmHelper) + extraWorkHelper;

            breakdown.push({ label: 'General Errand Base (incl. 3km & 15m work)', amount: 129 });
            if (extraKm > 0) breakdown.push({ label: `Additional Distance (${extraKm.toFixed(1)} km)`, amount: extraKmFee });
            if (extraWorkBlocks > 0) breakdown.push({ label: `Additional Work Time (${extraWorkBlocks} x 15m)`, amount: extraWorkFee });
            break;
    }

    // Apply Minimum Fares
    const finalCustomerServiceFee = Math.max(minFare, Math.round(customerFare));
    const finalHelperEarnings = Math.max(minPayout, Math.round(helperPayout)) + tip;
    const totalCustomerPayment = finalCustomerServiceFee + goods;
    const platformContribution = finalCustomerServiceFee - (finalHelperEarnings - tip);

    return {
        success: true,
        taskType,
        summary: {
            serviceFee: finalCustomerServiceFee,
            goodsInvoiceAmount: goods,
            totalCustomerPayment,
            guaranteedHelperPayout: finalHelperEarnings,
            tipAmount: tip,
            platformContributionMargin: platformContribution,
            marginPercentage: ((platformContribution / finalCustomerServiceFee) * 100).toFixed(1) + '%'
        },
        breakdown
    };
}

module.exports = {
    calculateCustomWorkPrice,
    CONFIG
};
