const path = require('path');
const mysql = require(path.join(__dirname, 'backend', 'node_modules', 'mysql2', 'promise'));
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: './.env' });

async function run() {
    console.log('Migrating Services Config in DB:', process.env.DB_NAME || 'N2D');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'admin',
        database: process.env.DB_NAME || 'N2D'
    });

    try {
        console.log('Connected to DB successfully.');

        // Create service_config table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS service_config (
                id INT PRIMARY KEY AUTO_INCREMENT,
                service_id INT UNIQUE NOT NULL,
                service_key VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(100) NOT NULL,
                description VARCHAR(255),
                icon VARCHAR(20),
                category VARCHAR(50),
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Table service_config created or verified.');

        // 7 Platform Services Definition
        const services = [
            [1, 'groceries', '🛒 Groceries Service', 'Order daily essentials, milk, or fresh food items.', '🛒', 'Groceries', 0],
            [7, 'veggies_fruits', '🥦 Veggies & Fruits', 'Browse catalog, check live prices, and order fresh produce.', '🥦', 'Produce', 0],
            [9, 'food', '🍔 Food Service', 'Order meals and food from your favorite restaurants.', '🍔', 'Food', 0],
            [10, 'home_services', '🏠 Home Services', 'Book trusted home cleaning and repair services.', '🏠', 'Services', 1],
            [2, 'medicines', '💊 Medicines Service', 'Buy health supplies or medicines with prescription.', '💊', 'Healthcare', 1],
            [4, 'ride', '🚗 Ride Service', 'Book a quick bike, auto, or car for your travel.', '🚗', 'Transport', 0],
            [5, 'anywork', '👨‍🔧 Any Work Service', 'Pick/Drop parcels, run errands, or custom tasks.', '👨‍🔧', 'Custom Tasks', 1]
        ];

        for (const s of services) {
            await connection.query(`
                INSERT INTO service_config (service_id, service_key, title, description, icon, category, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    description = VALUES(description),
                    icon = VALUES(icon),
                    category = VALUES(category);
            `, s);
        }

        console.log('Successfully seeded 7 platform services into service_config!');
        
        const [rows] = await connection.query('SELECT service_id, title, is_active FROM service_config ORDER BY service_id');
        console.log('Current Services Status:', rows);

    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await connection.end();
    }
}

run();
