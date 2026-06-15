const mysql = require('mysql2');
// NOTE: dotenv is loaded in server.js at startup — no need to load again here.

// ==========================================
// TODO[ENV_CHANGE]: DATABASE CREDENTIALS
// Ensure DB credentials reflect local testing vs AWS prod.
// ==========================================
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'n2d',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection((err, conn) => {
    if(err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL DB');
        conn.release();
    }
});

module.exports = pool.promise();
