"""
=================================================
Need2Done – Helper Repository (FastAPI Compatible)
=================================================

✔ helper_status = single GPS truth
✔ ENUM SAFE ('AVAILABLE','UNAVAILABLE')
✔ Always ensures helper_status row exists
✔ Proper UPSERT everywhere
✔ Syncs helpers.status correctly
✔ Allows login anytime
✔ Live tracking compatible
✔ No silent DB failures
✔ MySQL production safe
"""

import traceback
from typing import Optional, List, Dict

from db.mysql_conn import get_db


# =================================================
# SAFE COMMIT
# =================================================

def _safe_commit(db) -> bool:

    try:
        db.commit()
        return True

    except Exception:

        traceback.print_exc()

        db.rollback()

        return False


# =================================================
# ENSURE HELPER_STATUS ROW EXISTS
# =================================================

def _ensure_helper_status_row(cur, helper_id: int):

    cur.execute(
        """
        INSERT INTO helper_status (helper_id, status, last_login, last_seen)
        VALUES (%s, 'UNAVAILABLE', NOW(), NOW())
        ON DUPLICATE KEY UPDATE helper_id = helper_id
        """,
        (helper_id,)
    )


# =================================================
# GET HELPER BY PHONE
# =================================================

def get_helper_by_phone(phone: str) -> Optional[Dict]:
    db = get_db()
    if not db:
        return None

    cur = db.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT id, name, phone, helper_code, active, status
            FROM helpers
            WHERE phone=%s
              AND active=1
            LIMIT 1
            """,
            (phone,)
        )
        return cur.fetchone()
    except Exception:
        traceback.print_exc()
        return None
    finally:
        cur.close()
        db.close()



# =================================================
# GET HELPER BY ID
# =================================================

def get_helper_by_id(helper_id: int) -> Optional[Dict]:

    db = get_db()
    if not db:
        return None

    cur = db.cursor(dictionary=True)

    try:
        cur.execute(
            """
            SELECT id, name, phone, helper_code, active, status
            FROM helpers
            WHERE id=%s
              AND active=1
            LIMIT 1
            """,
            (helper_id,)
        )
        return cur.fetchone()
    except Exception:
        traceback.print_exc()
        return None
    finally:
        cur.close()
        db.close()



# =================================================
# GET HELPER STATUS
# =================================================

def get_helper_status(helper_id: int) -> str:

    db = get_db()

    if not db:
        return "UNAVAILABLE"

    cur = db.cursor(dictionary=True)

    try:

        cur.execute(
            """
            SELECT status
            FROM helper_status
            WHERE helper_id=%s
            """,
            (helper_id,)
        )

        row = cur.fetchone()

        return row["status"] if row else "UNAVAILABLE"

    except Exception:

        traceback.print_exc()

        return "UNAVAILABLE"

    finally:

        cur.close()

        db.close()


# =================================================
# HELPER LOGIN
# =================================================

def helper_login(helper_id: int) -> bool:

    db = get_db()

    if not db:
        return False

    cur = db.cursor()

    try:

        db.start_transaction()

        _ensure_helper_status_row(cur, helper_id)

        # Force status to AVAILABLE in both tables
        cur.execute(
            """
            UPDATE helper_status
            SET status='AVAILABLE',
                last_login=NOW(),
                last_seen=NOW()
            WHERE helper_id=%s
            """,
            (helper_id,)
        )


        cur.execute(
            """
            UPDATE helpers
            SET status='ONLINE'
            WHERE id=%s
            """,
            (helper_id,)
        )

        return _safe_commit(db)

    except Exception:

        traceback.print_exc()

        db.rollback()

        return False

    finally:

        cur.close()

        db.close()


# =================================================
# HELPER LOGOUT
# =================================================

def helper_logout(helper_id: int) -> bool:

    db = get_db()

    if not db:
        return False

    cur = db.cursor()

    try:

        db.start_transaction()

        _ensure_helper_status_row(cur, helper_id)

        cur.execute(
            """
            UPDATE helper_status
            SET status='UNAVAILABLE',
                last_seen=NOW()
            WHERE helper_id=%s
            """,
            (helper_id,)
        )

        cur.execute(
            """
            UPDATE helpers
            SET status='OFFLINE'
            WHERE id=%s
            """,
            (helper_id,)
        )

        return _safe_commit(db)

    except Exception:

        traceback.print_exc()

        db.rollback()

        return False

    finally:

        cur.close()

        db.close()


# =================================================
# UPDATE HELPER LOCATION
# =================================================

def update_helper_location(helper_id: int, latitude: float, longitude: float) -> bool:

    db = get_db()

    if not db:
        return False

    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        _ensure_helper_status_row(cur, helper_id)

        # update GPS
        cur.execute(
            """
            UPDATE helper_status
            SET latitude=%s,
                longitude=%s,
                last_seen=NOW()
            WHERE helper_id=%s
            """,
            (latitude, longitude, helper_id)
        )

        # check active order
        cur.execute(
            """
            SELECT id
            FROM orders
            WHERE helper_id=%s
              AND status IN (
                'HELPER_ACCEPTED',
                'ADMIN_APPROVED_BILL',
                'HELPER_ARRIVED',
                'ITEM_PHOTO_UPLOADED',
                'PAYMENT_GENERATED',
                'PAID'
              )
            ORDER BY id DESC
            LIMIT 1
            """,
            (helper_id,)
        )

        active_order = cur.fetchone()

        if active_order:

            order_id = active_order["id"]

            # live tracking table
            cur.execute(
                """
                INSERT INTO helper_live_tracking
                    (helper_id, order_id, lat, lng)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    lat=%s,
                    lng=%s,
                    last_seen=NOW()
                """,
                (
                    helper_id,
                    order_id,
                    latitude,
                    longitude,
                    latitude,
                    longitude
                )
            )

            # location history
            cur.execute(
                """
                INSERT INTO helper_location_history
                    (order_id, helper_id, latitude, longitude)
                VALUES (%s, %s, %s, %s)
                """,
                (order_id, helper_id, latitude, longitude)
            )

        return _safe_commit(db)

    except Exception:

        traceback.print_exc()

        db.rollback()

        return False

    finally:

        cur.close()

        db.close()


# =================================================
# GET AVAILABLE HELPERS
# =================================================

def get_available_helpers(engine_type: str = 'TASK') -> List[Dict]:

    db = get_db()

    if not db:
        return []

    cur = db.cursor(dictionary=True)

    try:
        # Filtering logic based on user request:
        # TASK order -> Helpers with category 'TASK' or 'BOTH'
        # RIDE order -> Helpers with category 'RIDE' or 'BOTH'
        category_filter = "('TASK', 'BOTH')" if engine_type == 'TASK' else "('RIDE', 'BOTH')"

        cur.execute(
            f"""
            SELECT
                h.id,
                h.name,
                h.phone,
                h.helper_code,
                h.category,
                hs.latitude,
                hs.longitude,
                hs.last_seen
            FROM helpers h
            JOIN helper_status hs
                ON hs.helper_id = h.id
            WHERE h.active = 1
              AND hs.status = 'AVAILABLE'
              AND h.category IN {category_filter}
            ORDER BY hs.last_seen ASC
            """
        )

        return cur.fetchall()

    except Exception:

        traceback.print_exc()

        return []

    finally:

        cur.close()

        db.close()


# =================================================
# ROLE CHECK
# =================================================

def is_helper(phone: str) -> bool:

    db = get_db()

    if not db:
        return False

    cur = db.cursor()

    try:

        cur.execute(
            """
            SELECT 1
            FROM helpers
            WHERE phone=%s
              AND active=1
            LIMIT 1
            """,
            (phone,)
        )

        return cur.fetchone() is not None

    except Exception:

        traceback.print_exc()

        return False

    finally:

        cur.close()

        db.close()

# =================================================
# 🆕 GET HELPER BY CODE (FOR TRACKING LINK)
# =================================================

def get_helper_by_code(helper_code: str) -> Optional[Dict]:
    """
    Used for:
    - Helper tracking link (/helper/live)
    - Convert helper_code → helper_id

    Safe, read-only, no transaction
    """

    db = get_db()

    if not db:
        return None

    cur = db.cursor(dictionary=True)

    try:

        if not helper_code or not isinstance(helper_code, str):
            return None

        helper_code = helper_code.strip().upper()

        cur.execute(
            """
            SELECT id, name, phone, helper_code, status
            FROM helpers
            WHERE helper_code=%s
              AND active=1
            LIMIT 1
            """,
            (helper_code,)
        )

        return cur.fetchone()

    except Exception:

        traceback.print_exc()
        return None

        cur.close()
        db.close()

# =================================================
# GET ALL HELPERS (FOR BROADCASTS)
# =================================================

def get_all_helpers() -> List[Dict]:
    db = get_db()
    if not db:
        return []

    cur = db.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT id, name, phone, helper_code, status
            FROM helpers
            WHERE active=1
            """
        )
        return cur.fetchall()
    except Exception:
        traceback.print_exc()
        return []
    finally:
        cur.close()
        db.close()

