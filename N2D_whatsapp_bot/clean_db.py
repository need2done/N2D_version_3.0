from db.mysql_conn import get_db

def main():
    db = get_db()
    cur = db.cursor()
    cur.execute("UPDATE orders SET status = 'ADMIN_APPROVED_BILL' WHERE order_id = 'N2DCW_5458'")
    db.commit()
    print("✅ Updated order N2DCW_5458 status to ADMIN_APPROVED_BILL:", cur.rowcount)
    cur.close()
    db.close()

if __name__ == "__main__":
    main()
