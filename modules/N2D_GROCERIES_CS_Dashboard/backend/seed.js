const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function runSeed() {
  console.log('Connecting to MySQL...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    console.log('Creating database if not exists...');
    await connection.query('CREATE DATABASE IF NOT EXISTS need2done_grocery;');
    await connection.query('USE need2done_grocery;');

    console.log('Running init.sql...');
    const initSqlPath = path.join(__dirname, 'database', 'init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    // Execute the init script (multiple statements)
    await connection.query(initSql);
    console.log('Schema created successfully.');

    // Seed Categories
    console.log('Seeding categories...');
    await connection.query("INSERT IGNORE INTO categories (id, name, icon) VALUES (1, 'Dairy, Bread & Eggs', 'Milk')");

    // We will extract data from the frontend products file to seed it.
    // It's easier to just read the JSON structure directly since it's exported as a JS module, 
    // but Node can't easily require an ES module from outside without setup.
    // I will just use the python script I created earlier to get the data, or just use the generated products.js.
    // Let's read products.js using regex.
    const productsJsPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'products.js');
    const productsStr = fs.readFileSync(productsJsPath, 'utf8');
    
    // Extract JSON array from export const productsData = [...]
    const arrayMatch = productsStr.match(/export const productsData = (\[[\s\S]*?\]);/);
    if (arrayMatch && arrayMatch[1]) {
      // Evaluate the string into a JS object
      // We need to use eval safely or new Function
      const productsData = new Function(`return ${arrayMatch[1]}`)();
      
      console.log(`Found ${productsData.length} products to seed.`);
      
      // Seed Brands
      const brands = [...new Set(productsData.map(p => p.name.split(' ')[0]))];
      const brandIdMap = {};
      for (const brand of brands) {
        const [brandResult] = await connection.query('INSERT INTO brands (name) VALUES (?)', [brand]);
        brandIdMap[brand] = brandResult.insertId;
      }
      
      // Seed Products
      for (const p of productsData) {
        const brandName = p.name.split(' ')[0];
        const brandId = brandIdMap[brandName];
        
        const [result] = await connection.query(`
          INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [1, brandId, p.name, p.weight || '1 unit', p.mrp || 0, p.selling_price || 0, 100]);
        
        // Insert product image
        if (p.image) {
          await connection.query(`
            INSERT INTO product_images (product_id, image_url, is_primary) 
            VALUES (?, ?, TRUE)
          `, [result.insertId, p.image]);
        }
      }
      console.log('Successfully seeded database with frontend data!');
    } else {
      console.log('Could not parse products from products.js');
    }
    
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await connection.end();
  }
}

runSeed();
