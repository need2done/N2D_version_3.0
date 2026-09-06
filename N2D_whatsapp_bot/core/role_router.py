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
import json
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
from core.vendor_router import handle_vendor

from router import route

from db.helper_repo import is_helper
from db.mysql_conn import get_db

try:
    from db.service_repo import is_service_active, SERVICE_NAMES
except Exception:
    def is_service_active(svc_id):
        return svc_id in (2, 5, 6, 8, 10)
    SERVICE_NAMES = {}

def is_vendor(phone: str) -> bool:
    db = get_db()
    if not db: return False
    cur = db.cursor()
    try:
        normalized_phone = phone if phone.startswith('+') else '+' + phone
        cur.execute("SELECT id FROM vendors WHERE (phone=%s OR phone=%s) AND status='Active' LIMIT 1", (phone, normalized_phone))
        return cur.fetchone() is not None
    finally:
        cur.close()
        db.close()


# =================================================
# CONSTANTS
# =================================================

RESTART_WORDS = {"hi", "hello", "hey", "start", "restart", "menu", "go"}

SERVICE_TEXT_MAP = {
    "1": 1, "groceries": 1, "grocery": 1,
    "2": 2, "medicines": 2, "medicine": 2,
    "3": 3, "parcel": 3,
    "4": 4, "ride": 4, "cab": 4, "auto": 4,
    "5": 5, "any work": 5, "anywork": 5,
    "6": 6, "support": 6, "help": 6,
    "7": 7, "vegetables": 7, "fruits": 7, "vegetables & fruits": 7,
    "9": 9, "food": 9, "food service": 9
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
    if "vegetable" in t or "fruit" in t:
        return 7
    if "food" in t:
        return 9
    return None


# =================================================
# DRAFT ORDER DETECTION
# =================================================

def check_for_draft_order(phone: str):
    db = get_db()
    if not db:
        return None
    cur = db.cursor(dictionary=True)
    try:
        # Only return DRAFT orders that actually have items in the cart
        cur.execute(
            """
            SELECT o.order_id, o.service 
            FROM orders o
            JOIN cart_items c ON o.order_id = c.order_id
            WHERE o.customer_number=%s AND o.status='DRAFT' 
            GROUP BY o.order_id, o.service, o.created_at
            ORDER BY o.created_at DESC 
            LIMIT 1
            """,
            (phone,)
        )
        return cur.fetchone()
    finally:
        cur.close()
        db.close()

def get_active_order_details(phone: str):
    db = get_db()
    if not db: return None
    cur = db.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT o.id, o.payload, o.order_id, o.service, o.status, o.total_amount, o.otp, h.name as helper_name, h.phone as helper_phone
            FROM orders o
            LEFT JOIN helpers h ON o.helper_id = h.id
            WHERE o.customer_number=%s AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'DRAFT', 'WAITING_FOR_CART')
            ORDER BY o.created_at DESC LIMIT 1
            """,
            (phone,)
        )
        return cur.fetchone()
    finally:
        cur.close()
        db.close()

def get_order_history(phone: str):
    db = get_db()
    if not db: return []
    cur = db.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT order_id, service, status, total_amount, DATE_FORMAT(created_at, '%d-%b-%Y') as date
            FROM orders
            WHERE customer_number=%s AND status != 'DRAFT'
            ORDER BY created_at DESC LIMIT 3
            """,
            (phone,)
        )
        return cur.fetchall()
    finally:
        cur.close()
        db.close()


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
    msg: Dict[str, Any],
    profile_name: str = ""
):

    try:

        user = normalize(from_number)

        raw_text = (text or "").strip()

        lower_text = raw_text.lower()
        upper = raw_text.upper()

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
        # 🏪 VENDOR ROUTING
        # =================================================

        if is_vendor(user):
            handle_vendor(user, raw_text, msg)
            return

        # =================================================
        # 👤 CUSTOMER INTERACTIVE
        # =================================================

        if msg_type == "interactive":

            interactive = msg.get("interactive", {})
            btn_id = ""
            if "button_reply" in interactive:
                btn_id = interactive["button_reply"].get("id", "")

            if btn_id.startswith("TRACK_ORDER_") or btn_id.startswith("MANAGE_BOOKING_"):
                from config import TRACKING_BASE_URL
                from whatsapp_client import send_url_button
                order_id = btn_id.replace("MANAGE_BOOKING_", "").replace("TRACK_ORDER_", "")
                url = f"{TRACKING_BASE_URL}/home-services/my-bookings?orderId={order_id}"
                if btn_id.startswith("TRACK_ORDER_"):
                    url = f"{TRACKING_BASE_URL}/track/{order_id}"
                
                send_url_button(
                    to=user,
                    text="Manage your Home Service bookings here:" if btn_id.startswith("MANAGE_BOOKING_") else "Track your order here:",
                    button_text="Manage Booking" if btn_id.startswith("MANAGE_BOOKING_") else "Track Order",
                    url=url
                )
                return

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

            if btn_id in ("CONTINUE_DRAFT", "VIEW_ACTIVE_ORDER"):
                session = get_session(user)
                # 1. If in-memory case state exists, resume it!
                if session.get("stage") == "IN_CASE" and session.get("case_state"):
                    send_message(user, "▶️ Resuming your order...")
                    reply = route(session, "", msg)
                    if reply:
                        send_message(user, reply)
                    return
                    
                # 2. Else check DB draft
                row = check_for_draft_order(user)
                if row:
                    session["user_id"] = user
                    session["stage"] = "IN_CASE"
                    session["order_id"] = row["order_id"]
                    session["service"] = 1 if row["service"] == "Groceries" else 7
                    session["case_state"] = "CART_REVIEW"
                    
                    send_message(user, f"Resuming your {row['service']} order `#{row['order_id']}`...")
                    reply = route(session, row["order_id"], msg)
                    if reply:
                        send_message(user, reply)
                    return

                # 3. Else check Active Order (Confirmed/Assigned/On The Way)
                active_order = get_active_order_details(user)
                if active_order:
                    helper_str = f"Helper: {active_order['helper_name']} ({active_order['helper_phone']})\nOTP to share: {active_order.get('otp', 'N/A')}\n" if active_order.get("helper_phone") else "Helper: Not Assigned Yet\n"
                    msg_text = (
                        f"📦 *Active Order: #{active_order['order_id']}*\n"
                        f"Service: {active_order['service']}\n"
                        f"Status: {active_order['status']} 🚴\n"
                        f"Total: ₹{active_order['total_amount']}\n"
                        f"{helper_str}"
                    )
                    send_message(user, msg_text)
                    from config import TRACKING_BASE_URL
                    from whatsapp_client import send_url_button
                    if active_order['service'] == 'Home Services':
                        url = f"{TRACKING_BASE_URL}/home-services/my-bookings?orderId={active_order['order_id']}"
                        send_url_button(to=user, text="Manage your Home Service booking:", button_text="Manage Booking", url=url)
                    else:
                        url = f"{TRACKING_BASE_URL}/track/{active_order['order_id']}"
                        send_url_button(to=user, text="Track your order status live:", button_text="Track Order", url=url)
                    return

                send_message(user, "⚠️ No pending order found.")
                send_rich_service_list(user, session.get("name"))
                return

            if btn_id == "NEW_ORDER":
                row = check_for_draft_order(user)
                if row:
                    db = get_db()
                    if db:
                        cur = db.cursor()
                        cur.execute("UPDATE orders SET status='CANCELLED' WHERE order_id=%s", (row["order_id"],))
                        db.commit()
                        cur.close()
                        db.close()
                reset_session(user)
                session = get_session(user)
                
                # Fetch customer name if exists
                db = get_db()
                cust_name = None
                if db:
                    cur = db.cursor(dictionary=True)
                    cur.execute("SELECT name FROM customers WHERE phone=%s", (user,))
                    row_cust = cur.fetchone()
                    cur.close()
                    db.close()
                    if row_cust and row_cust.get("name"):
                        cust_name = row_cust["name"]
                        
                if cust_name:
                    session["name"] = cust_name
                    session["stage"] = "ASK_SERVICE"
                    send_rich_service_list(user, cust_name)
                else:
                    session["stage"] = "ASK_NAME"
                    send_rich_welcome(user)
                return

            session = get_session(user)
            if btn_id.startswith("MED_"):
                if session.get("stage") != "IN_CASE" or session.get("service") != 2:
                    reset_session(user)
                    send_message(user, "⚠️ Session expired. Please start again.")
                    return
            elif btn_id.startswith("RIDE_"):
                if session.get("stage") != "IN_CASE" or session.get("service") != 4:
                    reset_session(user)
                    send_message(user, "⚠️ Session expired. Please start again.")
                    return
            elif btn_id.startswith("C1_") or btn_id.startswith("AW_") or btn_id in ("EDIT_ITEMS", "EDIT_LOCATION", "EDIT_COST"):
                if session.get("stage") != "IN_CASE" or session.get("service") not in (1, 3, 5, 9):
                    reset_session(user)
                    send_message(user, "⚠️ Session expired. Please start again.")
                    return
            elif btn_id.startswith("CART_") or btn_id.startswith("CANCEL_") or btn_id.startswith("PLACE_") or btn_id.startswith("PAY_"):
                if session.get("stage") != "IN_CASE" or session.get("service") not in (1, 7, 9, 10):
                    reset_session(user)
                    send_message(user, "⚠️ Session expired. Please start again.")
                    return

        # =================================================
        # 🔗 CHECKOUT REDIRECT MATCH (ORDER_XXXX & FOOD)
        # =================================================
        if msg_type == "text" and "🍽️ *Need2Done Food Order*" in raw_text:
            order_id_match = re.search(r"📋 \*Order ID:\* (N2D-[A-Z0-9-]+)", raw_text)
            restaurant_match = re.search(r"🏪 \*Restaurant:\* (.+)", raw_text)
            total_match = re.search(r"✅ \*Grand Total: ₹([0-9.]+)\*", raw_text)
            
            items_section = ""
            if "*Items Ordered:*" in raw_text:
                parts = raw_text.split("*Items Ordered:*")
                if len(parts) > 1:
                    items_section = parts[1].split("━━━━━━━━━━━━━━━━━━━━")[0].strip()
            
            items_list = [line.strip() for line in items_section.split("\n") if line.strip()]
            
            session = get_session(user)
            session["user_id"] = user
            session["service"] = 9
            session["stage"] = "IN_CASE"
            session["case_state"] = "LOCATION"
            session["data"] = {
                "items": items_list,
                "restaurant": restaurant_match.group(1).strip() if restaurant_match else "Restaurant",
                "cost": total_match.group(1).strip() if total_match else "TBD",
                "images": []
            }
            if order_id_match:
                session["order_id"] = order_id_match.group(1).strip()
            
            send_message(user, "🍽️ *Food Order Details Received!*\n\n📍 Please share your *delivery location* using the WhatsApp location feature so we can calculate the ETA and dispatch a rider.")
            return

        if msg_type == "text" and (upper.startswith("ORDER_") or re.match(r"^N2D[A-Z0-9]{4,10}$", upper)):
            order_code = raw_text.replace("ORDER_", "").strip()
            
            # Check if order ID has already been taken/used
            db = get_db()
            service_name_db = "Vegetables & Fruits"
            restaurant_name = ""
            if db:
                cur = db.cursor(dictionary=True)
                cur.execute("SELECT id, status, customer_number, service, payload FROM orders WHERE order_id=%s", (order_code,))
                order_row = cur.fetchone()
                
                if order_row:
                    existing_status = (order_row.get("status") or "").upper()
                    existing_customer = order_row.get("customer_number")
                    
                    # 🚨 UNIQUE ORDER ID PROTECTION: Block re-use if order is already confirmed/placed/completed or belongs to another customer
                    if existing_status not in ("DRAFT", "PENDING", "") or (existing_customer and existing_customer != user and existing_status != "DRAFT"):
                        cur.close()
                        db.close()
                        send_message(user, f"⚠️ *Order ID Already Taken*\n\nThe order ID `{order_code}` has already been used and cannot be taken again.\n\nEach order ID is unique to a single order. Please start a new order!")
                        return

                    # Link real customer details to draft order
                    cur.execute("SELECT id, name FROM customers WHERE phone=%s", (user,))
                    cust = cur.fetchone()
                    if cust:
                        cur.execute("UPDATE orders SET customer_number=%s, customer_id=%s, customer_name=%s WHERE order_id=%s", (user, cust['id'], cust['name'], order_code))
                    else:
                        cur.execute("UPDATE orders SET customer_number=%s WHERE order_id=%s", (user, order_code))
                    db.commit()

                    if order_row.get("service"):
                        service_name_db = order_row["service"]
                    if order_row.get("payload"):
                        try:
                            payload_data = json.loads(order_row["payload"]) if isinstance(order_row["payload"], str) else order_row["payload"]
                            restaurant_name = payload_data.get("restaurant", "")
                        except:
                            pass
                cur.close()
                db.close()
                
            session = get_session(user)
            session["user_id"] = user

            from config import TRACKING_BASE_URL
            if order_code.startswith("N2D_HS_"):
                from whatsapp_client import send_url_button
                send_url_button(
                    to=user,
                    text="Manage your Home Service bookings here:",
                    button_text="Manage Booking",
                    url=f"{TRACKING_BASE_URL}/home-services/my-bookings?orderId={order_code}"
                )
                return

            if order_code.startswith("N2DRD"):
                session["service"] = 4
                session["stage"] = "IN_CASE"
                session["case_state"] = "CONFIRM_RIDE"
                session["order_id"] = order_code
                
                db = get_db()
                pickup = "Unknown"
                drop = "Unknown"
                vehicle = "BIKE"
                price = 0.0
                distance = 0.0
                pickup_lat, pickup_lng = None, None
                drop_lat, drop_lng = None, None
                
                if db:
                    cur = db.cursor(dictionary=True)
                    cur.execute("SELECT payload FROM orders WHERE order_id=%s", (order_code,))
                    row = cur.fetchone()
                    if row and row.get("payload"):
                        try:
                            import json
                            payload = json.loads(row["payload"]) if isinstance(row["payload"], str) else row["payload"]
                            pickup = payload.get("pickup_address", "Unknown")
                            drop = payload.get("drop_address", "Unknown")
                            vehicle = payload.get("vehicle", "BIKE")
                            price = float(payload.get("price", 0.0))
                            distance = float(payload.get("distance", 0.0))
                            pickup_lat = payload.get("pickup_lat")
                            pickup_lng = payload.get("pickup_lng")
                            drop_lat = payload.get("drop_lat")
                            drop_lng = payload.get("drop_lng")
                        except Exception as e:
                            print("Error parsing ride payload:", e)
                    cur.close()
                    db.close()
                
                session["data"] = {
                    "pickup": pickup,
                    "drop": drop,
                    "vehicle": vehicle,
                    "price": price,
                    "distance_km": distance,
                    "pickup_lat": pickup_lat,
                    "pickup_lng": pickup_lng,
                    "drop_lat": drop_lat,
                    "drop_lng": drop_lng,
                    "start_otp": "",
                    "end_otp": "",
                    "breakdown_base": price - 5.0 if price > 5 else 0.0,
                    "breakdown_platform": 5.0 if price > 5 else price,
                    "breakdown_discount": 0.0,
                    "applied_offer": ""
                }
                
                summary = (
                    f"🚕 *Ride Summary*\n\n"
                    f"📍 From: {pickup}\n"
                    f"🏁 To: {drop}\n"
                    f"📏 Distance: {distance} km\n"
                    f"🚗 Vehicle: {vehicle}\n\n"
                    f"🧾 *Total Est. Fare: ₹{price}*\n\n"
                    "Confirm booking?"
                )
                from whatsapp_client import send_reply_buttons
                send_reply_buttons(
                    to=user,
                    body=summary,
                    buttons=[
                        {"id": "RIDE_OK", "title": "✅ Confirm"},
                        {"id": "RIDE_EDIT", "title": "✏️ Edit"},
                        {"id": "RIDE_CANCEL", "title": "❌ Cancel"}
                    ]
                )
                return


            # Map service name to ID
            service_map = {
                "Groceries": 1,
                "Medicines": 2,
                "Parcel": 3,
                "Ride": 4,
                "Any Work": 5,
                "Support": 6,
                "Vegetables & Fruits": 7,
                "Food Service": 9,
                "Home Services": 10
            }
            
            session["service"] = service_map.get(service_name_db, 7)
            session["stage"] = "IN_CASE"
            session["case_state"] = "CART_REVIEW"
            session["order_id"] = order_code
            
            # Pass restaurant name to session so auto-assign works
            if "data" not in session or not session["data"]:
                session["data"] = {}
            if restaurant_name:
                session["data"]["restaurant"] = restaurant_name
            
            # Start/Route Case
            reply = route(session, order_code, msg)
            if reply:
                send_message(user, reply)
            return

        if msg_type == "text" and upper.startswith("PAY_SUCCESS_"):
            order_code = raw_text.replace("PAY_SUCCESS_", "").strip()
            # Confirm order in DB
            db = get_db()
            cur = db.cursor()
            cur.execute("UPDATE orders SET status='CONFIRMED', payment_status='PAID', payment_method='UPI', customer_number=%s WHERE order_id=%s", (user, order_code))
            db.commit()
            cur.close()
            db.close()
            
            # Trigger helper auto assignment
            try:
                from core.helper_matcher import trigger_helper_assignment
                trigger_helper_assignment(order_code)
            except Exception as assign_err:
                print("Error triggers auto assignment:", assign_err)

            send_message(user, f"🎉 *Payment Successful!*\n\nYour order `#{order_code}` is confirmed. A delivery helper is being assigned.")
            reset_session(user)
            return

        if msg_type == "text" and upper.startswith("PAY_FAILED_"):
            order_code = raw_text.replace("PAY_FAILED_", "").strip()
            
            # Link the real WhatsApp phone number to the draft order
            db = get_db()
            if db:
                cur = db.cursor()
                cur.execute("UPDATE orders SET customer_number=%s WHERE order_id=%s", (user, order_code))
                db.commit()
                cur.close()
                db.close()
                
            send_message(user, f"❌ *Payment Failed for order #{order_code}*\n\nPlease try again or select Cash on Delivery.")
            session = get_session(user)
            session["user_id"] = user
            session["service"] = 7
            session["stage"] = "IN_CASE"
            session["case_state"] = "PAYMENT_SELECT"
            session["order_id"] = order_code
            
            reply = route(session, "", {})
            if reply:
                send_message(user, reply)
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

        # =================================================
        # 🔄 GLOBAL RESTART / GREETING WITH ACTIVE STATE CHECK
        # =================================================
        if msg_type == "text" and lower_text in RESTART_WORDS:
            # Check if user has an in-progress session OR a DB draft OR an active order
            in_memory_incomplete = (session.get("stage") == "IN_CASE" and session.get("case_state"))
            db_draft = check_for_draft_order(user)
            active_order = get_active_order_details(user)
            
            if in_memory_incomplete or db_draft or active_order:
                svc_map = {1: "Groceries", 2: "Medicines", 3: "Parcel", 4: "Ride", 5: "Any Work", 7: "Vegetables & Fruits", 9: "Food", 10: "Home Services"}
                svc_name = "order"
                if in_memory_incomplete and session.get("service"):
                    svc_name = svc_map.get(session.get("service"), "order")
                elif db_draft:
                    svc_name = db_draft.get("service", "order")
                elif active_order:
                    svc_name = active_order.get("service", "order")
                    
                name_str = session.get("name") or "there"
                from whatsapp_client import send_reply_buttons
                
                if active_order and not (in_memory_incomplete or db_draft):
                    helper_str = f"Helper: {active_order['helper_name']} ({active_order['helper_phone']})\nOTP to share: {active_order.get('otp', 'N/A')}\n" if active_order.get("helper_phone") else "Helper: Not Assigned Yet\n"
                    msg_body = (
                        f"📦 *Active Order: #{active_order['order_id']}*\n"
                        f"Service: {active_order['service']}\n"
                        f"Status: {active_order['status']} 🚴\n"
                        f"Total: ₹{active_order['total_amount']}\n"
                        f"{helper_str}\n"
                        f"Would you like to view/track your active order, or start a new order?"
                    )
                    send_reply_buttons(
                        to=user,
                        body=msg_body,
                        buttons=[
                            {"id": "CONTINUE_DRAFT", "title": "📦 View Active Order"},
                            {"id": "NEW_ORDER", "title": "🔄 Start New Order"}
                        ]
                    )
                else:
                    btn_body = (
                        f"👋 Welcome back, *{name_str}*!\n\n"
                        f"We noticed you have an incomplete *{svc_name}* order in progress. "
                        "Would you like to continue with it, or start a new order?"
                    )
                    send_reply_buttons(
                        to=user,
                        body=btn_body,
                        buttons=[
                            {"id": "CONTINUE_DRAFT", "title": "🛒 Continue Order"},
                            {"id": "NEW_ORDER", "title": "🔄 Start New Order"}
                        ]
                    )
                return

            reset_session(user)
            session = get_session(user)

        if not session.get("stage"):
            # SMART ACTIVE ORDER CHECK: Prevent interrupting ongoing orders
            if msg_type == "text":
                active_order = get_active_order_details(user)
                if active_order:
                    helper_str = f"Helper: {active_order['helper_name']} ({active_order['helper_phone']})\nOTP to share: {active_order.get('otp', 'N/A')}\n" if active_order.get("helper_phone") else "Helper: Not Assigned Yet\n"
                    msg = (
                        f"📦 *Active Order: #{active_order['order_id']}*\n"
                        f"Service: {active_order['service']}\n"
                        f"Status: {active_order['status']} 🚴\n"
                        f"Total: ₹{active_order['total_amount']}\n"
                        f"{helper_str}"
                    )
                    send_message(user, msg)
                    
                    if active_order['status'] == 'PAYMENT_GENERATED':
                        from whatsapp_client import send_reply_buttons
                        from core.helper_router import safe_parse_payload
                        payload = safe_parse_payload(active_order.get("payload"))
                        balance = float(payload.get("balance_due", active_order['total_amount']))
                        send_reply_buttons(
                            to=user,
                            body=f"💵 Balance Due : ₹{balance}\nPlease select your payment method to complete the order:",
                            buttons=[
                                {"id": f"PAY_UPI_{active_order['id']}", "title": "📱 Pay Online (UPI)"},
                                {"id": f"PAY_COD_{active_order['id']}", "title": "💵 Cash on Delivery"}
                            ]
                        )
                        return

                    if lower_text not in RESTART_WORDS:
                        send_message(user, "_(Type *Menu* or *Restart* to place a new order instead)_")
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
                
                # Check for Draft
                draft = check_for_draft_order(user)
                if draft:
                    from whatsapp_client import send_reply_buttons
                    btn_body = (
                        f"👋 Welcome back, *{session['name']}*!\n\n"
                        f"We noticed you have an incomplete order for {draft['service']} (`#{draft['order_id']}`). "
                        "Would you like to continue with it, or start a new order?"
                    )
                    send_reply_buttons(
                        to=user,
                        body=btn_body,
                        buttons=[
                            {"id": "CONTINUE_DRAFT", "title": "🛒 Continue Order"},
                            {"id": "NEW_ORDER", "title": "🔄 Start New Order"}
                        ]
                    )
                    return
                
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
            session["location_name"] = location.get("name")
            session["location_address"] = location.get("address")

            save_customer_location(user, lat, lng)

            send_message(user, "📍 Location received successfully.")

            if session.get("stage") in ["ASK_LOCATION", "IN_CASE"]:

                session["stage"] = "IN_CASE"

                reply = route(session, "LOCATION", msg)

                if reply:
                    send_message(user, reply)

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
                interactive_type = msg.get("interactive", {}).get("type", "")
                
                if interactive_type == "button_reply":
                    raw_text = msg.get("interactive", {}).get("button_reply", {}).get("id", "")
                    if raw_text == "MANAGE_BOOKING" or raw_text == "TRACK_ORDER":
                        from whatsapp_client import send_url_button
                        
                        db_conn = get_db()
                        cursor = db_conn.cursor(dictionary=True)
                        cursor.execute("""
                            SELECT order_id FROM orders 
                            WHERE customer_number = %s AND service = 'Home Services'
                            ORDER BY created_at DESC LIMIT 1
                        """, (user,))
                        row = cursor.fetchone()
                        cursor.close()
                        db_conn.close()
                        
                        order_id = row["order_id"] if row else None
                        if order_id:
                            url = f"{TRACKING_BASE_URL}/home-services/my-bookings?orderId={order_id}"
                            if raw_text == "TRACK_ORDER":
                                url = f"{TRACKING_BASE_URL}/track/{order_id}"
                            send_url_button(
                                to=user,
                                text="Manage your Home Service bookings here:" if raw_text == "MANAGE_BOOKING" else "Track your order here:",
                                button_text="Manage Booking" if raw_text == "MANAGE_BOOKING" else "Track Order",
                                url=url
                            )
                        else:
                            send_message(user, "You don't have any active Home Service bookings.")
                        return

                try:
                    list_id = msg["interactive"]["list_reply"]["id"]
                except Exception:
                    draft = check_for_draft_order(user)
                    if draft:
                        from whatsapp_client import send_reply_buttons
                        btn_body = (
                            f"We noticed you have an incomplete order for {draft['service']} (`#{draft['order_id']}`). "
                            "Would you like to continue with it, or start a new order?"
                        )
                        send_reply_buttons(
                            to=user,
                            body=btn_body,
                            buttons=[
                                {"id": "CONTINUE_DRAFT", "title": "🛒 Continue Order"},
                                {"id": "NEW_ORDER", "title": "🔄 Start New Order"}
                            ]
                        )
                    else:
                        send_message(user, "❌ Please select a service.")
                    return

                if list_id == "SERVICE_8":
                    orders = get_order_history(user)
                    if not orders:
                        send_message(user, "📝 You have no recent orders.")
                    else:
                        lines = ["📋 *Your Recent Orders*\n"]
                        for i, o in enumerate(orders, 1):
                            emoji = "✅" if o['status'] == "COMPLETED" else "❌" if o['status'] == "CANCELLED" else "🔄"
                            lines.append(f"{i}️⃣ `#{o['order_id']}` - {o['service']} (₹{o['total_amount']})\nStatus: {emoji} {o['status']}\nDate: {o['date']}\n")
                        send_message(user, "\n".join(lines))
                    send_rich_service_list(user, session.get("name"))
                    return

                service_map = {
                    "SERVICE_1": 1,
                    "SERVICE_2": 2,
                    "SERVICE_4": 4,
                    "SERVICE_5": 5,
                    "SERVICE_6": 6,
                    "SERVICE_7": 7,
                    "SERVICE_9": 9,
                    "SERVICE_10": 10,
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
                    # Check if they have a draft before showing service error
                    draft = check_for_draft_order(user)
                    if draft:
                        from whatsapp_client import send_reply_buttons
                        btn_body = (
                            f"We noticed you have an incomplete order for {draft['service']} (`#{draft['order_id']}`). "
                            "Would you like to continue with it, or start a new order?"
                        )
                        send_reply_buttons(
                            to=user,
                            body=btn_body,
                            buttons=[
                                {"id": "CONTINUE_DRAFT", "title": "🛒 Continue Order"},
                                {"id": "NEW_ORDER", "title": "🔄 Start New Order"}
                            ]
                        )
            target_svc = session.get("service")
            if target_svc and not is_service_active(target_svc):
                svc_title = SERVICE_NAMES.get(target_svc, "This service")
                send_message(
                    user, 
                    f"🚀 *{svc_title}* is currently coming soon in your area!\n\n"
                    "Currently available services:\n"
                    "🏠 *Home Services*\n"
                    "💊 *Medicines Service*\n"
                    "👨‍🔧 *Custom Work / Any Work*\n\n"
                    "Please select one of the available options below 👇"
                )
                session["service"] = None
                send_rich_service_list(user, session.get("name"))
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
