const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Almonds
  { name: 'California Almonds Premium', sub: 'Nut' },
  { name: 'California Almonds Regular', sub: 'Nut' },
  { name: 'Mamra Almonds', sub: 'Nut' },
  { name: 'Gurbandi Almonds', sub: 'Nut' },
  { name: 'Organic Almonds', sub: 'Nut' },
  { name: 'Roasted Almonds', sub: 'Nut' },
  { name: 'Salted Almonds', sub: 'Nut' },
  { name: 'Sliced Almonds', sub: 'Nut' },
  { name: 'Almond Flakes', sub: 'Nut' },
  { name: 'Almond Powder', sub: 'Nut' },

  // Cashews
  { name: 'W180 Cashews (Jumbo)', sub: 'Nut' },
  { name: 'W210 Cashews', sub: 'Nut' },
  { name: 'W240 Cashews', sub: 'Nut' },
  { name: 'W320 Cashews', sub: 'Nut' },
  { name: 'W450 Cashews', sub: 'Nut' },
  { name: 'Broken Cashews', sub: 'Nut' },
  { name: 'Roasted Cashews', sub: 'Nut' },
  { name: 'Salted Cashews', sub: 'Nut' },
  { name: 'Pepper Cashews', sub: 'Nut' },
  { name: 'Masala Cashews', sub: 'Nut' },
  { name: 'Organic Cashews', sub: 'Nut' },

  // Pistachios
  { name: 'Salted Pistachios', sub: 'Nut' },
  { name: 'Unsalted Pistachios', sub: 'Nut' },
  { name: 'Roasted Pistachios', sub: 'Nut' },
  { name: 'Premium Pistachios', sub: 'Nut' },
  { name: 'Pistachio Kernels', sub: 'Nut' },

  // Walnuts
  { name: 'Walnut Kernels', sub: 'Nut' },
  { name: 'Walnut Halves', sub: 'Nut' },
  { name: 'Walnut Pieces', sub: 'Nut' },
  { name: 'Organic Walnuts', sub: 'Nut' },
  { name: 'Premium Walnuts', sub: 'Nut' },

  // Peanuts
  { name: 'Raw Peanuts', sub: 'Nut' },
  { name: 'Roasted Peanuts', sub: 'Nut' },
  { name: 'Salted Peanuts', sub: 'Nut' },
  { name: 'Masala Peanuts', sub: 'Nut' },
  { name: 'Skinless Peanuts', sub: 'Nut' },
  { name: 'Organic Peanuts', sub: 'Nut' },
  { name: 'Peanut Kernels', sub: 'Nut' },

  // Hazelnuts
  { name: 'Whole Hazelnuts', sub: 'Nut' },
  { name: 'Roasted Hazelnuts', sub: 'Nut' },

  // Macadamia
  { name: 'Whole Macadamia Nuts', sub: 'Nut' },
  { name: 'Roasted Macadamia Nuts', sub: 'Nut' },

  // Brazil & Pine
  { name: 'Brazil Nuts', sub: 'Nut' },
  { name: 'Pine Nuts', sub: 'Nut' },

  // Raisins
  { name: 'Golden Raisins', sub: 'Fruit' },
  { name: 'Black Raisins', sub: 'Fruit' },
  { name: 'Green Raisins', sub: 'Fruit' },
  { name: 'Seedless Raisins', sub: 'Fruit' },
  { name: 'Premium Raisins', sub: 'Fruit' },
  { name: 'Organic Raisins', sub: 'Fruit' },

  // Dates
  { name: 'Medjool Dates', sub: 'Fruit' },
  { name: 'Kimia Dates', sub: 'Fruit' },
  { name: 'Ajwa Dates', sub: 'Fruit' },
  { name: 'Kalmi Dates', sub: 'Fruit' },
  { name: 'Zahidi Dates', sub: 'Fruit' },
  { name: 'Omani Dates', sub: 'Fruit' },
  { name: 'Dry Dates', sub: 'Fruit' },
  { name: 'Seedless Dates', sub: 'Fruit' },

  // Figs, Apricots, Prunes
  { name: 'Premium Dry Figs', sub: 'Fruit' },
  { name: 'Turkish Figs', sub: 'Fruit' },
  { name: 'Organic Dry Figs', sub: 'Fruit' },
  { name: 'Dried Apricots', sub: 'Fruit' },
  { name: 'Organic Apricots', sub: 'Fruit' },
  { name: 'Seedless Prunes', sub: 'Fruit' },
  { name: 'Premium Prunes', sub: 'Fruit' },

  // Dry Coconut
  { name: 'Whole Dry Coconut', sub: 'Fruit' },
  { name: 'Coconut Pieces', sub: 'Fruit' },
  { name: 'Coconut Powder', sub: 'Fruit' },
  { name: 'Coconut Chips', sub: 'Fruit' },
  { name: 'Desiccated Coconut', sub: 'Fruit' },

  // Seeds
  { name: 'Raw Pumpkin Seeds', sub: 'Seed' },
  { name: 'Roasted Pumpkin Seeds', sub: 'Seed' },
  { name: 'Raw Sunflower Seeds', sub: 'Seed' },
  { name: 'Roasted Sunflower Seeds', sub: 'Seed' },
  { name: 'Brown Flax Seeds', sub: 'Seed' },
  { name: 'Golden Flax Seeds', sub: 'Seed' },
  { name: 'Organic Chia Seeds', sub: 'Seed' },
  { name: 'Premium Chia Seeds', sub: 'Seed' },
  { name: 'Watermelon Kernels', sub: 'Seed' },
  { name: 'White Sesame Seeds', sub: 'Seed' },
  { name: 'Black Sesame Seeds', sub: 'Seed' },

  // Mixed & Flavoured
  { name: 'Premium Mixed Dry Fruits', sub: 'Mixed' },
  { name: 'Roasted Mixed Nuts', sub: 'Mixed' },
  { name: 'Dry Fruit Gift Pack', sub: 'Mixed' },
  { name: 'Trail Mix', sub: 'Mixed' },
  { name: 'Healthy Mix', sub: 'Mixed' },
  { name: 'Honey Almonds', sub: 'Flavoured' },
  { name: 'Chilli Almonds', sub: 'Flavoured' },
  { name: 'Peri Peri Cashews', sub: 'Flavoured' },
  { name: 'Salted Pistachios (Flavoured)', sub: 'Flavoured' },
  { name: 'Chocolate Almonds', sub: 'Flavoured' },
  { name: 'Chocolate Raisins', sub: 'Flavoured' },

  // Nut Butters
  { name: 'Peanut Butter Creamy', sub: 'Butter' },
  { name: 'Peanut Butter Crunchy', sub: 'Butter' },
  { name: 'Almond Butter', sub: 'Butter' },
  { name: 'Cashew Butter', sub: 'Butter' },

  // Organic
  { name: 'Organic Almonds', sub: 'Nut' },
  { name: 'Organic Cashews', sub: 'Nut' },
  { name: 'Organic Raisins', sub: 'Fruit' },
  { name: 'Organic Dates', sub: 'Fruit' },
  { name: 'Organic Walnuts', sub: 'Nut' },
  { name: 'Organic Pumpkin Seeds', sub: 'Seed' },
  { name: 'Organic Flax Seeds', sub: 'Seed' },
  { name: 'Organic Chia Seeds', sub: 'Seed' },
];

const brands = [
  'Happilo', 'Nutraj', 'Tulsi', 'Vedaka', 'Urban Platter', 'Farmley', 'Wonderland', 'Pintola', 'Alpino', 'MyFitness', 'Sundrop', 'Local'
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
    // Category ID 7 = Nuts & Dry Fruits
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (7, 'Nuts & Dry Fruits', 'Nut')");

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

      let image = '/images/nuts.png'; 
      let weight = '250 g';
      let mrp = Math.floor(Math.random() * 500) + 200; // Nuts are expensive

      if (item.sub === 'Fruit') {
        weight = '250 g';
        mrp = Math.floor(Math.random() * 300) + 100;
      } else if (item.sub === 'Seed') {
        weight = '200 g';
        mrp = Math.floor(Math.random() * 200) + 80;
      } else if (item.sub === 'Butter') {
        image = 'https://images.unsplash.com/photo-1599598425947-33000b213baf?w=400&q=80'; // Butter jar
        weight = '500 g';
        mrp = Math.floor(Math.random() * 400) + 250;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7)); // 70-90% of mrp

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [7, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Nuts & Dry Fruits items!`);
  } catch (err) {
    console.error('Error seeding category 7:', err);
  } finally {
    await connection.end();
  }
}

seed();
