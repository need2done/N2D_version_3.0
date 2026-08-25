require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');



const { apiRateLimiter } = require('./middleware/rateLimiter');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx)

// Set secure allowed origins
const defaultOrigins = 'https://need2done.in,https://www.need2done.in,http://localhost:3000,http://localhost:5000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5000,http://127.0.0.1:5173';
let allowedOrigins = (process.env.CORS_ORIGIN || defaultOrigins).split(',').map(o => o.trim());

// Disallow wildcard origin '*' in production
if (process.env.NODE_ENV === 'production') {
    allowedOrigins = allowedOrigins.filter(o => o !== '*');
    if (allowedOrigins.length === 0) {
        allowedOrigins = ['https://need2done.in', 'https://www.need2done.in'];
    }
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, direct navigation, or bot webhooks)
        if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && (allowedOrigins.includes('*') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)))) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Internal-Secret']
}));



// Apply general API rate limiting
app.use('/api/', apiRateLimiter);

// Simple Logger (Top Level)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.json());

// Catch JSON parsing errors to prevent server crash
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error(`[JSON_ERROR] Bad JSON Payload from ${req.ip}:`, err.message);
        return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    }
    next(err);
});


const axios = require('axios');

// Webhook Forwarder (Manual Proxy for stability)
app.all(['/webhook', '/webhooks', '/api/webhook/whatsapp'], async (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] Forwarding ${req.method} ${req.url} to bot...`);
        
        let targetUrl = 'http://127.0.0.1:8000/webhook';
        
        // Forward GET or POST
        const config = {
            method: req.method,
            url: targetUrl,
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        };

        if (req.method === 'POST') {
            config.data = req.body;
        } else {
            config.params = req.query;
        }

        const response = await axios(config);
        
        // WhatsApp verification expects just the hub.challenge as plain text for GET
        if (req.method === 'GET' && req.query['hub.challenge']) {
            return res.status(200).send(response.data);
        }

        res.status(response.status).json(response.data);
    } catch (err) {
        console.error('❌ Webhook Forward Error:', err.message);
        res.status(err.response?.status || 500).json({ error: 'Proxy Failed', details: err.message });
    }
});

// app.use(express.json());

// Logger moved to top

// ==========================================
// ROUTE IMPORTS
// ==========================================
// const whatsappRoutes = require('./routes/whatsapp');
const orderRoutes = require('./routes/orders');
const helperRoutes = require('./routes/helpers');
const trackingRoutes = require('./routes/tracking');
const otpRoutes = require('./routes/otp');
const mediaRoutes = require('./routes/media');

const analyticsRoutes = require('./routes/analytics');
const supportRoutes = require('./routes/support');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const productsRoutes = require('./routes/products');
const cartsRoutes = require('./routes/carts');
const categoriesRoutes = require('./routes/categories');
const inventoryRoutes = require('./routes/inventory');
const offersRoutes = require('./routes/offers');
const vendorsRoutes = require('./routes/vendors');
const walletRoutes = require('./routes/wallet');
const homeServicesRoutes = require('./routes/homeServices');
const fruitsVegetablesRoutes = require('./routes/fruitsVegetables');
const rideRoutes = require('./routes/ride');


// Groceries Backend Routers
const groceryCategoryRoutes = require('../modules/N2D_GROCERIES_CS_Dashboard/backend/src/routes/categoryRoutes');
const groceryProductRoutes = require('../modules/N2D_GROCERIES_CS_Dashboard/backend/src/routes/productRoutes');
const grocerySearchRoutes = require('../modules/N2D_GROCERIES_CS_Dashboard/backend/src/routes/searchRoutes');
const groceryCartRoutes = require('../modules/N2D_GROCERIES_CS_Dashboard/backend/src/routes/cartRoutes');
const groceryAdminRoutes = require('../modules/N2D_GROCERIES_CS_Dashboard/backend/src/routes/adminRoutes');

// app.use('/api/webhook/whatsapp', whatsappRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/helpers', helperRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/carts', cartsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/home-services', homeServicesRoutes);
app.use('/api/fruits-vegetables', fruitsVegetablesRoutes);
app.use('/api/ride', rideRoutes);


// Groceries Backend Routes
app.use('/api/groceries/categories', groceryCategoryRoutes);
app.use('/api/groceries/products', groceryProductRoutes);
app.use('/api/groceries/search', grocerySearchRoutes);
app.use('/api/groceries/cart', groceryCartRoutes);
app.use('/api/groceries/admin', groceryAdminRoutes);

// Food Admin Routes
const foodAdminRoutes = require('./routes/foodAdmin');
app.use('/api/food/admin', foodAdminRoutes);

// Razorpay Payment Routes
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);



// Health check
const os = require('os');

app.get('/api/health', async (req, res) => {
    try {
        let dbStatus = 'OFFLINE';
        try {
            const db = require('./config/db');
            await db.query('SELECT 1');
            dbStatus = 'ONLINE';
        } catch(e) { dbStatus = 'ERROR'; }

        let botStatus = 'OFFLINE';
        try {
            const botMeta = await axios.get('http://127.0.0.1:8000/health', { timeout: 2000 });
            if (botMeta.status === 200) botStatus = 'ONLINE';
        } catch(e) { botStatus = 'ERROR'; }

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
        
        let cpuUsage = 0;
        const cpus = os.cpus();
        if (cpus && cpus.length > 0) {
            let totalIdle = 0, totalTick = 0;
            for(let i = 0; i < cpus.length; i++) {
                let cpu = cpus[i];
                for(let type in cpu.times) {
                    totalTick += cpu.times[type];
                }     
                totalIdle += cpu.times.idle;
            }
            cpuUsage = 100 - ~~(100 * totalIdle / totalTick);
        }

        res.json({ 
            success: true,
            status: (dbStatus === 'ONLINE' && botStatus === 'ONLINE') ? 'OK' : 'DEGRADED', 
            service: 'Need2Done Backend', 
            timestamp: new Date(),
            components: {
                backend: 'ONLINE',
                database: dbStatus,
                whatsappBot: botStatus
            },
            metrics: {
                memory: parseFloat(memoryUsage.toFixed(1)),
                cpu: cpuUsage,
                pools: 45 // Simulated connection pool metric
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Health check failed' });
    }
});

// ==========================================
// CUSTOMER TRACKING PAGE (lightweight HTML)
// Serves the live tracking page for customers
// URL: /track/:token
// ==========================================
app.get('/track/:token', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'tracking', 'index.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.warn(`[WEB_TRACK] Serving fallback HTML for token ${req.params.token} (Reason: ${err.message})`);

            res.status(200).send(`
                <!DOCTYPE html>
                <html><head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>N2D — Live Tracking</title>
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
                    #map { height: 75vh; width: 100%; border-radius: 0 0 1.5rem 1.5rem; }
                    .header { padding: 1rem 1.5rem; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); }
                    .header h1 { font-size: 1.2rem; font-weight: 700; }
                    .header p { font-size: 0.8rem; opacity: 0.8; }
                    .status-bar { display: flex; justify-content: space-between; padding: 1rem 1.5rem; background: #1e293b; }
                    .status-item { text-align: center; }
                    .status-item .label { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; }
                    .status-item .value { font-size: 1rem; font-weight: 600; margin-top: 4px; }
                </style>
                </head><body>
                <div class="header"><h1>📍 Need2Done — Live Tracking</h1><p>Your helper is on the way!</p></div>
                <div id="map"></div>
                <div class="status-bar">
                    <div class="status-item"><div class="label">Status</div><div class="value" id="statusText" style="color: #4ade80;">Loading...</div></div>
                    <div class="status-item"><div class="label">Last Update</div><div class="value" id="lastUpdate">--</div></div>
                </div>
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <script>
                    const API_BASE = window.location.origin;
                    const token = window.location.pathname.split('/track/')[1];
                    const map = L.map('map').setView([17.385, 78.486], 14);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap'}).addTo(map);
                    const markerIcon = L.divIcon({
                        html: '<div style="background-color: #4F46E5; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
                        className: '',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    let marker = null;
                    async function fetchLocation() {
                        try {
                            const res = await fetch(API_BASE + '/api/tracking/live/' + token);
                            const data = await res.json();
                            if (data.location) {
                                const pos = [parseFloat(data.location.lat), parseFloat(data.location.lng)];
                                if (!marker) { 
                                    marker = L.marker(pos, { icon: markerIcon }).addTo(map); 
                                } else { 
                                    marker.setLatLng(pos); 
                                }
                                map.panTo(pos);
                                document.getElementById('statusText').textContent = 'ACTIVE';
                            }
                        } catch(e) { console.error(e); }
                    }
                    fetchLocation();
                    setInterval(fetchLocation, 10000);

                </script>
                </body></html>
            `);
        }
    });
});

app.use('/track', express.static(path.resolve(__dirname, 'public', 'tracking')));
app.get(/^\/Vegetables.*/, (req, res) => {
    const targetUrl = req.url.replace(/^\/Vegetables%20%26%20Fruits/, '/vegetables-fruits');
    res.redirect(targetUrl);
});

// Groceries Dashboard SPA
app.use('/groceries', express.static(path.resolve(__dirname, '../website/groceries'), { extensions: ['html'] }));
app.get(/^\/groceries.*/, (req, res) => {
    res.sendFile('index.html', { root: path.resolve(__dirname, '../website/groceries') });
});

// Vegetables & Fruits Dashboard SPA
app.use('/vegetables-fruits', express.static(path.resolve(__dirname, '../website/vegetables-fruits'), { extensions: ['html'] }));
app.get(/^\/vegetables-fruits.*/, (req, res) => {
    res.sendFile('index.html', { root: path.resolve(__dirname, '../website/vegetables-fruits') });
});

// Food Dashboard SPA
app.get(/^\/food\/food\/(.*)/, (req, res) => {
    res.redirect('/food/' + req.params[0]);
});
app.use('/food', express.static(path.resolve(__dirname, '../website/food')));
app.get(/^\/food.*/, (req, res) => {
    res.sendFile('index.html', { root: path.resolve(__dirname, '../website/food') });
});

// Ride Dashboard SPA
app.use('/ride', express.static(path.resolve(__dirname, '../website/ride')));
app.get(/^\/ride.*/, (req, res) => {
    res.sendFile('index.html', { root: path.resolve(__dirname, '../website/ride') });
});

// Home Services Dashboard SPA

app.use('/home-services', express.static(path.resolve(__dirname, '../website/home-services')));
app.get(/^\/home-services.*/, (req, res) => {
    res.sendFile('index.html', { root: path.resolve(__dirname, '../website/home-services') });
});

// Admin Dashboard SPA
app.use('/admin/', express.static(path.resolve(__dirname, '../admin-dashboard/dist')));
app.get(/^\/admin(\/.*)?$/, (req, res) => {
    const distPath = path.resolve(__dirname, '../admin-dashboard/dist');
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile('index.html', { root: distPath });
    } else {
        res.sendFile('index.html', { root: path.resolve(__dirname, '../website/admin') });
    }
});

// Redirect old admin-catalog page to admin dashboard
app.get('/admin-catalog.html', (req, res) => res.redirect('/admin'));

app.use('/', express.static(path.resolve(__dirname, '../website')));


// ==========================================
// HELPER APP DEEP LINK REDIRECT
// URL: /open-app?order_id=X&helper_code=Y
// ==========================================
app.get('/open-app', (req, res) => {
    const { order_id, helper_code } = req.query;
    if (!order_id || !helper_code) {
        return res.status(400).send("Invalid Tracking Link");
    }
    const deepLink = `gramiogo://track?order_id=${order_id}&helper_code=${helper_code}`;
    
    // Serve a simple mobile-friendly HTML page that auto-redirects
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="refresh" content="0; url=${deepLink}" />
            <title>Opening N2D Tracking...</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 2rem; background: #0f172a; color: white; }
                a { color: #4ade80; font-weight: bold; text-decoration: none; padding: 1rem; border: 1px solid #4ade80; border-radius: 8px; display: inline-block; margin-top: 1rem; }
            </style>
        </head>
        <body>
            <h2>Opening N2D Agent App...</h2>
            <p>If the app does not open automatically, please tap the button below.</p>
            <a href="${deepLink}">Open N2D Agent</a>
        </body>
        </html>
    `);
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(`[SERVER_ERROR] ${err.stack || err.message || err}`);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        success: false,
        error: isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error')
    });
});

// ==========================================
// TODO[ENV_CHANGE]: PORT CONFIGURATION
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Need2Done Backend running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

