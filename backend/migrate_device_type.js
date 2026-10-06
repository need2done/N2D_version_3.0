require('dotenv').config();
const db = require('./config/db');

async function run() {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM helpers LIKE 'device_type'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE helpers ADD COLUMN device_type VARCHAR(20) DEFAULT 'SMARTPHONE'");
      console.log('Successfully added device_type column to helpers table');
    } else {
      console.log('device_type column already exists in helpers table');
    }

    // Also ensure cash_settled / offline payout column or table if needed
    const [ordersCols] = await db.query("SHOW COLUMNS FROM orders LIKE 'payout_settled'");
    if (ordersCols.length === 0) {
      await db.query("ALTER TABLE orders ADD COLUMN payout_settled TINYINT DEFAULT 0");
      console.log('Successfully added payout_settled column to orders table');
    }

    const [ordersPayoutMethod] = await db.query("SHOW COLUMNS FROM orders LIKE 'payout_method'");
    if (ordersPayoutMethod.length === 0) {
      await db.query("ALTER TABLE orders ADD COLUMN payout_method VARCHAR(20) DEFAULT NULL");
      console.log('Successfully added payout_method column to orders table');
    }

    // Expand orders.status ENUM to ensure HELPER_ASSIGNED, ARRIVED, END_OTP_REQUESTED are valid
    await db.query(`
      ALTER TABLE orders MODIFY COLUMN status ENUM(
        'DRAFT',
        'CONFIRMED',
        'WAITING_FOR_CART',
        'PENDING',
        'HELPER_ACCEPTED',
        'HELPER_ASSIGNED',
        'ARRIVED_AT_STORE',
        'BILL_IMAGE_UPLOADED',
        'BILL_PENDING_ONLINE_PAYMENT',
        'ADMIN_APPROVED_BILL',
        'ARRIVED_AT_CUSTOMER',
        'ITEMS_PICKED_UP',
        'HELPER_ARRIVED',
        'ARRIVED',
        'ITEM_PHOTO_UPLOADED',
        'ADMIN_VERIFY_ITEMS',
        'PAYMENT_GENERATED',
        'PAID',
        'OTP_SUBMITTED',
        'RIDE_STARTED',
        'SERVICE_STARTED',
        'END_OTP_REQUESTED',
        'COMPLETED',
        'CANCELLED',
        'ASSIGNED',
        'PLACED',
        'PACKED',
        'BILL_SENT'
      ) DEFAULT 'DRAFT'
    `);
    // Ensure helpers.category can store 'HOME_SERVICES' without truncation
    await db.query(`ALTER TABLE helpers MODIFY COLUMN category VARCHAR(50) DEFAULT 'TASK'`);
    console.log('Successfully updated helpers category column to VARCHAR(50)');

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
