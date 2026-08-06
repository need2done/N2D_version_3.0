const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('./config/db');

// Brands Mapping
const BRANDS = ['Bravo', 'God Morgon', 'Tropicana', 'Arla', 'Garant', 'Oatly', 'Alpro', 'Valio', 'Yoggi'];

function getTitleCase(str) {
    return str.split('-').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

async function run() {
    console.log('Starting GroceryStoreDataset importer...');

    // 1. Ensure description column exists in products table
    try {
        console.log('Checking database table structure...');
        const [columns] = await db.query('SHOW COLUMNS FROM products');
        const hasDesc = columns.some(col => col.Field === 'description');
        if (!hasDesc) {
            console.log('Adding description column to products table...');
            await db.query('ALTER TABLE products ADD COLUMN description TEXT NULL');
        }
    } catch (err) {
        console.error('Error checking/adding description column:', err);
    }

    // Paths
    const datasetRoot = path.resolve(__dirname, '../temp_dataset/dataset');
    const classesCsvPath = path.resolve(datasetRoot, 'classes.csv');
    const assetsDir = path.resolve(__dirname, '../website/assets/grocery_dataset');

    // Ensure assets directory exists
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    if (!fs.existsSync(classesCsvPath)) {
        console.error(`classes.csv not found at ${classesCsvPath}. Please run git clone first.`);
        process.exit(1);
    }

    const csvData = fs.readFileSync(classesCsvPath, 'utf8');
    const lines = csvData.split(/\r?\n/);

    console.log(`Found ${lines.length - 2} classes to process.`);

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Golden-Delicious,0,Apple,0,/iconic-images-and-descriptions/Fruit/Apple/Golden-Delicious/Golden-Delicious_Iconic.jpg,...
        const parts = line.split(',');
        if (parts.length < 6) continue;

        const className = parts[0].trim();
        const classId = parts[1].trim();
        const coarseClass = parts[2].trim();
        const coarseClassId = parts[3].trim();
        const iconicImgPathRelative = parts[4].trim();
        const descPathRelative = parts[5].trim();

        // 1. Category Mapping
        let category = 'General';
        if (iconicImgPathRelative.includes('/Fruit/')) {
            category = 'Fresh Fruits';
        } else if (iconicImgPathRelative.includes('/Vegetables/')) {
            category = 'Fresh Vegetables';
        } else if (iconicImgPathRelative.includes('/Packages/Juice/')) {
            category = 'Drinks';
        } else if (iconicImgPathRelative.includes('/Packages/Oat-Milk/')) {
            category = 'Drinks';
        } else if (iconicImgPathRelative.includes('/Packages/Soy-Milk/')) {
            category = 'Drinks';
        } else if (iconicImgPathRelative.includes('/Packages/Milk/')) {
            category = 'Dairy, Bread & Eggs';
        } else if (iconicImgPathRelative.includes('/Packages/Oatghurt/')) {
            category = 'Dairy, Bread & Eggs';
        } else if (iconicImgPathRelative.includes('/Packages/Sour-Cream/')) {
            category = 'Dairy, Bread & Eggs';
        } else if (iconicImgPathRelative.includes('/Packages/Sour-Milk/')) {
            category = 'Dairy, Bread & Eggs';
        } else if (iconicImgPathRelative.includes('/Packages/Soyghurt/')) {
            category = 'Dairy, Bread & Eggs';
        } else if (iconicImgPathRelative.includes('/Packages/Yoghurt/')) {
            category = 'Dairy, Bread & Eggs';
        }

        // 2. Brand & Name Extraction
        let brand = '';
        let cleanName = className;

        // Check if starts with a known brand prefix
        const matchedBrand = BRANDS.find(b => {
            const hyphenated = b.replace(' ', '-').toLowerCase();
            return className.toLowerCase().startsWith(hyphenated + '-');
        });

        if (matchedBrand) {
            brand = matchedBrand;
            const hyphenated = matchedBrand.replace(' ', '-').toLowerCase();
            cleanName = className.slice(hyphenated.length + 1);
        } else {
            if (category === 'Fresh Fruits' || category === 'Fresh Vegetables') {
                brand = 'Farm Fresh';
            } else {
                brand = 'Generic';
            }
        }

        let displayName = getTitleCase(cleanName);
        
        // Append coarse category name if not present
        if (category === 'Fresh Fruits' || category === 'Fresh Vegetables') {
            const coarseLower = coarseClass.toLowerCase();
            const displayLower = displayName.toLowerCase();
            if (!displayLower.includes(coarseLower)) {
                displayName = `${displayName} ${coarseClass}`;
            }
        }

        // 3. Price & MRP Mapping
        let price = 45.00;
        let mrp = 55.00;

        if (category === 'Drinks') {
            if (className.toLowerCase().includes('juice')) {
                price = 135.00; mrp = 150.00;
            } else {
                price = 160.00; mrp = 190.00; // Soy / Oat milk
            }
        } else if (category === 'Dairy, Bread & Eggs') {
            if (className.toLowerCase().includes('milk')) {
                price = 65.00; mrp = 75.00;
            } else {
                price = 90.00; mrp = 110.00; // Yoghurt etc
            }
        } else {
            // Veg / Fruits
            const nameLower = displayName.toLowerCase();
            if (nameLower.includes('apple')) {
                price = 180.00; mrp = 210.00;
            } else if (nameLower.includes('avocado')) {
                price = 99.00; mrp = 120.00;
            } else if (nameLower.includes('banana')) {
                price = 50.00; mrp = 60.00;
            } else if (nameLower.includes('kiwi')) {
                price = 120.00; mrp = 140.00;
            } else if (nameLower.includes('mango')) {
                price = 150.00; mrp = 180.00;
            } else if (nameLower.includes('watermelon')) {
                price = 79.00; mrp = 99.00;
            } else if (nameLower.includes('pineapple')) {
                price = 89.00; mrp = 110.00;
            } else if (nameLower.includes('pomegranate')) {
                price = 140.00; mrp = 160.00;
            } else if (nameLower.includes('garlic')) {
                price = 60.00; mrp = 75.00;
            } else if (nameLower.includes('ginger')) {
                price = 50.00; mrp = 60.00;
            } else if (nameLower.includes('lemon')) {
                price = 30.00; mrp = 40.00;
            } else if (nameLower.includes('lime')) {
                price = 25.00; mrp = 30.00;
            } else if (nameLower.includes('potato')) {
                price = 40.00; mrp = 50.00;
            }
        }

        // 4. Unit Mapping
        let unit = '1 kg';
        const nameLower = displayName.toLowerCase();
        if (nameLower.includes('standard milk') || nameLower.includes('fat milk') || nameLower.includes('soy milk') || nameLower.includes('oat milk') || nameLower.includes('juice')) {
            unit = '1 L';
        } else if (nameLower.includes('yoghurt') || nameLower.includes('soyghurt') || nameLower.includes('oatghurt') || nameLower.includes('sour milk')) {
            unit = '500 g';
        } else if (nameLower.includes('sour cream')) {
            unit = '250 g';
        } else if (nameLower.includes('pineapple') || nameLower.includes('watermelon') || nameLower.includes('cabbage') || nameLower.includes('cantaloupe') || nameLower.includes('avocado')) {
            unit = '1 pc';
        } else if (nameLower.includes('lemon') || nameLower.includes('lime')) {
            unit = '4 pcs';
        } else if (nameLower.includes('garlic') || nameLower.includes('ginger') || nameLower.includes('mushroom')) {
            unit = '250 g';
        } else if (nameLower.includes('cucumber') || nameLower.includes('aubergine') || nameLower.includes('zucchini')) {
            unit = '500 g';
        } else if (nameLower.includes('asparagus')) {
            unit = '1 bunch';
        }

        // 5. Image copy
        const sourceImgPath = path.join(datasetRoot, iconicImgPathRelative);
        const imgExt = path.extname(sourceImgPath);
        const targetImgName = `${className}${imgExt}`;
        const targetImgPath = path.join(assetsDir, targetImgName);

        if (fs.existsSync(sourceImgPath)) {
            fs.copyFileSync(sourceImgPath, targetImgPath);
        } else {
            console.warn(`Source image not found: ${sourceImgPath}`);
        }

        const imageUrl = `/assets/grocery_dataset/${targetImgName}`;

        // 6. Description reading
        const sourceDescPath = path.join(datasetRoot, descPathRelative);
        let description = `Standard packaging. Sourced fresh and clean. Keep refrigerated.`;
        if (fs.existsSync(sourceDescPath)) {
            description = fs.readFileSync(sourceDescPath, 'utf8').trim();
        }

        // 7. DB Insert or Update
        try {
            const [existing] = await db.query('SELECT id FROM products WHERE name = ?', [displayName]);
            if (existing.length > 0) {
                // Update
                await db.query(
                    `UPDATE products 
                     SET category = ?, price = ?, unit = ?, brand = ?, mrp = ?, image_url = ?, description = ?
                     WHERE id = ?`,
                    [category, price, unit, brand, mrp, imageUrl, description, existing[0].id]
                );
            } else {
                // Insert
                await db.query(
                    `INSERT INTO products (name, category, price, unit, brand, mrp, image_url, description, stock, available) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [displayName, category, price, unit, brand, mrp, imageUrl, description, 100, 1]
                );
            }
            console.log(`Processed: [${category}] ${brand} - ${displayName} (₹${price})`);
        } catch (dbErr) {
            console.error(`DB error for ${displayName}:`, dbErr);
        }
    }

    console.log('GroceryStoreDataset import completed successfully!');
    process.exit(0);
}

run();
