const express = require('express');
const router = express.Router();
const { calculateCustomWorkPrice, CONFIG } = require('../services/customWorkPricing');
const { getOlaRouteDistance } = require('../services/olaMapsService');
const { authenticateAdmin } = require('../middleware/auth');

/**
 * POST /api/custom-work/quote
 * Calculates fare quote and helper payout for Custom Work requests.
 */
router.post('/quote', async (req, res) => {
    try {
        const {
            taskType = 'direct_pickup',
            pickupLat, pickupLng,
            dropLat, dropLng,
            distanceKm,
            extraStops = 0,
            hasAccessCoordination = false,
            itemLines = 0,
            extraStores = 0,
            extraTimeBlocks = 0,
            activeWorkMins = 0,
            goodsInvoiceAmount = 0,
            tipAmount = 0,
            description = ''
        } = req.body;

        let calculatedDistance = parseFloat(distanceKm) || 0;

        // If coordinates provided, use Ola Maps to compute exact road route distance
        if ((!calculatedDistance || calculatedDistance === 0) && pickupLat && pickupLng && dropLat && dropLng) {
            const routeData = await getOlaRouteDistance(
                parseFloat(pickupLat), parseFloat(pickupLng),
                parseFloat(dropLat), parseFloat(dropLng)
            );
            calculatedDistance = routeData.distanceKm;
        }

        const pricingResult = calculateCustomWorkPrice({
            taskType,
            distanceKm: calculatedDistance,
            extraStops,
            hasAccessCoordination,
            itemLines,
            extraStores,
            extraTimeBlocks,
            activeWorkMins,
            goodsInvoiceAmount,
            tipAmount,
            description
        });

        if (!pricingResult.success) {
            return res.status(400).json(pricingResult);
        }

        res.json({
            success: true,
            calculatedDistanceKm: calculatedDistance,
            ...pricingResult
        });
    } catch (err) {
        console.error('[CUSTOM_WORK_QUOTE_ERROR]', err.message);
        res.status(500).json({ success: false, error: 'Failed to calculate custom work quote' });
    }
});

/**
 * GET /api/custom-work/rate-card
 * Fetches current pilot rate card configuration
 */
router.get('/rate-card', (req, res) => {
    res.json({
        success: true,
        rateCard: CONFIG
    });
});

/**
 * PUT /api/custom-work/rate-card (Admin Protected)
 * Updates dynamic rate card parameters
 */
router.put('/rate-card', authenticateAdmin, (req, res) => {
    try {
        const updates = req.body;
        Object.keys(updates).forEach(key => {
            if (CONFIG[key] !== undefined && typeof updates[key] === 'number') {
                CONFIG[key] = updates[key];
            }
        });
        res.json({ success: true, message: 'Rate card updated successfully', rateCard: CONFIG });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update rate card' });
    }
});

module.exports = router;
