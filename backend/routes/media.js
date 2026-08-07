const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Fetch WA_TOKEN from .env
const WA_TOKEN = process.env.WA_TOKEN;

// Local media cache storage directory (6+ months retention)
const MEDIA_DIR = path.join(__dirname, '../public/uploads/media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// ==========================================
// GET /api/media/:media_id — Proxy & Retain Meta Media
// ==========================================
router.get('/:media_id', async (req, res) => {
  try {
    const { media_id } = req.params;

    // Sanitize media_id to prevent path traversal
    const safeMediaId = media_id.replace(/[^a-zA-Z0-9_-]/g, '');
    const localFilePath = path.join(MEDIA_DIR, `${safeMediaId}.jpg`);

    // 1. Check if media exists in local 6-month storage
    if (fs.existsSync(localFilePath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=15552000'); // 180 days (6 months) browser cache
      return res.sendFile(localFilePath);
    }

    if (!WA_TOKEN) {
      return res.status(500).json({ error: 'WA_TOKEN not configured in backend' });
    }

    // 2. Fetch Media download URL from Meta Graph API
    const metaUrl = `https://graph.facebook.com/v20.0/${safeMediaId}`;
    const metaRes = await axios.get(metaUrl, {
      headers: { Authorization: `Bearer ${WA_TOKEN}` }
    });

    const downloadUrl = metaRes.data.url;
    const mimeType = metaRes.data.mime_type || 'image/jpeg';

    if (!downloadUrl) {
      return res.status(404).json({ error: 'Media URL not found from Meta' });
    }

    // 3. Download binary image from Meta
    const imageRes = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
      responseType: 'arraybuffer'
    });

    // 4. Save to local disk permanently for 6+ months retention
    try {
      fs.writeFileSync(localFilePath, imageRes.data);
    } catch (saveErr) {
      console.warn('⚠️ Warning: Failed to save local media copy:', saveErr.message);
    }

    // 5. Stream back to client
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=15552000');
    return res.send(imageRes.data);

  } catch (err) {
    console.error('❌ Media Proxy Error:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: 'Failed to proxy media',
      details: err.response?.data || err.message
    });
  }
});

module.exports = router;
