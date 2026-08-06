const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Toor / Arhar Dal
  { name: 'Toor Dal Premium' },
  { name: 'Toor Dal Economy' },
  { name: 'Toor Dal Unpolished' },
  { name: 'Organic Toor Dal' },
  { name: 'Split Toor Dal' },
  // Moong Dal
  { name: 'Split Yellow Moong Dal' },
  { name: 'Whole Green Moong' },
  { name: 'Green Moong Split' },
  { name: 'Unpolished Moong Dal' },
  { name: 'Organic Moong Dal' },
  // Urad Dal
  { name: 'Urad Dal Split' },
  { name: 'Urad Dal Whole' },
  { name: 'Urad Dal Washed' },
  { name: 'Urad Gota' },
  { name: 'Black Urad Whole' },
  { name: 'Organic Urad Dal' },
  // Chana Dal
  { name: 'Chana Dal Premium' },
  { name: 'Chana Dal Unpolished' },
  { name: 'Organic Chana Dal' },
  { name: 'Roasted Chana Dal' },
  // Masoor Dal
  { name: 'Masoor Dal Whole' },
  { name: 'Masoor Dal Split' },
  { name: 'Red Masoor Dal' },
  { name: 'Organic Masoor Dal' },
  // Green Gram
  { name: 'Whole Green Gram' },
  { name: 'Split Green Gram' },
  { name: 'Organic Green Gram' },
  // Bengal Gram / Chana
  { name: 'Black Chana' },
  { name: 'Kabuli Chana Small' },
  { name: 'Kabuli Chana Jumbo' },
  { name: 'White Chana' },
  { name: 'Organic Black Chana' },
  { name: 'Organic Kabuli Chana' },
  // Kidney Beans (Rajma)
  { name: 'Red Rajma' },
  { name: 'Jammu Rajma' },
  { name: 'Chitra Rajma' },
  { name: 'Small Rajma' },
  { name: 'Organic Rajma' },
  // Peas
  { name: 'White Peas' },
  { name: 'Green Dry Peas' },
  { name: 'Yellow Peas' },
  { name: 'Split Yellow Peas' },
  // Horse Gram
  { name: 'Horse Gram' },
  { name: 'Organic Horse Gram' },
  // Cowpeas
  { name: 'Black Eyed Beans' },
  { name: 'Red Cowpeas' },
  { name: 'White Cowpeas' },
  // Other Pulses
  { name: 'Moth Beans' },
  { name: 'Field Beans' },
  { name: 'Double Beans' },
  { name: 'Hyacinth Beans (Dry)' },
  { name: 'Dry Lima Beans' },
  // Soy Products
  { name: 'Soya Chunks' },
  { name: 'Mini Soya Chunks' },
  { name: 'Soya Granules' },
  // Sprouting Pulses
  { name: 'Sprouting Moong' },
  { name: 'Sprouting Chana' },
  { name: 'Mixed Sprouts Pack' }
];

const brands = [
  'Tata Sampann',
  'Aashirvaad',
  'Fortune',
  'Organic Tattva',
  '24 Mantra Organic',
  'Patanjali',
  'Natureland Organics',
  'Local Gunj Market Brands',
  'Local Dal Mill Products'
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
    // ID 4 corresponds to 'Dal & Beans' in CategorySidebar.jsx
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (4, 'Dal & Beans', 'Bean')");

    // Insert all brands
    for (const b of brands) {
      await connection.query('INSERT IGNORE INTO brands (name) VALUES (?)', [b]);
    }

    let count = 0;
    for (const item of items) {
      // Pick a random brand
      const brandName = brands[Math.floor(Math.random() * brands.length)];
      const [brandRows] = await connection.query('SELECT id FROM brands WHERE name = ?', [brandName]);
      const brandId = brandRows[0].id;

      let image = '/images/dal.png'; // use generated image
      let weight = '1 kg';
      let mrp = Math.floor(Math.random() * 200) + 80;
      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7)); // 70-90% of mrp

      // Determine weights
      const weights = ['500 g', '1 kg', '2 kg', '5 kg'];
      weight = weights[Math.floor(Math.random() * weights.length)];

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [4, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Dal & Pulses items!`);
  } catch (err) {
    console.error('Error seeding category 3:', err);
  } finally {
    await connection.end();
  }
}

seed();
