import sys
sys.path.append('.')
from db.mysql_conn import get_db
db = get_db()
cur = db.cursor(dictionary=True)
cur.execute("SELECT * FROM orders WHERE order_id='N2D_HS_33101'")
print(cur.fetchone())
