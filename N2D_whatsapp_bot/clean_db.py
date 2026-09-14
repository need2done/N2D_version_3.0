from db.mysql_conn import get_db

def main():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM orders WHERE order_id LIKE '%5458%'")
    orders = cur.fetchall()
    print("ORDER 5458 DETAILS:", orders)

    cur.execute("SELECT id, name, phone, status FROM helpers WHERE name LIKE '%ram%' OR phone LIKE '%6303455594%'")
    helpers = cur.fetchall()
    print("HELPERS DETAILS:", helpers)

    cur.close()
    db.close()

if __name__ == "__main__":
    main()
