const path = require('path');
const mysql = require(path.join(__dirname, 'backend', 'node_modules', 'mysql2', 'promise'));
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: './.env' });

async function run() {
    console.log('Migrating DB:', process.env.DB_NAME);
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'admin',
        database: process.env.DB_NAME || 'N2D'
    });

    try {
        console.log('Connected to DB');

        // 1. Alter orders.status ENUM to include DRAFT
        try {
            await connection.query(`
                ALTER TABLE orders MODIFY COLUMN status ENUM(
                    'DRAFT',
                    'CONFIRMED',
                    'HELPER_ACCEPTED',
                    'BILL_IMAGE_UPLOADED',
                    'ADMIN_APPROVED_BILL',
                    'HELPER_ARRIVED',
                    'ITEM_PHOTO_UPLOADED',
                    'PAYMENT_GENERATED',
                    'PAID',
                    'OTP_SUBMITTED',
                    'COMPLETED',
                    'CANCELLED'
                ) DEFAULT 'CONFIRMED'
            `);
            console.log('Successfully altered orders.status ENUM to include DRAFT');
        } catch(e) {
            console.error('Error altering orders.status ENUM:', e.message);
        }

        // 2. Create products table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) DEFAULT 'General',
                price DECIMAL(10,2) NOT NULL,
                unit VARCHAR(20) DEFAULT 'kg',
                available BOOLEAN DEFAULT TRUE,
                image_url VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Created products table');

        // 3. Create cart_items table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(30) NOT NULL,
                product_id INT NOT NULL,
                product_name VARCHAR(100) NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                unit VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_order_id (order_id)
            )
        `);
        console.log('Created cart_items table');

        // 4. Insert mock products if none exist
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM products');
        if (rows[0].count === 0) {
            console.log('Inserting mock products...');
            const mockProducts = [
                // Vegetables
                ['Fresh Tomato', 'Fresh Vegetables', 40.00, 'kg', 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&q=80'],
                ['Red Onion', 'Fresh Vegetables', 30.00, 'kg', 'https://images.unsplash.com/photo-1618228473037-8289714e4b65?w=400&q=80'],
                ['Potato', 'Fresh Vegetables', 25.00, 'kg', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80'],
                ['Spinach (Palak)', 'Fresh Vegetables', 15.00, 'bunch', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80'],
                ['Fresh Cucumber', 'Fresh Vegetables', 20.00, 'kg', 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400&q=80'],
                ['Carrot', 'Fresh Vegetables', 50.00, 'kg', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80'],

                // Fruits
                ['Banana (Robusta)', 'Fresh Fruits', 60.00, 'dozen', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80'],
                ['Apple (Shimla)', 'Fresh Fruits', 180.00, 'kg', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&q=80'],
                ['Sweet Mango (Kesar)', 'Fresh Fruits', 150.00, 'kg', 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80'],
                ['Green Grapes', 'Fresh Fruits', 80.00, 'kg', 'https://images.unsplash.com/photo-1601275868399-45bec4f4cd9d?w=400&q=80'],
                ['Papaya', 'Fresh Fruits', 40.00, 'pc', 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&q=80'],

                // Herbs
                ['Fresh Mint (Pudina)', 'Seasonings & Herbs', 10.00, 'bunch', 'https://images.unsplash.com/photo-1588693951010-09b9f71c4c1e?w=400&q=80'],
                ['Coriander (Kothmir)', 'Seasonings & Herbs', 10.00, 'bunch', 'https://images.unsplash.com/photo-1514944224746-6bba5b09e5c2?w=400&q=80'],
                ['Garlic', 'Seasonings & Herbs', 120.00, 'kg', 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&q=80'],
                ['Ginger', 'Seasonings & Herbs', 140.00, 'kg', 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&q=80'],
                ['Green Chillies', 'Seasonings & Herbs', 45.00, 'kg', 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400&q=80'],

                // Exotics
                ['Broccoli', 'Exotics', 120.00, 'pc', 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400&q=80'],
                ['Avocado', 'Exotics', 90.00, 'pc', 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&q=80'],
                ['Dragon Fruit', 'Exotics', 110.00, 'pc', 'https://images.unsplash.com/photo-1527325678964-54921661f92e?w=400&q=80']
            ];

            for (const prod of mockProducts) {
                await connection.query(
                    'INSERT INTO products (name, category, price, unit, image_url) VALUES (?, ?, ?, ?, ?)',
                    prod
                );
            }
            console.log('Inserted all mock products successfully.');
        } else {
            console.log('Products table already has data, skipping mock insertion.');
        }

        console.log('Migration completed successfully.');
    } catch(e) {
        console.error('Fatal Error during migration:', e);
    } finally {
        await connection.end();
    }
}

run().catch(console.error);
