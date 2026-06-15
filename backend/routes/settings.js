const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '../../.env');

// ==========================================
// GET /api/settings — Read .env
// ==========================================
router.get('/', (req, res) => {
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
// POST /api/settings — Update .env
// ==========================================
router.post('/', (req, res) => {
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
