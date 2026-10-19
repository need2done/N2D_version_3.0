/**
 * Need2Done (N2D) — Database Migration v7
 * Creates tables for Helper & Vendor Registration System:
 * - registration_applications
 * - application_documents
 * - application_status_history
 * - application_notes
 * - email_notification_logs
 */

const path = require('path');
require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../.env') });
const db = require('../backend/config/db');

async function migrate() {
    console.log('🔄 Running migration_v7_applications...');

    try {
        console.log('📦 Connected to MySQL database:', process.env.DB_NAME || 'N2D');

        // 1. registration_applications
        await db.query(`
            CREATE TABLE IF NOT EXISTS registration_applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id VARCHAR(32) NOT NULL UNIQUE,
                type ENUM('HELPER', 'VENDOR') NOT NULL,
                status ENUM('SUBMITTED', 'PENDING_REVIEW', 'UNDER_VERIFICATION', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
                name VARCHAR(150) NOT NULL,
                owner_name VARCHAR(150) NULL,
                phone VARCHAR(20) NOT NULL,
                whatsapp_number VARCHAR(20) NULL,
                email VARCHAR(150) NOT NULL,
                dob DATE NULL,
                gender VARCHAR(20) NULL,
                address TEXT NOT NULL,
                village_town VARCHAR(100) NULL,
                mandal VARCHAR(100) NULL,
                district VARCHAR(100) NULL,
                state VARCHAR(100) DEFAULT 'Telangana',
                pincode VARCHAR(10) NOT NULL,
                emergency_contact VARCHAR(20) NULL,
                service_category VARCHAR(100) NOT NULL,
                vehicle_type VARCHAR(50) NULL,
                vehicle_reg_number VARCHAR(50) NULL,
                vehicle_make_model VARCHAR(100) NULL,
                vehicle_year INT NULL,
                driving_experience_years INT NULL,
                driving_license_number VARCHAR(50) NULL,
                preferred_area VARCHAR(150) NULL,
                availability_type VARCHAR(50) NULL,
                preferred_hours VARCHAR(100) NULL,
                bank_holder_name VARCHAR(150) NULL,
                bank_name VARCHAR(100) NULL,
                bank_account_number_encrypted TEXT NULL,
                bank_account_last4 VARCHAR(8) NULL,
                ifsc_code VARCHAR(20) NULL,
                upi_id VARCHAR(100) NULL,
                business_name VARCHAR(150) NULL,
                business_category VARCHAR(100) NULL,
                products_offered TEXT NULL,
                operating_hours VARCHAR(100) NULL,
                years_in_business INT NULL,
                business_description TEXT NULL,
                gst_number VARCHAR(30) NULL,
                eligibility_declarations JSON NULL,
                assigned_reviewer VARCHAR(100) NULL,
                rejection_reason TEXT NULL,
                additional_info_request TEXT NULL,
                decision_timestamp DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_app_type_status (type, status),
                INDEX idx_app_phone (phone),
                INDEX idx_app_email (email),
                INDEX idx_app_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table registration_applications created or already exists.');

        // 2. application_documents
        await db.query(`
            CREATE TABLE IF NOT EXISTS application_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id VARCHAR(32) NOT NULL,
                doc_type VARCHAR(50) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INT NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_doc_app_id (application_id),
                CONSTRAINT fk_docs_application
                    FOREIGN KEY (application_id) REFERENCES registration_applications (application_id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table application_documents created or already exists.');

        // 3. application_status_history
        await db.query(`
            CREATE TABLE IF NOT EXISTS application_status_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id VARCHAR(32) NOT NULL,
                from_status VARCHAR(50) NULL,
                to_status VARCHAR(50) NOT NULL,
                changed_by VARCHAR(100) NOT NULL,
                notes TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_history_app_id (application_id),
                CONSTRAINT fk_history_application
                    FOREIGN KEY (application_id) REFERENCES registration_applications (application_id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table application_status_history created or already exists.');

        // 4. application_notes
        await db.query(`
            CREATE TABLE IF NOT EXISTS application_notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id VARCHAR(32) NOT NULL,
                author VARCHAR(100) NOT NULL,
                note TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_notes_app_id (application_id),
                CONSTRAINT fk_notes_application
                    FOREIGN KEY (application_id) REFERENCES registration_applications (application_id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table application_notes created or already exists.');

        // 5. email_notification_logs
        await db.query(`
            CREATE TABLE IF NOT EXISTS email_notification_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id VARCHAR(32) NOT NULL,
                recipient_email VARCHAR(150) NOT NULL,
                recipient_role ENUM('APPLICANT', 'ADMIN') NOT NULL,
                email_type VARCHAR(50) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                status ENUM('SENT', 'QUEUED', 'FAILED') DEFAULT 'QUEUED',
                retry_count INT DEFAULT 0,
                last_error TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                sent_at DATETIME NULL,
                INDEX idx_email_app_id (application_id),
                INDEX idx_email_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Table email_notification_logs created or already exists.');

        console.log('🎉 Migration v7 completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
