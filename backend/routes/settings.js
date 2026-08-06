const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '../../.env');

// ==========================================
// GET /api/settings/pricing — Public endpoint for dynamic service fees
// ==========================================
router.get('/pricing', (req, res) => {
    try {
        const envContent = fs.readFileSync(ENV_PATH, 'utf8');
        const env = {};
        envContent.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...rest] = trimmed.split('=');
                if (key) env[key] = rest.join('=');
            }
        });

        const service = (req.query.service || 'groceries').toLowerCase();
        let deliveryFee = parseFloat(env.HELPER_CHARGE || '30');
        let platformFee = parseFloat(env.PLATFORM_FEE || '8');
        let freeDeliveryThreshold = parseFloat(env.FREE_DELIVERY_THRESHOLD_FOOD || env.FREE_DELIVERY_THRESHOLD || '199');

        if (service.includes('groceries')) {
            if (env.HELPER_CHARGE_GROCERIES) deliveryFee = parseFloat(env.HELPER_CHARGE_GROCERIES);
            if (env.PLATFORM_FEE_GROCERIES) platformFee = parseFloat(env.PLATFORM_FEE_GROCERIES);
            if (env.FREE_DELIVERY_THRESHOLD_GROCERIES) freeDeliveryThreshold = parseFloat(env.FREE_DELIVERY_THRESHOLD_GROCERIES);
        } else if (service.includes('medicine')) {
            if (env.HELPER_CHARGE_MEDICINES) deliveryFee = parseFloat(env.HELPER_CHARGE_MEDICINES);
            if (env.PLATFORM_FEE_MEDICINES) platformFee = parseFloat(env.PLATFORM_FEE_MEDICINES);
        } else if (service.includes('anywork')) {
            if (env.HELPER_CHARGE_ANYWORK) deliveryFee = parseFloat(env.HELPER_CHARGE_ANYWORK);
            if (env.PLATFORM_FEE_ANYWORK) platformFee = parseFloat(env.PLATFORM_FEE_ANYWORK);
        } else if (service.includes('ride')) {
            if (env.HELPER_CHARGE_RIDE) deliveryFee = parseFloat(env.HELPER_CHARGE_RIDE);
            if (env.PLATFORM_FEE_RIDE) platformFee = parseFloat(env.PLATFORM_FEE_RIDE);
        } else if (service.includes('veg') || service.includes('fruit')) {
            if (env.HELPER_CHARGE_VEG_FRUITS) deliveryFee = parseFloat(env.HELPER_CHARGE_VEG_FRUITS);
            if (env.PLATFORM_FEE_VEG_FRUITS) platformFee = parseFloat(env.PLATFORM_FEE_VEG_FRUITS);
        } else if (service.includes('food')) {
            if (env.HELPER_CHARGE_FOOD) deliveryFee = parseFloat(env.HELPER_CHARGE_FOOD);
            if (env.PLATFORM_FEE_FOOD) platformFee = parseFloat(env.PLATFORM_FEE_FOOD);
            if (env.FREE_DELIVERY_THRESHOLD_FOOD) freeDeliveryThreshold = parseFloat(env.FREE_DELIVERY_THRESHOLD_FOOD);
        } else if (service.includes('home')) {
            if (env.HELPER_CHARGE_HOMESERVICES) deliveryFee = parseFloat(env.HELPER_CHARGE_HOMESERVICES);
            if (env.PLATFORM_FEE_HOMESERVICES) platformFee = parseFloat(env.PLATFORM_FEE_HOMESERVICES);
        }

        res.json({ success: true, deliveryFee, platformFee, freeDeliveryThreshold });
    } catch (err) {
        res.json({ success: true, deliveryFee: 30, platformFee: 8 });
    }
});

const { authenticateAdmin } = require('../middleware/auth');

// ==========================================
// GET /api/settings — Read .env (Admin Protected)
// ==========================================
router.get('/', authenticateAdmin, (req, res) => {

    try {
        const envContent = fs.readFileSync(ENV_PATH, 'utf8');
        const settings = {};
        
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...rest] = trimmed.split('=');
                if (key) {
                    settings[key] = rest.join('=');
                }
            }
        });
        
        // Mask sensitive data
        if (settings.ADMIN_PASSWORD) settings.ADMIN_PASSWORD = '••••••••';
        if (settings.DB_PASSWORD) settings.DB_PASSWORD = '••••••••';
        if (settings.WHATSAPP_ACCESS_TOKEN) settings.WHATSAPP_ACCESS_TOKEN = '••••••••';
        if (settings.WA_TOKEN) settings.WA_TOKEN = '••••••••';
        if (settings.INTERNAL_SECRET) settings.INTERNAL_SECRET = '••••••••';
        
        res.json({ success: true, settings });
    } catch (err) {
        console.error('Error reading .env:', err);
        res.status(500).json({ success: false, error: 'Failed to read settings' });
    }
});

// ==========================================
// POST /api/settings — Update .env (Admin Protected)
// ==========================================
router.post('/', authenticateAdmin, (req, res) => {
    try {
        const updates = req.body;
        let envContent = fs.readFileSync(ENV_PATH, 'utf8');
        // split by \n or \r\n
        const lines = envContent.split(/\r?\n/);
        
        for (const [key, value] of Object.entries(updates)) {
            // Skip masked passwords
            if (value === '••••••••' || value === undefined || value === null) continue;
            
            let found = false;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith(`${key}=`)) {
                    lines[i] = `${key}=${value}`;
                    found = true;
                    break;
                }
            }
            if (!found) {
                // Add if not found
                lines.push(`${key}=${value}`);
            }
        }
        
        fs.writeFileSync(ENV_PATH, lines.join('\n'));
        
        // Update current process env so some changes reflect immediately
        for (const [key, value] of Object.entries(updates)) {
            if (value !== '••••••••' && value !== undefined && value !== null) {
                process.env[key] = value;
            }
        }
        
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
        console.error('Error updating .env:', err);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
});

module.exports = router;
