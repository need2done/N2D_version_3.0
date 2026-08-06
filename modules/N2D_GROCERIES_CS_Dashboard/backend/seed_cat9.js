const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Oats
  { name: 'Quaker Oats', sub: 'Oat' },
  { name: 'Quaker Instant Oats', sub: 'Oat' },
  { name: 'Saffola Oats', sub: 'Oat' },
  { name: 'Kellogg\'s Oats', sub: 'Oat' },
  { name: 'Bagrry\'s Oats', sub: 'Oat' },
  { name: 'Patanjali Oats', sub: 'Oat' },
  { name: 'Rolled Oats', sub: 'Oat' },
  { name: 'Steel Cut Oats', sub: 'Oat' },
  { name: 'Instant Masala Oats', sub: 'Oat' },
  { name: 'High Fibre Oats', sub: 'Oat' },

  // Corn Flakes
  { name: 'Kellogg\'s Corn Flakes Original', sub: 'Cereal' },
  { name: 'Kellogg\'s Corn Flakes Real Honey', sub: 'Cereal' },
  { name: 'Kellogg\'s Corn Flakes Almond & Honey', sub: 'Cereal' },
  { name: 'Bagrry\'s Corn Flakes', sub: 'Cereal' },
  { name: 'Patanjali Corn Flakes', sub: 'Cereal' },

  // Chocos
  { name: 'Kellogg\'s Chocos', sub: 'Cereal' },
  { name: 'Kellogg\'s Chocos Moon & Stars', sub: 'Cereal' },
  { name: 'Choco Rings', sub: 'Cereal' },
  { name: 'Chocolate Cereal', sub: 'Cereal' },

  // Muesli & Granola
  { name: 'Kellogg\'s Muesli', sub: 'Cereal' },
  { name: 'Bagrry\'s Muesli', sub: 'Cereal' },
  { name: 'Yogabar Muesli', sub: 'Cereal' },
  { name: 'Fruit & Nut Muesli', sub: 'Cereal' },
  { name: 'Multigrain Muesli', sub: 'Cereal' },
  { name: 'Granola Original', sub: 'Cereal' },
  { name: 'Granola Honey', sub: 'Cereal' },
  { name: 'Granola Fruit & Nut', sub: 'Cereal' },

  // Dalia & Millet
  { name: 'Wheat Dalia', sub: 'Mix' },
  { name: 'Broken Wheat', sub: 'Mix' },
  { name: 'Ragi Malt', sub: 'Mix' },
  { name: 'Millet Porridge Mix', sub: 'Mix' },
  { name: 'Multigrain Porridge Mix', sub: 'Mix' },

  // Bread Spreads
  { name: 'Kissan Mixed Fruit Jam', sub: 'Spread' },
  { name: 'Kissan Mango Jam', sub: 'Spread' },
  { name: 'Kissan Pineapple Jam', sub: 'Spread' },
  { name: 'Mixed Fruit Jam', sub: 'Spread' },
  { name: 'Strawberry Jam', sub: 'Spread' },
  { name: 'Orange Marmalade', sub: 'Spread' },
  { name: 'Pintola Peanut Butter Creamy', sub: 'Spread' },
  { name: 'Pintola Peanut Butter Crunchy', sub: 'Spread' },
  { name: 'MyFitness Peanut Butter', sub: 'Spread' },
  { name: 'Alpino Peanut Butter', sub: 'Spread' },
  { name: 'Sundrop Peanut Butter', sub: 'Spread' },
  { name: 'Nutella', sub: 'Spread' },
  { name: 'Hershey\'s Chocolate Spread', sub: 'Spread' },
  { name: 'Choco Spread', sub: 'Spread' },
  { name: 'Dabur Honey', sub: 'Spread' },
  { name: 'Patanjali Honey', sub: 'Spread' },
  { name: 'Organic Honey', sub: 'Spread' },

  // Instant Noodles
  { name: 'Maggi 2-Minute Noodles', sub: 'Noodle' },
  { name: 'Maggi Masala', sub: 'Noodle' },
  { name: 'Maggi Atta Noodles', sub: 'Noodle' },
  { name: 'Maggi Oats Noodles', sub: 'Noodle' },
  { name: 'Yippee Magic Masala', sub: 'Noodle' },
  { name: 'Yippee Mood Masala', sub: 'Noodle' },
  { name: 'Top Ramen Curry', sub: 'Noodle' },
  { name: 'Top Ramen Masala', sub: 'Noodle' },
  { name: 'Cup Noodles Veg', sub: 'Noodle' },
  { name: 'Cup Noodles Chicken', sub: 'Noodle' },

  // Pasta & Macaroni
  { name: 'Penne Pasta', sub: 'Pasta' },
  { name: 'Fusilli Pasta', sub: 'Pasta' },
  { name: 'Spaghetti', sub: 'Pasta' },
  { name: 'Macaroni', sub: 'Pasta' },
  { name: 'Shell Pasta', sub: 'Pasta' },
  { name: 'Whole Wheat Pasta', sub: 'Pasta' },
  { name: 'Cheese Pasta Mix', sub: 'Pasta' },

  // Instant Mixes
  { name: 'MTR Idli Mix', sub: 'Mix' },
  { name: 'Aachi Idli Mix', sub: 'Mix' },
  { name: 'Priya Idli Mix', sub: 'Mix' },
  { name: 'MTR Dosa Mix', sub: 'Mix' },
  { name: 'Aachi Dosa Mix', sub: 'Mix' },
  { name: 'Priya Dosa Mix', sub: 'Mix' },
  { name: 'MTR Upma Mix', sub: 'Mix' },
  { name: 'Aachi Upma Mix', sub: 'Mix' },
  { name: 'Pongal Mix', sub: 'Mix' },
  { name: 'MTR Rava Idli Mix', sub: 'Mix' },

  // Ready-to-Cook
  { name: 'Poha Mix', sub: 'Mix' },
  { name: 'Pulihora Mix', sub: 'Mix' },
  { name: 'Lemon Rice Mix', sub: 'Mix' },
  { name: 'Bisibele Bath Mix', sub: 'Mix' },
  { name: 'Vangi Bath Mix', sub: 'Mix' },
  { name: 'Khichdi Mix', sub: 'Mix' },
  { name: 'Soup Mix', sub: 'Mix' },
  { name: 'Instant Dal Mix', sub: 'Mix' },

  // Ready-to-Eat
  { name: 'Ready Veg Biryani', sub: 'RTE' },
  { name: 'Ready Fried Rice', sub: 'RTE' },
  { name: 'Ready Jeera Rice', sub: 'RTE' },
  { name: 'Ready Rajma Rice', sub: 'RTE' },
  { name: 'Ready Dal Makhani', sub: 'RTE' },
  { name: 'Ready Paneer Butter Masala', sub: 'RTE' },
  { name: 'Ready Chole', sub: 'RTE' },
  { name: 'Ready Sambar Rice', sub: 'RTE' },
  { name: 'Ready Pongal', sub: 'RTE' },
  { name: 'Ready Upma', sub: 'RTE' },

  // Soup
  { name: 'Knorr Tomato Soup', sub: 'Soup' },
  { name: 'Knorr Sweet Corn Soup', sub: 'Soup' },
  { name: 'Knorr Hot & Sour Soup', sub: 'Soup' },
  { name: 'Maggi Tomato Soup', sub: 'Soup' },
  { name: 'Veg Soup Mix', sub: 'Soup' },
  { name: 'Mushroom Soup', sub: 'Soup' },

  // Dessert Mixes
  { name: 'Gulab Jamun Mix', sub: 'Mix' },
  { name: 'Rasgulla Mix', sub: 'Mix' },
  { name: 'Payasam Mix', sub: 'Mix' },
  { name: 'Kheer Mix', sub: 'Mix' },
  { name: 'Custard Mix', sub: 'Mix' },
  { name: 'Falooda Mix', sub: 'Mix' },
  { name: 'Pancake Mix', sub: 'Mix' },
  { name: 'Waffle Mix', sub: 'Mix' },
  { name: 'Cake Mix', sub: 'Mix' },
  { name: 'Brownie Mix', sub: 'Mix' },
  { name: 'Muffin Mix', sub: 'Mix' },

  // Breakfast Drinks
  { name: 'Horlicks', sub: 'Drink' },
  { name: 'Women\'s Horlicks', sub: 'Drink' },
  { name: 'Junior Horlicks', sub: 'Drink' },
  { name: 'Boost', sub: 'Drink' },
  { name: 'Bournvita', sub: 'Drink' },
  { name: 'Complan', sub: 'Drink' },
  { name: 'Pediasure', sub: 'Drink' },
  { name: 'Protinex', sub: 'Drink' }
];

const brands = [
  'Kellogg\'s', 'Bagrry\'s', 'Quaker', 'Saffola', 'Yogabar', 'Maggi', 'Yippee', 'Top Ramen', 'MTR', 'Aachi', 'Priya', 'Horlicks', 'Boost', 'Bournvita', 'Complan', 'Pediasure', 'Protinex', 'Local'
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
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (9, 'Breakfast & Instant Food', 'Coffee')");

    for (const b of brands) {
      await connection.query('INSERT IGNORE INTO brands (name) VALUES (?)', [b]);
    }

    let count = 0;
    for (const item of items) {
      let brandName = brands.find(b => item.name.includes(b));
      if (!brandName) brandName = brands[Math.floor(Math.random() * brands.length)];
      
      const [brandRows] = await connection.query('SELECT id FROM brands WHERE name = ?', [brandName]);
      const brandId = brandRows[0].id;

      let image = '/images/breakfast.png'; 
      let weight = '500 g';
      let mrp = Math.floor(Math.random() * 200) + 50; 

      if (item.sub === 'Noodle') {
        weight = '280 g';
        mrp = Math.floor(Math.random() * 80) + 20;
      } else if (item.sub === 'Soup') {
        weight = '50 g';
        mrp = Math.floor(Math.random() * 60) + 10;
      } else if (item.sub === 'Drink') {
        weight = '500 g';
        mrp = Math.floor(Math.random() * 300) + 150;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7));

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [9, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Breakfast & Instant Foods!`);
  } catch (err) {
    console.error('Error seeding category 9:', err);
  } finally {
    await connection.end();
  }
}

seed();
