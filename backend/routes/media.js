const express = require('express');
const router = express.Router();
const axios = require('axios');

// Fetch WA_TOKEN from .env
const WA_TOKEN = process.env.WA_TOKEN;

// ==========================================
// GET /api/media/:media_id — Proxy Meta Media
// ==========================================
router.get('/:media_id', async (req, res) => {
    try {
        const { media_id } = req.params;

        if (!WA_TOKEN) {
            return res.status(500).json({ error: 'WA_TOKEN not configured in backend' });
        }

        // 1. Get Media URL from Meta
        const metaUrl = `https://graph.facebook.com/v20.0/${media_id}`;
        const metaRes = await axios.get(metaUrl, {
            headers: { 'Authorization': `Bearer ${WA_TOKEN}` }
        });

        const downloadUrl = metaRes.data.url;
        const mimeType = metaRes.data.mime_type;

        if (!downloadUrl) {
            return res.status(404).json({ error: 'Media URL not found from Meta' });
        }

        // 2. Download binary data
        const imageRes = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${WA_TOKEN}` },
            responseType: 'arraybuffer'
        });

        // 3. Stream back to dashboard
        res.setHeader('Content-Type', mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.send(imageRes.data);

    } catch (err) {
        console.error('❌ Media Proxy Error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json({ 
            error: 'Failed to proxy media', 
            details: err.response?.data || err.message 
        });
    }
});

module.exports = router;
