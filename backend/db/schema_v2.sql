-- ============================================================
-- Need2Done (N2D) FINAL MASTER DATABASE SCHEMA
-- Consolidated & Cleaned for Production
-- ============================================================

DROP DATABASE IF EXISTS gramiogooo;
DROP DATABASE IF EXISTS n2d;
CREATE DATABASE N2D CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE N2D;

-- ============================================================
-- ADMINS
-- ============================================================
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- HELPERS
-- ============================================================
CREATE TABLE helpers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  helper_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(100) DEFAULT 'ggo123',
  status ENUM('ONLINE','OFFLINE','BUSY') DEFAULT 'OFFLINE',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- HELPER STATUS (LIVE AVAILABILITY)
-- ============================================================
CREATE TABLE helper_status (
    helper_id INT NOT NULL,
    status ENUM('AVAILABLE','UNAVAILABLE') DEFAULT 'UNAVAILABLE',
    latitude DOUBLE NULL,
    longitude DOUBLE NULL,
    last_login DATETIME NULL,
    last_seen DATETIME NULL,
    PRIMARY KEY (helper_id),
    FOREIGN KEY (helper_id) REFERENCES helpers(id) ON DELETE CASCADE,
    INDEX idx_last_seen (last_seen)
);

-- ============================================================
-- ORDERS (CORE)
-- ============================================================
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(30) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  customer_number VARCHAR(20),
  customer_name VARCHAR(100),
  customer_lat DECIMAL(10,8) NULL,
  customer_lng DECIMAL(11,8) NULL,
  service VARCHAR(50),
  payload JSON,
  status ENUM(
    'CONFIRMED',
    'HELPER_ACCEPTED',
    'BILL_IMAGE_UPLOADED',
    'ADMIN_APPROVED_BILL',
    'HELPER_ARRIVED',
    'ITEM_PHOTO_UPLOADED',
    'PAYMENT_GENERATED',
    'PAID',
    'OTP_SUBMITTED',
    'COMPLETED',
    'CANCELLED'
  ) DEFAULT 'CONFIRMED',

  helper_id INT NULL,
  helper_phone VARCHAR(20),
  assigned_at TIMESTAMP NULL,

  bill_amount DECIMAL(10,2),
  helper_charge DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  approved_at DATETIME NULL,

  payment_method ENUM('UPI','COD'),
  payment_status ENUM('PENDING','PAID') DEFAULT 'PENDING',

  delivery_otp VARCHAR(10),
  otp VARCHAR(10),
  otp_created_at TIMESTAMP NULL,

  tracking_status ENUM('NOT_STARTED','STARTED','LIVE','COMPLETED') DEFAULT 'NOT_STARTED',
  tracking_summary JSON,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,

  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (helper_id) REFERENCES helpers(id),

  INDEX idx_order_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_updated_at (updated_at)
);

-- ============================================================
-- HELPER LIVE TRACKING (NODE SERVICE)
-- ============================================================
CREATE TABLE helper_live_tracking (
    helper_id INT NOT NULL,
    order_id INT NOT NULL,
    lat DOUBLE,
    lng DOUBLE,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (helper_id, order_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (helper_id) REFERENCES helpers(id) ON DELETE CASCADE,
    INDEX idx_order (order_id)
);

-- ============================================================
-- HELPER LOCATION HISTORY (PATH REPLAY)
-- ============================================================
CREATE TABLE helper_location_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  helper_id INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (helper_id) REFERENCES helpers(id),
  INDEX idx_hist_order (order_id),
  INDEX idx_helper_time (helper_id, recorded_at)
);

-- ============================================================
-- ORDER TIMELINE (AUDIT)
-- ============================================================
CREATE TABLE order_timeline (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_text TEXT NOT NULL,
  triggered_by ENUM('SYSTEM','ADMIN','HELPER','CUSTOMER') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_event (event_type)
);

-- ============================================================
-- TRACKING TOKENS (CUSTOMER VIEW)
-- ============================================================
CREATE TABLE order_tracking_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  role ENUM('CUSTOMER','ADMIN') NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_order (order_id)
);

-- ============================================================
-- ORDER IMAGES
-- ============================================================
CREATE TABLE order_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  image_type ENUM('BILL','ITEM','DELIVERY_CONFIRM'),
  image_url TEXT,
  media_id VARCHAR(100),
  uploaded_by ENUM('HELPER','ADMIN','CUSTOMER'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  item_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ============================================================
-- SEED DATA
-- ============================================================
-- Default Admin: admin / ggo123
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2b$12$KFS9l.sMrkmnQmOkJUNz6e7DnOwB3hIlXKNMkOYhO0uKUblYqTml6');

-- Test Helpers
INSERT INTO helpers (helper_code, name, phone, active)
VALUES
  ('BNGGO-001', 'KUMAR', '917702635741', 1),
  ('BNGGO-002', 'CHARY', '917095849056', 1);

-- Initialize helper status for seeded helpers
INSERT INTO helper_status (helper_id, status)
SELECT id, 'UNAVAILABLE' FROM helpers;

CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    address TEXT,
    auto_assign TINYINT(1) DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Active',
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
