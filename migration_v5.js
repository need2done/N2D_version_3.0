const path = require('path');
const mysql = require(path.join(__dirname, 'backend', 'node_modules', 'mysql2', 'promise'));
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: './.env' });

async function run() {
    console.log('Migrating Groceries DB:', process.env.DB_NAME);
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'admin',
        database: process.env.DB_NAME || 'N2D'
    });

    try {
        console.log('Connected to DB');

        // Check product categories
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM products WHERE category NOT IN ('Fresh Vegetables', 'Fresh Fruits', 'Seasonings & Herbs', 'Exotics')");
        if (rows[0].count === 0) {
            console.log('Inserting mock grocery products...');
            const mockGroceries = [
                // 1. Dairy, Bread & Eggs
                ['Fresh Whole Milk', 'Dairy, Bread & Eggs', 68.00, '1 L', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80'],
                ['Greek Yogurt (Plain)', 'Dairy, Bread & Eggs', 45.00, '200 g', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80'],
                ['Amul Salted Butter', 'Dairy, Bread & Eggs', 56.00, '100 g', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80'],
                ['Processed Cheese Slices', 'Dairy, Bread & Eggs', 130.00, '200 g', 'https://images.unsplash.com/photo-1618067424218-90f94ef617a9?w=400&q=80'],
                ['Fresh Paneer', 'Dairy, Bread & Eggs', 95.00, '200 g', 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=400&q=80'],
                ['Organic Farm Eggs (Pack of 6)', 'Dairy, Bread & Eggs', 55.00, '6 pcs', 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&q=80'],
                ['Sandwich White Bread', 'Dairy, Bread & Eggs', 40.00, '400 g', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80'],

                // 2. Oils & Cooking Items
                ['Fortune Sunflower Oil', 'Oils & Cooking Items', 135.00, '1 L', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80'],
                ['Borges Extra Virgin Olive Oil', 'Oils & Cooking Items', 750.00, '500 ml', 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400&q=80'],
                ['Amul Pure Cow Ghee', 'Oils & Cooking Items', 320.00, '500 ml', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80'],
                ['Tata Iodized Salt', 'Oils & Cooking Items', 28.00, '1 kg', 'https://images.unsplash.com/photo-1549474843-ad59a68c9284?w=400&q=80'],
                ['Madhur Pure Sugar', 'Oils & Cooking Items', 48.00, '1 kg', 'https://images.unsplash.com/photo-1622484211148-717af01f4c7f?w=400&q=80'],

                // 3. Rice, Flour & Grains
                ['India Gate Basmati Rice', 'Rice, Flour & Grains', 115.00, '1 kg', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80'],
                ['Aashirvaad Shudh Chakki Atta', 'Rice, Flour & Grains', 260.00, '5 kg', 'https://images.unsplash.com/photo-1574325131876-a7999d3e5140?w=400&q=80'],
                ['Organic Rolled Oats', 'Rice, Flour & Grains', 95.00, '500 g', 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80'],
                ['Durum Wheat Pasta (Penne)', 'Rice, Flour & Grains', 75.00, '500 g', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&q=80'],
                ['Instant Masala Noodles (Pack of 4)', 'Rice, Flour & Grains', 60.00, '280 g', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80'],

                // 4. Dal & Beans
                ['Tata Sampann Toor Dal', 'Dal & Beans', 160.00, '1 kg', 'https://images.unsplash.com/photo-1547058886-f4024346897b?w=400&q=80'],
                ['Split Moong Dal', 'Dal & Beans', 140.00, '1 kg', 'https://images.unsplash.com/photo-1547058886-f4024346897b?w=400&q=80'],
                ['Whole Rajma (Red Kidney Beans)', 'Dal & Beans', 130.00, '1 kg', 'https://images.unsplash.com/photo-1547058886-f4024346897b?w=400&q=80'],
                ['Organic Kabuli Chana', 'Dal & Beans', 150.00, '1 kg', 'https://images.unsplash.com/photo-1547058886-f4024346897b?w=400&q=80'],

                // 5. Spices
                ['Everest Turmeric Powder', 'Spices', 29.00, '100 g', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&q=80'],
                ['Tikhalal Red Chili Powder', 'Spices', 48.00, '100 g', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&q=80'],
                ['Whole Cumin Seeds (Jeera)', 'Spices', 65.00, '100 g', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&q=80'],
                ['Garam Masala Powder', 'Spices', 78.00, '100 g', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&q=80'],

                // 6. Nuts & Dry Fruits
                ['Premium California Almonds', 'Nuts & Dry Fruits', 220.00, '250 g', 'https://images.unsplash.com/photo-1508061253366-f7da158b6d4f?w=400&q=80'],
                ['Whole Cashew Nuts (Kaju)', 'Nuts & Dry Fruits', 260.00, '250 g', 'https://images.unsplash.com/photo-1508061253366-f7da158b6d4f?w=400&q=80'],
                ['Seedless Golden Raisins (Kishmish)', 'Nuts & Dry Fruits', 110.00, '250 g', 'https://images.unsplash.com/photo-1508061253366-f7da158b6d4f?w=400&q=80'],

                // 7. Snacks
                ['Britannia Good Day Biscuits', 'Snacks', 25.00, '150 g', 'https://images.unsplash.com/photo-1558961309-dbdf037743f4?w=400&q=80'],
                ['Classic Salted Potato Chips', 'Snacks', 20.00, '50 g', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80'],
                ['Haldiram Aloo Bhujia Namkeen', 'Snacks', 45.00, '150 g', 'https://images.unsplash.com/photo-1613721404964-fc798bb6c188?w=400&q=80'],

                // 8. Breakfast
                ['Kellogg Corn Flakes', 'Breakfast', 185.00, '475 g', 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80'],
                ['Creamy Peanut Butter', 'Breakfast', 165.00, '340 g', 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&q=80'],
                ['Mixed Fruit Jam', 'Breakfast', 85.00, '200 g', 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=400&q=80'],

                // 9. Meat & Frozen
                ['Frozen Chicken Breast Nuggets', 'Meat & Frozen', 240.00, '500 g', 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80'],
                ['Frozen Green Peas', 'Meat & Frozen', 65.00, '500 g', 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400&q=80'],

                // 10. Drinks
                ['Taj Mahal Tea Powder', 'Drinks', 145.00, '250 g', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80'],
                ['Nescafe Classic Instant Coffee', 'Drinks', 170.00, '50 g', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80'],
                ['Coca-Cola Original Taste', 'Drinks', 40.00, '750 ml', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80'],

                // 11. Cleaning
                ['Vim Lemon Dishwash Liquid', 'Cleaning', 115.00, '500 ml', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&q=80'],
                ['Surf Excel Easy Wash Detergent', 'Cleaning', 130.00, '1 kg', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&q=80'],
                ['Lizol Floral Floor Cleaner', 'Cleaning', 99.00, '500 ml', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&q=80'],

                // 12. Personal Care
                ['Dettol Original Soap (Pack of 3)', 'Personal Care', 110.00, '3 x 75g', 'https://images.unsplash.com/photo-1607006342411-92fc2a41a39f?w=400&q=80'],
                ['Head & Shoulders Shampoo', 'Personal Care', 145.00, '180 ml', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&q=80'],
                ['Colgate MaxFresh Toothpaste', 'Personal Care', 90.00, '150 g', 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&q=80']
            ];

            for (const prod of mockGroceries) {
                await connection.query(
                    'INSERT INTO products (name, category, price, unit, image_url) VALUES (?, ?, ?, ?, ?)',
                    prod
                );
            }
            console.log('Inserted all mock grocery products successfully.');
        } else {
            console.log('Grocery products already exist, skipping.');
        }

        console.log('Migration completed successfully.');
    } catch(e) {
        console.error('Fatal Error during migration:', e);
    } finally {
        await connection.end();
    }
}

run().catch(console.error);
