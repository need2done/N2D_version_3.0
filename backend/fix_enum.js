require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function fixEnum() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'need2done_db'
    });

    try {
        console.log("Fixing ENUM...");
        const [rows] = await connection.query(`SHOW COLUMNS FROM orders WHERE Field = 'status'`);
        console.log("Current ENUM:", rows[0].Type);

        await connection.query(`ALTER TABLE orders MODIFY status ENUM('DRAFT', 'CONFIRMED', 'WAITING_FOR_CART', 'PENDING', 'HELPER_ACCEPTED', 'BILL_IMAGE_UPLOADED', 'ADMIN_APPROVED_BILL', 'HELPER_ARRIVED', 'ITEM_PHOTO_UPLOADED', 'ADMIN_VERIFY_ITEMS', 'PAYMENT_GENERATED', 'PAID', 'OTP_SUBMITTED', 'RIDE_STARTED', 'COMPLETED', 'CANCELLED', 'ASSIGNED') DEFAULT 'DRAFT'`);
        console.log("Altered successfully.");
        
        const [newRows] = await connection.query(`SHOW COLUMNS FROM orders WHERE Field = 'status'`);
        console.log("New ENUM:", newRows[0].Type);

        // Also fix vendor_status enum just in case
        await connection.query(`ALTER TABLE orders MODIFY vendor_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'PACKED', 'UNASSIGNED') DEFAULT 'UNASSIGNED'`);
        console.log("vendor_status altered successfully.");
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

fixEnum();
