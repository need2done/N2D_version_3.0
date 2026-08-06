const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Sunflower Oil
  { name: 'Fortune Sunlite', sub: 'Oil' },
  { name: 'Fortune Sunflower Oil', sub: 'Oil' },
  { name: 'Freedom Sunflower Oil', sub: 'Oil' },
  { name: 'Gold Winner Sunflower Oil', sub: 'Oil' },
  { name: 'Gemini Sunflower Oil', sub: 'Oil' },
  { name: 'Saffola Sunflower Oil', sub: 'Oil' },
  { name: 'Dhara Sunflower Oil', sub: 'Oil' },
  { name: 'Nature Fresh Sunflower Oil', sub: 'Oil' },
  { name: 'Sundrop Sunflower Oil', sub: 'Oil' },
  { name: 'Local Sunflower Oil', sub: 'Oil' },
  // Groundnut Oil
  { name: 'Fortune Groundnut Oil', sub: 'Oil' },
  { name: 'Freedom Groundnut Oil', sub: 'Oil' },
  { name: 'Gold Winner Groundnut Oil', sub: 'Oil' },
  { name: 'Gemini Groundnut Oil', sub: 'Oil' },
  { name: 'Dhara Groundnut Oil', sub: 'Oil' },
  { name: 'Local Groundnut Oil', sub: 'Oil' },
  { name: 'Cold Pressed Groundnut Oil', sub: 'Oil' },
  { name: 'Organic Groundnut Oil', sub: 'Oil' },
  // Rice Bran Oil
  { name: 'Fortune Rice Bran Oil', sub: 'Oil' },
  { name: 'Freedom Rice Bran Oil', sub: 'Oil' },
  { name: 'Saffola Rice Bran Oil', sub: 'Oil' },
  { name: 'Nature Fresh Rice Bran Oil', sub: 'Oil' },
  { name: 'Ricela Rice Bran Oil', sub: 'Oil' },
  { name: 'Local Rice Bran Oil', sub: 'Oil' },
  // Mustard Oil
  { name: 'Fortune Mustard Oil', sub: 'Oil' },
  { name: 'Dhara Mustard Oil', sub: 'Oil' },
  { name: 'Engine Mustard Oil', sub: 'Oil' },
  { name: 'Organic Mustard Oil', sub: 'Oil' },
  { name: 'Cold Pressed Mustard Oil', sub: 'Oil' },
  // Coconut Oil
  { name: 'Parachute Coconut Oil', sub: 'Oil' },
  { name: 'Max Care Coconut Oil', sub: 'Oil' },
  { name: 'KLF Coconut Oil', sub: 'Oil' },
  { name: 'Patanjali Coconut Oil', sub: 'Oil' },
  { name: 'Organic Coconut Oil', sub: 'Oil' },
  { name: 'Cold Pressed Coconut Oil', sub: 'Oil' },
  // Sesame Oil
  { name: 'Idhayam Gingelly Oil', sub: 'Oil' },
  { name: 'Gold Winner Sesame Oil', sub: 'Oil' },
  { name: 'Fortune Sesame Oil', sub: 'Oil' },
  { name: 'Cold Pressed Sesame Oil', sub: 'Oil' },
  { name: 'Organic Sesame Oil', sub: 'Oil' },
  // Olive Oil
  { name: 'Borges Olive Oil', sub: 'Oil' },
  { name: 'Figaro Olive Oil', sub: 'Oil' },
  { name: 'Del Monte Olive Oil', sub: 'Oil' },
  { name: 'Extra Virgin Olive Oil', sub: 'Oil' },
  { name: 'Pure Olive Oil', sub: 'Oil' },
  // Palm Oil
  { name: 'Palmolein Oil', sub: 'Oil' },
  { name: 'Ruchi Palm Oil', sub: 'Oil' },
  { name: 'Local Palm Oil', sub: 'Oil' },
  // Ghee
  { name: 'Amul Ghee', sub: 'Ghee' },
  { name: 'Heritage Ghee', sub: 'Ghee' },
  { name: 'Dodla Ghee', sub: 'Ghee' },
  { name: 'Gowardhan Ghee', sub: 'Ghee' },
  { name: 'Patanjali Cow Ghee', sub: 'Ghee' },
  { name: 'A2 Cow Ghee', sub: 'Ghee' },
  { name: 'Organic Ghee', sub: 'Ghee' },
  { name: 'Homemade Ghee', sub: 'Ghee' },
  // Vanaspati
  { name: 'Dalda Vanaspati', sub: 'Ghee' },
  { name: 'Ruchi Vanaspati', sub: 'Ghee' },
  { name: 'Local Vanaspati', sub: 'Ghee' },
  // Sauces
  { name: 'Kissan Tomato Ketchup', sub: 'Sauce' },
  { name: 'Maggi Tomato Ketchup', sub: 'Sauce' },
  { name: 'Del Monte Tomato Ketchup', sub: 'Sauce' },
  { name: 'Veeba Tomato Ketchup', sub: 'Sauce' },
  { name: "Ching's Chilli Sauce", sub: 'Sauce' },
  { name: 'Veeba Chilli Sauce', sub: 'Sauce' },
  { name: 'Del Monte Chilli Sauce', sub: 'Sauce' },
  { name: "Ching's Schezwan Sauce", sub: 'Sauce' },
  { name: 'Veeba Schezwan Sauce', sub: 'Sauce' },
  { name: 'Del Monte Pasta Sauce', sub: 'Sauce' },
  { name: 'Veeba Pasta Sauce', sub: 'Sauce' },
  { name: 'Pizza Sauce', sub: 'Sauce' },
  // Coconut Milk
  { name: 'Dabur Coconut Milk', sub: 'Sauce' },
  { name: 'Real Thai Coconut Milk', sub: 'Sauce' },
  { name: 'Fresh Coconut Milk', sub: 'Sauce' },
  // Vinegar
  { name: 'White Vinegar', sub: 'Sauce' },
  { name: 'Apple Cider Vinegar', sub: 'Sauce' },
  { name: 'Synthetic Vinegar', sub: 'Sauce' },
  // Soy Sauce
  { name: "Ching's Soy Sauce", sub: 'Sauce' },
  { name: 'Del Monte Soy Sauce', sub: 'Sauce' },
  { name: 'Veeba Soy Sauce', sub: 'Sauce' },
  // Mayonnaise
  { name: 'Dr. Oetker FunFoods Mayonnaise', sub: 'Sauce' },
  { name: 'Veeba Mayonnaise', sub: 'Sauce' },
  { name: 'Del Monte Mayonnaise', sub: 'Sauce' },
  { name: 'Eggless Mayonnaise', sub: 'Sauce' },
  // Corn Flour & Starch
  { name: 'Corn Flour', sub: 'Powder' },
  { name: 'Corn Starch', sub: 'Powder' },
  { name: 'Arrowroot Powder', sub: 'Powder' },
  { name: 'Potato Starch', sub: 'Powder' },
  // Baking Essentials
  { name: 'Baking Powder', sub: 'Powder' },
  { name: 'Baking Soda', sub: 'Powder' },
  { name: 'Dry Yeast', sub: 'Powder' },
  { name: 'Cocoa Powder', sub: 'Powder' },
  { name: 'Vanilla Essence', sub: 'Sauce' },
  { name: 'Custard Powder', sub: 'Powder' },
  { name: 'Gelatin', sub: 'Powder' },
  { name: 'Food Colour', sub: 'Powder' },
  { name: 'Icing Sugar', sub: 'Powder' },
  // Cooking Mixes
  { name: 'Ginger Garlic Paste', sub: 'Paste' },
  { name: 'Tamarind Paste', sub: 'Paste' },
  { name: 'Garlic Paste', sub: 'Paste' },
  { name: 'Ginger Paste', sub: 'Paste' },
  { name: 'Coconut Paste', sub: 'Paste' }
];

const brands = [
  'Fortune', 'Freedom', 'Gold Winner', 'Gemini', 'Dhara', 'Saffola', 'Sundrop', 'Nature Fresh', 'Idhayam', 'Borges', 'Figaro',
  'Kissan', 'Maggi', 'Veeba', "Ching's", 'Del Monte'
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
    // Category ID 2 = Oils & Cooking Items
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (2, 'Oils & Cooking Items', 'Droplet')");

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

      let image = '/images/oil.png'; 
      let weight = '1 L';
      let mrp = Math.floor(Math.random() * 200) + 100;
      
      if (item.sub === 'Sauce' || item.sub === 'Paste') {
        image = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80';
        weight = '500 g';
        mrp = Math.floor(Math.random() * 100) + 50;
      } else if (item.sub === 'Ghee') {
        image = 'https://images.unsplash.com/photo-1627914483758-52264871e89b?w=400&q=80';
        weight = '500 ml';
        mrp = Math.floor(Math.random() * 300) + 200;
      } else if (item.sub === 'Powder') {
        image = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80';
        weight = '100 g';
        mrp = Math.floor(Math.random() * 80) + 20;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7)); // 70-90% of mrp

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [2, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Oils & Cooking Essentials items!`);
  } catch (err) {
    console.error('Error seeding category 4:', err);
  } finally {
    await connection.end();
  }
}

seed();
