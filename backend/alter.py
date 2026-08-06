import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
db = mysql.connector.connect(
    host=os.getenv('DB_HOST','localhost'),
    user=os.getenv('DB_USER','root'),
    password=os.getenv('DB_PASSWORD',''),
    database=os.getenv('DB_NAME','need2done')
)
cur = db.cursor()
cur.execute("ALTER TABLE order_timeline MODIFY COLUMN triggered_by ENUM('SYSTEM','ADMIN','HELPER','CUSTOMER','VENDOR') NOT NULL")
db.commit()
print('ALTER SUCCESS')
