/**
 * Need2Done Custom Work Pricing Engine
 * Bhongir Telangana Pilot Rate Card (v2.0 - Smooth Tiered Slabs)
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/rate_card.json');

let CONFIG = {
    SLAB_0_2KM: 39,
    SLAB_0_2KM_HELPER: 25,
    SLAB_2_3_5KM: 79,
    SLAB_2_3_5KM_HELPER: 55,
    SLAB_3_5_5KM: 99,
    SLAB_3_5_5KM_HELPER: 68,
    PER_KM_ABOVE_5KM: 8,
    PER_KM_ABOVE_5KM_HELPER: 5,
    
    EXTRA_STOP: 30,
    EXTRA_STOP_HELPER: 20,
    ACCESS_COORDINATION: 20,
    ACCESS_COORDINATION_HELPER: 10,
    SHOPPING_EFFORT: 45,
    SHOPPING_EFFORT_HELPER: 15,
    EXTRA_TIME_BLOCK: 30, // per 15 mins block
    EXTRA_TIME_BLOCK_HELPER: 20, // per 15 mins block to helper
    
    // Category Specific Rate Cards
    MICRO_ERRAND_FEE: 39,
    MICRO_ERRAND_HELPER: 25,
    MICRO_ERRAND_MAX_ITEMS: 2,
    MICRO_ERRAND_MAX_BILL: 250,
    STANDARD_SHOPPING_MAX_ITEMS: 6,
    PREPAID_PICKUP_FEE: 49,
    PREPAID_PICKUP_HELPER: 35,
    RETRIEVE_FEE: 59,
    RETRIEVE_HELPER: 40,
    DIRECT_PICKUP_FEE: 59,
    DIRECT_PICKUP_HELPER: 40,
    QUEUE_PAPERWORK_MIN: 89,
    QUEUE_PAPERWORK_HELPER_MIN: 60,
    MULTI_STOP_MIN: 119,
    MULTI_STOP_HELPER_MIN: 85,
    CARGO_AUTO_MIN: 149,
    CARGO_AUTO_HELPER_MIN: 110,
    BREAKDOWN_REPAIR_FEE: 99,
    BREAKDOWN_REPAIR_HELPER: 75,
    HIGH_BILL_ONLINE_THRESHOLD: 200,

    // Safety Exclusions
    RESTRICTED_KEYWORDS: [
        'cash transfer', 'bank deposit', 'withdrawal', 'weapon', 'gun', 
        'explosive', 'illegal', 'drug', 'prescription missing', 'childcare', 
        'baby sitting', 'nursing', 'medical care', 'unattended key access'
    ]
};

// Try loading saved config from JSON
try {
    if (fs.existsSync(CONFIG_PATH)) {
        const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        CONFIG = { ...CONFIG, ...saved };
        console.log('[RATE_CARD] Dynamic rate card config loaded from disk.');
    }
} catch (e) {
    console.error('[RATE_CARD] Could not load rate_card.json:', e.message);
}

function saveRateCardConfig(newUpdates) {
    try {
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        CONFIG = { ...CONFIG, ...newUpdates };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2), 'utf8');
        console.log('[RATE_CARD] Dynamic rate card config saved to disk.');
        return true;
    } catch (e) {
        console.error('[RATE_CARD_SAVE_ERROR]', e.message);
        return false;
    }
}

/**
 * Calculates smooth tiered fare based on distance slab.
 */
function getSmoothTieredFare(dist) {
    if (dist <= 2.0) {
        return {
            fare: CONFIG.SLAB_0_2KM,
            helper: CONFIG.SLAB_0_2KM_HELPER,
            label: `Hyperlocal Micro Errand (0-2 km: ₹${CONFIG.SLAB_0_2KM})`
        };
    } else if (dist <= 3.5) {
        return {
            fare: CONFIG.SLAB_2_3_5KM,
            helper: CONFIG.SLAB_2_3_5KM_HELPER,
            label: `Bhongir Local Town Errand (2.1-3.5 km: ₹${CONFIG.SLAB_2_3_5KM})`
        };
    } else if (dist <= 5.0) {
        return {
            fare: CONFIG.SLAB_3_5_5KM,
            helper: CONFIG.SLAB_3_5_5KM_HELPER,
            label: `Extended Town Errand (3.6-5.0 km: ₹${CONFIG.SLAB_3_5_5KM})`
        };
    } else {
        const base5k = CONFIG.SLAB_3_5_5KM;
        const helper5k = CONFIG.SLAB_3_5_5KM_HELPER;
        const extraKm = dist - 5.0;
        const extraFee = Math.round(extraKm * CONFIG.PER_KM_ABOVE_5KM);
        const extraHelperFee = Math.round(extraKm * CONFIG.PER_KM_ABOVE_5KM_HELPER);
        return {
            fare: base5k + extraFee,
            helper: helper5k + extraHelperFee,
            label: `Extended Base (5km: ₹${base5k}) + Extra Distance (${extraKm.toFixed(1)} km @ ₹${CONFIG.PER_KM_ABOVE_5KM}/km)`
        };
    }
}

function calculateCustomWorkPrice(params) {
    const {
        taskType = 'direct_pickup',
        distanceKm = 0,
        extraStops = 0,
        hasAccessCoordination = false,
        itemLines = 0,
        extraStores = 0,
        extraTimeBlocks = 0,
        activeWorkMins = 0,
        goodsInvoiceAmount = 0,
        tipAmount = 0,
        description = ''
    } = params;

    const descLower = (description || '').toLowerCase();
    const isExcluded = CONFIG.RESTRICTED_KEYWORDS.some(keyword => descLower.includes(keyword));
    if (isExcluded) {
        return {
            success: false,
            error: 'Task contains safety-restricted activities and cannot be auto-assigned.',
            requiresAdminReview: true
        };
    }

    const dist = Math.max(0, parseFloat(distanceKm) || 0);
    const stops = Math.max(0, parseInt(extraStops) || 0);
    const timeBlocks = Math.max(0, parseInt(extraTimeBlocks) || 0);
    const tip = Math.max(0, parseFloat(tipAmount) || 0);
    const goods = Math.max(0, parseFloat(goodsInvoiceAmount) || 0);

    let customerFare = 0;
    let helperPayout = 0;
    let breakdown = [];

    const tiered = getSmoothTieredFare(dist);

    const maxMicroItems = parseInt(CONFIG.MICRO_ERRAND_MAX_ITEMS || 2, 10);
    const maxMicroBill = parseFloat(CONFIG.MICRO_ERRAND_MAX_BILL || 250);

    const rawItemCount = itemLines > 0 ? itemLines : (
        description ? description.split(/,|\n| and |&|\+/i).filter(s => s.trim().length > 0).length : 1
    );

    const isMicroErrand = (
        params.isMicroErrand === true || 
        params.isSmallBuy === true || 
        (
            taskType === 'buy_and_bring' && 
            rawItemCount <= maxMicroItems &&
            (goodsInvoiceAmount <= 0 || goodsInvoiceAmount <= maxMicroBill) &&
            (
                /1l|1\s*litre|1\s*liter|handwash|packet|single|small|oil|milk|bread|curd|kobari|coconut|agarbatti|dhoop|pooja|soap|biscuit|chips|chocolate|medicine|pill|1-2 items|small buy|micro errand/i.test(descLower)
            ) &&
            !/family|full grocery|supermarket|weekly|multiple items|big store|shopping list/i.test(descLower)
        )
    );

    switch (taskType) {
        case 'queue_paperwork':
            const qFee = CONFIG.QUEUE_PAPERWORK_MIN || 89;
            const qHelper = CONFIG.QUEUE_PAPERWORK_HELPER_MIN || 60;
            customerFare = Math.max(qFee, dist <= 3.5 ? qFee : tiered.fare) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = Math.max(qHelper, dist <= 3.5 ? qHelper : tiered.helper) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Queue & Paperwork Base Service', amount: qFee });
            if (timeBlocks > 0) breakdown.push({ label: `Queue Wait (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'multi_stop':
            const stopFee = stops * (CONFIG.EXTRA_STOP || 30);
            const stopHelperFee = stops * (CONFIG.EXTRA_STOP_HELPER || 20);
            const baseMulti = CONFIG.MULTI_STOP_MIN || 119;
            const baseMultiHelper = CONFIG.MULTI_STOP_HELPER_MIN || 85;
            customerFare = Math.max(baseMulti, tiered.fare) + stopFee + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = Math.max(baseMultiHelper, tiered.helper) + stopHelperFee + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Multi-Stop Errand Base Service', amount: baseMulti });
            if (stops > 0) breakdown.push({ label: `Additional Stops (${stops} @ ₹${CONFIG.EXTRA_STOP || 30})`, amount: stopFee });
            if (timeBlocks > 0) breakdown.push({ label: `Extra Time (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'heavy_cargo_auto':
            const cargoBase = CONFIG.CARGO_AUTO_MIN || 149;
            const cargoHelperBase = CONFIG.CARGO_AUTO_HELPER_MIN || 110;
            customerFare = Math.max(cargoBase, dist <= 3.5 ? cargoBase : tiered.fare + 50) + (timeBlocks * 60);
            helperPayout = Math.max(cargoHelperBase, dist <= 3.5 ? cargoHelperBase : tiered.helper + 40) + (timeBlocks * 40);
            breakdown.push({ label: 'Heavy Cargo Auto Base Service', amount: cargoBase });
            if (dist > 3.5) breakdown.push({ label: `Distance Charge (${dist.toFixed(1)} km)`, amount: Math.round(customerFare - cargoBase) });
            break;

        case 'buy_and_bring':
            if (isMicroErrand && dist <= 3.5) {
                const microFee = CONFIG.MICRO_ERRAND_FEE || 39;
                const microHelper = CONFIG.MICRO_ERRAND_HELPER || 25;
                customerFare = microFee + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
                helperPayout = microHelper + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
                breakdown.push({ label: 'Micro Errand / Small Buy Base (< ₹250)', amount: microFee });
            } else {
                const stdFee = CONFIG.SLAB_2_3_5KM || 79;
                const stdHelper = CONFIG.SLAB_2_3_5KM_HELPER || 55;
                if (dist <= 3.5) {
                    customerFare = stdFee + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
                    helperPayout = stdHelper + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
                    breakdown.push({ label: 'Standard Shopping Base Service', amount: stdFee });
                } else {
                    customerFare = Math.max(stdFee, tiered.fare) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
                    helperPayout = Math.max(stdHelper, tiered.helper) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
                    breakdown.push({ label: tiered.label, amount: tiered.fare });
                }
            }
            if (timeBlocks > 0) breakdown.push({ label: `Extra Time (${timeBlocks} x 15m)`, amount: timeBlocks * CONFIG.EXTRA_TIME_BLOCK });
            break;

        case 'prepaid_pickup':
            const prepaidFee = CONFIG.PREPAID_PICKUP_FEE || 49;
            const prepaidHelper = CONFIG.PREPAID_PICKUP_HELPER || 35;
            customerFare = (dist <= 3.5 ? prepaidFee : Math.max(prepaidFee, tiered.fare)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = (dist <= 3.5 ? prepaidHelper : Math.max(prepaidHelper, tiered.helper)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Prepaid Store Pickup Base Service', amount: prepaidFee });
            break;

        case 'retrieve':
            const retrieveFee = CONFIG.RETRIEVE_FEE || 59;
            const retrieveHelper = CONFIG.RETRIEVE_HELPER || 40;
            customerFare = (dist <= 3.5 ? retrieveFee : Math.max(retrieveFee, tiered.fare)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = (dist <= 3.5 ? retrieveHelper : Math.max(retrieveHelper, tiered.helper)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Retrieve Forgotten Item Base Service', amount: retrieveFee });
            break;

        case 'direct_pickup':
            const parcelFee = CONFIG.DIRECT_PICKUP_FEE || 59;
            const parcelHelper = CONFIG.DIRECT_PICKUP_HELPER || 40;
            customerFare = (dist <= 3.5 ? parcelFee : Math.max(parcelFee, tiered.fare)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = (dist <= 3.5 ? parcelHelper : Math.max(parcelHelper, tiered.helper)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Direct Parcel Pickup Base Service', amount: parcelFee });
            break;

        case 'unique_custom_task':
        default:
            const repairFee = CONFIG.BREAKDOWN_REPAIR_FEE || 99;
            const repairHelper = CONFIG.BREAKDOWN_REPAIR_HELPER || 75;
            customerFare = (dist <= 3.5 ? repairFee : Math.max(repairFee, tiered.fare)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK);
            helperPayout = (dist <= 3.5 ? repairHelper : Math.max(repairHelper, tiered.helper)) + (timeBlocks * CONFIG.EXTRA_TIME_BLOCK_HELPER);
            breakdown.push({ label: 'Bike Breakdown / Repair Base Service', amount: repairFee });
            break;
    }

    const finalCustomerServiceFee = Math.round(customerFare);
    const finalHelperEarnings = Math.round(helperPayout) + tip;
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
    saveRateCardConfig,
    CONFIG
};
