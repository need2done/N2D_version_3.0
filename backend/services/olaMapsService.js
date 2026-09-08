/**
 * Ola Maps OAuth 2.0 & Navigation Integration Service
 * Client ID: 8388c2f1-84fd-4f7a-9e81-e9e0f6ad03aa
 */

const OLA_CONFIG = {
    CLIENT_ID: process.env.OLA_MAPS_CLIENT_ID || '8388c2f1-84fd-4f7a-9e81-e9e0f6ad03aa',
    CLIENT_SECRET: process.env.OLA_MAPS_CLIENT_SECRET || 'aaa90d76a15e4a41a13e2b8261a266e4',
    API_KEY: process.env.OLA_MAPS_API_KEY || 'JjCr6EG5iWD7a7qzfp5pECZA4t9bnLT8ObU8R3Gy',
    TOKEN_URL: 'https://account.olamaps.io/realms/olamaps/protocol/openid-connect/token',
    API_BASE_URL: 'https://api.olamaps.io'
};

let cachedAccessToken = null;
let tokenExpiryTime = 0;

/**
 * Fetches OAuth 2.0 Access Token from Ola Maps API using Client Credentials grant.
 */
async function getOlaAccessToken() {
    // Return cached token if still valid (with 60s buffer)
    if (cachedAccessToken && Date.now() < tokenExpiryTime - 60000) {
        return cachedAccessToken;
    }

    try {
        const bodyParams = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: OLA_CONFIG.CLIENT_ID,
            client_secret: OLA_CONFIG.CLIENT_SECRET
        });

        const response = await fetch(OLA_CONFIG.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: bodyParams.toString()
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[OLA_MAPS] Token Auth Failed:', response.status, errText);
            throw new Error(`Ola Maps Token Auth Failed: ${response.status}`);
        }

        const data = await response.json();
        cachedAccessToken = data.access_token;
        const expiresInSec = data.expires_in || 3600;
        tokenExpiryTime = Date.now() + (expiresInSec * 1000);

        console.log('[OLA_MAPS] OAuth Access Token successfully refreshed.');
        return cachedAccessToken;
    } catch (err) {
        console.error('[OLA_MAPS_ERROR] Failed to obtain access token:', err.message);
        return null;
    }
}

/**
 * Calculates road route distance and transit time between origin and destination using Ola Maps Routing API.
 * 
 * @param {number} originLat 
 * @param {number} originLng 
 * @param {number} destLat 
 * @param {number} destLng 
 * @returns {Promise<Object>} Distance in km, duration in mins
 */
async function getOlaRouteDistance(originLat, originLng, destLat, destLng) {
    try {
        const token = await getOlaAccessToken();
        if (!token) {
            // Fallback estimation using Haversine formula if API is unreachable
            const fallbackKm = calculateHaversineDistance(originLat, originLng, destLat, destLng) * 1.25;
            return {
                distanceKm: parseFloat(fallbackKm.toFixed(2)),
                durationMins: Math.ceil((fallbackKm / 25) * 60),
                isFallback: true
            };
        }

        // Call Ola Maps Directions API using API_KEY and Bearer Token
        const url = `${OLA_CONFIG.API_BASE_URL}/routing/v1/directions?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&api_key=${OLA_CONFIG.API_KEY}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-API-KEY': OLA_CONFIG.API_KEY
            }
        });

        if (!res.ok) {
            console.warn('[OLA_MAPS] Directions API returned non-200:', res.status);
            const fallbackKm = calculateHaversineDistance(originLat, originLng, destLat, destLng) * 1.25;
            return { distanceKm: parseFloat(fallbackKm.toFixed(2)), durationMins: Math.ceil((fallbackKm / 25) * 60), isFallback: true };
        }

        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
            const leg = data.routes[0].legs[0];
            const distMeters = leg.distance || 0;
            const durationSec = leg.duration || 0;
            return {
                distanceKm: parseFloat((distMeters / 1000).toFixed(2)),
                durationMins: Math.ceil(durationSec / 60),
                isFallback: false
            };
        }

        const fallbackKm = calculateHaversineDistance(originLat, originLng, destLat, destLng) * 1.25;
        return { distanceKm: parseFloat(fallbackKm.toFixed(2)), durationMins: Math.ceil((fallbackKm / 25) * 60), isFallback: true };
    } catch (err) {
        console.error('[OLA_MAPS_ERROR] Route calculation error:', err.message);
        const fallbackKm = calculateHaversineDistance(originLat, originLng, destLat, destLng) * 1.25;
        return { distanceKm: parseFloat(fallbackKm.toFixed(2)), durationMins: Math.ceil((fallbackKm / 25) * 60), isFallback: true };
    }
}

/**
 * Haversine formula calculation for distance fallback
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

module.exports = {
    getOlaAccessToken,
    getOlaRouteDistance,
    OLA_CONFIG
};
