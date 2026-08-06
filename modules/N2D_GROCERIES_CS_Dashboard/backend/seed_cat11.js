const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Family Packs
  { name: 'Amul Vanilla Family Pack', sub: 'Pack' },
  { name: 'Amul Chocolate Family Pack', sub: 'Pack' },
  { name: 'Amul Butterscotch Family Pack', sub: 'Pack' },
  { name: 'Amul Rajbhog Family Pack', sub: 'Pack' },
  { name: 'Amul Kesar Pista Family Pack', sub: 'Pack' },
  { name: 'Arun Vanilla Family Pack', sub: 'Pack' },
  { name: 'Arun Chocolate Family Pack', sub: 'Pack' },
  { name: 'Arun Strawberry Family Pack', sub: 'Pack' },
  { name: 'Heritage Vanilla Family Pack', sub: 'Pack' },
  { name: 'Heritage Chocolate Family Pack', sub: 'Pack' },
  { name: "Kwality Wall's Vanilla Family Pack", sub: 'Pack' },
  { name: "Kwality Wall's Chocolate Family Pack", sub: 'Pack' },
  { name: 'Cream Bell Family Pack', sub: 'Pack' },
  { name: 'Vadilal Family Pack', sub: 'Pack' },
  { name: 'Havmor Family Pack', sub: 'Pack' },

  // Cups
  { name: 'Vanilla Cup', sub: 'Cup' },
  { name: 'Chocolate Cup', sub: 'Cup' },
  { name: 'Strawberry Cup', sub: 'Cup' },
  { name: 'Butterscotch Cup', sub: 'Cup' },
  { name: 'Mango Cup', sub: 'Cup' },
  { name: 'Black Currant Cup', sub: 'Cup' },
  { name: 'Rajbhog Cup', sub: 'Cup' },
  { name: 'Kesar Pista Cup', sub: 'Cup' },

  // Cones
  { name: 'Vanilla Cone', sub: 'Cone' },
  { name: 'Chocolate Cone', sub: 'Cone' },
  { name: 'Butterscotch Cone', sub: 'Cone' },
  { name: 'Strawberry Cone', sub: 'Cone' },
  { name: 'Choco Almond Cone', sub: 'Cone' },
  { name: 'Belgian Chocolate Cone', sub: 'Cone' },

  // Sticks
  { name: 'Chocobar', sub: 'Stick' },
  { name: 'Vanilla Stick', sub: 'Stick' },
  { name: 'Mango Stick', sub: 'Stick' },
  { name: 'Orange Stick', sub: 'Stick' },
  { name: 'Cola Stick', sub: 'Stick' },
  { name: 'Raspberry Stick', sub: 'Stick' },

  // Kulfi
  { name: 'Malai Kulfi', sub: 'Kulfi' },
  { name: 'Kesar Kulfi', sub: 'Kulfi' },
  { name: 'Pista Kulfi', sub: 'Kulfi' },
  { name: 'Mango Kulfi', sub: 'Kulfi' },
  { name: 'Chocolate Kulfi', sub: 'Kulfi' },
  { name: 'Badam Kulfi', sub: 'Kulfi' },
  { name: 'Matka Kulfi', sub: 'Kulfi' },

  // Cassata
  { name: 'Vanilla Cassata', sub: 'Cassata' },
  { name: 'Fruit Cassata', sub: 'Cassata' },
  { name: 'Chocolate Cassata', sub: 'Cassata' },

  // Sundae
  { name: 'Chocolate Sundae', sub: 'Sundae' },
  { name: 'Butterscotch Sundae', sub: 'Sundae' },
  { name: 'Strawberry Sundae', sub: 'Sundae' },
  { name: 'Mango Sundae', sub: 'Sundae' },

  // Tubs
  { name: 'Vanilla Tub', sub: 'Tub' },
  { name: 'Chocolate Tub', sub: 'Tub' },
  { name: 'Strawberry Tub', sub: 'Tub' },
  { name: 'Butterscotch Tub', sub: 'Tub' },
  { name: 'Mango Tub', sub: 'Tub' },
  { name: 'Black Currant Tub', sub: 'Tub' }
];

const brands = [
  'Amul', 'Arun', 'Heritage', "Kwality Wall's", 'Cream Bell', 'Vadilal', 'Havmor', 'Joy', 'Local'
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
    // Category ID 11 = Frozen Food
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (11, 'Frozen Food', 'Snowflake')"); // Assuming Snowflake or similar icon is fine

    for (const b of brands) {
      await connection.query('INSERT IGNORE INTO brands (name) VALUES (?)', [b]);
    }

    let count = 0;
    for (const item of items) {
      let brandName = brands.find(b => item.name.includes(b));
      if (!brandName) brandName = brands[Math.floor(Math.random() * brands.length)];
      
      const [brandRows] = await connection.query('SELECT id FROM brands WHERE name = ?', [brandName]);
      const brandId = brandRows[0].id;

      let image = '/images/icecream.png'; 
      let weight = '1 pc';
      let mrp = Math.floor(Math.random() * 50) + 20; 

      if (item.sub === 'Pack' || item.sub === 'Tub') {
        weight = '1 L';
        mrp = Math.floor(Math.random() * 200) + 150;
      } else if (item.sub === 'Cup') {
        weight = '100 ml';
        mrp = Math.floor(Math.random() * 30) + 10;
      } else if (item.sub === 'Sundae') {
        weight = '150 ml';
        mrp = Math.floor(Math.random() * 60) + 30;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7));

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [11, brandId, item.name, weight, mrp, selling, 50]); // Frozen usually lower stock logic
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Frozen Food items!`);
  } catch (err) {
    console.error('Error seeding category 11:', err);
  } finally {
    await connection.end();
  }
}

seed();
