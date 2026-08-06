const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');

const app = express();
const port = process.env.PORT || 5000;

const defaultOrigins = 'https://need2done.in,https://www.need2done.in,http://localhost:3000,http://localhost:5000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5000,http://127.0.0.1:5173';
const allowedOrigins = (process.env.CORS_ORIGIN || defaultOrigins).split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && (allowedOrigins.includes('*') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)))) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Internal-Secret']
}));


app.use(express.json());

// Routes
const serviceRoutes = require('./routes/services');
const categoryRoutes = require('./routes/categories');
const offerRoutes = require('./routes/offers');
const bookingRoutes = require('./routes/booking');

app.use('/api/services', serviceRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/booking', bookingRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(`[HOME_SERVICES_ERROR] ${err.stack || err.message || err}`);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
        success: false,
        error: isProduction ? 'Internal Server Error' : (err.message || 'Something went wrong!')
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
