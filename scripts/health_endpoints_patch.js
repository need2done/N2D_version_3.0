/**
 * N2D Health Sub-Endpoints
 * Append this to /need2done/app/Need2Done/backend/server.js before the listen() call
 * Provides granular health checks for Uptime Kuma
 */

// MySQL DB Health — 200 ONLINE, 503 OFFLINE
app.get('/api/health/db', async (req, res) => {
    try {
        const db = require('./config/db');
        const start = Date.now();
        await db.query('SELECT 1');
        res.json({ status: 'ONLINE', database: 'MySQL', responseMs: Date.now() - start, timestamp: new Date() });
    } catch (e) {
        res.status(503).json({ status: 'OFFLINE', error: e.message });
    }
});

// System Health — 200 if CPU<90% and RAM<90%, else 503
app.get('/api/health/system', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const memPct   = parseFloat(((totalMem - freeMem) / totalMem * 100).toFixed(1));
    let totalIdle  = 0, totalTick = 0;
    for (const cpu of os.cpus()) {
        for (const type in cpu.times) totalTick += cpu.times[type];
        totalIdle += cpu.times.idle;
    }
    const cpuPct = 100 - ~~(100 * totalIdle / totalTick);
    const healthy = cpuPct < 90 && memPct < 90;
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'OK' : 'CRITICAL',
        cpu: cpuPct,
        memory: memPct,
        totalMemMB: Math.round(totalMem / 1024 / 1024),
        freeMemMB:  Math.round(freeMem  / 1024 / 1024),
        serverUptime: Math.round(os.uptime()),
        timestamp: new Date()
    });
});

// WhatsApp Bot Health Proxy — 200 if bot up
app.get('/api/health/bot', async (req, res) => {
    try {
        const r = await axios.get('http://127.0.0.1:8000/health', { timeout: 3000 });
        res.status(200).json({ status: 'ONLINE', ...r.data });
    } catch (e) {
        res.status(503).json({ status: 'OFFLINE', error: 'WhatsApp bot unreachable' });
    }
});
