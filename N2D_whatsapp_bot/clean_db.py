import re
from db.mysql_conn import get_db

def main():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT id, phone FROM helpers")
    rows = cur.fetchall()
    count = 0
    for r in rows:
        raw = r["phone"] or ""
        digits = re.sub(r'\D', '', raw)
        if len(digits) == 10:
            digits = '91' + digits
        if digits != raw:
            cur.execute("UPDATE helpers SET phone = %s WHERE id = %s", (digits, r["id"]))
            count += 1
    db.commit()
    print(f"✅ Cleaned {count} helper phone numbers in database.")
    cur.close()
    db.close()

if __name__ == "__main__":
    main()
