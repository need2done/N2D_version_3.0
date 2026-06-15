const path = require('path');
// Point to backend node_modules
const mysql = require(path.join(__dirname, 'backend', 'node_modules', 'mysql2', 'promise'));
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: './.env' });

async function run() {
    console.log('Using DB:', process.env.DB_NAME);
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'admin',
        database: process.env.DB_NAME || 'N2D'
    });

    try {
        console.log('Connected to DB');
        // Standard MySQL ALTER (try-catch handles existence)
        try {
            await connection.query('ALTER TABLE orders ADD COLUMN message_id VARCHAR(255) AFTER order_id');
            console.log('Added message_id');
        } catch(e) { console.log('message_id column might already exist'); }

        try {
            await connection.query('ALTER TABLE orders ADD COLUMN rating INT DEFAULT 0 AFTER total_amount');
            console.log('Added rating');
        } catch(e) { console.log('rating column might already exist'); }

    } catch(e) {
        console.error('Fatal Error:', e);
    } finally {
        await connection.end();
    }
}

run().catch(console.error);
