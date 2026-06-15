"""
=================================================
GramioGO – Order Timeline Logger (FINAL SAFE)
=================================================

✔ Central audit logger
✔ Uses orders.id (INT)
✔ Crash-safe
✔ Rolls back on failure
✔ Safe for helper/admin/customer flows
"""

import traceback
from db.mysql_conn import get_db


def log_event(order_id: int, event_type: str, text: str, by: str):
    """
    Logs an event into order_timeline table.

    Args:
        order_id (int): orders.id (INT PRIMARY KEY)
        event_type (str): e.g. HELPER_ACCEPTED
        text (str): Description
        by (str): HELPER / ADMIN / CUSTOMER
    """

    if not isinstance(order_id, int):
        # Safety guard — prevents string order_code mistake
        print("⚠️ log_event skipped — order_id is not INT")
        return

    db = get_db()
    if not db:
        return

    cur = db.cursor()

    try:
        cur.execute(
            """
            INSERT INTO order_timeline
              (order_id, event_type, event_text, triggered_by)
            VALUES (%s, %s, %s, %s)
            """,
            (order_id, event_type, text, by)
        )

        db.commit()

    except Exception:
        traceback.print_exc()
        db.rollback()

    finally:
        cur.close()
        db.close()
