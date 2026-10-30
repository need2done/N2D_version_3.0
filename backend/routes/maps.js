const express = require('express');
const router = express.Router();
const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[SECURITY WARNING] GOOGLE_MAPS_API_KEY environment variable is not configured.');
}

// Center of Service Area (Bhongir / Hyderabad region)
const SERVICE_CENTER_LAT = parseFloat(process.env.SERVICE_CENTER_LAT) || 17.5113;
const SERVICE_CENTER_LNG = parseFloat(process.env.SERVICE_CENTER_LNG) || 78.8899;

/**
 * Normalizes city and pincode:
 * Whenever location is in Bhongir / Bhuvanagiri or nearby Yadadri region,
 * ensure official Bhongir Head Post Office PIN 508116 is assigned if 508100/empty appears.
 */
function normalizeAddress(addr) {
    if (!addr) return addr;
    let city = addr.city || '';
    let pincode = addr.pincode || '';
    let area = addr.area || '';
    let full = addr.fullAddress || '';

    const isBhongir = /bhongir|bhuvanagiri|yadadri/i.test(`${city} ${area} ${full}`);
    if (isBhongir) {
        if (!city || /detected city/i.test(city)) {
            city = 'Bhongir';
        }
        // 508100 is often mislabeled in OSM node; official Bhongir town pincode is 508116
        if (!pincode || pincode === '508100') {
            pincode = '508116';
        }
    }

    return {
        ...addr,
        city,
        pincode
    };
}

/**
 * GET /api/maps/autocomplete?query=...
 * Searches Google Places Autocomplete API (New) with location bias towards Bhongir/Hyderabad,
 * parallel fallback/enrichment from OSM Nominatim.
 */
router.get('/autocomplete', async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.json({ success: true, predictions: [] });
    }

    const trimmed = query.trim();

    // If query has door/house number like "1-8-212, khila nagar", extract landmark/area query as well
    const queryParts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    const mainAreaQuery = queryParts.length > 1 && /^\d+[-/\w]+$/.test(queryParts[0])
        ? queryParts.slice(1).join(', ')
        : trimmed;

    let googlePredictions = [];
    let osmPredictions = [];

    // 1. Google Places API (New) with locationBias towards service region
    if (GOOGLE_MAPS_API_KEY) {
        try {
            const googleRes = await axios.post(
                'https://places.googleapis.com/v1/places:autocomplete',
                {
                    input: trimmed,
                    includedRegionCodes: ['in'],
                    languageCode: 'en',
                    locationBias: {
                        circle: {
                            center: {
                                latitude: SERVICE_CENTER_LAT,
                                longitude: SERVICE_CENTER_LNG
                            },
                            radius: 50000.0 // 50km radius around Bhongir/Hyderabad
                        }
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY
                    },
                    timeout: 4000
                }
            );

            if (googleRes.data && googleRes.data.suggestions) {
                googlePredictions = googleRes.data.suggestions
                    .filter(s => s.placePrediction)
                    .map(s => {
                        const pred = s.placePrediction;
                        return {
                            placeId: pred.placeId,
                            description: pred.text?.text || '',
                            primaryText: pred.structuredFormat?.mainText?.text || pred.text?.text || '',
                            secondaryText: pred.structuredFormat?.secondaryText?.text || '',
                            source: 'google'
                        };
                    });
            }
        } catch (err) {
            console.warn('[Maps API] Google autocomplete failed:', err.response?.data || err.message);
        }
    }

    // 2. Query OSM with location bias / area query for hyper-local streets like "Khila Nagar Bhongir"
    try {
        const osmSearchTerm = /bhongir|hyderabad/i.test(mainAreaQuery)
            ? mainAreaQuery
            : `${mainAreaQuery}, Bhongir`;

        const osmRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                format: 'json',
                q: osmSearchTerm,
                addressdetails: 1,
                countrycodes: 'in',
                limit: 5
            },
            headers: {
                'User-Agent': 'Need2Done-App/1.0'
            },
            timeout: 4000
        });

        if (osmRes.data && Array.isArray(osmRes.data)) {
            osmPredictions = osmRes.data.map(item => {
                const addr = item.address || {};
                let pin = addr.postcode || '';
                if (!pin || pin === '508100') pin = '508116';
                const town = addr.town || addr.city || addr.suburb || 'Bhongir';

                return {
                    placeId: `osm_${item.place_id}`,
                    description: item.display_name,
                    primaryText: item.name || item.display_name.split(',')[0],
                    secondaryText: item.display_name.split(',').slice(1).join(',').trim(),
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    rawAddress: {
                        ...addr,
                        postcode: pin,
                        town: town
                    },
                    source: 'osm'
                };
            });
        }
    } catch (err) {
        console.warn('[Maps API] OSM search fallback failed:', err.message);
    }

    // Merge predictions prioritizing local matches
    const allPredictions = [...osmPredictions, ...googlePredictions];
    // Deduplicate by primaryText or description
    const seen = new Set();
    const unique = [];
    for (const p of allPredictions) {
        const key = p.primaryText.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(p);
        }
    }

    return res.json({
        success: true,
        predictions: unique.slice(0, 7)
    });
});

/**
 * GET /api/maps/place-details?placeId=...
 * Resolves place to structured fields with guaranteed Bhongir 508116 accuracy.
 */
router.get('/place-details', async (req, res) => {
    const { placeId } = req.query;
    if (!placeId) {
        return res.status(400).json({ success: false, error: 'Missing placeId' });
    }

    if (!placeId.startsWith('osm_') && GOOGLE_MAPS_API_KEY) {
        try {
            const googleRes = await axios.get(
                `https://places.googleapis.com/v1/places/${placeId}?fields=id,displayName,formattedAddress,addressComponents,location`,
                {
                    headers: {
                        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY
                    },
                    timeout: 4000
                }
            );

            const data = googleRes.data;
            const components = data.addressComponents || [];

            let houseNo = '';
            let street = '';
            let area = '';
            let city = '';
            let pincode = '';

            for (const comp of components) {
                const types = comp.types || [];
                if (types.includes('street_number')) {
                    houseNo = comp.longText;
                } else if (types.includes('route')) {
                    street = comp.longText;
                } else if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
                    area = area ? `${area}, ${comp.longText}` : comp.longText;
                } else if (types.includes('locality')) {
                    city = comp.longText;
                } else if (!city && types.includes('administrative_area_level_3')) {
                    city = comp.longText;
                } else if (types.includes('postal_code')) {
                    pincode = comp.longText;
                }
            }

            if (!area && data.displayName?.text) {
                area = data.displayName.text;
            }

            const normalized = normalizeAddress({
                houseNo,
                street,
                area,
                city,
                pincode,
                fullAddress: data.formattedAddress,
                lat: data.location?.latitude,
                lng: data.location?.longitude
            });

            return res.json({
                success: true,
                address: normalized
            });
        } catch (err) {
            console.warn('[Maps API] Google Place Details failed:', err.response?.data || err.message);
        }
    }

    return res.status(404).json({ success: false, error: 'Details could not be resolved' });
});

/**
 * GET /api/maps/reverse-geocode?lat=...&lng=...
 * Reverse geocodes coordinates with 508116 PIN normalization.
 */
router.get('/reverse-geocode', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ success: false, error: 'Missing lat or lng' });
    }

    try {
        const osmRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
                format: 'json',
                lat,
                lon: lng,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'Need2Done-App/1.0'
            },
            timeout: 5000
        });

        const data = osmRes.data;
        const addr = data.address || {};

        const cityStr = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Bhongir';
        const areaStr = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
        const streetStr = addr.road || '';
        const houseStr = addr.house_number || '';
        let pinStr = addr.postcode || '';

        const normalized = normalizeAddress({
            houseNo: houseStr,
            street: streetStr,
            area: areaStr,
            city: cityStr,
            pincode: pinStr,
            fullAddress: data.display_name
        });

        return res.json({
            success: true,
            address: normalized
        });
    } catch (err) {
        console.error('[Maps API] Reverse geocoding failed:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to reverse geocode' });
    }
});

module.exports = router;
