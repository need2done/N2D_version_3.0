const path = require('path');
const mysql = require('./backend/node_modules/mysql2/promise');
require('./backend/node_modules/dotenv').config({ path: './.env' });

async function mapCats() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'n2d_user',
    password: process.env.DB_PASSWORD || 'n2d_pass',
    database: process.env.DB_NAME || 'N2D'
  });
  console.log('Connected to DB');

  const mappings = [
    [1, '%Dairy%'], [1, '%Bread%'], [1, '%Egg%'], [1, '%Milk%'], [1, '%Yogurt%'], [1, '%Paneer%'], [1, '%Butter%'], [1, '%Cheese%'],
    [2, '%Oil%'], [2, '%Ghee%'], [2, '%Sunflower%'], [2, '%Olive%'],
    [3, '%Rice%'], [3, '%Flour%'], [3, '%Grain%'], [3, '%Atta%'], [3, '%Basmati%'], [3, '%Wheat%'], [3, '%Pasta%'],
    [4, '%Dal%'], [4, '%Bean%'], [4, '%Rajma%'], [4, '%Chana%'], [4, '%Toor%'], [4, '%Moong%'],
    [5, '%Spice%'], [5, '%Masala%'], [5, '%Chili%'], [5, '%Cumin%'], [5, '%Turmeric%'], [5, '%Jeera%'],
    [6, '%Salt%'], [6, '%Sugar%'], [6, '%Sweetener%'],
    [7, '%Nut%'], [7, '%Fruit%'], [7, '%Almond%'], [7, '%Cashew%'], [7, '%Raisin%'], [7, '%Kaju%'], [7, '%Kishmish%'],
    [8, '%Snack%'], [8, '%Biscuit%'], [8, '%Good Day%'],
    [9, '%Breakfast%'], [9, '%Instant%'], [9, '%Oats%'], [9, '%Noodle%'],
    [10, '%Tea%'], [10, '%Coffee%'], [10, '%Beverage%'],
    [11, '%Frozen%'],
    [12, '%Meat%'], [12, '%Fish%'], [12, '%Chicken%'], [12, '%Mutton%'], [12, '%Duck%'],
    [13, '%Cleaning%'],
    [14, '%Personal%'],
    [15, '%Baby%'],
    [16, '%Household%']
  ];

  for (const [id, pat] of mappings) {
    await conn.query('UPDATE products SET category_id = ? WHERE category LIKE ? OR name LIKE ?', [id, pat, pat]);
  }
  
  // Set default category_id = 1 for any remaining nulls
  await conn.query('UPDATE products SET category_id = 1 WHERE category_id IS NULL');
  
  // Update broken Unsplash images for Almonds, Cashews, Raisins, Biscuits
  await conn.query(`UPDATE products SET image_url = 'https://images.unsplash.com/photo-1508061253366-f7da158b6d4f?w=400&q=80' WHERE name LIKE '%Almond%' OR name LIKE '%Cashew%' OR name LIKE '%Raisin%'`);
  await conn.query(`UPDATE products SET image_url = 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80' WHERE name LIKE '%Biscuit%'`);

  console.log('Category mapping & image fix completed successfully!');
  await conn.end();
}

mapCats().catch(console.error);
