const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Premium Rice
  { name: 'India Gate Basmati Rice', sub: 'Rice' },
  { name: 'Daawat Basmati Rice', sub: 'Rice' },
  { name: 'Kohinoor Basmati Rice', sub: 'Rice' },
  { name: 'Fortune Basmati Rice', sub: 'Rice' },
  { name: 'Lal Qilla Basmati Rice', sub: 'Rice' },
  // Daily Cooking Rice
  { name: 'Sona Masoori Rice', sub: 'Rice' },
  { name: 'HMT Rice', sub: 'Rice' },
  { name: 'Kolam Rice', sub: 'Rice' },
  { name: 'Steam Rice', sub: 'Rice' },
  { name: 'Raw Rice', sub: 'Rice' },
  { name: 'Telangana Sona Rice', sub: 'Rice' },
  { name: 'Telangana Fine Rice', sub: 'Rice' },
  { name: 'Telangana Premium Rice', sub: 'Rice' },
  { name: 'Broken Rice', sub: 'Rice' },
  { name: 'Idli Rice', sub: 'Rice' },
  // Healthy Rice
  { name: 'Brown Rice', sub: 'Rice' },
  { name: 'Red Rice', sub: 'Rice' },
  { name: 'Black Rice', sub: 'Rice' },
  { name: 'Organic Rice', sub: 'Rice' },
  { name: 'Hand Pounded Rice', sub: 'Rice' },
  // Rice Variants
  { name: 'Mini Basmati Rice', sub: 'Rice' },
  { name: 'Jeera Rice', sub: 'Rice' },
  { name: 'Boiled Rice', sub: 'Rice' },
  { name: 'Single Polish Rice', sub: 'Rice' },
  { name: 'Double Polish Rice', sub: 'Rice' },
  { name: 'Premium Steam Rice', sub: 'Rice' },
  { name: 'Silky Rice', sub: 'Rice' },
  { name: 'Old Rice', sub: 'Rice' },
  { name: 'New Rice', sub: 'Rice' },
  // Wheat
  { name: 'Whole Wheat', sub: 'Wheat' },
  { name: 'Premium Wheat', sub: 'Wheat' },
  { name: 'Organic Wheat', sub: 'Wheat' },
  // Wheat Flour (Atta)
  { name: 'Aashirvaad Atta', sub: 'Atta' },
  { name: 'Pillsbury Atta', sub: 'Atta' },
  { name: 'Fortune Atta', sub: 'Atta' },
  { name: 'Annapurna Atta', sub: 'Atta' },
  { name: 'Nature Fresh Atta', sub: 'Atta' },
  { name: 'Patanjali Atta', sub: 'Atta' },
  { name: 'Chakki Fresh Atta', sub: 'Atta' },
  { name: 'Whole Wheat Atta', sub: 'Atta' },
  { name: 'Premium Atta', sub: 'Atta' },
  { name: 'Organic Atta', sub: 'Atta' },
  // Specialty Atta
  { name: 'Multigrain Atta', sub: 'Atta' },
  { name: 'High Fibre Atta', sub: 'Atta' },
  { name: 'Sharbati Atta', sub: 'Atta' },
  { name: 'Gluten Free Atta', sub: 'Atta' },
  { name: 'Diet Atta', sub: 'Atta' },
  // Maida
  { name: 'Premium Maida', sub: 'Flour' },
  { name: 'Refined Flour', sub: 'Flour' },
  { name: 'Bakery Maida', sub: 'Flour' },
  { name: 'Pizza Maida', sub: 'Flour' },
  { name: 'Cake Maida', sub: 'Flour' },
  // Besan
  { name: 'Chana Besan', sub: 'Flour' },
  { name: 'Fine Besan', sub: 'Flour' },
  { name: 'Coarse Besan', sub: 'Flour' },
  { name: 'Organic Besan', sub: 'Flour' },
  // Rice Flour
  { name: 'Rice Flour', sub: 'Flour' },
  { name: 'Fine Rice Flour', sub: 'Flour' },
  { name: 'Organic Rice Flour', sub: 'Flour' },
  // Corn Flour
  { name: 'Corn Flour', sub: 'Flour' },
  { name: 'Corn Starch', sub: 'Flour' },
  // Millet Flours
  { name: 'Ragi Flour', sub: 'Flour' },
  { name: 'Jowar Flour', sub: 'Flour' },
  { name: 'Bajra Flour', sub: 'Flour' },
  { name: 'Foxtail Millet Flour', sub: 'Flour' },
  { name: 'Little Millet Flour', sub: 'Flour' },
  { name: 'Kodo Millet Flour', sub: 'Flour' },
  { name: 'Barnyard Millet Flour', sub: 'Flour' },
  { name: 'Multi Millet Flour', sub: 'Flour' },
  // Rava / Suji
  { name: 'Bombay Rava', sub: 'Flour' },
  { name: 'Bansi Rava', sub: 'Flour' },
  { name: 'Fine Suji', sub: 'Flour' },
  { name: 'Coarse Suji', sub: 'Flour' },
  { name: 'Roasted Suji', sub: 'Flour' },
  // Vermicelli
  { name: 'Plain Vermicelli', sub: 'Grains' },
  { name: 'Roasted Vermicelli', sub: 'Grains' },
  { name: 'Wheat Vermicelli', sub: 'Grains' },
  { name: 'Rice Vermicelli', sub: 'Grains' },
  // Poha
  { name: 'Thick Poha', sub: 'Grains' },
  { name: 'Thin Poha', sub: 'Grains' },
  { name: 'Nylon Poha', sub: 'Grains' },
  { name: 'Organic Poha', sub: 'Grains' },
  // Oats
  { name: 'Plain Oats', sub: 'Oats' },
  { name: 'Rolled Oats', sub: 'Oats' },
  { name: 'Instant Oats', sub: 'Oats' },
  { name: 'Masala Oats', sub: 'Oats' },
  { name: 'Steel Cut Oats', sub: 'Oats' },
  // Millets
  { name: 'Whole Ragi', sub: 'Millets' },
  { name: 'Organic Ragi', sub: 'Millets' },
  { name: 'Whole Jowar', sub: 'Millets' },
  { name: 'Organic Jowar', sub: 'Millets' },
  { name: 'Whole Bajra', sub: 'Millets' },
  { name: 'Organic Bajra', sub: 'Millets' },
  { name: 'Foxtail Millet', sub: 'Millets' },
  { name: 'Organic Foxtail Millet', sub: 'Millets' },
  { name: 'Little Millet', sub: 'Millets' },
  { name: 'Organic Little Millet', sub: 'Millets' },
  { name: 'Barnyard Millet', sub: 'Millets' },
  { name: 'Kodo Millet', sub: 'Millets' },
  { name: 'Proso Millet', sub: 'Millets' },
  { name: 'Browntop Millet', sub: 'Millets' },
  // Healthy Grains
  { name: 'Quinoa White', sub: 'Grains' },
  { name: 'Quinoa Red', sub: 'Grains' },
  { name: 'Quinoa Black', sub: 'Grains' },
  { name: 'Barley', sub: 'Grains' },
  { name: 'Broken Wheat (Dalia)', sub: 'Grains' },
  { name: 'Rolled Barley', sub: 'Grains' },
  // Baking Flour
  { name: 'Self Raising Flour', sub: 'Flour' },
  { name: 'Whole Wheat Baking Flour', sub: 'Flour' },
  { name: 'Bread Flour', sub: 'Flour' },
  { name: 'Pizza Flour', sub: 'Flour' },
  { name: 'Cake Flour', sub: 'Flour' },
  // Starches
  { name: 'Tapioca Flour', sub: 'Flour' },
  { name: 'Arrowroot Powder', sub: 'Flour' },
  { name: 'Potato Starch', sub: 'Flour' },
  // Specialty Flours
  { name: 'Soy Flour', sub: 'Flour' },
  { name: 'Almond Flour', sub: 'Flour' },
  { name: 'Coconut Flour', sub: 'Flour' },
  { name: 'Oat Flour', sub: 'Flour' },
  { name: 'Buckwheat Flour', sub: 'Flour' },
  { name: 'Chickpea Flour', sub: 'Flour' },
  // Ready Rice Products
  { name: 'Idli Rava', sub: 'Rice' },
  { name: 'Rice Rava', sub: 'Rice' },
  { name: 'Avalakki', sub: 'Grains' },
  { name: 'Rice Sevai', sub: 'Grains' },
  { name: 'Instant Rice', sub: 'Rice' },
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
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (3, 'Rice, Flour & Grains', 'Wheat')");

    const tags = ["Farm Fresh", "Organic", "Best Seller", "", "", "New"];

    let count = 0;
    for (const item of items) {
      // Determine image based on sub-type
      let image = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80';
      let weight = '1 kg';
      let mrp = 100;
      let tag = tags[Math.floor(Math.random() * tags.length)];

      if (item.sub === 'Rice') {
        image = '/images/rice.png'; // use generated image
        weight = '5 kg';
        mrp = Math.floor(Math.random() * 500) + 200;
      } else if (item.sub === 'Atta' || item.sub === 'Wheat') {
        image = '/images/atta.png'; // use generated image
        weight = '5 kg';
        mrp = Math.floor(Math.random() * 300) + 150;
      } else if (item.sub === 'Flour') {
        image = 'https://images.unsplash.com/photo-1508338712271-40539c9f2203?w=400&q=80';
        weight = '500 g';
        mrp = Math.floor(Math.random() * 100) + 40;
      } else if (item.sub === 'Oats') {
        image = 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&q=80';
        weight = '1 kg';
        mrp = Math.floor(Math.random() * 200) + 100;
      } else if (item.sub === 'Millets' || item.sub === 'Grains') {
        image = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80';
        weight = '1 kg';
        mrp = Math.floor(Math.random() * 150) + 50;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7)); // 70-90% of mrp

      // Insert brand if doesn't exist
      const brandName = item.name.split(' ')[0];
      await connection.query('INSERT IGNORE INTO brands (name) VALUES (?)', [brandName]);
      const [brandRows] = await connection.query('SELECT id FROM brands WHERE name = ?', [brandName]);
      const brandId = brandRows[0].id;

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [3, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);

      // Note: the tag isn't stored in DB in the schema currently, we'll just ignore or add to description if needed
      
      count++;
    }

    console.log(`Successfully seeded ${count} Rice, Flour & Grains items!`);
  } catch (err) {
    console.error('Error seeding category 2:', err);
  } finally {
    await connection.end();
  }
}

seed();
