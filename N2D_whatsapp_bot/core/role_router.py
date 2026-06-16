"""
=================================================
Need2Done – Role Router (FastAPI Compatible)
=================================================

✔ Admin / Helper / Customer routing
✔ Proper location handling (customer + helper safe)
✔ Helper login triggered on location
✔ Session never stuck
✔ Order flow continues correctly
✔ Restart always works
✔ Never crashes webhook
✔ Production-safe GPS handling
✔ Fully compatible with helper_live_tracking
✔ Ready for browser live GPS system
✔ Framework independent (Flask / FastAPI)
"""

import re
import traceback
from typing import Dict, Any, Optional

from config import ADMIN_NUMBER
from session_store import get_session, reset_session

from whatsapp_client import (
    send_message, 
    send_service_list, 
    send_rich_welcome, 
    send_rich_service_list
)

from core.admin_router import handle_admin_interactive
from core.helper_router import handle_helper
from core.customer_router import handle_customer_interactive

from router import route

from db.helper_repo import is_helper
from db.mysql_conn import get_db


# =================================================
# CONSTANTS
# =================================================

RESTART_WORDS = {"hi", "hello", "hey", "start", "restart"}

SERVICE_TEXT_MAP = {
    "1": 1, "groceries": 1, "grocery": 1,
    "2": 2, "medicines": 2, "medicine": 2,
    "3": 3, "parcel": 3,
    "4": 4, "ride": 4, "cab": 4, "auto": 4,
    "5": 5, "any work": 5, "anywork": 5,
    "6": 6, "support": 6, "help": 6
}

def detect_service_from_text(text: str) -> Optional[int]:
    t = (text or "").lower()
    if "grocery" in t or "groceries" in t:
        return 1
    if "medicine" in t or "medicines" in t:
        return 2
    if "ride" in t or "cab" in t or "auto" in t:
        return 4
    if "parcel" in t or "any work" in t or "anywork" in t:
        return 5
    return None


# =================================================
# PHONE NORMALIZATION
# =================================================

def normalize(num: str) -> str:
    return re.sub(r"\D", "", str(num or ""))


ADMIN = normalize(ADMIN_NUMBER)


# =================================================
# SAVE CUSTOMER GPS (SAFE)
# =================================================

def save_customer_location(phone: str, latitude: float, longitude: float):

    db = None
    cur = None

    try:

        db = get_db()
        if not db:
            return

        cur = db.cursor()

        cur.execute("""
            UPDATE orders
            SET customer_lat=%s,
                customer_lng=%s
            WHERE customer_number=%s
            ORDER BY id DESC
            LIMIT 1
        """, (latitude, longitude, phone))

        db.commit()

        print("SUCCESS: CUSTOMER GPS SAVED")

    except Exception:

        traceback.print_exc()

    finally:

        if cur:
            cur.close()

        if db:
            db.close()


# =================================================
# MAIN ROUTER
# =================================================

def route_message(
    from_number: str,
    text: Optional[str],
    msg: Dict[str, Any]
):

    try:

        user = normalize(from_number)

        raw_text = (text or "").strip()

        lower_text = raw_text.lower()

        msg_type = msg.get("type") if isinstance(msg, dict) else None

        print("\n[MSG] ROUTE_MESSAGE")
        print("FROM :", user)
        print("TYPE :", msg_type)
        print("TEXT :", raw_text)

        # =================================================
        # 👑 ADMIN ROUTING
        # =================================================

        if user == ADMIN:

            if msg_type == "interactive":
                handle_admin_interactive(msg)

            return


        # =================================================
        # 🧑‍🔧 HELPER ROUTING (PRIORITY)
        # =================================================

        if is_helper(user):

            # -------------------------------------------------
            # HELPER LOCATION VIA WHATSAPP
            # -------------------------------------------------

            if msg_type == "location":

                location = msg.get("location", {})

                lat = location.get("latitude")
                lng = location.get("longitude")

                if lat is None or lng is None:
                    print("⚠ Invalid helper location payload")
                    return

                print("LOCATION: HELPER LOCATION RECEIVED (WhatsApp snapshot)")

                # forward to helper router
                handle_helper(user, "", msg)

                return

            # -------------------------------------------------
            # OTHER HELPER COMMANDS
            # -------------------------------------------------

            handle_helper(user, raw_text, msg)

            return


        # =================================================
        # 👤 CUSTOMER INTERACTIVE
        # =================================================

        if msg_type == "interactive":

            interactive = msg.get("interactive", {})
            btn_id = ""
            if "button_reply" in interactive:
                btn_id = interactive["button_reply"].get("id", "")

            # Handle Welcome Start
            if btn_id == "WELCOME_START":
                session = get_session(user)
                session["stage"] = "ASK_NAME"
                send_message(user, "Please type your *name* below to continue! 👇")
                return

            # Handle Welcome Service (Returning user)
            if btn_id == "WELCOME_SERVICE":
                session = get_session(user)
                session["stage"] = "ASK_SERVICE"
                send_rich_service_list(user, session.get("name"))
                return

            if handle_customer_interactive(user, msg):
                return

            session = get_session(user)
            if btn_id.startswith("MED_"):
                if session.get("stage") != "IN_CASE" or session.get("service") != 2:
                    reset_session(user)
                    send_message(user, "⚠️ Session expired. Please start again.")
                    return
            elif btn_id.startswith("C1_") or btn_id.startswith("AW_") or btn_id in ("EDIT_ITEMS", "EDIT_LOCATION", "EDIT_COST"):
                if session.get("stage") != "IN_CASE" or session.get("service") not in (1, 3, 5):
                    reset_session(user)
                    send_message(user, "⚠️ Session expired. Please start again.")
                    return


        # =================================================
        # 👤 SESSION INIT
        # =================================================

        session = get_session(user)

        # Prevent double-tap or hijacked service selection when already in case
        if msg_type == "interactive":
            interactive = msg.get("interactive", {})
            list_reply = interactive.get("list_reply", {})
            list_id = list_reply.get("id", "")
            if list_id.startswith("SERVICE_") and session.get("stage") == "IN_CASE":
                print(f"LOG: Ignoring duplicate service selection: {list_id}")
                return

        if not session.get("stage"):
            # SMART ACTIVE ORDER CHECK: Prevent interrupting ongoing orders
            if msg_type == "text" and lower_text not in RESTART_WORDS:
                from db.order_repo import has_active_order_for_customer
                if has_active_order_for_customer(user):
                    send_message(user, "ℹ️ You currently have an active order/ride. Please coordinate directly with your assigned helper or share the OTP with them.\n\n_(Type *Hi* or *Restart* if you want to place a new order)_")
                    return

            detected_svc = None
            if msg_type == "text":
                detected_svc = detect_service_from_text(raw_text)

            db = get_db()
            cur = db.cursor(dictionary=True)
            cur.execute("SELECT name FROM customers WHERE phone=%s", (user,))
            customer = cur.fetchone()
            cur.close()
            db.close()

            if customer and customer.get("name"):
                forbidden_names = ["groceries", "medicines", "medicine", "parcel", "ride", "any work", "anywork", "support"]
                if customer["name"].strip().lower() in forbidden_names:
                    session["stage"] = "ASK_NAME"
                    session["user_id"] = user  # ✅ FIX: always set user_id
                    if detected_svc:
                        session["pending_service"] = detected_svc
                    send_rich_welcome(user)
                    return

                session["name"] = customer["name"]
                session["user_id"] = user  # ✅ FIX: always set user_id
                
                if detected_svc:
                    session["service"] = detected_svc
                    session["stage"] = "IN_CASE"
                    session["case_state"] = ""
                    reply = route(session, "", {})
                    if reply:
                        send_message(user, reply)
                    return

                session["stage"] = "ASK_SERVICE"
                try:
                    send_rich_welcome(user, session["name"])
                except:
                    send_message(user, f"👋 Welcome back, *{session['name']}*!\n\nHow can I help you today?")
                    send_service_list(user)
                return
            else:
                session["stage"] = "ASK_NAME"
                session["user_id"] = user  # ✅ FIX: always set user_id
                if detected_svc:
                    session["pending_service"] = detected_svc
                send_rich_welcome(user)
                return


        # =================================================
        # 📍 CUSTOMER LOCATION HANDLER
        # =================================================

        if msg_type == "location":

            location = msg.get("location", {})

            lat = location.get("latitude")
            lng = location.get("longitude")

            if lat is None or lng is None:

                send_message(user, "❌ Invalid location data.")

                return

            print("LOCATION: CUSTOMER LOCATION RECEIVED")

            session["latitude"] = lat
            session["longitude"] = lng

            save_customer_location(user, lat, lng)

            send_message(user, "📍 Location received successfully.")

            if session.get("stage") in ["ASK_LOCATION", "IN_CASE"]:

                session["stage"] = "IN_CASE"

                reply = route(session, "LOCATION", msg)

                if reply:
                    send_message(user, reply)

            return


        # =================================================
        # 🔄 GLOBAL RESTART
        # =================================================

        if msg_type == "text" and lower_text in RESTART_WORDS:

            reset_session(user)

            session = get_session(user)

            session["user_id"] = user
            session["stage"] = "ASK_NAME"

            send_rich_welcome(user)

            return


        # =================================================
        # 🧾 ASK NAME
        # =================================================

        if session["stage"] == "ASK_NAME":

            if msg_type != "text":

                send_message(user, "❓ Please type your *name*.")

                return

            if not re.match(r"^[A-Za-z ]{2,}$", raw_text):

                send_message(user, "❌ Please enter a valid name.")

                return

            forbidden_names = ["groceries", "medicines", "medicine", "parcel", "ride", "any work", "anywork", "support"]
            if raw_text.strip().lower() in forbidden_names:
                send_message(user, "❌ Please enter your actual name, not a service name.")
                return

            session["name"] = raw_text.title()
            session["stage"] = "ASK_SERVICE"
            session["user_id"] = user  # ✅ FIX: ensure user_id is set after name

            # 🔥 Save name to database immediately so we remember them next time
            try:
                db = get_db()
                cur = db.cursor()
                cur.execute("""
                    INSERT INTO customers (phone, name) 
                    VALUES (%s, %s) 
                    ON DUPLICATE KEY UPDATE name=%s
                """, (user, session["name"], session["name"]))
                db.commit()
                cur.close()
                db.close()
            except Exception as e:
                print(f"Error saving customer name: {e}")

            if session.get("pending_service"):
                session["service"] = session.pop("pending_service")
                session["stage"] = "IN_CASE"
                session["case_state"] = ""
                reply = route(session, "", {})
                if reply:
                    send_message(user, reply)
            else:
                try:
                    send_rich_service_list(user, session["name"])
                except Exception:
                    send_service_list(user)

            return


        # =================================================
        # 🛠 ASK SERVICE
        # =================================================

        if session["stage"] == "ASK_SERVICE":

            if msg_type == "interactive":

                try:
                    list_id = msg["interactive"]["list_reply"]["id"]

                except Exception:

                    send_message(user, "❌ Please select a service.")

                    return

                service_map = {
                    "SERVICE_1": 1,
                    "SERVICE_2": 2,
                    "SERVICE_4": 4,
                    "SERVICE_5": 5,
                    "SERVICE_6": 6,
                }

                if list_id not in service_map:

                    send_message(user, "❌ Invalid service.")

                    return

                session["service"] = service_map[list_id]

            elif msg_type == "text" and lower_text in SERVICE_TEXT_MAP:
                session["service"] = SERVICE_TEXT_MAP[lower_text]
            else:
                detected = detect_service_from_text(raw_text)
                if detected:
                    session["service"] = detected
                else:
                    send_message(user, "❗ Please select a service (1–5).")
                    return

            session["stage"] = "IN_CASE"
            session["case_state"] = ""
            session["user_id"] = user  # ✅ FIX: ensure user_id is set when entering case flow

            reply = route(session, "", {})

            if reply:
                send_message(user, reply)

            return


        # =================================================
        # 📦 MAIN SERVICE FLOW
        # =================================================

        reply = route(session, raw_text, msg)

        if reply:
            send_message(user, reply)


    except Exception:

        print("ERROR: FATAL ERROR INSIDE role_router")

        traceback.print_exc()
