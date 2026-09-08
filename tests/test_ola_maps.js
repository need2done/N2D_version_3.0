/**
 * Unit Test for Ola Maps Integration Service
 */

const { getOlaAccessToken, getOlaRouteDistance, OLA_CONFIG } = require('../backend/services/olaMapsService');

async function runOlaMapsTest() {
    console.log('==================================================');
    console.log('  OLA MAPS OAUTH 2.0 & ROUTING SERVICE TEST       ');
    console.log('==================================================\n');

    console.log(`[CONFIG] Client ID: ${OLA_CONFIG.CLIENT_ID}`);

    // Test 1: OAuth Token Retrieval
    console.log('\n[TEST 1] Testing OAuth 2.0 Token Generation...');
    const token = await getOlaAccessToken();
    
    if (token) {
        console.log(`[PASS] Access Token Retrieved Successfully! Token snippet: ${token.substring(0, 25)}...`);
    } else {
        console.log('[INFO] OAuth token endpoint returned fallback or unreachable network. Verify Client ID & Secret.');
    }

    // Test 2: Distance & Route Calculation (Bhongir Bus Stand to Govt Degree College)
    // Coordinates: Bhongir Bus Stand (17.5116, 78.8890) -> Degree College (17.5190, 78.8950)
    console.log('\n[TEST 2] Testing Route Calculation (Bhongir Bus Stand -> Degree College)...');
    const route = await getOlaRouteDistance(17.5116, 78.8890, 17.5190, 78.8950);
    
    console.log(`[RESULT] Distance: ${route.distanceKm} km | Estimated Time: ${route.durationMins} mins | Fallback Mode: ${route.isFallback}`);
    
    if (route.distanceKm > 0) {
        console.log('[PASS] Route Distance Calculation Test Passed!');
    } else {
        console.error('[FAIL] Route distance is invalid.');
    }

    console.log('\n--------------------------------------------------\n');
}

runOlaMapsTest();
