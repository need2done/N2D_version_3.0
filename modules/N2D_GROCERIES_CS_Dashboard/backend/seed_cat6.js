const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Iodized Salt
  { name: 'Tata Salt', sub: 'Salt' },
  { name: 'Tata Salt Lite', sub: 'Salt' },
  { name: 'Aashirvaad Iodized Salt', sub: 'Salt' },
  { name: 'Annapurna Salt', sub: 'Salt' },
  { name: 'Captain Cook Salt', sub: 'Salt' },
  { name: 'Patanjali Iodized Salt', sub: 'Salt' },
  { name: 'Local Iodized Salt', sub: 'Salt' },
  // Rock Salt (Sendha Namak)
  { name: 'White Rock Salt', sub: 'Salt' },
  { name: 'Pink Rock Salt', sub: 'Salt' },
  { name: 'Crushed Rock Salt', sub: 'Salt' },
  { name: 'Powdered Rock Salt', sub: 'Salt' },
  { name: 'Organic Rock Salt', sub: 'Salt' },
  // Black Salt
  { name: 'Black Salt Powder', sub: 'Salt' },
  { name: 'Crystal Black Salt', sub: 'Salt' },
  { name: 'Kala Namak Premium', sub: 'Salt' },
  // Himalayan Salt
  { name: 'Pink Himalayan Salt Fine', sub: 'Salt' },
  { name: 'Pink Himalayan Salt Coarse', sub: 'Salt' },
  { name: 'Himalayan Rock Salt Crystals', sub: 'Salt' },
  { name: 'Himalayan Pink Salt Powder', sub: 'Salt' },
  // Sea Salt
  { name: 'Natural Sea Salt', sub: 'Salt' },
  { name: 'Fine Sea Salt', sub: 'Salt' },
  { name: 'Coarse Sea Salt', sub: 'Salt' },
  // Low Sodium Salt
  { name: 'Low Sodium Salt', sub: 'Salt' },
  { name: 'Diet Salt', sub: 'Salt' },
  // White Sugar
  { name: 'Double Refined Sugar', sub: 'Sugar' },
  { name: 'Sulphurless Sugar', sub: 'Sugar' },
  { name: 'Premium Sugar', sub: 'Sugar' },
  { name: 'Crystal Sugar', sub: 'Sugar' },
  { name: 'Fine Sugar', sub: 'Sugar' },
  // Brown Sugar
  { name: 'Natural Brown Sugar', sub: 'Sugar' },
  { name: 'Organic Brown Sugar', sub: 'Sugar' },
  { name: 'Cane Brown Sugar', sub: 'Sugar' },
  // Raw Sugar
  { name: 'Raw Cane Sugar', sub: 'Sugar' },
  { name: 'Organic Cane Sugar', sub: 'Sugar' },
  // Powdered Sugar
  { name: 'Icing Sugar', sub: 'Sugar' },
  { name: 'Powdered Sugar', sub: 'Sugar' },
  // Sugar Cubes
  { name: 'White Sugar Cubes', sub: 'Sugar' },
  { name: 'Brown Sugar Cubes', sub: 'Sugar' },
  // Solid Jaggery
  { name: 'Jaggery Blocks', sub: 'Jaggery' },
  { name: 'Jaggery Balls', sub: 'Jaggery' },
  { name: 'Palm Jaggery', sub: 'Jaggery' },
  { name: 'Organic Jaggery', sub: 'Jaggery' },
  // Jaggery Powder
  { name: 'Fine Jaggery Powder', sub: 'Jaggery' },
  { name: 'Organic Jaggery Powder', sub: 'Jaggery' },
  // Liquid Jaggery
  { name: 'Liquid Jaggery Syrup', sub: 'Jaggery' },
  // Mishri
  { name: 'White Mishri', sub: 'Sugar' },
  { name: 'Brown Mishri', sub: 'Sugar' },
  { name: 'Crystal Mishri', sub: 'Sugar' },
  // Honey
  { name: 'Dabur Honey', sub: 'Honey' },
  { name: 'Patanjali Honey', sub: 'Honey' },
  { name: 'Himalaya Honey', sub: 'Honey' },
  { name: 'Zandu Honey', sub: 'Honey' },
  { name: 'Organic Honey', sub: 'Honey' },
  { name: 'Forest Honey', sub: 'Honey' },
  { name: 'Wild Honey', sub: 'Honey' },
  { name: 'Multi-Flora Honey', sub: 'Honey' },
  // Natural Sweeteners
  { name: 'Stevia Powder', sub: 'Sweetener' },
  { name: 'Stevia Tablets', sub: 'Sweetener' },
  { name: 'Stevia Drops', sub: 'Sweetener' },
  { name: 'Monk Fruit Sweetener', sub: 'Sweetener' },
  // Sugar-Free Sweeteners
  { name: 'Sugar Free Natura', sub: 'Sweetener' },
  { name: 'Sugar Free Gold', sub: 'Sweetener' },
  { name: 'Sugar Free Green', sub: 'Sweetener' },
  { name: 'Equal Sweetener', sub: 'Sweetener' },
  { name: 'Sugar-Free Sachets', sub: 'Sweetener' },
  // Syrups
  { name: 'Maple Syrup', sub: 'Syrup' },
  { name: 'Date Syrup', sub: 'Syrup' },
  { name: 'Palm Syrup', sub: 'Syrup' },
  { name: 'Corn Syrup', sub: 'Syrup' },
  // Palm Sugar
  { name: 'Palm Sugar Powder', sub: 'Sugar' },
  { name: 'Palm Sugar Cubes', sub: 'Sugar' }
];

const brands = [
  'Tata', 'Aashirvaad', 'Annapurna', 'Captain Cook', 'Patanjali', 'Madhur', 'Dhampur', 'Uttam', 'Dabur', 'Himalaya', 'Zandu', 'Organic India', 'Sugar Free', 'Equal', 'Local'
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'need2done_grocery'
  });

  try {
    console.log('Inserting Category...');
    // Category ID 6 = Salt, Sugar & Sweeteners
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (6, 'Salt, Sugar & Sweeteners', 'Cookie')");

    // Insert all brands
    for (const b of brands) {
      await connection.query('INSERT IGNORE INTO brands (name) VALUES (?)', [b]);
    }

    let count = 0;
    for (const item of items) {
      // Try to match brand from name, or pick random
      let brandName = brands.find(b => item.name.includes(b));
      if (!brandName) brandName = brands[Math.floor(Math.random() * brands.length)];
      
      const [brandRows] = await connection.query('SELECT id FROM brands WHERE name = ?', [brandName]);
      const brandId = brandRows[0].id;

      let image = '/images/sugar.png'; 
      let weight = '1 kg';
      let mrp = Math.floor(Math.random() * 60) + 30; // Salt is cheap, Sugar a bit more

      if (item.sub === 'Salt') {
        image = '/images/sugar.png'; // same mockup works for salt
        weight = '1 kg';
        mrp = Math.floor(Math.random() * 30) + 20;
      } else if (item.sub === 'Honey' || item.sub === 'Syrup') {
        image = 'https://images.unsplash.com/photo-1587049352847-4d455449eb35?w=400&q=80'; // Honey jar
        weight = '500 g';
        mrp = Math.floor(Math.random() * 200) + 150;
      } else if (item.sub === 'Sweetener') {
        image = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80'; // Packets
        weight = '100 g';
        mrp = Math.floor(Math.random() * 100) + 50;
      } else if (item.sub === 'Jaggery') {
        image = 'https://images.unsplash.com/photo-1579294273574-eecb819f39df?w=400&q=80'; // Dark block/powder (placeholder)
        weight = '500 g';
        mrp = Math.floor(Math.random() * 80) + 40;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7)); // 70-90% of mrp

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [6, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Salt, Sugar & Sweeteners items!`);
  } catch (err) {
    console.error('Error seeding category 6:', err);
  } finally {
    await connection.end();
  }
}

seed();
