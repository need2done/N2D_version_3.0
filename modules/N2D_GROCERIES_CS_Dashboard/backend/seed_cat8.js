const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Glucose Biscuits
  { name: 'Parle-G Original', sub: 'Biscuit' },
  { name: 'Parle-G Gold', sub: 'Biscuit' },
  { name: 'Sunfeast Glucose', sub: 'Biscuit' },
  { name: 'Priya Glucose Biscuits', sub: 'Biscuit' },
  { name: 'Britannia Milk Bikis', sub: 'Biscuit' },

  // Marie Biscuits
  { name: 'Britannia Marie Gold', sub: 'Biscuit' },
  { name: 'Parle Marie', sub: 'Biscuit' },
  { name: 'Sunfeast Marie Light', sub: 'Biscuit' },
  { name: "McVitie's Marie", sub: 'Biscuit' },

  // Cream Biscuits
  { name: 'Britannia Bourbon', sub: 'Biscuit' },
  { name: 'Britannia Treat', sub: 'Biscuit' },
  { name: 'Britannia Jim Jam', sub: 'Biscuit' },
  { name: 'Sunfeast Dark Fantasy', sub: 'Biscuit' },
  { name: 'Sunfeast Bounce', sub: 'Biscuit' },
  { name: 'Oreo Vanilla', sub: 'Biscuit' },
  { name: 'Oreo Chocolate', sub: 'Biscuit' },
  { name: 'Oreo Strawberry', sub: 'Biscuit' },
  { name: 'Parle Hide & Seek', sub: 'Biscuit' },
  { name: 'Hide & Seek Fab', sub: 'Biscuit' },
  { name: 'Unibic Choco Chip Cookies', sub: 'Biscuit' },

  // Digestive & Healthy
  { name: 'Britannia NutriChoice Digestive', sub: 'Biscuit' },
  { name: 'NutriChoice Oats', sub: 'Biscuit' },
  { name: 'NutriChoice Sugar-Free', sub: 'Biscuit' },
  { name: "McVitie's Digestive", sub: 'Biscuit' },
  { name: 'Diabetic Biscuits', sub: 'Biscuit' },
  { name: 'Ragi Biscuits', sub: 'Biscuit' },
  { name: 'Millet Biscuits', sub: 'Biscuit' },
  { name: 'Oats Biscuits', sub: 'Biscuit' },
  { name: 'Multigrain Biscuits', sub: 'Biscuit' },

  // Salted Biscuits
  { name: 'Britannia 50-50', sub: 'Biscuit' },
  { name: 'Britannia Maska Chaska', sub: 'Biscuit' },
  { name: 'Parle Monaco', sub: 'Biscuit' },
  { name: 'Monaco Jeera', sub: 'Biscuit' },
  { name: 'Cheese Crackers', sub: 'Biscuit' },
  { name: 'Salt Crackers', sub: 'Biscuit' },

  // Cookies
  { name: 'Good Day Butter', sub: 'Biscuit' },
  { name: 'Good Day Cashew', sub: 'Biscuit' },
  { name: 'Good Day Chocochip', sub: 'Biscuit' },
  { name: 'Good Day Pista Badam', sub: 'Biscuit' },
  { name: 'Unibic Cookies', sub: 'Biscuit' },
  { name: 'Butter Cookies', sub: 'Biscuit' },
  { name: 'Coconut Cookies', sub: 'Biscuit' },
  { name: 'Fruit Cookies', sub: 'Biscuit' },

  // Potato Chips
  { name: 'Lays Classic Salted', sub: 'Chip' },
  { name: 'Lays American Style Cream & Onion', sub: 'Chip' },
  { name: 'Lays Magic Masala', sub: 'Chip' },
  { name: 'Lays Chile Lemon', sub: 'Chip' },
  { name: 'Bingo Original', sub: 'Chip' },
  { name: 'Bingo Mad Angles', sub: 'Chip' },
  { name: 'Bingo Tedhe Medhe', sub: 'Chip' },
  { name: 'Balaji Wafers', sub: 'Chip' },
  { name: 'Uncle Chipps', sub: 'Chip' },

  // Corn Snacks
  { name: 'Kurkure Masala Munch', sub: 'Chip' },
  { name: 'Kurkure Chilli Chatka', sub: 'Chip' },
  { name: 'Kurkure Green Chutney', sub: 'Chip' },
  { name: 'Cornitos Nachos', sub: 'Chip' },
  { name: 'Doritos Nachos', sub: 'Chip' },
  { name: 'Corn Puffs', sub: 'Chip' },

  // Namkeen
  { name: 'Haldiram Aloo Bhujia', sub: 'Namkeen' },
  { name: 'Haldiram Bhujia Sev', sub: 'Namkeen' },
  { name: 'Haldiram Moong Dal', sub: 'Namkeen' },
  { name: 'Haldiram Navratan Mix', sub: 'Namkeen' },
  { name: 'Bikaji Bhujia', sub: 'Namkeen' },
  { name: 'Bikaji Mixture', sub: 'Namkeen' },
  { name: 'Balaji Mixture', sub: 'Namkeen' },
  { name: 'Local Mixture', sub: 'Namkeen' },
  { name: 'Kara Boondi', sub: 'Namkeen' },
  { name: 'Plain Boondi', sub: 'Namkeen' },

  // Telangana Snacks
  { name: 'Murukulu', sub: 'Namkeen' },
  { name: 'Janthikalu', sub: 'Namkeen' },
  { name: 'Chekkalu', sub: 'Namkeen' },
  { name: 'Sakinalu', sub: 'Namkeen' },
  { name: 'Appalu', sub: 'Namkeen' },
  { name: 'Ribbon Pakoda', sub: 'Namkeen' },
  { name: 'Sev', sub: 'Namkeen' },
  { name: 'Masala Groundnuts', sub: 'Namkeen' },
  { name: 'Masala Peanuts', sub: 'Namkeen' },
  { name: 'Chana Jor Garam', sub: 'Namkeen' },
  { name: 'Banana Chips', sub: 'Chip' },
  { name: 'Tapioca Chips', sub: 'Chip' },

  // Popcorn
  { name: 'ACT II Butter Popcorn', sub: 'Popcorn' },
  { name: 'ACT II Golden Sizzle', sub: 'Popcorn' },
  { name: 'Microwave Popcorn', sub: 'Popcorn' },
  { name: 'Ready-to-Eat Popcorn', sub: 'Popcorn' },
  { name: 'Cheese Popcorn', sub: 'Popcorn' },
  { name: 'Caramel Popcorn', sub: 'Popcorn' },

  // Chocolates
  { name: 'Dairy Milk', sub: 'Choc' },
  { name: 'Dairy Milk Silk', sub: 'Choc' },
  { name: 'Dairy Milk Fruit & Nut', sub: 'Choc' },
  { name: 'Dairy Milk Crackle', sub: 'Choc' },
  { name: 'Five Star', sub: 'Choc' },
  { name: 'Perk', sub: 'Choc' },
  { name: 'Gems', sub: 'Choc' },
  { name: 'Fuse', sub: 'Choc' },
  { name: 'KitKat', sub: 'Choc' },
  { name: 'KitKat Dark', sub: 'Choc' },
  { name: 'Munch', sub: 'Choc' },
  { name: 'Milkybar', sub: 'Choc' },
  { name: 'Snickers', sub: 'Choc' },
  { name: 'Mars Chocolate', sub: 'Choc' },
  { name: 'Bounty', sub: 'Choc' },
  { name: 'Twix', sub: 'Choc' },
  { name: 'Ferrero Rocher', sub: 'Choc' },

  // Candies
  { name: 'Alpenliebe', sub: 'Candy' },
  { name: 'Eclairs', sub: 'Candy' },
  { name: 'Melody', sub: 'Candy' },
  { name: 'Mango Bite', sub: 'Candy' },
  { name: 'Coffee Bite', sub: 'Candy' },
  { name: 'Kaccha Mango Bite', sub: 'Candy' },
  { name: 'Pulse Candy', sub: 'Candy' },
  { name: 'Hajmola Candy', sub: 'Candy' },
  { name: 'Poppins', sub: 'Candy' },
  { name: 'Lollipop', sub: 'Candy' },

  // Indian Sweets & Snacks
  { name: 'Soan Papdi', sub: 'Sweet' },
  { name: 'Kaju Katli', sub: 'Sweet' },
  { name: 'Mysore Pak', sub: 'Sweet' },
  { name: 'Laddu', sub: 'Sweet' },
  { name: 'Dry Fruit Laddu', sub: 'Sweet' },
  { name: 'Peanut Chikki', sub: 'Sweet' },
  { name: 'Sesame Chikki', sub: 'Sweet' },
  { name: 'Coconut Chikki', sub: 'Sweet' },

  // Khakhra
  { name: 'Plain Khakhra', sub: 'Snack' },
  { name: 'Methi Khakhra', sub: 'Snack' },
  { name: 'Jeera Khakhra', sub: 'Snack' },
  { name: 'Masala Khakhra', sub: 'Snack' },

  // Toast & Rusk
  { name: 'Britannia Rusk', sub: 'Biscuit' },
  { name: 'Milk Rusk', sub: 'Biscuit' },
  { name: 'Elaichi Rusk', sub: 'Biscuit' },
  { name: 'Toast Biscuits', sub: 'Biscuit' },
  { name: 'Butter Rusk', sub: 'Biscuit' },

  // Roasted Snacks
  { name: 'Roasted Chana', sub: 'Snack' },
  { name: 'Roasted Peanuts', sub: 'Snack' },
  { name: 'Salted Peanuts', sub: 'Snack' },
  { name: 'Roasted Makhana', sub: 'Snack' },
  { name: 'Masala Makhana', sub: 'Snack' },

  // Cheese Snacks
  { name: 'Cheese Balls', sub: 'Snack' },
  { name: 'Cheese Puffs', sub: 'Snack' },
  { name: 'Cheese Nachos', sub: 'Snack' },
  { name: 'Cheese Crackers', sub: 'Snack' },

  // Healthy Snacks
  { name: 'Granola Bars', sub: 'Snack' },
  { name: 'Protein Bars', sub: 'Snack' },
  { name: 'Fruit Bars', sub: 'Snack' },
  { name: 'Mixed Nuts Pack', sub: 'Snack' },
  { name: 'Trail Mix', sub: 'Snack' },
];

const brands = [
  'Britannia', 'Parle', 'Sunfeast', 'Unibic', 'McVitie\'s', 'Lays', 'Bingo', 'Kurkure', 'Haldiram', 'Bikaji', 'Balaji', 'Cornitos', 'Doritos', 'Cadbury', 'Nestlé', 'Mars', 'Ferrero', 'Local'
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
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (8, 'Snacks & Biscuits', 'Cookie')");

    for (const b of brands) {
      await connection.query('INSERT IGNORE INTO brands (name) VALUES (?)', [b]);
    }

    let count = 0;
    for (const item of items) {
      let brandName = brands.find(b => item.name.includes(b));
      if (!brandName) brandName = brands[Math.floor(Math.random() * brands.length)];
      
      const [brandRows] = await connection.query('SELECT id FROM brands WHERE name = ?', [brandName]);
      const brandId = brandRows[0].id;

      let image = '/images/snacks.png'; 
      let weight = '100 g';
      let mrp = Math.floor(Math.random() * 50) + 10; 

      if (item.sub === 'Choc') {
        weight = '50 g';
        mrp = Math.floor(Math.random() * 100) + 20;
      } else if (item.sub === 'Chip') {
        weight = '90 g';
        mrp = Math.floor(Math.random() * 30) + 10;
      } else if (item.sub === 'Sweet') {
        weight = '250 g';
        mrp = Math.floor(Math.random() * 150) + 50;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7));

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [8, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Snacks & Biscuits!`);
  } catch (err) {
    console.error('Error seeding category 8:', err);
  } finally {
    await connection.end();
  }
}

seed();
