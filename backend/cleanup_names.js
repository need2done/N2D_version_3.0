const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('./config/db');

async function run() {
    console.log('Cleaning up imported names...');
    try {
        const cleanups = [
            { old: 'Passion Fruit Passion-Fruit', new: 'Passion Fruit' },
            { old: 'Red Grapefruit Red-Grapefruit', new: 'Red Grapefruit' },
            { old: 'Red Beet Red-Beet', new: 'Red Beet' }
        ];

        for (const c of cleanups) {
            await db.query('UPDATE products SET name = ? WHERE name = ?', [c.new, c.old]);
            console.log(`Cleaned up: ${c.old} -> ${c.new}`);
        }
        console.log('Cleanup completed successfully!');
    } catch (err) {
        console.error('Error cleaning names:', err);
    }
    process.exit(0);
}

run();
