import sys
sys.path.append('.')
from db.mysql_conn import get_db

db = get_db()
cur = db.cursor()

# Get helper phone
cur.execute("SELECT helper_id FROM orders WHERE order_id='N2D_HS_33101'")
row = cur.fetchone()
helper_id = row[0]

cur.execute("SELECT phone FROM helpers WHERE id=%s", (helper_id,))
helper_row = cur.fetchone()
helper_phone = helper_row[0]

# Update order
cur.execute("UPDATE orders SET payment_status='PENDING', helper_phone=%s WHERE order_id='N2D_HS_33101'", (helper_phone,))
db.commit()

print("DB Fixed!")
