const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateAdmin } = require('../middleware/auth');

const ZONES_FILE_PATH = path.resolve(__dirname, '../data/service_zones.json');
const ENV_PATH = path.resolve(__dirname, '../../.env');

// Helper: Haversine distance in KM
function haversineDistance(lat1, lon1, lat2, lon2) {
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

// Helper: Read service zones file
function readZonesData() {
    try {
        if (fs.existsSync(ZONES_FILE_PATH)) {
            const raw = fs.readFileSync(ZONES_FILE_PATH, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('[SERVICE_ZONES] Error reading service_zones.json:', e);
    }
    // Default fallback
    return {
        global: {
            defaultRadiusKm: 30.0,
            defaultCenterLat: 17.5113,
            defaultCenterLng: 78.8899,
            primaryAreaName: "Bhongir and surrounding villages"
        },
        zones: [
            {
                id: "zone-bhongir-main",
                name: "Bhongir Town & Surrounding Villages (Main Hub)",
                centerLat: 17.5113,
                centerLng: 78.8899,
                radiusKm: 30.0,
                status: "ACTIVE",
                description: "Primary operational zone",
                villagesCovered: ["Bhongir", "Raigir", "Pagidipalli", "Bibinagar", "Yadagirigutta", "Valigonda"],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ]
    };
}

// Helper: Write service zones file
function writeZonesData(data) {
    try {
        const dir = path.dirname(ZONES_FILE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ZONES_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[SERVICE_ZONES] Error writing service_zones.json:', e);
        return false;
    }
}

// ==========================================
// GET /api/service-zones
// Returns all configured expansion zones and global stats
// ==========================================
router.get('/', (req, res) => {
    try {
        const data = readZonesData();
        const activeZones = (data.zones || []).filter(z => z.status === 'ACTIVE');
        const comingSoonZones = (data.zones || []).filter(z => z.status !== 'ACTIVE');

        res.json({
            success: true,
            global: data.global || {},
            zones: data.zones || [],
            stats: {
                totalZones: (data.zones || []).length,
                activeZones: activeZones.length,
                comingSoonZones: comingSoonZones.length,
                maxCoverageRadius: Math.max(...(data.zones || []).map(z => z.radiusKm || 0), 0)
            }
        });
    } catch (err) {
        console.error('Error fetching service zones:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch service zones' });
    }
});

// ==========================================
// POST /api/service-zones
// Adds a new expansion zone
// ==========================================
router.post('/', authenticateAdmin, (req, res) => {
    try {
        const { name, centerLat, centerLng, radiusKm, status, description, villagesCovered } = req.body;

        if (!name || centerLat === undefined || centerLng === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Zone name, center latitude, and center longitude are required.'
            });
        }

        const data = readZonesData();
        const newId = `zone-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        // Parse villages if array or comma-separated string
        let villages = [];
        if (Array.isArray(villagesCovered)) {
            villages = villagesCovered.map(v => String(v).trim()).filter(Boolean);
        } else if (typeof villagesCovered === 'string') {
            villages = villagesCovered.split(',').map(v => v.trim()).filter(Boolean);
        }

        const newZone = {
            id: newId,
            name: name.trim(),
            centerLat: parseFloat(centerLat),
            centerLng: parseFloat(centerLng),
            radiusKm: parseFloat(radiusKm) || 15.0,
            status: status === 'ACTIVE' ? 'ACTIVE' : 'COMING_SOON',
            description: (description || '').trim(),
            villagesCovered: villages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        data.zones.push(newZone);
        const saved = writeZonesData(data);

        if (!saved) {
            return res.status(500).json({ success: false, error: 'Could not save new zone to disk.' });
        }

        res.json({
            success: true,
            message: `Service zone '${newZone.name}' created successfully.`,
            zone: newZone
        });
    } catch (err) {
        console.error('Error creating service zone:', err);
        res.status(500).json({ success: false, error: 'Internal server error while creating zone.' });
    }
});

// ==========================================
// PUT /api/service-zones/:id
// Updates an existing service zone
// ==========================================
router.put('/:id', authenticateAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const data = readZonesData();

        const index = data.zones.findIndex(z => z.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Service zone not found.' });
        }

        const current = data.zones[index];

        let villages = current.villagesCovered || [];
        if (updates.villagesCovered !== undefined) {
            if (Array.isArray(updates.villagesCovered)) {
                villages = updates.villagesCovered.map(v => String(v).trim()).filter(Boolean);
            } else if (typeof updates.villagesCovered === 'string') {
                villages = updates.villagesCovered.split(',').map(v => v.trim()).filter(Boolean);
            }
        }

        data.zones[index] = {
            ...current,
            name: updates.name !== undefined ? updates.name.trim() : current.name,
            centerLat: updates.centerLat !== undefined ? parseFloat(updates.centerLat) : current.centerLat,
            centerLng: updates.centerLng !== undefined ? parseFloat(updates.centerLng) : current.centerLng,
            radiusKm: updates.radiusKm !== undefined ? parseFloat(updates.radiusKm) : current.radiusKm,
            status: updates.status !== undefined ? (updates.status === 'ACTIVE' ? 'ACTIVE' : 'COMING_SOON') : current.status,
            description: updates.description !== undefined ? updates.description.trim() : current.description,
            villagesCovered: villages,
            updatedAt: new Date().toISOString()
        };

        const saved = writeZonesData(data);
        if (!saved) {
            return res.status(500).json({ success: false, error: 'Could not save updated zone.' });
        }

        res.json({
            success: true,
            message: `Service zone '${data.zones[index].name}' updated successfully.`,
            zone: data.zones[index]
        });
    } catch (err) {
        console.error('Error updating service zone:', err);
        res.status(500).json({ success: false, error: 'Internal server error while updating zone.' });
    }
});

// ==========================================
// DELETE /api/service-zones/:id
// Deletes a service zone
// ==========================================
router.delete('/:id', authenticateAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const data = readZonesData();

        const index = data.zones.findIndex(z => z.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Service zone not found.' });
        }

        const deletedName = data.zones[index].name;
        data.zones.splice(index, 1);

        writeZonesData(data);
        res.json({
            success: true,
            message: `Service zone '${deletedName}' deleted successfully.`
        });
    } catch (err) {
        console.error('Error deleting service zone:', err);
        res.status(500).json({ success: false, error: 'Failed to delete service zone.' });
    }
});

// ==========================================
// PUT /api/service-zones/global
// Updates global configuration and syncs to .env
// ==========================================
router.put('/settings/global', authenticateAdmin, (req, res) => {
    try {
        const { defaultRadiusKm, defaultCenterLat, defaultCenterLng, primaryAreaName, comingSoonMessageTe, comingSoonMessageEn } = req.body;
        const data = readZonesData();

        data.global = {
            ...data.global,
            defaultRadiusKm: defaultRadiusKm !== undefined ? parseFloat(defaultRadiusKm) : data.global.defaultRadiusKm,
            defaultCenterLat: defaultCenterLat !== undefined ? parseFloat(defaultCenterLat) : data.global.defaultCenterLat,
            defaultCenterLng: defaultCenterLng !== undefined ? parseFloat(defaultCenterLng) : data.global.defaultCenterLng,
            primaryAreaName: primaryAreaName !== undefined ? primaryAreaName.trim() : data.global.primaryAreaName,
            comingSoonMessageTe: comingSoonMessageTe !== undefined ? comingSoonMessageTe.trim() : data.global.comingSoonMessageTe,
            comingSoonMessageEn: comingSoonMessageEn !== undefined ? comingSoonMessageEn.trim() : data.global.comingSoonMessageEn
        };

        writeZonesData(data);

        // Also update .env file
        try {
            if (fs.existsSync(ENV_PATH)) {
                let envContent = fs.readFileSync(ENV_PATH, 'utf8');
                const lines = envContent.split(/\r?\n/);
                const updates = {
                    SERVICE_CENTER_LAT: data.global.defaultCenterLat,
                    SERVICE_CENTER_LNG: data.global.defaultCenterLng,
                    SERVICE_RADIUS_KM: data.global.defaultRadiusKm,
                    SERVICE_AREA_NAME: data.global.primaryAreaName
                };

                for (const [key, val] of Object.entries(updates)) {
                    let found = false;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith(`${key}=`)) {
                            lines[i] = `${key}=${val}`;
                            found = true;
                            break;
                        }
                    }
                    if (!found) lines.push(`${key}=${val}`);
                }
                fs.writeFileSync(ENV_PATH, lines.join('\n'));
            }
        } catch (envErr) {
            console.error('[SERVICE_ZONES] Error syncing to .env:', envErr);
        }

        res.json({
            success: true,
            message: 'Global expansion settings saved and synced to environment.',
            global: data.global
        });
    } catch (err) {
        console.error('Error updating global settings:', err);
        res.status(500).json({ success: false, error: 'Failed to update global settings.' });
    }
});

// ==========================================
// POST /api/service-zones/test
// Simulator: Test coordinates or address against all active zones
// ==========================================
router.post('/test', (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and Longitude are required for testing.'
            });
        }

        const testLat = parseFloat(lat);
        const testLng = parseFloat(lng);
        const data = readZonesData();

        const activeZones = (data.zones || []).filter(z => z.status === 'ACTIVE');
        const results = [];
        let isServiceable = false;
        let matchedZone = null;
        let minDistance = 999999;

        for (const zone of (data.zones || [])) {
            const dist = haversineDistance(zone.centerLat, zone.centerLng, testLat, testLng);
            const inside = dist <= zone.radiusKm;
            const zoneResult = {
                zoneId: zone.id,
                zoneName: zone.name,
                status: zone.status,
                distanceKm: Math.round(dist * 100) / 100,
                radiusKm: zone.radiusKm,
                isInside: inside,
                isServiceable: inside && zone.status === 'ACTIVE'
            };

            if (zoneResult.isServiceable && !isServiceable) {
                isServiceable = true;
                matchedZone = zone;
            }

            if (dist < minDistance) {
                minDistance = dist;
            }

            results.push(zoneResult);
        }

        res.json({
            success: true,
            isServiceable,
            matchedZone: matchedZone ? matchedZone.name : null,
            nearestDistanceKm: Math.round(minDistance * 100) / 100,
            zoneBreakdown: results,
            message: isServiceable
                ? `✅ Location is SERVICEABLE! Covered under '${matchedZone.name}'.`
                : `❌ Location is OUT OF SERVICE AREA. Nearest zone is ${Math.round(minDistance * 10) / 10} km away.`
        });
    } catch (err) {
        console.error('Error testing location serviceability:', err);
        res.status(500).json({ success: false, error: 'Failed to test location.' });
    }
});

module.exports = router;
