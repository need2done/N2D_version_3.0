from db.mysql_conn import get_db

def main():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        UPDATE orders 
        SET vendor_status = 'CANCELLED' 
        WHERE status IN ('CANCELLED', 'COMPLETED', 'EXPIRED', 'DELIVERED', 'REJECTED') 
          AND vendor_status = 'PENDING'
    """)
    db.commit()
    print(f"✅ Cleaned stale vendor statuses: {cur.rowcount} rows updated.")
    cur.close()
    db.close()

if __name__ == "__main__":
    main()
