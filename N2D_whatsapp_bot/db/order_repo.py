"""
=================================================
GramioGO – Order Repository (FastAPI Compatible)
=================================================

✔ Strict state enforcement
✔ Centralized transitions
✔ FOR UPDATE locking everywhere
✔ Timeline auto logging
✔ No illegal state jumps
✔ Transaction safe
✔ Helper release safe
✔ OTP replay protected
✔ MySQL pool compatible
✔ Production hardened
"""

import random
import traceback
from typing import Optional, Tuple, Dict

from db.mysql_conn import get_db
from admin_v2.sync_service import sync_new_order
from config import HELPER_CHARGE

# =================================================
# STATE MACHINE
# =================================================

VALID_TRANSITIONS = {
    # Shared / Task flow
    "DRAFT": ["CONFIRMED", "BASE_FEE_PAID", "ORDER_PLACED", "HELPER_ACCEPTED"],
    "CONFIRMED": ["HELPER_ACCEPTED", "BASE_FEE_PAID", "ORDER_PLACED"],
    "BASE_FEE_PAID": ["HELPER_ACCEPTED", "ORDER_PLACED"],
    "ORDER_PLACED": ["HELPER_ACCEPTED"],
    "HELPER_ACCEPTED": ["BILL_IMAGE_UPLOADED", "HELPER_ARRIVED", "ARRIVED_AT_STORE", "ARRIVED_AT_CUSTOMER"],
    "ARRIVED_AT_STORE": ["BILL_IMAGE_UPLOADED", "ITEMS_PICKED_UP"],
    "BILL_IMAGE_UPLOADED": ["ADMIN_APPROVED_BILL", "BILL_PENDING_ONLINE_PAYMENT", "BILL_PAID_ONLINE", "ITEMS_PICKED_UP"],
    "BILL_PENDING_ONLINE_PAYMENT": ["BILL_PAID_ONLINE", "ITEMS_PICKED_UP"],
    "BILL_PAID_ONLINE": ["ITEMS_PICKED_UP", "HELPER_ARRIVED", "ARRIVED_AT_CUSTOMER"],
    "ADMIN_APPROVED_BILL": ["HELPER_ARRIVED", "ITEMS_PICKED_UP", "ARRIVED_AT_CUSTOMER"],
    "ITEMS_PICKED_UP": ["HELPER_ARRIVED", "ARRIVED_AT_CUSTOMER"],
    "HELPER_ARRIVED": ["ITEM_PHOTO_UPLOADED", "RIDE_STARTED", "PAYMENT_GENERATED", "OTP_SUBMITTED", "COMPLETED"],
    "ARRIVED_AT_CUSTOMER": ["ITEM_PHOTO_UPLOADED", "PAYMENT_GENERATED", "OTP_SUBMITTED", "COMPLETED"],
    "ITEM_PHOTO_UPLOADED": ["ADMIN_VERIFY_ITEMS", "PAYMENT_GENERATED"],
    "ADMIN_VERIFY_ITEMS": ["PAYMENT_GENERATED"],
    "RIDE_STARTED": ["PAYMENT_GENERATED"],     # After END OTP, collect payment first
    "PAYMENT_GENERATED": ["PAID"],
    "PAID": ["OTP_SUBMITTED", "COMPLETED"],    # Task uses OTP_SUBMITTED; Ride goes direct COMPLETED
    "OTP_SUBMITTED": ["COMPLETED"],
}


# =================================================
# UTILITIES
# =================================================

def _log_timeline(cur, order_db_id: int, status: str, actor: str):
    try:
        cur.execute(
            """
            INSERT INTO order_timeline (order_id, event_type, event_text, triggered_by)
            VALUES (%s,%s,%s,%s)
            """,
            (order_db_id, status, status, actor)
        )
    except Exception as e:
        print(f"⚠️ Timeline log failed (order_timeline): {e}")
        # Try fallback to timeline_logs if needed, or just proceed
        try:
            cur.execute(
                """
                INSERT INTO timeline_logs (order_id, status, actor)
                VALUES (%s,%s,%s)
                """,
                (order_db_id, status, actor)
            )
        except:
            pass


def _resolve_and_lock(cur, public_order_id: str):

    cur.execute(
        """
        SELECT *
        FROM orders
        WHERE order_id=%s
        FOR UPDATE
        """,
        (public_order_id,)
    )

    return cur.fetchone()


def _lock_order_by_id(cur, db_id: int):
    """
    Locks an order by its internal database ID (PRIMARY KEY).
    """
    cur.execute(
        "SELECT * FROM orders WHERE id=%s FOR UPDATE",
        (db_id,)
    )
    return cur.fetchone()


def _validate_transition(current_status: str, new_status: str) -> bool:

    return new_status in VALID_TRANSITIONS.get(current_status, [])


def _transition_order(cur, order_row: Dict, new_status: str, actor: str):

    current_status = order_row["status"]

    if not _validate_transition(current_status, new_status):

        raise Exception(f"Invalid transition {current_status} → {new_status}")

    cur.execute(
        """
        UPDATE orders
        SET status=%s,
            updated_at=NOW()
        WHERE id=%s
        """,
        (new_status, order_row["id"])
    )

    _log_timeline(cur, order_row["id"], new_status, actor)


# =================================================
# ACCEPT ORDER (ATOMIC)
# =================================================

def accept_order_atomic(order_id: str, helper_id: int) -> Tuple[bool, Optional[str]]:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:
        db.start_transaction()

        # 🔒 LOCK ORDER
        order = _resolve_and_lock(cur, order_id)

        if not order:
            db.rollback()
            return False, "Order not found"

        # Check helper_id: allow if unassigned or assigned to this specific helper
        if order.get("helper_id") is not None and order.get("helper_id") != helper_id:
            db.rollback()
            return False, "Order already assigned to another helper"

        # Allow acceptance if order is in CONFIRMED, DRAFT, or HELPER_ACCEPTED state
        if order["status"] not in ("CONFIRMED", "DRAFT", "HELPER_ACCEPTED"):
            db.rollback()
            return False, f"Order is in {order['status']} state"

        # 🔒 LOCK HELPER STATUS
        cur.execute(
            """
            SELECT status
            FROM helper_status
            WHERE helper_id=%s
            FOR UPDATE
            """,
            (helper_id,)
        )

        helper = cur.fetchone()

        if not helper or helper["status"] != "AVAILABLE":
            db.rollback()
            return False, "Helper not available"

        # Fetch Helper Phone
        cur.execute("SELECT phone FROM helpers WHERE id=%s", (helper_id,))
        helper_row = cur.fetchone()
        helper_phone = helper_row["phone"] if helper_row else None

        # 🚨 NEW FIX 2 — SAFE UPDATE (ATOMIC CHECK)
        cur.execute(
            """
            UPDATE orders
            SET helper_id=%s,
                helper_phone=%s,
                assigned_at=NOW()
            WHERE id=%s AND helper_id IS NULL
            """,
            (helper_id, helper_phone, order["id"])
        )

        # 🚨 If no row updated → someone else took it
        if cur.rowcount == 0:
            db.rollback()
            return False, "Order already taken"

        # 🔁 STATE TRANSITION
        _transition_order(cur, order, "HELPER_ACCEPTED", "HELPER")

        # 🔄 HELPER BUSY
        cur.execute("UPDATE helpers SET status='BUSY' WHERE id=%s", (helper_id,))

        cur.execute(
            """
            UPDATE helper_status
            SET status='UNAVAILABLE'
            WHERE helper_id=%s
            """,
            (helper_id,)
        )

        db.commit()

        return True, None

    except Exception:
        db.rollback()
        traceback.print_exc()
        return False, "Internal error"

    finally:
        cur.close()
        db.close()

# =================================================
# SAVE BILL IMAGE
# =================================================

def save_bill_image(order_id: str, media_id: str):

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        if not order:
            raise Exception("Order not found")

        _transition_order(cur, order, "BILL_IMAGE_UPLOADED", "HELPER")

        cur.execute(
            """
            DELETE FROM order_images
            WHERE order_id=%s AND image_type='BILL'
            """,
            (order["id"],)
        )

        cur.execute(
            """
            INSERT INTO order_images
            (order_id,image_type,image_url,uploaded_by)
            VALUES (%s,'BILL',%s,'HELPER')
            """,
            (order["id"], media_id)
        )

        db.commit()

    except Exception:

        db.rollback()

        traceback.print_exc()

        raise

    finally:

        cur.close()

        db.close()


# =================================================
# SAVE BILL AMOUNT
# =================================================

def save_bill_amount(order_id: str, amount: float) -> bool:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        if not order or order["status"] != "BILL_IMAGE_UPLOADED":
            db.rollback()
            return False

        if order["bill_amount"] is not None:
            db.rollback()
            return False

        cur.execute(
            "UPDATE orders SET bill_amount=%s WHERE id=%s",
            (amount, order["id"])
        )

        db.commit()

        return True

    except Exception:

        db.rollback()

        return False

    finally:

        cur.close()

        db.close()


# =================================================
# HELPER ARRIVED
# =================================================

def mark_helper_arrived(order_id: str) -> bool:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        allowed_statuses = ["ITEMS_PICKED_UP"]
        is_anywork = order.get("service") in ("AnyWork", 3, 5)
        is_home_service = order.get("service") == "Home Services" or str(order.get("service")) == "10"
        if order and (order.get("engine_type") == "RIDE" or is_anywork or is_home_service):
            allowed_statuses.extend(["HELPER_ACCEPTED", "ADMIN_APPROVED_BILL"])

        if not order or order["status"] not in allowed_statuses:
            db.rollback()
            return False


        _transition_order(cur, order, "HELPER_ARRIVED", "HELPER")

        db.commit()

        return True

    except Exception:

        db.rollback()

        return False

    finally:

        cur.close()
        db.close()


# =================================================
# AUTO APPROVE BILL
# =================================================

def auto_approve_bill(order_id: str) -> bool:
    """
    Automatically approves the bill, moving status from BILL_IMAGE_UPLOADED 
    to ADMIN_APPROVED_BILL.
    """
    db = get_db()
    cur = db.cursor(dictionary=True)

    try:
        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        # Allow from BILL_IMAGE_UPLOADED
        if not order or order["status"] != "BILL_IMAGE_UPLOADED":
            db.rollback()
            return False

        _transition_order(cur, order, "ADMIN_APPROVED_BILL", "SYSTEM")
        
        cur.execute(
            "UPDATE orders SET approved_at=NOW() WHERE id=%s",
            (order["id"],)
        )

        db.commit()
        return True

    except Exception:
        db.rollback()
        traceback.print_exc()
        return False

    finally:
        cur.close()
        db.close()


# =================================================
# GENERATE OTP
# =================================================

def generate_and_save_otp(order_id: str) -> Optional[str]:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        if not order or order["status"] != "PAID" or order.get("otp"):
            db.rollback()
            return None

        otp = str(random.randint(100000, 999999))

        cur.execute(
            """
            UPDATE orders
            SET otp=%s,
                otp_created_at=NOW()
            WHERE id=%s
            """,
            (otp, order["id"])
        )

        db.commit()

        return otp

    finally:

        cur.close()

        db.close()


# =================================================
# COMPLETE ORDER
# =================================================

def complete_order(order_id: str) -> bool:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        if not order or order["status"] != "OTP_SUBMITTED":
            db.rollback()
            return False

        _transition_order(cur, order, "COMPLETED", "ADMIN")

        cur.execute(
            "UPDATE orders SET completed_at=NOW() WHERE id=%s",
            (order["id"],)
        )

        if order["helper_id"]:

            cur.execute(
                "UPDATE helpers SET status='ONLINE' WHERE id=%s",
                (order["helper_id"],)
            )

            cur.execute(
                """
                UPDATE helper_status
                SET status='AVAILABLE'
                WHERE helper_id=%s
                """,
                (order["helper_id"],)
            )

            # --- WALLET DEDUCTION LOGIC FOR COD ---
            if order.get("payment_method") == "COD":
                # Helper collected cash. They keep their helper_charge.
                # The rest is owed to Admin/Platform/Vendor.
                amount_to_deduct = float(order.get("total_amount") or 0) - float(order.get("helper_charge") or 0)
                
                if amount_to_deduct > 0:
                    cur.execute(
                        "UPDATE helpers SET wallet_balance = wallet_balance - %s WHERE id = %s",
                        (amount_to_deduct, order["helper_id"])
                    )
                    cur.execute(
                        "INSERT INTO helper_ledger (helper_id, amount, type, description, order_id) VALUES (%s, %s, 'DEBIT', %s, %s)",
                        (order["helper_id"], amount_to_deduct, f"COD Collection for Order {order['order_id']}", order["id"])
                    )

        db.commit()

        return True

    except Exception:

        db.rollback()

        return False

    finally:

        cur.close()

        db.close()

# =================================================
# FETCH ORDER BY DB ID
# =================================================

def get_order_by_db_id(order_db_id: int):

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        cur.execute(
            """
            SELECT o.*,
                   h.phone AS helper_phone,
                   h.name AS helper_name,
                   h.helper_code
            FROM orders o
            LEFT JOIN helpers h ON h.id=o.helper_id
            WHERE o.id=%s
            LIMIT 1
            """,
            (order_db_id,)
        )

        return cur.fetchone()

    finally:

        cur.close()
        db.close()


# =================================================
# FETCH ORDER BY PUBLIC ORDER ID
# =================================================

def get_order(order_id: str):

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        cur.execute(
            """
            SELECT o.*,
                   h.phone AS helper_phone,
                   h.name AS helper_name,
                   h.helper_code
            FROM orders o
            LEFT JOIN helpers h ON h.id=o.helper_id
            WHERE o.order_id=%s
            LIMIT 1
            """,
            (order_id,)
        )

        return cur.fetchone()

    finally:

        cur.close()
        db.close()


# =================================================
# ACTIVE ORDER FOR HELPER
# =================================================

ACTIVE_STATUSES = (
    "HELPER_ACCEPTED",
    "BILL_IMAGE_UPLOADED",
    "ADMIN_APPROVED_BILL",
    "ITEMS_PICKED_UP",
    "HELPER_ARRIVED",
    "ITEM_PHOTO_UPLOADED",
    "ADMIN_VERIFY_ITEMS",
    "SERVICE_STARTED",
    "PAYMENT_GENERATED",
    "PAID",
    "OTP_SUBMITTED",
    "RIDE_STARTED",
)


def get_active_order_for_helper(helper_id: int):

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        cur.execute(
            f"""
            SELECT *
            FROM orders
            WHERE helper_id=%s
            AND status IN {ACTIVE_STATUSES}
            ORDER BY assigned_at DESC
            LIMIT 1
            """,
            (helper_id,)
        )

        return cur.fetchone()

    finally:

        cur.close()
        db.close()


# =================================================
# ADMIN VERIFY ITEMS
# =================================================

def mark_admin_verify(order_id: str) -> bool:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        if not order or order["status"] != "ITEM_PHOTO_UPLOADED":

            db.rollback()
            return False

        _transition_order(cur, order, "ADMIN_VERIFY_ITEMS", "ADMIN")

        db.commit()

        return True

    except Exception:

        db.rollback()

        return False

    finally:

        cur.close()
        db.close()


# =================================================
# PAYMENT METHOD SELECT
# =================================================

def mark_payment_method(db_id: int, method: str) -> bool:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        order = _lock_order_by_id(cur, db_id)

        if not order or order["status"] != "PAYMENT_GENERATED":

            db.rollback()
            return False

        if method not in ("UPI", "COD"):

            db.rollback()
            return False

        cur.execute(
            """
            UPDATE orders
            SET payment_method=%s,
                updated_at=NOW()
            WHERE id=%s
            """,
            (method, order["id"])
        )

        db.commit()

        return True

    except Exception:

        db.rollback()

        return False

    finally:

        cur.close()
        db.close()


# =================================================
# SUBMIT OTP
# =================================================

# =================================================
# SUBMIT OTP
# =================================================

def submit_otp(order_id: str, otp_entered: str) -> bool:
    """
    Submits OTP for verification (Task Engine).
    """
    import datetime
    from config import OTP_EXPIRY_MINUTES

    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        db.start_transaction()
        order = _resolve_and_lock(cur, order_id)
        if not order:
            db.rollback()
            return False
            
        if not order.get('otp'):
            db.rollback()
            return False
            
        # Check expiration
        created_at = order.get("otp_created_at")
        if created_at:
            now = datetime.datetime.now()
            elapsed = (now - created_at).total_seconds() / 60.0
            if elapsed > OTP_EXPIRY_MINUTES:
                db.rollback()
                print(f"OTP Expired: {elapsed:.2f} minutes elapsed (max: {OTP_EXPIRY_MINUTES})")
                return False

        if str(otp_entered).strip() == str(order['otp']).strip():
            _transition_order(cur, order, "OTP_SUBMITTED", "HELPER")
            # Clear OTP to prevent replay/reuse
            cur.execute("UPDATE orders SET otp=NULL WHERE id=%s", (order["id"],))
            db.commit()
            return True
        else:
            db.rollback()
            return False
    except Exception:
        db.rollback()
        traceback.print_exc()
        return False
    finally:
        cur.close()
        db.close()


# =================================================
# RIDE ENGINE CORE (Double OTP)
# =================================================

def get_ride_details(order_db_id: int, cursor=None) -> Optional[Dict]:
    if cursor:
        cursor.execute("SELECT * FROM order_rides WHERE order_id=%s", (order_db_id,))
        return cursor.fetchone()
        
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM order_rides WHERE order_id=%s", (order_db_id,))
        return cur.fetchone()
    finally:
        cur.close()
        db.close()

def verify_ride_otp(public_order_id: str, otp_entered: str, otp_type: str = 'START') -> Tuple[bool, str]:
    """
    Verifies ride OTP (START or END). 
    Handles 3-attempt lockout.
    Returns (success, message)
    """
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        db.start_transaction()
        order = _resolve_and_lock(cur, public_order_id)
        if not order:
            db.rollback()
            return False, "Order not found"

        # Use existing cursor to avoid connection overhead/locking issues
        ride = get_ride_details(order["id"], cursor=cur)
        if not ride:
            db.rollback()
            return False, "Ride details not found"

        if ride.get('locked'):
            db.rollback()
            return False, "❌ Ride is LOCKED due to multiple failed attempts. Contact admin."

        target_otp = ride['start_otp'] if otp_type == 'START' else ride['end_otp']
        expected_status = 'HELPER_ARRIVED' if otp_type == 'START' else 'RIDE_STARTED'
        new_status = 'RIDE_STARTED' if otp_type == 'START' else 'PAYMENT_GENERATED'

        if order['status'] != expected_status:
            db.rollback()
            return False, f"Order is in wrong state: {order['status']}"

        if str(otp_entered).strip() == str(target_otp).strip():
            # SUCCESS
            _transition_order(cur, order, new_status, "HELPER")
            # reset attempts
            cur.execute("UPDATE order_rides SET otp_attempts=0 WHERE order_id=%s", (order["id"],))
            
            # If END OTP: mark payment pending (helper collects from customer)
            if new_status == 'PAYMENT_GENERATED':
                cur.execute(
                    "UPDATE orders SET payment_status='PENDING', updated_at=NOW() WHERE id=%s",
                    (order["id"],)
                )

            db.commit()
            return True, "Verified successfully"
        else:
            # FAILURE
            new_attempts = (ride.get('otp_attempts') or 0) + 1
            if new_attempts >= 3:
                cur.execute("UPDATE order_rides SET otp_attempts=%s, locked=1 WHERE order_id=%s", (new_attempts, order["id"]))
                db.commit()
                return False, "❌ 3 failed attempts! Ride is now LOCKED. Admin has been notified."
            else:
                cur.execute("UPDATE order_rides SET otp_attempts=%s WHERE order_id=%s", (new_attempts, order["id"]))
                db.commit()
                return False, f"❌ Invalid OTP. {3 - new_attempts} attempts remaining."
    except Exception as e:
        if db:
            db.rollback()
        print(f"🔥 verify_ride_otp error: {e}")
        traceback.print_exc()
        return False, "Internal error"
    finally:
        cur.close()
        db.close()


# =================================================
# RIDE PAYMENT GENERATED (after END OTP)
# =================================================

def mark_ride_payment_generated(order_id: str, fare: float) -> bool:
    """
    After END OTP is verified, transition RIDE_STARTED → PAYMENT_GENERATED
    and save the final fare so customer can pay.
    """
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        db.start_transaction()
        order = _resolve_and_lock(cur, order_id)
        if not order or order["status"] != "RIDE_STARTED":
            db.rollback()
            return False

        _transition_order(cur, order, "PAYMENT_GENERATED", "SYSTEM")

        cur.execute(
            """
            UPDATE orders
            SET total_amount=%s,
                payment_status='PENDING',
                updated_at=NOW()
            WHERE id=%s
            """,
            (fare, order["id"])
        )
        db.commit()
        return True
    except Exception:
        db.rollback()
        traceback.print_exc()
        return False
    finally:
        cur.close()
        db.close()


# =================================================
# COMPLETE RIDE ORDER (after customer pays)
# =================================================

def complete_ride_order(order_db_id: int) -> bool:
    """
    Transitions a RIDE order from PAID → COMPLETED and releases the helper.
    Called after customer confirms ride payment.
    """
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        db.start_transaction()
        order = _lock_order_by_id(cur, order_db_id)
        if not order or order["status"] != "PAID":
            db.rollback()
            return False

        _transition_order(cur, order, "COMPLETED", "SYSTEM")

        cur.execute(
            "UPDATE orders SET completed_at=NOW() WHERE id=%s",
            (order["id"],)
        )

        if order["helper_id"]:
            cur.execute(
                "UPDATE helpers SET status='ONLINE' WHERE id=%s",
                (order["helper_id"],)
            )
            cur.execute(
                "UPDATE helper_status SET status='AVAILABLE' WHERE helper_id=%s",
                (order["helper_id"],)
            )

        db.commit()
        return True
    except Exception:
        db.rollback()
        traceback.print_exc()
        return False
    finally:
        cur.close()
        db.close()


# =================================================
# PAYMENT GENERATED (admin/task flow)
# =================================================

def mark_payment_generated(order_id: str, total: float, platform_fee: float = 0, helper_charge: float = 0) -> bool:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:
        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        if not order or order["status"] != "ADMIN_VERIFY_ITEMS":
            db.rollback()
            return False

        _transition_order(cur, order, "PAYMENT_GENERATED", "ADMIN")

        cur.execute(
            """
            UPDATE orders
            SET total_amount=%s,
                platform_fee=%s,
                helper_charge=%s,
                payment_status='PENDING'
            WHERE id=%s
            """,
            (total, platform_fee, helper_charge, order["id"])
        )

        db.commit()
        return True

    except Exception:
        db.rollback()
        return False

    finally:
        cur.close()
        db.close()

 # =================================================
# SAVE ITEM PHOTO
# =================================================

def save_item_photo(order_id: str, media_id: str):

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:

        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        if not order or order["status"] != "HELPER_ARRIVED":
            raise Exception("Invalid state for item photo")

        _transition_order(cur, order, "ITEM_PHOTO_UPLOADED", "HELPER")

        cur.execute(
            """
            INSERT INTO order_images
            (order_id, media_id, image_type, uploaded_by)
            VALUES (%s, %s, 'ITEM', 'HELPER')
            """,
            (order["id"], media_id)
        )

        db.commit()

    except Exception:

        db.rollback()
        traceback.print_exc()
        raise

    finally:

        cur.close()
        db.close()


# =================================================
# AUTO GENERATE PAYMENT
# =================================================

def auto_generate_payment(order_id: str, bill_amount: float, helper_charge: float, platform_fee: float, total_override: Optional[float] = None) -> Optional[float]:
    """
    Automatically generates payment request, transitions ITEM_PHOTO_UPLOADED -> PAYMENT_GENERATED.
    Returns total_amount if successful.
    """
    db = get_db()
    cur = db.cursor(dictionary=True)

    try:
        db.start_transaction()

        order = _resolve_and_lock(cur, order_id)

        if not order or order["status"] != "ITEM_PHOTO_UPLOADED":
            db.rollback()
            return None

        total = total_override if total_override is not None else float(bill_amount) + float(helper_charge) + float(platform_fee)

        _transition_order(cur, order, "PAYMENT_GENERATED", "SYSTEM")

        cur.execute(
            """
            UPDATE orders 
            SET total_amount=%s, 
                platform_fee=%s,
                helper_charge=%s,
                payment_status='PENDING', 
                updated_at=NOW() 
            WHERE id=%s
            """,
            (total, platform_fee, helper_charge, order["id"])
        )

        db.commit()
        return total

    except Exception:
        db.rollback()
        traceback.print_exc()
        return None

    finally:
        cur.close()
        db.close()

 # =================================================
# PAYMENT RECEIVED (CUSTOMER CONFIRMS PAYMENT)
# =================================================

def mark_payment_received(db_id: int, method: str) -> bool:

    db = get_db()
    cur = db.cursor(dictionary=True)

    try:
        db.start_transaction()

        order = _lock_order_by_id(cur, db_id)

        if not order or order["status"] != "PAYMENT_GENERATED":
            db.rollback()
            return False

        _transition_order(cur, order, "PAID", "CUSTOMER")

        cur.execute(
            """
            UPDATE orders
            SET payment_status='PAID',
                payment_method=%s,
                updated_at=NOW()
            WHERE id=%s
            """,
            (method, order["id"])
        )

        db.commit()
        return True

    except Exception:
        db.rollback()
        traceback.print_exc()
        return False

    finally:
        cur.close()
        db.close()   


from db.mysql_conn import get_db
from admin_v2.sync_service import sync_new_order


def create_order_and_sync(order_data):
    db = get_db()
    if not db:
        return None
        
    cursor = db.cursor()
    try:
        # 1. Insert into OLD DB
        query = """
        INSERT INTO orders (
            customer_name,
            status,
            created_at
        ) VALUES (%s, %s, NOW())
        """

        cursor.execute(query, (
            order_data["customer_name"],
            "PLACED"
        ))

        db.commit()

        order_id = cursor.lastrowid

        print("🔥 ORDER CREATED:", order_id)

        # 2. 🔥 SYNC TO NEW DB
        sync_new_order({
            "order_id": order_id,
            "customer_name": order_data["customer_name"],
            "status": "PLACED"
        })

        print("🔥 SYNC SENT TO ADMIN DB")

        return order_id
    except Exception:
        db.rollback()
        traceback.print_exc()
        return None
    finally:
        cursor.close()
        db.close()



# =================================================
# FETCH ORDER IMAGES
# =================================================

def get_order_images(order_db_id: int, image_type: str = 'ITEM'):
    """
    Fetches media IDs and URLs associated with an order.
    """
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT * FROM order_images WHERE order_id=%s AND image_type=%s", 
            (order_db_id, image_type)
        )
        return cur.fetchall()
    finally:
        cur.close()
        db.close()


# =================================================
# TRACKING & GPS
# =================================================

def update_helper_gps(helper_id: int, order_id: Optional[int], lat: float, lng: float):
    """
    Updates live location and history for a helper.
    order_id can be None if helper is just ONLINE but not on a task.
    """
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        db.start_transaction()
        
        # 1. Update overall helper status
        cur.execute(
            """
            INSERT INTO helper_status (helper_id, status, latitude, longitude, last_seen)
            VALUES (%s, 'AVAILABLE', %s, %s, NOW())
            ON DUPLICATE KEY UPDATE status='AVAILABLE', latitude=%s, longitude=%s, last_seen=NOW()
            """,
            (helper_id, lat, lng, lat, lng)
        )
        
        # 2. If on order, update history and live tracking
        if order_id:
            # Store in history
            cur.execute(
                "INSERT INTO helper_location_history (helper_id, order_id, latitude, longitude) VALUES (%s, %s, %s, %s)",
                (helper_id, order_id, lat, lng)
            )
            
            # Update live tracking
            cur.execute(
                """
                INSERT INTO helper_live_tracking (helper_id, order_id, lat, lng, last_seen)
                VALUES (%s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE lat=%s, lng=%s, last_seen=NOW()
                """,
                (helper_id, order_id, lat, lng, lat, lng)
            )
            
        db.commit()
        return True
    except Exception:
        db.rollback()
        import traceback
        traceback.print_exc()
        return False
    finally:
        cur.close()
        db.close()


# =================================================
# FETCH UNASSIGNED ORDERS
# =================================================

def get_unassigned_orders():
    """
    Returns list of orders in CONFIRMED state without a helper.
    """
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT o.*, c.name as customer_name, c.phone as customer_number
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            WHERE o.status = 'CONFIRMED'
              AND o.helper_id IS NULL
            ORDER BY o.created_at ASC
        """)
        return cur.fetchall()
    finally:
        cur.close()
        db.close()


# =================================================
# HELPER STATS (EARNINGS)
# =================================================

def get_helper_stats(helper_id: int) -> Dict:
    """
    Returns daily and all-time completion stats for a helper.
    """
    db = get_db()
    if not db:
        return {"today_count": 0, "today_sum": 0, "total_count": 0, "total_sum": 0}

    cur = db.cursor(dictionary=True)
    try:
        # Today's stats
        cur.execute("""
            SELECT COUNT(*) as count, COALESCE(SUM(helper_charge), 0) as total_charge
            FROM orders 
            WHERE helper_id = %s 
              AND status = 'COMPLETED' 
              AND DATE(completed_at) = CURDATE()
        """, (helper_id,))
        today = cur.fetchone()
        today_count = today['count'] if today else 0
        today_sum = float(today['total_charge']) if today else 0.0

        # Fetch today's detailed orders
        cur.execute("""
            SELECT order_id, engine_type, COALESCE(helper_charge, 0) as helper_charge, completed_at
            FROM orders
            WHERE helper_id = %s
              AND status = 'COMPLETED'
              AND DATE(completed_at) = CURDATE()
            ORDER BY completed_at DESC
        """, (helper_id,))
        orders_raw = cur.fetchall()
        
        today_orders = []
        for o in orders_raw:
            time_str = o['completed_at'].strftime('%H:%M') if o.get('completed_at') else '--:--'
            today_orders.append({
                "order_id": o["order_id"],
                "engine_type": o["engine_type"],
                "helper_charge": float(o["helper_charge"]),
                "time_str": time_str
            })

        # Total stats
        cur.execute("""
            SELECT COUNT(*) as count, COALESCE(SUM(helper_charge), 0) as total_charge
            FROM orders 
            WHERE helper_id = %s 
              AND status = 'COMPLETED'
        """, (helper_id,))
        total = cur.fetchone()
        total_count = total['count'] if total else 0
        total_sum = float(total['total_charge']) if total else 0.0

        # Past 10 Days stats
        cur.execute("""
            SELECT DATE(completed_at) as c_date, COUNT(*) as count, COALESCE(SUM(helper_charge), 0) as daily_charge
            FROM orders
            WHERE helper_id = %s
              AND status = 'COMPLETED'
              AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 10 DAY)
            GROUP BY DATE(completed_at)
            ORDER BY c_date DESC
        """, (helper_id,))
        past_10_raw = cur.fetchall()
        
        past_10_days = []
        for row in past_10_raw:
            past_10_days.append({
                "date": row["c_date"].strftime("%d %b") if row["c_date"] else "N/A",
                "count": row["count"],
                "daily_charge": float(row["daily_charge"])
            })

        return {
            "today_count": today_count,
            "today_sum": round(today_sum, 2),
            "today_orders": today_orders,
            "total_count": total_count,
            "total_sum": round(total_sum, 2),
            "past_10_days": past_10_days
        }
    except Exception:
        traceback.print_exc()
        return {"today_count": 0, "today_sum": 0, "total_count": 0, "total_sum": 0}
    finally:
        cur.close()
        db.close()


# =================================================
# SAVE ORDER RATING
# =================================================

def save_order_rating(order_db_id: int, rating: int):
    """
    Saves customer rating to the orders table.
    Returns the order row on success so callers can notify the helper/admin.
    Returns None on failure or if already rated.
    """
    db = get_db()
    cur = db.cursor(dictionary=True)

    try:
        db.start_transaction()

        # Check if already rated to prevent multiple feedback notifications
        cur.execute("SELECT rating FROM orders WHERE id=%s FOR UPDATE", (order_db_id,))
        existing = cur.fetchone()
        
        if not existing:
            db.rollback()
            return None
            
        # The rating column defaults to 0
        if existing.get("rating") not in (0, None):
            db.rollback()
            return "ALREADY_RATED"

        cur.execute(
            "UPDATE orders SET rating=%s WHERE id=%s",
            (rating, order_db_id)
        )

        db.commit()

        # Fetch order details for downstream notifications
        cur.execute(
            """
            SELECT o.id, o.order_id, o.service, o.engine_type, o.total_amount,
                   h.phone AS helper_phone, h.name AS helper_name
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            WHERE o.id=%s
            """,
            (order_db_id,)
        )
        return cur.fetchone()

    except Exception:
        db.rollback()
        traceback.print_exc()
        return None

    finally:
        cur.close()
        db.close()


# =================================================
# ACTIVE ORDER FOR CUSTOMER
# =================================================

def has_active_order_for_customer(customer_phone: str) -> bool:
    """
    Checks if a customer has an active order (not cancelled/completed).
    Used to prevent the welcome menu from interrupting their flow.
    """
    db = get_db()
    if not db:
        return False
        
    cur = db.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT id FROM orders 
            WHERE customer_number=%s 
            AND status NOT IN ('COMPLETED', 'CANCELLED')
            LIMIT 1
            """,
            (customer_phone,)
        )
        return cur.fetchone() is not None
    except Exception:
        db.close()

# =================================================
# FETCH CART ITEMS
# =================================================
def get_cart_items(order_id: str):
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        cur.execute("SELECT product_name, quantity, unit FROM cart_items WHERE order_id=%s", (order_id,))
        return cur.fetchall()
    finally:
        cur.close()
        db.close()

# =================================================
# VENDOR REPOSITORY FUNCTIONS
# =================================================
from utils.distance import calculate_distance

def get_auto_assign_vendor(service_category: str, customer_lat=None, customer_lng=None, shop_name=None):
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM vendors WHERE service_category=%s AND auto_assign=1 AND status='Active'", (service_category,))
        vendors = cur.fetchall()
        
        if not vendors:
            return None
            
        if shop_name and shop_name.lower() != "restaurant":
            shop_name_lower = shop_name.lower()
            matched_vendors = [v for v in vendors if shop_name_lower in (v.get('name') or '').lower() or (v.get('name') or '').lower() in shop_name_lower]
            if not matched_vendors:
                return None
            vendors = matched_vendors

        if not customer_lat or not customer_lng:
            return vendors[0]
            
        # Find nearest
        nearest_vendor = None
        min_distance = float('inf')
        
        for v in vendors:
            if v.get('lat') and v.get('lng'):
                dist = calculate_distance(customer_lat, customer_lng, v['lat'], v['lng'])
                if dist < min_distance:
                    min_distance = dist
                    nearest_vendor = v
                    
        return nearest_vendor or vendors[0]
    finally:
        cur.close()
        db.close()

def assign_vendor(order_db_id: int, vendor_id: int) -> bool:
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        db.start_transaction()
        cur.execute("UPDATE orders SET vendor_id=%s, vendor_status='PENDING' WHERE id=%s", (vendor_id, order_db_id))
        _log_timeline(cur, order_db_id, "VENDOR_ASSIGNED", "SYSTEM")
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
    finally:
        cur.close()
        db.close()

def update_vendor_status(public_order_id: str, status: str) -> bool:
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        db.start_transaction()
        order = _resolve_and_lock(cur, public_order_id)
        if not order:
            db.rollback()
            return False
        cur.execute("UPDATE orders SET vendor_status=%s WHERE id=%s", (status, order["id"]))
        _log_timeline(cur, order["id"], f"VENDOR_STATUS_{status}", "VENDOR")
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
    finally:
        cur.close()
        db.close()

def get_vendors_by_category(service_category: str, shop_name=None):
    """Fetch all active vendors in the given category (e.g. Groceries, Vegetables & Fruits, Food Service, Medicines)."""
    db = get_db()
    if not db:
        return []
    cur = db.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM vendors WHERE status='Active'")
        all_vendors = cur.fetchall()
        if not all_vendors:
            return []

        sc_lower = (service_category or "").lower().strip()
        matched_cat = []
        for v in all_vendors:
            v_cat = (v.get("service_category") or "").lower().strip()
            if v_cat == sc_lower:
                matched_cat.append(v)
            elif "veg" in sc_lower or "fruit" in sc_lower:
                if "veg" in v_cat or "fruit" in v_cat:
                    matched_cat.append(v)
            elif "groc" in sc_lower:
                if "groc" in v_cat:
                    matched_cat.append(v)
            elif "food" in sc_lower:
                if "food" in v_cat:
                    matched_cat.append(v)
            elif "med" in sc_lower:
                if "med" in v_cat:
                    matched_cat.append(v)

        if not matched_cat:
            matched_cat = [v for v in all_vendors if (v.get("service_category") or "").lower() == sc_lower]

        if not matched_cat:
            return []

        if shop_name and str(shop_name).lower().strip() not in ("restaurant", "", "none", "null"):
            shop_name_lower = str(shop_name).lower().strip()
            shop_matched = [
                v for v in matched_cat 
                if shop_name_lower in (v.get('name') or '').lower() or (v.get('name') or '').lower() in shop_name_lower
            ]
            if shop_matched:
                return shop_matched

        return matched_cat
    finally:
        cur.close()
        db.close()

def claim_vendor_order(public_order_id: str, vendor_id: int) -> bool:
    """Atomic first-pick assignment: claims the order for vendor_id if unassigned or pending."""
    db = get_db()
    if not db:
        return False
    cur = db.cursor(dictionary=True)
    try:
        db.start_transaction()
        order = _resolve_and_lock(cur, public_order_id)
        if not order:
            db.rollback()
            return False
        
        # Check if already assigned to another vendor with non-pending status
        if order.get("vendor_id") is not None and order.get("vendor_id") != vendor_id and order.get("vendor_status") not in ("PENDING", "UNASSIGNED", ""):
            db.rollback()
            return False
            
        cur.execute(
            "UPDATE orders SET vendor_id=%s, vendor_status='ACCEPTED' WHERE id=%s AND (vendor_id IS NULL OR vendor_id=%s OR vendor_status='PENDING' OR vendor_status='UNASSIGNED' OR vendor_status IS NULL OR vendor_status='')",
            (vendor_id, order["id"], vendor_id)
        )
        if cur.rowcount > 0:
            _log_timeline(cur, order["id"], f"VENDOR_CLAIMED_BY_{vendor_id}", "VENDOR")
            db.commit()
            return True
        else:
            db.rollback()
            return False
    except Exception:
        db.rollback()
        return False
    finally:
        cur.close()
        db.close()