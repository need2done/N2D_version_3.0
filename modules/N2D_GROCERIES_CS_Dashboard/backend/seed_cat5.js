const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Whole Spices
  { name: 'Black Mustard Seeds', sub: 'Whole' },
  { name: 'Yellow Mustard Seeds', sub: 'Whole' },
  { name: 'Organic Mustard Seeds', sub: 'Whole' },
  { name: 'Regular Jeera', sub: 'Whole' },
  { name: 'Premium Jeera', sub: 'Whole' },
  { name: 'Organic Jeera', sub: 'Whole' },
  { name: 'Black Jeera (Shahi Jeera)', sub: 'Whole' },
  { name: 'Whole Coriander Seeds', sub: 'Whole' },
  { name: 'Premium Coriander Seeds', sub: 'Whole' },
  { name: 'Organic Coriander Seeds', sub: 'Whole' },
  { name: 'Whole Black Pepper', sub: 'Whole' },
  { name: 'Premium Pepper', sub: 'Whole' },
  { name: 'Organic Black Pepper', sub: 'Whole' },
  { name: 'Fennel Seeds', sub: 'Whole' },
  { name: 'Premium Fennel', sub: 'Whole' },
  { name: 'Organic Fennel', sub: 'Whole' },
  { name: 'Fenugreek Seeds', sub: 'Whole' },
  { name: 'Organic Fenugreek', sub: 'Whole' },
  { name: 'Ajwain', sub: 'Whole' },
  { name: 'Organic Ajwain', sub: 'Whole' },
  { name: 'Kalonji', sub: 'Whole' },
  { name: 'White Sesame', sub: 'Whole' },
  { name: 'Black Sesame', sub: 'Whole' },
  { name: 'White Poppy Seeds', sub: 'Whole' },
  { name: 'Premium Cloves', sub: 'Whole' },
  { name: 'Regular Cloves', sub: 'Whole' },
  { name: 'Green Cardamom', sub: 'Whole' },
  { name: 'Black Cardamom', sub: 'Whole' },
  { name: 'Cinnamon Sticks', sub: 'Whole' },
  { name: 'Cinnamon Powder', sub: 'Whole' },
  { name: 'Bay Leaf', sub: 'Whole' },
  { name: 'Star Anise', sub: 'Whole' },
  { name: 'Nutmeg Whole', sub: 'Whole' },
  { name: 'Mace', sub: 'Whole' },
  { name: 'Byadagi Chilli', sub: 'Whole' },
  { name: 'Guntur Chilli', sub: 'Whole' },
  { name: 'Kashmiri Whole Chilli', sub: 'Whole' },
  { name: 'Local Dry Red Chilli', sub: 'Whole' },

  // Spice Powders
  { name: 'Regular Chilli Powder', sub: 'Powder' },
  { name: 'Kashmiri Chilli Powder', sub: 'Powder' },
  { name: 'Extra Hot Chilli Powder', sub: 'Powder' },
  { name: 'Turmeric Powder', sub: 'Powder' },
  { name: 'Organic Turmeric', sub: 'Powder' },
  { name: 'Coriander Powder', sub: 'Powder' },
  { name: 'Premium Coriander Powder', sub: 'Powder' },
  { name: 'Jeera Powder', sub: 'Powder' },
  { name: 'Black Pepper Powder', sub: 'Powder' },
  { name: 'Dry Ginger Powder', sub: 'Powder' },
  { name: 'Garlic Powder', sub: 'Powder' },
  { name: 'Onion Powder', sub: 'Powder' },
  { name: 'Dry Mango Powder', sub: 'Powder' },
  { name: 'Hing Powder', sub: 'Powder' },
  { name: 'Compounded Asafoetida', sub: 'Powder' },

  // Indian Masalas
  { name: 'Everest Garam Masala', sub: 'Masala' },
  { name: 'MDH Garam Masala', sub: 'Masala' },
  { name: 'Aachi Garam Masala', sub: 'Masala' },
  { name: 'Priya Garam Masala', sub: 'Masala' },
  { name: 'Tata Sampann Garam Masala', sub: 'Masala' },
  { name: 'Everest Kitchen King', sub: 'Masala' },
  { name: 'MDH Kitchen King', sub: 'Masala' },
  { name: 'Everest Chicken Masala', sub: 'Masala' },
  { name: 'MDH Chicken Masala', sub: 'Masala' },
  { name: 'Aachi Chicken Masala', sub: 'Masala' },
  { name: 'Everest Mutton Masala', sub: 'Masala' },
  { name: 'MDH Mutton Masala', sub: 'Masala' },
  { name: 'Everest Fish Masala', sub: 'Masala' },
  { name: 'Aachi Fish Masala', sub: 'Masala' },
  { name: 'Everest Biryani Masala', sub: 'Masala' },
  { name: 'MDH Biryani Masala', sub: 'Masala' },
  { name: 'Priya Biryani Masala', sub: 'Masala' },
  { name: 'Aachi Sambar Powder', sub: 'Masala' },
  { name: 'MTR Sambar Powder', sub: 'Masala' },
  { name: 'Priya Sambar Powder', sub: 'Masala' },
  { name: 'Sakthi Sambar Powder', sub: 'Masala' },
  { name: 'Aachi Rasam Powder', sub: 'Masala' },
  { name: 'MTR Rasam Powder', sub: 'Masala' },
  { name: 'Priya Rasam Powder', sub: 'Masala' },
  { name: 'Curry Powder', sub: 'Masala' },
  { name: 'Everest Chaat Masala', sub: 'Masala' },
  { name: 'MDH Chaat Masala', sub: 'Masala' },
  { name: 'Everest Pav Bhaji Masala', sub: 'Masala' },
  { name: 'MDH Pav Bhaji Masala', sub: 'Masala' },
  { name: 'Everest Pani Puri Masala', sub: 'Masala' },
  { name: 'Mixed Vegetable Masala', sub: 'Masala' },
  { name: 'Paneer Butter Masala Mix', sub: 'Masala' },
  { name: 'Tandoori Masala', sub: 'Masala' },
  { name: 'Meat Curry Masala', sub: 'Masala' },

  // South Indian Powders
  { name: 'Idli Karam Podi', sub: 'Powder' },
  { name: 'Peanut Podi', sub: 'Powder' },
  { name: 'Curry Leaf Powder', sub: 'Powder' },
  { name: 'Flaxseed Powder', sub: 'Powder' },
  { name: 'Sesame Powder', sub: 'Powder' },
  { name: 'Garlic Podi', sub: 'Powder' },
  { name: 'Karivepaku Powder', sub: 'Powder' },

  // Pickle Mixes
  { name: 'Mango Pickle Masala', sub: 'Masala' },
  { name: 'Lemon Pickle Masala', sub: 'Masala' },
  { name: 'Gongura Pickle Mix', sub: 'Masala' },
  { name: 'Mixed Pickle Masala', sub: 'Masala' },

  // Ready Spice Mixes
  { name: 'Pulihora Mix', sub: 'Masala' },
  { name: 'Lemon Rice Mix', sub: 'Masala' },
  { name: 'Bisibele Bath Powder', sub: 'Masala' },
  { name: 'Vangi Bath Powder', sub: 'Masala' },
  { name: 'Rasam Mix', sub: 'Masala' },
  { name: 'Sambar Mix', sub: 'Masala' },

  // Seasoning
  { name: 'Pizza Seasoning', sub: 'Powder' },
  { name: 'Italian Herbs', sub: 'Powder' },
  { name: 'Oregano', sub: 'Powder' },
  { name: 'Basil', sub: 'Powder' },
  { name: 'Mixed Herbs', sub: 'Powder' },
  { name: 'Chilli Flakes', sub: 'Powder' },
];

const brands = [
  'Everest', 'MDH', 'Tata Sampann', 'Aachi', 'Priya', 'MTR', 'Sakthi', 'Catch', 'Organic Tattva', 'Patanjali', 'Local'
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
    // Category ID 5 = Spices & Masalas
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (5, 'Spices & Masalas', 'Flame')");

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

      let image = '/images/spice.png'; 
      let weight = '100 g';
      let mrp = Math.floor(Math.random() * 80) + 40;
      
      if (item.sub === 'Whole') {
        weight = '200 g';
        mrp = Math.floor(Math.random() * 150) + 80;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7)); // 70-90% of mrp

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [5, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Spices & Masalas items!`);
  } catch (err) {
    console.error('Error seeding category 5:', err);
  } finally {
    await connection.end();
  }
}

seed();
