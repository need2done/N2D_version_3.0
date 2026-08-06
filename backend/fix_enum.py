import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

db = mysql.connector.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASS', ''),
    database=os.getenv('DB_NAME', 'need2done_db')
)

cursor = db.cursor(dictionary=True)
cursor.execute("SHOW COLUMNS FROM orders WHERE Field = 'status'")
print(cursor.fetchone())
cursor.execute("ALTER TABLE orders MODIFY status ENUM('DRAFT', 'WAITING_FOR_CART', 'PENDING', 'HELPER_ACCEPTED', 'BILL_IMAGE_UPLOADED', 'ADMIN_APPROVED_BILL', 'HELPER_ARRIVED', 'ITEM_PHOTO_UPLOADED', 'ADMIN_VERIFY_ITEMS', 'PAYMENT_GENERATED', 'PAID', 'OTP_SUBMITTED', 'RIDE_STARTED', 'COMPLETED', 'CANCELLED', 'ASSIGNED') DEFAULT 'DRAFT'")
print("ALTERED")
cursor.execute("SHOW COLUMNS FROM orders WHERE Field = 'status'")
print(cursor.fetchone())

db.commit()
cursor.close()
db.close()
