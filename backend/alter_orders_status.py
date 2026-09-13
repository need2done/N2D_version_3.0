import sys
import os
import mysql.connector

# Connect to database using env vars
db_host = os.getenv("DB_HOST", "localhost")
db_user = os.getenv("DB_USER", "n2d_user")
db_pass = os.getenv("DB_PASSWORD", "N2DB@2026")
db_name = os.getenv("DB_NAME", "N2D")

db = mysql.connector.connect(
    host=db_host,
    user=db_user,
    password=db_pass,
    database=db_name
)

cur = db.cursor()

print("Altering status ENUM column in orders table...")
cur.execute("""
    ALTER TABLE orders MODIFY COLUMN status ENUM(
        'DRAFT',
        'CONFIRMED',
        'WAITING_FOR_CART',
        'PENDING',
        'HELPER_ACCEPTED',
        'ARRIVED_AT_STORE',
        'BILL_IMAGE_UPLOADED',
        'BILL_PENDING_ONLINE_PAYMENT',
        'ADMIN_APPROVED_BILL',
        'ARRIVED_AT_CUSTOMER',
        'ITEMS_PICKED_UP',
        'HELPER_ARRIVED',
        'ITEM_PHOTO_UPLOADED',
        'ADMIN_VERIFY_ITEMS',
        'PAYMENT_GENERATED',
        'PAID',
        'OTP_SUBMITTED',
        'RIDE_STARTED',
        'SERVICE_STARTED',
        'COMPLETED',
        'CANCELLED',
        'ASSIGNED',
        'PLACED',
        'PACKED',
        'BILL_SENT'
    ) DEFAULT 'DRAFT'
""")
db.commit()
print("✅ ALTER TABLE orders status ENUM succeeded!")

cur.execute("DESCRIBE orders status")
print(cur.fetchall())
cur.close()
db.close()
