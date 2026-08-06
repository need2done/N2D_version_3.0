const db = require('./src/config/db');

async function testConnection() {
  try {
    const [rows] = await db.query('SELECT 1');
    console.log('Database connected successfully');
    process.exit(0);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
