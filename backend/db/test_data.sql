-- ============================================================
-- Need2Done (N2D) TEST DATA
-- Create a customer and an active order to test tracking
-- ============================================================

USE N2D;

-- 1. Create a customer if none exists
INSERT IGNORE INTO customers (id, phone, name)
VALUES (1, '919999999999', 'Test Customer');

-- 2. Create an active order for Helper #1 (KUMAR)
-- helper_id 1 is 'BNGGO-001'
INSERT INTO orders (
  order_id, 
  customer_id, 
  customer_number, 
  customer_name, 
  service, 
  status, 
  helper_id, 
  helper_phone,
  assigned_at,
  bill_amount
) VALUES (
  'N2D-TEST-001',
  1,
  '919999999999',
  'Test Customer',
  'Grocery Pickup',
  'HELPER_ACCEPTED',
  1,
  '917702635741',
  NOW(),
  150.00
);

-- 3. Add to timeline
INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by)
SELECT id, 'TEST_DATA', 'Order created for verification', 'SYSTEM'
FROM orders WHERE order_id = 'N2D-TEST-001';
