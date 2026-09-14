from db.mysql_conn import get_db

def main():
    db = get_db()
    cur = db.cursor()
    cur.execute("UPDATE orders SET otp = '8662' WHERE order_id = 'N2DCW_5458'")
    db.commit()
    print("✅ Updated order N2DCW_5458 otp to 8662:", cur.rowcount)
    cur.close()
    db.close()

if __name__ == "__main__":
    main()
