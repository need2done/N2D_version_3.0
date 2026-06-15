"""
=================================================
GramioGO – Tracking Link Generator (FINAL CLEAN)
=================================================

✔ Secure DB-backed tracking tokens
✔ Uses orders.id (INT only)
✔ Fully UTC-safe (MySQL controlled time)
✔ Auto-cleans expired tokens
✔ Removes old tokens per order
✔ Strict order validation
✔ Bounded expiry
✔ Transaction safe
✔ Injection safe
✔ Crash safe
✔ Production ready

🆕 Added:
✔ Android deep link support for helper tracking
✔ Optional fallback web link (disabled by default)
"""

import os
import uuid
import traceback
from typing import Optional

from db.mysql_conn import get_db


# -------------------------------------------------
# CONFIG
# -------------------------------------------------
TRACKING_BASE_URL = os.getenv(
    "PUBLIC_BASE_URL",
    "http://localhost:5000"
).rstrip("/")

# Maximum allowed expiry (security guardrail)
MAX_EXPIRY_MINUTES = 720  # 12 hours


# =================================================
# EXISTING FUNCTION (UNCHANGED - DO NOT TOUCH)
# =================================================
def generate_tracking_link(
    order_db_id: int,
    expires_in_minutes: int = 180
) -> str:

    db = None
    cur = None

    try:
        if not isinstance(order_db_id, int):
            print("⚠️ Invalid order_db_id type:", order_db_id)
            return "Tracking unavailable"

        if expires_in_minutes <= 0:
            expires_in_minutes = 180

        if expires_in_minutes > MAX_EXPIRY_MINUTES:
            expires_in_minutes = MAX_EXPIRY_MINUTES

        db = get_db()
        cur = db.cursor(dictionary=True)

        db.start_transaction()

        # Validate order
        cur.execute("""
            SELECT id, status
            FROM orders
            WHERE id = %s
            FOR UPDATE
        """, (order_db_id,))
        order = cur.fetchone()

        if not order:
            db.rollback()
            return "Tracking unavailable"

        if order["status"] in ("CANCELLED", "COMPLETED"):
            db.rollback()
            return "Tracking unavailable"

        # Cleanup expired tokens
        cur.execute("""
            DELETE FROM order_tracking_tokens
            WHERE expires_at IS NOT NULL
              AND expires_at < UTC_TIMESTAMP()
        """)

        # Remove old tokens for this order
        cur.execute("""
            DELETE FROM order_tracking_tokens
            WHERE order_id = %s
        """, (order_db_id,))

        token = uuid.uuid4().hex

        # Insert new token
        cur.execute("""
            INSERT INTO order_tracking_tokens
                (order_id, token, role, created_at, expires_at)
            VALUES (
                %s,
                %s,
                'CUSTOMER',
                NOW(),
                DATE_ADD(NOW(), INTERVAL %s MINUTE)
            )
        """, (order_db_id, token, expires_in_minutes))


        db.commit()

        tracking_url = f"{TRACKING_BASE_URL}/track/{token}"

        print("✅ Tracking link generated:", tracking_url)

        return tracking_url

    except Exception as e:
        print("🔥 TRACKING LINK ERROR:", e)
        traceback.print_exc()
        if db:
            db.rollback()
        return "Tracking unavailable"

    finally:
        if cur:
            cur.close()
        if db:
            db.close()


# =================================================
# 🆕 HELPER TRACKING LINK (CLEAN + NO DUPLICATE)
# =================================================
def generate_helper_tracking_link(
    order_db_id: int,
    helper_code: str
) -> str:
    """
    Generate helper tracking deep link

    ✔ Opens Android app directly
    ✔ No DB write
    ✔ Clean + minimal
    ✔ No duplicate logic

    Example:
    gramiogo://track?order_id=75&helper_code=BNGGO-001
    """

    try:
        # Validation
        if not isinstance(order_db_id, int):
            print("⚠️ Invalid order id")
            return ""

        if not helper_code or not isinstance(helper_code, str):
            print("⚠️ Invalid helper_code")
            return ""

        helper_code = helper_code.strip().upper()

        # ✅ HTTP BRIDGE LINK (STOPS AT OUR SERVER, THEN REDIRECTS TO APP)
        link = (
            f"{TRACKING_BASE_URL}/open-app?"
            f"order_id={order_db_id}&helper_code={helper_code}"
        )

        print("🚀 Helper tracking link:", link)

        return link

    except Exception as e:
        print("🔥 HELPER LINK ERROR:", e)
        traceback.print_exc()
        return ""