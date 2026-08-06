const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const items = [
  // Tea - Regular
  { name: 'Tata Tea Gold', sub: 'Tea' },
  { name: 'Tata Tea Premium', sub: 'Tea' },
  { name: 'Tata Agni Tea', sub: 'Tea' },
  { name: 'Tata Chakra Gold', sub: 'Tea' },
  { name: 'Red Label Tea', sub: 'Tea' },
  { name: 'Taj Mahal Tea', sub: 'Tea' },
  { name: 'Society Tea', sub: 'Tea' },
  { name: 'Wagh Bakri Tea', sub: 'Tea' },
  { name: 'Brooke Bond 3 Roses', sub: 'Tea' },
  { name: 'AVT Tea', sub: 'Tea' },
  { name: 'Girnar Tea', sub: 'Tea' },
  { name: 'Local Tea Powder', sub: 'Tea' },
  
  // Green Tea
  { name: 'Lipton Green Tea', sub: 'Tea' },
  { name: 'Tetley Green Tea', sub: 'Tea' },
  { name: 'Girnar Green Tea', sub: 'Tea' },
  { name: 'Organic Green Tea', sub: 'Tea' },
  { name: 'Lemon Green Tea', sub: 'Tea' },
  { name: 'Honey Green Tea', sub: 'Tea' },
  { name: 'Tulsi Green Tea', sub: 'Tea' },

  // Herbal Tea
  { name: 'Tulsi Tea', sub: 'Tea' },
  { name: 'Ginger Tea', sub: 'Tea' },
  { name: 'Lemon Tea', sub: 'Tea' },
  { name: 'Masala Tea', sub: 'Tea' },
  { name: 'Cardamom Tea', sub: 'Tea' },
  { name: 'Chamomile Tea', sub: 'Tea' },
  { name: 'Hibiscus Tea', sub: 'Tea' },

  // Coffee - Instant
  { name: 'Bru Instant Coffee', sub: 'Coffee' },
  { name: 'Bru Gold', sub: 'Coffee' },
  { name: 'Nescafe Classic', sub: 'Coffee' },
  { name: 'Nescafe Gold', sub: 'Coffee' },
  { name: 'Continental Coffee', sub: 'Coffee' },

  // Coffee - Filter & Beans
  { name: 'Cothas Filter Coffee', sub: 'Coffee' },
  { name: "Narasu's Coffee", sub: 'Coffee' },
  { name: 'Continental Filter Coffee', sub: 'Coffee' },
  { name: 'Leo Coffee', sub: 'Coffee' },
  { name: 'Fresh Filter Coffee Powder', sub: 'Coffee' },
  { name: 'Arabica Coffee Beans', sub: 'Coffee' },
  { name: 'Robusta Coffee Beans', sub: 'Coffee' },
  { name: 'Coffee Powder', sub: 'Coffee' },
  { name: 'Chicory Blend', sub: 'Coffee' },

  // Health & Nutrition Drinks
  { name: 'Horlicks Classic', sub: 'Health' },
  { name: 'Horlicks Chocolate', sub: 'Health' },
  { name: "Women's Horlicks", sub: 'Health' },
  { name: 'Junior Horlicks', sub: 'Health' },
  { name: "Mother's Horlicks", sub: 'Health' },
  { name: 'Boost', sub: 'Health' },
  { name: 'Boost Chocolate', sub: 'Health' },
  { name: 'Bournvita', sub: 'Health' },
  { name: 'Complan', sub: 'Health' },
  { name: 'Pediasure', sub: 'Health' },
  { name: 'Protinex', sub: 'Health' },
  { name: 'Maltova', sub: 'Health' },
  { name: 'Milo', sub: 'Health' },
  { name: 'Junior Horlicks Stage 1', sub: 'Health' },
  { name: 'Junior Horlicks Stage 2', sub: 'Health' },
  { name: 'Ensure Nutrition Drink', sub: 'Health' },
  { name: 'Resource High Protein', sub: 'Health' },

  // Soft Drinks
  { name: 'Coca-Cola 250 ml', sub: 'Soft' },
  { name: 'Coca-Cola 750 ml', sub: 'Soft' },
  { name: 'Coca-Cola 1.25 L', sub: 'Soft' },
  { name: 'Coca-Cola 2 L', sub: 'Soft' },
  { name: 'Pepsi 250 ml', sub: 'Soft' },
  { name: 'Pepsi 750 ml', sub: 'Soft' },
  { name: 'Pepsi 2 L', sub: 'Soft' },
  { name: 'Sprite 250 ml', sub: 'Soft' },
  { name: 'Sprite 750 ml', sub: 'Soft' },
  { name: 'Sprite 2 L', sub: 'Soft' },
  { name: 'Thums Up 250 ml', sub: 'Soft' },
  { name: 'Thums Up 750 ml', sub: 'Soft' },
  { name: 'Thums Up 2 L', sub: 'Soft' },
  { name: 'Fanta Orange', sub: 'Soft' },
  { name: 'Fanta Apple', sub: 'Soft' },
  { name: 'Limca 250 ml', sub: 'Soft' },
  { name: 'Limca 750 ml', sub: 'Soft' },
  { name: 'Mountain Dew', sub: 'Soft' },

  // Fruit Juices
  { name: 'Real Mixed Fruit', sub: 'Juice' },
  { name: 'Real Mango', sub: 'Juice' },
  { name: 'Real Orange', sub: 'Juice' },
  { name: 'Real Apple', sub: 'Juice' },
  { name: 'Real Litchi', sub: 'Juice' },
  { name: 'Real Guava', sub: 'Juice' },
  { name: 'Real Cranberry', sub: 'Juice' },
  { name: 'Tropicana Orange', sub: 'Juice' },
  { name: 'Tropicana Apple', sub: 'Juice' },
  { name: 'Tropicana Mixed Fruit', sub: 'Juice' },
  { name: 'Tropicana Guava', sub: 'Juice' },
  { name: 'Minute Maid Pulpy Orange', sub: 'Juice' },
  { name: 'Minute Maid Apple', sub: 'Juice' },
  { name: 'Minute Maid Mango', sub: 'Juice' },
  { name: 'Appy Fizz', sub: 'Juice' },
  { name: 'Appy Classic', sub: 'Juice' },

  // Coconut Water
  { name: 'Tender Coconut Water', sub: 'Juice' },
  { name: 'Paper Boat Coconut Water', sub: 'Juice' },
  { name: 'Raw Pressery Coconut Water', sub: 'Juice' },

  // Packaged Drinking Water
  { name: 'Bisleri', sub: 'Water' },
  { name: 'Kinley', sub: 'Water' },
  { name: 'Aquafina', sub: 'Water' },
  { name: 'Bailley', sub: 'Water' },
  { name: 'Local Mineral Water', sub: 'Water' },

  // Energy & Sports Drinks
  { name: 'Red Bull', sub: 'Drink' },
  { name: 'Sting', sub: 'Drink' },
  { name: 'Monster Energy', sub: 'Drink' },
  { name: 'Tzinga', sub: 'Drink' },
  { name: 'Gatorade Orange', sub: 'Drink' },
  { name: 'Gatorade Blue Bolt', sub: 'Drink' },
  { name: 'Enerzal', sub: 'Drink' },
  { name: 'ORS Drink', sub: 'Drink' },

  // Flavoured Milk Drinks
  { name: 'Amul Kool', sub: 'Drink' },
  { name: 'Heritage Flavoured Milk', sub: 'Drink' },
  { name: 'Dodla Flavoured Milk', sub: 'Drink' },
  { name: 'Chocolate Milk', sub: 'Drink' },
  { name: 'Badam Milk', sub: 'Drink' },
  { name: 'Rose Milk', sub: 'Drink' },

  // Squash & Syrups
  { name: 'Rasna', sub: 'Syrup' },
  { name: 'Rooh Afza', sub: 'Syrup' },
  { name: 'Mapro Squash', sub: 'Syrup' },
  { name: 'Kissan Squash', sub: 'Syrup' },
  { name: 'Mango Syrup', sub: 'Syrup' },
  { name: 'Orange Syrup', sub: 'Syrup' },
  { name: 'Jaljeera', sub: 'Syrup' },
  { name: 'Aam Panna', sub: 'Syrup' },
  { name: 'Nannari Syrup', sub: 'Syrup' },
  { name: 'Bel Sharbat', sub: 'Syrup' },
  { name: 'Sugarcane Juice (Seasonal)', sub: 'Syrup' },
  { name: 'Lemon Juice Mix', sub: 'Syrup' },

  // Milkshake Mixes
  { name: 'Vanilla Milkshake Mix', sub: 'Mix' },
  { name: 'Chocolate Milkshake Mix', sub: 'Mix' },
  { name: 'Strawberry Milkshake Mix', sub: 'Mix' },
  { name: 'Mango Milkshake Mix', sub: 'Mix' },

  // Soda & Mixers
  { name: 'Club Soda', sub: 'Soft' },
  { name: 'Plain Soda', sub: 'Soft' },
  { name: 'Ginger Ale', sub: 'Soft' },
  { name: 'Tonic Water', sub: 'Soft' },
];

const brands = [
  'Tata', 'Brooke Bond', 'Society', 'Wagh Bakri', 'Girnar', 'Bru', 'Nescafe', 'Continental', 'Cothas', "Narasu's", 'Coca-Cola', 'Pepsi', 'Sprite', 'Thums Up', 'Fanta', 'Limca', 'Real', 'Tropicana', 'Minute Maid', 'Appy', 'Bisleri', 'Kinley', 'Aquafina', 'Bailley', 'Local'
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
    // Category ID 10 = Tea, Coffee & Beverages
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (10, 'Tea, Coffee & Beverages', 'CupSoda')");

    for (const b of brands) {
      await connection.query('INSERT IGNORE INTO brands (name) VALUES (?)', [b]);
    }

    let count = 0;
    for (const item of items) {
      let brandName = brands.find(b => item.name.includes(b));
      if (!brandName) brandName = brands[Math.floor(Math.random() * brands.length)];
      
      const [brandRows] = await connection.query('SELECT id FROM brands WHERE name = ?', [brandName]);
      const brandId = brandRows[0].id;

      let image = '/images/beverage.png'; 
      let weight = '250 g';
      let mrp = Math.floor(Math.random() * 200) + 50; 

      if (item.sub === 'Soft' || item.sub === 'Juice' || item.sub === 'Drink' || item.sub === 'Water') {
        weight = '1 L';
        mrp = Math.floor(Math.random() * 80) + 20;
        if (item.name.includes('250 ml') || item.name.includes('Water')) mrp = 20;
      } else if (item.sub === 'Coffee') {
        weight = '100 g';
        mrp = Math.floor(Math.random() * 300) + 150;
      } else if (item.sub === 'Tea') {
        weight = '250 g';
        mrp = Math.floor(Math.random() * 150) + 50;
      }

      let selling = Math.floor(mrp * (Math.random() * 0.2 + 0.7));

      const [result] = await connection.query(`
        INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [10, brandId, item.name, weight, mrp, selling, 100]);
      
      await connection.query(`
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES (?, ?, TRUE)
      `, [result.insertId, image]);
      
      count++;
    }

    console.log(`Successfully seeded ${count} Beverages!`);
  } catch (err) {
    console.error('Error seeding category 10:', err);
  } finally {
    await connection.end();
  }
}

seed();
