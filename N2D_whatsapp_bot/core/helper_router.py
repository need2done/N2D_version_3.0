"""
=================================================
GramioGO – Helper Router (FastAPI Compatible)
=================================================
✔ SAFE EXTENSIONS ADDED (NO BREAKING CHANGES)
✔ Atomic Accept FIXED
✔ Duplicate Accept Prevented
✔ Better Logging
"""

import traceback

import os
import json
from urllib.parse import quote
from typing import Optional, Dict, Any


from whatsapp_client import send_message, send_reply_buttons, send_image, send_interactive_list
from utils.tracking_link import generate_tracking_link, generate_helper_tracking_link
from utils.timeline import log_event

from db.helper_repo import (
    get_helper_by_phone,
    get_helper_status,
    helper_login,
    helper_logout,
    update_helper_location
)

from core.order_finalizer import push_unassigned_orders_to_helper

from db.order_repo import (
    accept_order_atomic,
    get_active_order_for_helper,
    get_order,
    get_order_by_db_id,
    save_bill_image,
    save_bill_amount,
    save_item_photo,
    mark_helper_arrived,
    submit_otp,
    generate_and_save_otp,
    verify_ride_otp,
    get_order_images,
    auto_approve_bill,
    auto_generate_payment,
    complete_order,
    get_ride_details,
    get_helper_stats,
    mark_ride_payment_generated,
    complete_ride_order,
    get_cart_items
)

def safe_parse_payload(payload_obj):
    if not payload_obj:
        return {}
    if isinstance(payload_obj, dict):
        return payload_obj
    if isinstance(payload_obj, str):
        try:
            return json.loads(payload_obj)
        except Exception:
            return {}
def resolve_delivery_location(order: dict) -> str:
    if not isinstance(order, dict):
        return "Contact customer for address"

    # 1. GPS Coordinates (Google Maps link)
    lat = order.get("customer_lat") or order.get("pickup_latitude") or order.get("latitude")
    lng = order.get("customer_lng") or order.get("pickup_longitude") or order.get("longitude")
    if lat and lng:
        try:
            f_lat, f_lng = float(lat), float(lng)
            if f_lat != 0 and f_lng != 0:
                return f"https://www.google.com/maps/dir/?api=1&destination={f_lat},{f_lng}"
        except (ValueError, TypeError):
            pass

    # 2. Text Address from Payload
    try:
        payload_data = safe_parse_payload(order.get("payload"))
        addr = payload_data.get("address") or payload_data.get("location") or payload_data.get("delivery_address")
        if addr:
            if isinstance(addr, dict):
                parts = [
                    addr.get('houseNo') or addr.get('house') or addr.get('flat'),
                    addr.get('street') or addr.get('streetName') or addr.get('address'),
                    addr.get('area') or addr.get('landmark'),
                    addr.get('city'),
                    addr.get('pincode') or addr.get('zip')
                ]
                clean_parts = [str(p).strip() for p in parts if p and str(p).strip()]
                if clean_parts:
                    return ", ".join(clean_parts)
            elif isinstance(addr, str) and addr.strip():
                return addr.strip()
    except Exception as e:
        print("Error parsing location payload:", e)

    # 3. Direct order/customer address columns
    direct_addr = order.get("location_address") or order.get("customer_address") or order.get("address") or order.get("pickup_location")
    if direct_addr and str(direct_addr).strip() and str(direct_addr).strip().lower() != "none":
        return str(direct_addr).strip()

    # 4. Fetch address from customers table
    cust_num = order.get("customer_number")
    if cust_num:
        try:
            from db.mysql_conn import get_db
            db = get_db()
            cur = db.cursor(dictionary=True)
            cur.execute("SELECT address, location_address, city FROM customers WHERE phone=%s LIMIT 1", (cust_num,))
            cust_row = cur.fetchone()
            cur.close()
            db.close()
            if cust_row:
                c_addr = cust_row.get("location_address") or cust_row.get("address") or cust_row.get("city")
                if c_addr and str(c_addr).strip() and str(c_addr).strip().lower() != "none":
                    return str(c_addr).strip()
        except Exception:
            pass

    return "Contact customer for address"


from config import ADMIN_NUMBER, HELPER_CHARGE, PLATFORM_FEE, UPI_ID, ANYWORK_BASE_FEE, get_service_pricing


# =================================================
# HELPER ROUTER
# =================================================

def handle_helper(phone: str, text: str, msg: Optional[Dict[str, Any]]):

    try:

        text = (text or "").strip()
        upper = text.upper()
        msg_type = msg.get("type") if isinstance(msg, dict) else None

        print("\nHELPER MESSAGE:", phone, text, msg_type)

        helper = get_helper_by_phone(phone)

        if not helper:
            send_message(phone, "❌ You are not registered as a helper.")
            return

        helper_id = helper["id"]
        helper_state = get_helper_status(helper_id)
        display_status = helper.get("status", "OFFLINE")

        # =================================================
        # MAIN MENU
        # =================================================

        if upper == "GO":
            menu_body = (
                f"👋 *Welcome to NEED2DONE*\n\n"
                f"👤 Name  : {helper['name']}\n"
                f"🆔 Code  : {helper['helper_code']}\n"
                f"🟢 Status: {display_status}\n\n"
                "Choose an action from the menu below:"
            )
            
            rows = [
                {"id": "H_TOGGLE", "title": "Online/Offline", "description": "Toggle your availability"},
                {"id": "H_LOCATION", "title": "Update Location", "description": "Share your live location"},
                {"id": "H_ACTIVE", "title": "My Active Order", "description": "View CURRENT order details"},
                {"id": "H_EARNINGS", "title": "My Earnings", "description": "Check your daily & total income"},
                {"id": "H_WALLET", "title": "My Wallet", "description": "Check your wallet balance"}
            ]
            
            send_interactive_list(
                to=phone,
                body=menu_body,
                button_text="Main Menu",
                rows=rows
            )
            return

        # =================================================
        # BUTTON HANDLING
        # =================================================

        if msg_type == "interactive":
            interactive = msg.get("interactive", {})
            btn = interactive.get("button_reply")
            lst = interactive.get("list_reply")

            if not btn and not lst:
                return

            btn_id = (btn.get("id") if btn else lst.get("id") if lst else "").strip()
            print("HELPER ACTION CLICKED:", btn_id)

            # ------------------------------------------------
            # TOGGLE ONLINE/OFFLINE
            # ------------------------------------------------

            if btn_id == "H_TOGGLE":

                if helper_state == "AVAILABLE":

                    if not helper_logout(helper_id):
                        send_message(phone, "⚠️ Cannot go offline during active order.")
                        return

                    send_message(phone, "🛑 You are now OFFLINE. You will not receive new requests.")

                else:
                    send_message(phone, "📍 Share LIVE location to go ONLINE.")

                return

            # ------------------------------------------------
            # LOCATION REQUEST
            # ------------------------------------------------

            if btn_id == "H_LOCATION":
                send_message(phone, "📍 Please share your LIVE location.")
                return

            # ------------------------------------------------
            # MY EARNINGS
            # ------------------------------------------------
            if btn_id == "H_EARNINGS":
                stats = get_helper_stats(helper_id)
                msg_body = (
                    f"💰 *My Earnings*\n\n"
                    f"📅 *Today*\n"
                    f"▫️ Orders  : {stats['today_count']}\n"
                    f"▫️ Earnings: ₹{stats['today_sum']}\n\n"
                )

                if stats.get('today_orders'):
                    msg_body += "📝 *Today's Detailed Orders:*\n"
                    for o in stats['today_orders']:
                        msg_body += f"🔹 {o['order_id']} ({o['time_str']}) - ₹{o['helper_charge']}\n"
                    msg_body += "\n"

                if stats.get('past_10_days'):
                    msg_body += "📆 *Past 10 Days:*\n"
                    for d in stats['past_10_days']:
                        msg_body += f"🗓 {d['date']} | {d['count']} orders | ₹{d['daily_charge']}\n"
                    msg_body += "\n"

                msg_body += (
                    f"🏆 *All Time Total*\n"
                    f"▫️ Orders  : {stats['total_count']}\n"
                    f"▫️ Earnings: ₹{stats['total_sum']}"
                )
                send_message(phone, msg_body)
                return

            # ------------------------------------------------
            # MY WALLET
            # ------------------------------------------------
            if btn_id == "H_WALLET":
                balance = float(helper.get('wallet_balance', 0.0))
                msg_body = f"💼 *My Wallet*\n\n"
                msg_body += f"💰 Current Balance: *₹{balance}*\n\n"
                
                if balance < 0:
                    msg_body += (
                        "⚠️ *Negative Balance*\n"
                        "Your balance is negative because you collected Cash on Delivery (COD) orders on behalf of Need2Done. "
                        "Please settle this due amount via UPI to the Admin to continue taking orders.\n\n"
                        "Admin UPI: `917095849056@ybl`"
                    )
                elif balance > 0:
                    msg_body += (
                        "✅ *Positive Balance*\n"
                        "You have successfully earned this amount via Online Payment orders! "
                        "The Admin will settle this amount directly to your bank account."
                    )
                else:
                    msg_body += "Your balance is fully settled!"
                    
                send_message(phone, msg_body)
                return

            # ------------------------------------------------
            # ACTIVE ORDER
            # ------------------------------------------------

            if btn_id == "H_ACTIVE":

                active = get_active_order_for_helper(helper_id)

                if not active:
                    send_message(phone, "📦 No active orders.")
                    return

                status = active['status']
                order_id = active['order_id']
                is_ride = active.get('engine_type') == 'RIDE'

                # Retroactive fast-track for catalog/vendor orders
                if status in ("HELPER_ACCEPTED", "BILL_IMAGE_UPLOADED"):
                    has_catalog_bill = (active.get("bill_amount") is not None and float(active.get("bill_amount")) > 0)
                    has_total_amount = (active.get("total_amount") is not None and float(active.get("total_amount")) > 0)
                    has_vendor = active.get("vendor_id") is not None

                    if active.get("engine_type") == "TASK" and (has_catalog_bill or has_total_amount or has_vendor):
                        from db.mysql_conn import get_db
                        fast_db = get_db()
                        fast_cur = fast_db.cursor()
                        fast_cur.execute(
                            "UPDATE orders SET status = 'ADMIN_APPROVED_BILL', approved_at = NOW() WHERE id = %s",
                            (active["id"],)
                        )
                        fast_db.commit()
                        fast_cur.close()
                        fast_db.close()
                        active["status"] = "ADMIN_APPROVED_BILL"
                        status = "ADMIN_APPROVED_BILL"

                # Base info (always shown)
                info = (
                    f"📦 *Active Order*\n\n"
                    f"🆔 Order  : {order_id}\n"
                    f"👤 Customer: {active.get('customer_name', 'N/A')}\n"
                    f"📞 Phone  : {active.get('customer_number', 'N/A')}\n"
                    f"📍 Status : {status}\n"
                )

                # Context-sensitive action buttons
                if status == "HELPER_ACCEPTED":
                    is_anywork = active.get("service") in ("AnyWork", 3, 5)
                    is_home_service = active.get("service") == "Home Services" or str(active.get("service")) == "10"
                    if is_ride or is_anywork or is_home_service:
                        info += "\n🏁 Navigate to location. Tap *Arrived* when there."
                        send_reply_buttons(phone, info, [
                            {"id": f"ARRIVED|{active['id']}", "title": "📍 Arrived"}
                        ])
                    else:
                        info += "\n🧾 Upload BILL IMAGE after purchase."
                        send_message(phone, info)

                elif status == "BILL_IMAGE_UPLOADED":
                    info += "\n💰 Send BILL AMOUNT (numbers only)."
                    send_message(phone, info)

                elif status == "ADMIN_APPROVED_BILL":
                    is_home_service = active.get("service") == "Home Services" or str(active.get("service")) == "10"
                    if is_home_service:
                        info += "\n🏁 Navigate to location. Tap *Arrived* when there."
                        send_reply_buttons(phone, info, [
                            {"id": f"ARRIVED|{active['id']}", "title": "📍 Arrived"}
                        ])
                    else:
                        info += "\n🛍️ Pick up items from the store, then tap *Picked Up*."
                        send_reply_buttons(phone, info, [
                            {"id": f"PICKED_UP|{active['id']}", "title": "🛍️ Picked Up"}
                        ])

                elif status == "ITEMS_PICKED_UP":
                    info += "\n📍 Go to customer. Tap *Arrived* when there."
                    send_reply_buttons(phone, info, [
                        {"id": f"ARRIVED|{active['id']}", "title": "📍 Arrived"}
                    ])

                elif status == "HELPER_ARRIVED":
                    is_home_service = active.get("service") == "Home Services" or str(active.get("service")) == "10"
                    if is_ride or is_home_service:
                        info += "\n🔐 Ask customer for *START OTP*.\nReply: *START 1234*"
                    else:
                        info += "\n📸 Upload ITEM PHOTO to proceed."
                    send_message(phone, info)

                elif status == "ITEM_PHOTO_UPLOADED":
                    info += "\n⏳ Waiting for admin to verify items."
                    send_message(phone, info)

                elif status == "ADMIN_VERIFY_ITEMS":
                    info += "\n⏳ Waiting for payment generation."
                    send_message(phone, info)

                elif status == "PAYMENT_GENERATED":
                    info += "\n⏳ Waiting for customer payment."
                    send_message(phone, info)

                elif status == "PAID":
                    info += "\n🔐 Tap to send delivery OTP to customer."
                    send_reply_buttons(phone, info, [
                        {"id": f"TRIGGER_OTP|{active['id']}", "title": "🔐 Send OTP"}
                    ])

                elif status == "OTP_SUBMITTED":
                    info += "\n⏳ OTP submitted. Waiting for admin verification."
                    send_message(phone, info)

                elif status == "RIDE_STARTED":
                    info += "\n🏁 Navigate to Drop Location.\nReply *END 1234* to complete."
                    send_message(phone, info)

                elif status == "SERVICE_STARTED":
                    info += "\n🛠️ Service is in progress. Tap 'Request End OTP' when finished."
                    send_reply_buttons(phone, info, [
                        {"id": f"REQ_END_OTP|{active['id']}", "title": "🏁 Request End OTP"},
                        {"id": f"REQ_EXT|{active['id']}", "title": "⏱️ Request Extension"}
                    ])

                else:
                    send_message(phone, info)

                return

            # =================================================
            # ❌ REJECT ORDER
            # =================================================

            if btn_id.startswith("REJECT_ORDER|") or btn_id.startswith("DECLINE_ORDER|"):
                order_code = btn_id.split("|", 1)[1]
                send_message(phone, f"❌ You have rejected order {order_code}.")
                return

            # =================================================
            # ✅ ACCEPT ORDER (FIXED SAFELY)
            # =================================================

            if btn_id.startswith("ACCEPT_ORDER|"):

                order_code = btn_id.split("|", 1)[1]

                print("LOG: ACCEPT REQUEST:", order_code)

                if helper_state != "AVAILABLE":
                    send_message(phone, "❌ You must be ONLINE to accept orders.")
                    return

                # 🔥 EXTRA CHECK BEFORE DB CALL
                existing_order = get_order(order_code)

                if not existing_order:
                    send_message(phone, "❌ Order not found.")
                    return

                if existing_order.get("helper_id") and existing_order.get("helper_id") != helper_id:
                    send_message(phone, "❌ Order already assigned to another helper")
                    return

                # 🔥 ATOMIC ACCEPT
                ok, reason = accept_order_atomic(order_code, helper_id)

                if not ok:
                    print("ERROR: ACCEPT FAILED:", reason)
                    send_message(phone, f"❌ {reason}")
                    return

                order = get_order(order_code)


                # ------------------------------------------------
                # TIMELINE
                # ------------------------------------------------

                log_event(
                    order["id"],
                    "HELPER_ACCEPTED",
                    f"Helper {helper['name']} accepted order",
                    "HELPER"
                )

                # ------------------------------------------------
                # AUTO FAST-TRACK FOR CATALOG/VENDOR ORDERS
                # ------------------------------------------------
                has_catalog_bill = (order.get("bill_amount") is not None and float(order.get("bill_amount")) > 0)
                has_total_amount = (order.get("total_amount") is not None and float(order.get("total_amount")) > 0)
                has_vendor = order.get("vendor_id") is not None

                if order.get("engine_type") == "TASK" and (has_catalog_bill or has_total_amount or has_vendor):
                    is_home_service = order.get("service") == "Home Services" or str(order.get("service")) == "10"
                    if not is_home_service:
                        from db.mysql_conn import get_db
                        fast_db = get_db()
                        fast_cur = fast_db.cursor()
                        fast_cur.execute(
                            "UPDATE orders SET status = 'ADMIN_APPROVED_BILL', approved_at = NOW() WHERE id = %s",
                            (order["id"],)
                        )
                        fast_db.commit()
                        fast_cur.close()
                        fast_db.close()
                        
                        # Refresh order state locally so messaging logic sees the new state
                        order["status"] = "ADMIN_APPROVED_BILL"

                # ------------------------------------------------
                # MESSAGES
                # ------------------------------------------------

                # Determine next instruction based on engine
                is_anywork = order.get("service") in ("AnyWork", 3, 5)
                is_home_service = order.get("service") == "Home Services" or str(order.get("service")) == "10"
                if order.get("engine_type") == "RIDE":
                    instr = "🏁 Go to Pickup location. Tap 'ARRIVED' once there."
                elif is_anywork or is_home_service:
                    instr = "🏁 Go to task location. Tap 'ARRIVED' once there."
                elif order["status"] == "ADMIN_APPROVED_BILL":
                    # If it was fast-tracked!
                    if has_vendor:
                        instr = "🏁 Pick up items from Vendor, then go to customer. Tap 'ARRIVED' when at customer."
                    else:
                        instr = "🏁 Pick up items, then go to customer. Tap 'ARRIVED' when at customer."
                else:
                    instr = "🧾 Upload BILL IMAGE after purchase."

                # ------------------------------------------------
                # 📍 LOCATION LINK
                # ------------------------------------------------
                is_home_service = order.get("service") == "Home Services" or str(order.get("service")) == "10"
                if order.get("engine_type") == "RIDE":
                    loc_label = "📍 *Pickup location:*"
                elif is_home_service:
                    loc_label = "📍 *Service location:*"
                else:
                    loc_label = "📍 *Delivery location:*"

                nav_link = resolve_delivery_location(order)

                print("LOG: NAV LINK:", nav_link)

                # ------------------------------------------------
                # TRACKING LINKS
                # ------------------------------------------------
                helper_live_url = generate_helper_tracking_link(
                    order['id'],
                    helper['helper_code']
                )

                # ------------------------------------------------
                # SEND ACCEPTANCE MESSAGE
                # ------------------------------------------------
                
                items_text = ""
                if order.get("engine_type") == "TASK":
                    # Check database cart items first
                    cart_items = get_cart_items(order["order_id"])
                    if cart_items:
                        items_text = "🛍️ *Items:*\n" + "\n".join(f"• {item['quantity']}x {item['product_name']} ({item['unit']})" for item in cart_items) + "\n\n"
                    else:
                        # Fallback to payload items
                        try:
                            payload_data = safe_parse_payload(order.get("payload"))
                            items = payload_data.get("items", [])
                            if items:
                                items_text = "🛍️ *Items:*\n" + "\n".join(f"• {item}" for item in items) + "\n\n"
                        except Exception:
                            pass
                
                # -----------------------------------------------------
                # VENDOR AUTO-ASSIGNMENT LOGIC (MOVED TO order_finalizer)
                # -----------------------------------------------------

                is_home_service = order.get("service") == "Home Services" or str(order.get("service")) == "10"
                
                # Hide customer contact number completely for Home Services (use blank or ID)
                phone_line = f"📞 Phone    : {order['customer_number']}\n\n" if not is_home_service else "\n"
                
                if is_home_service:
                    instr = "🏁 Go to customer location to perform the service. Tap 'ARRIVED' once there."
                
                ride_safety_rider = ""
                if order.get("engine_type") == "RIDE":
                    ride_safety_rider = (
                        "\n\n🛡️ *Safety Precautions:*\n"
                        "• Wear a helmet at all times & obey speed limits.\n"
                        "• Verify customer identity & OTP before starting ride.\n"
                        "• Follow traffic rules & drive safely."
                    )

                service_title = order.get('service', 'General Service')
                earnings_val = order.get('helper_charge', 20)

                accept_body = (
                    f"✅ *Order Accepted*\n\n"
                    f"🆔 Order : {order['order_id']}\n"
                    f"🛠️ Service : {service_title}\n"
                    f"👤 Customer : {order['customer_name']}\n"
                    f"{phone_line}"
                    f"💰 Earnings : ₹{earnings_val}\n\n"
                    f"{items_text}"
                    f"{loc_label}\n{nav_link or 'Check details'}\n\n"
                    f"📱 *Open Agent App:*\n{helper_live_url}\n\n"
                    f"{instr}"
                    f"{ride_safety_rider}"
                )


                if order.get("engine_type") == "RIDE" or is_anywork or is_home_service:
                    # RIDE, AnyWork, Home Service: Include "Arrived" button directly
                    send_reply_buttons(phone, accept_body, [
                        {"id": f"ARRIVED|{order['id']}", "title": "📍 Arrived"}
                    ])
                elif order["status"] == "ADMIN_APPROVED_BILL":
                    # Needs "Picked Up" button first
                    send_reply_buttons(phone, accept_body, [
                        {"id": f"PICKED_UP|{order['id']}", "title": "🛍️ Picked Up"}
                    ])
                else:
                    # TASK (No vendor): Plain message or manual flow
                    send_message(phone, accept_body)

                # ------------------------------------------------
                # NOTIFY CUSTOMER
                # ------------------------------------------------
                if order.get("engine_type") == "RIDE":
                    send_message(
                        order["customer_number"],
                        f"🚗 *Rider Assigned!*\n\n"
                        f"🆔 Order: {order['order_id']}\n"
                        f"👤 Rider: {helper['name']}\n"
                        f"📞 Phone: {phone}\n\n"
                        f"📍 *Live Tracking:*\n"
                        f"https://need2done.in/track/{order['order_id']}\n\n"
                        f"Your rider is on the way to pick you up!\n\n"
                        f"🛡️ *Safety Precautions:*\n"
                        f"• Please wear a helmet during the ride.\n"
                        f"• Verify rider name & vehicle details before boarding.\n"
                        f"• Share START OTP with your rider only when seated."
                    )
                elif is_home_service:
                    send_message(
                        order["customer_number"],
                        f"🛠️ *Your Professional is on the way!*\n\n"
                        f"👤 Professional : {helper['name']}\n"
                        f"📞 Contact      : {phone}\n"
                        f"🆔 Order ID      : {order['order_id']}\n\n"
                        f"They are currently heading to your location.\n\n"
                        f"📍 *Live Tracking:*\n"
                        f"https://need2done.in/track/{order['order_id']}"
                    )
                else:
                    send_message(
                        order["customer_number"],
                        f"🚗 *Your Order is on the way!*\n\n"
                        f"Your helper {helper['name']} is working on your order.\n"
                        f"📞 Contact: {phone}\n\n"
                        f"📍 *Live Tracking:*\n"
                        f"https://need2done.in/track/{order['order_id']}"
                    )

                # ------------------------------------------------
                # 📸 FORWARD CUSTOMER PHOTOS TO HELPER (TASK ONLY)
                # ------------------------------------------------
                if order.get("engine_type") == "TASK":
                    images = get_order_images(order["id"], 'ITEM')
                    if images:
                        send_message(phone, "📸 *Customer uploaded item photos:*")
                        for img in images:
                            mid = img.get("media_id") or img.get("image_url")
                            if mid:
                                send_image(phone, mid, f"Order: {order['order_id']}")

                send_message(
                    ADMIN_NUMBER,
                    f"👷 {helper['name']} accepted Order {order['order_id']}"
                )

                return

            # =================================================
            # PICKED UP
            # =================================================

            if btn_id.startswith("PICKED_UP|"):
                order_db_id = int(btn_id.split("|")[1])
                order = get_order_by_db_id(order_db_id)

                if not order:
                    send_message(phone, "❌ Order not found.")
                    return

                from db.mysql_conn import get_db
                db = get_db()
                cur = db.cursor()
                cur.execute("UPDATE orders SET status='ITEMS_PICKED_UP' WHERE id=%s", (order_db_id,))
                db.commit()
                cur.close()
                db.close()

                log_event(order_db_id, "ITEMS_PICKED_UP", "Items picked up from store", "HELPER")

                send_message(
                    order["customer_number"],
                    f"🛍️ *Items Picked Up!*\n\n"
                    f"Your helper has picked up your items and is heading to your location."
                )

                delivery_link = f"https://www.google.com/maps/dir/?api=1&destination={order['customer_lat']},{order['customer_lng']}" if order.get('customer_lat') else ""
                msg = (
                    f"✅ Items picked up!\n\n"
                    f"📍 *Delivery Location:*\n{delivery_link or 'Customer Address'}\n\n"
                    "Tap *Arrived* button below when you reach the customer."
                )
                
                send_reply_buttons(phone, msg, [
                    {"id": f"ARRIVED|{order['id']}", "title": "📍 Arrived"}
                ])
                return

            # =================================================
            # ARRIVED
            # =================================================

            if btn_id.startswith("ARRIVED|"):

                order_db_id = int(btn_id.split("|")[1])

                order = get_order_by_db_id(order_db_id)

                if not order:
                    send_message(phone, "❌ Order not found.")
                    return

                if not mark_helper_arrived(order["order_id"]):
                    send_message(phone, "⚠️ Cannot mark arrived.")
                    return

                log_event(order_db_id, "HELPER_ARRIVED", "Helper arrived", "HELPER")

                if order.get("engine_type") == "RIDE":
                    payload = safe_parse_payload(order.get("payload"))
                    start_otp = payload.get("start_otp", "----")
                    
                    send_message(phone, "📍 Arrived at Pickup.\n🔐 Please ask the customer for the *START OTP* and reply:\n*START <otp>*")
                    # Notify customer that rider has arrived
                    send_message(
                        order["customer_number"],
                        f"📍 *Your Rider has arrived!*\n\n"
                        f"👤 Rider: {helper['name']}\n"
                        f"Please share your *START OTP ({start_otp})* with the rider to begin the trip."
                    )
                elif order.get("service") == "Home Services" or str(order.get("service")) == "10":
                    payload = safe_parse_payload(order.get("payload"))
                    if "start_otp" not in payload:
                        import random
                        import json
                        payload["start_otp"] = str(random.randint(1000, 9999))
                        from db.mysql_conn import get_db
                        db = get_db()
                        cur = db.cursor()
                        cur.execute("UPDATE orders SET payload=%s WHERE id=%s", (json.dumps(payload), order["id"]))
                        db.commit()
                        cur.close()
                        db.close()
                    start_otp = payload.get("start_otp")
                    
                    send_message(phone, f"📍 Marked as ARRIVED.\n🔐 Please ask the customer for the *START OTP* and reply:\n*START <otp>*")
                    send_message(
                        order["customer_number"],
                        f"📍 *Your Professional has arrived!*\n\n"
                        f"Please share your *START OTP ({start_otp})* with the professional to begin the service."
                    )
                else:
                    pm = order.get("payment_method")
                    ps = order.get("payment_status")
                    
                    if pm in ("UPI", "COD"):
                        # Skip photo and jump to payment collection
                        from db.mysql_conn import get_db
                        db = get_db()
                        cur = db.cursor()
                        if pm == "UPI" and ps == "PAID":
                            cur.execute("UPDATE orders SET status='PAID', updated_at=NOW() WHERE id=%s", (order["id"],))
                            db.commit()
                            log_event(order["id"], "STATUS_UPDATED", "Status updated to PAID (Upfront Payment)", "SYSTEM")
                            send_reply_buttons(
                                phone,
                                f"📍 Marked as ARRIVED.\n✅ Payment of ₹{order.get('total_amount') or order.get('bill_amount')} was already completed online.\nClick below to send the delivery OTP to the customer.",
                                [{"id": f"TRIGGER_OTP|{order['id']}", "title": "🔐 Trigger OTP"}]
                            )
                        elif pm == "COD":
                            cur.execute("UPDATE orders SET status='PAYMENT_GENERATED', updated_at=NOW() WHERE id=%s", (order["id"],))
                            db.commit()
                            log_event(order["id"], "STATUS_UPDATED", "Status updated to PAYMENT_GENERATED (COD Upfront)", "SYSTEM")
                            
                            customer_phone = order.get("customer_number")
                            total = float(order.get("total_amount", 0))
                            
                            send_message(phone, f"📍 Marked as ARRIVED.\n\n💵 Collect ₹{total} from customer in CASH. Ask customer to click 'I HAVE PAID' to proceed.")
                            
                            send_message(
                                customer_phone,
                                (
                                    "💵 *Cash on Delivery*\n\n"
                                    f"💰 Amount : ₹{total}\n\n"
                                    "Your helper has arrived! Please pay the helper directly.\n"
                                    "After payment, click *I HAVE PAID*."
                                )
                            )
                            send_reply_buttons(
                                to=customer_phone,
                                body="Confirm once cash is handed over:",
                                buttons=[
                                    {
                                        "id": f"I_PAID_{order['id']}",
                                        "title": "✅ I Have Paid"
                                    }
                                ]
                            )
                        cur.close()
                        db.close()
                    else:
                        send_message(phone, "📍 Marked as ARRIVED.\nNow upload ITEM PHOTO.")
                        # Notify customer that helper has arrived
                        send_message(
                            order["customer_number"],
                            f"📍 *Your Helper has arrived!*\n\n"
                            f"👤 Helper: {helper['name']} is at your location."
                        )
                return

            # =================================================
            # REQ_END_OTP & REQ_EXT (Home Services)
            # =================================================
            if btn_id.startswith("REQ_END_OTP|"):
                order_db_id = int(btn_id.split("|")[1])
                order = get_order_by_db_id(order_db_id)
                if not order:
                    send_message(phone, "❌ Order not found.")
                    return
                payload = safe_parse_payload(order.get("payload"))
                if "end_otp" not in payload:
                    import random
                    import json
                    payload["end_otp"] = str(random.randint(1000, 9999))
                    from db.mysql_conn import get_db
                    db = get_db()
                    cur = db.cursor()
                    cur.execute("UPDATE orders SET payload=%s WHERE id=%s", (json.dumps(payload), order["id"]))
                    db.commit()
                    cur.close()
                    db.close()
                end_otp = payload.get("end_otp")
                
                send_message(phone, f"📍 Requested End OTP.\n🔐 Please ask the customer for the *END OTP* and reply:\n*END <otp>*")
                send_message(
                    order["customer_number"],
                    f"📍 *Service is about to end!*\n\n"
                    f"Please share your *END OTP ({end_otp})* with the professional to complete the service."
                )
                return

            if btn_id.startswith("REQ_EXT|"):
                order_db_id = int(btn_id.split("|")[1])
                order = get_order_by_db_id(order_db_id)
                if not order: return
                
                if order.get("extension_status") == "REQUESTED":
                    send_message(phone, "⏳ You already requested an extension. Waiting for customer approval.")
                    return
                
                payload = safe_parse_payload(order.get("payload"))
                duration_str = payload.get("duration", "1 Hour")
                base_price = float(order.get("bill_amount") or 200)
                
                base_mins = 60
                if "1.5" in duration_str: base_mins = 90
                elif "2" in duration_str: base_mins = 120
                elif "3" in duration_str: base_mins = 180
                
                price_per_min = base_price / base_mins
                
                p60 = round(price_per_min * 60)
                p30 = round(price_per_min * 30)
                p15 = round(price_per_min * 15)
                
                if p30 < 10: p30 = 100
                if p60 < 20: p60 = 200
                if p15 < 5: p15 = 50
                
                send_reply_buttons(
                    phone,
                    "⏱️ *Request Extension*\nSelect extra time needed:",
                    [
                        {"id": f"EXT_60|{order_db_id}|{p60}", "title": f"1 Hr (+₹{p60})"},
                        {"id": f"EXT_30|{order_db_id}|{p30}", "title": f"30 Mins (+₹{p30})"},
                        {"id": f"EXT_15|{order_db_id}|{p15}", "title": f"15 Mins (+₹{p15})"}
                    ]
                )
                return

            if btn_id.startswith("EXT_"):
                parts = btn_id.split("|")
                ext_mins = int(parts[0].replace("EXT_", ""))
                order_db_id = int(parts[1])
                ext_price = float(parts[2])
                
                order = get_order_by_db_id(order_db_id)
                if not order: return
                
                from db.mysql_conn import get_db
                db = get_db()
                cur = db.cursor()
                cur.execute("UPDATE orders SET extension_status='REQUESTED' WHERE id=%s", (order_db_id,))
                db.commit()
                cur.close()
                db.close()
                
                send_message(phone, f"✅ Requested {ext_mins} mins extension. Waiting for customer approval.")
                
                send_reply_buttons(
                    order["customer_number"],
                    f"⏱️ *Extension Requested*\n\nYour professional requested more time to complete the work.\n\nAdditional Time: {ext_mins} Minutes\nCost: +₹{ext_price}",
                    [
                        {"id": f"CUST_EXT_APPROVE|{order_db_id}|{ext_mins}|{ext_price}", "title": "✅ Approve"},
                        {"id": f"CUST_EXT_DECLINE|{order_db_id}", "title": "❌ Decline"}
                    ])
                return

            if btn_id.startswith("HLPR_EXT_ACCEPT|"):
                parts = btn_id.split("|")
                ext_mins = int(parts[1])
                ext_price = float(parts[2])
                order_db_id = int(parts[3])
                
                order = get_order_by_db_id(order_db_id)
                if not order:
                    send_message(phone, "⚠️ Order not found.")
                    return
                
                was_paid = order.get("payment_status") == "PAID"
                payload = safe_parse_payload(order.get("payload"))
                
                def safe_float(val, default=0.0):
                    try:
                        return float(val) if val is not None else default
                    except (ValueError, TypeError):
                        return default

                if was_paid:
                    payload["balance_due"] = safe_float(payload.get("balance_due")) + ext_price
                else:
                    payload["balance_due"] = safe_float(order.get("total_amount")) + ext_price
                
                import json
                
                from db.mysql_conn import get_db
                db = get_db()
                cur = db.cursor()
                cur.execute(
                    "UPDATE orders SET extension_status='APPROVED', service_end_time = DATE_ADD(service_end_time, INTERVAL %s MINUTE), total_amount = COALESCE(total_amount, 0) + %s, payment_status='PENDING', payload=%s WHERE id=%s",
                    (ext_mins, ext_price, json.dumps(payload), order_db_id)
                )
                db.commit()
                cur.close()
                db.close()
                
                order = get_order_by_db_id(order_db_id)
                send_reply_buttons(
                    phone,
                    f"✅ Extension Accepted (+{ext_mins} mins). Added +₹{ext_price} to final bill.",
                    [
                        {"id": f"REQ_END_OTP|{order_db_id}", "title": "🏁 Request End OTP"},
                        {"id": f"REQ_EXT|{order_db_id}", "title": "⏱️ Request Extension"}
                    ]
                )
                if order and order.get("customer_number"):
                    send_message(
                        order["customer_number"],
                        f"✅ Professional accepted your extension! +{ext_mins} mins added to your service."
                    )
                return

            if btn_id.startswith("HLPR_EXT_REJECT|"):
                order_db_id = int(btn_id.split("|")[1])
                order = get_order_by_db_id(order_db_id)
                send_reply_buttons(
                    phone,
                    "❌ Extension Rejected.",
                    [
                        {"id": f"REQ_END_OTP|{order_db_id}", "title": "🏁 Request End OTP"}
                    ]
                )
                if order and order.get("customer_number"):
                    send_message(
                        order["customer_number"],
                        "❌ Professional could not accept the extension at this time."
                    )
                return

            # =================================================
            # TRIGGER OTP
            # =================================================

            if btn_id.startswith("TRIGGER_OTP|"):

                order_db_id = int(btn_id.split("|")[1])

                order = get_order_by_db_id(order_db_id)

                if not order:
                    send_message(phone, "❌ Order not found.")
                    return

                otp = generate_and_save_otp(order["order_id"])

                if not otp:
                    send_message(phone, "⚠️ OTP cannot be generated.")
                    return

                send_message(
                    order["customer_number"],
                    f"""🔐 *Delivery OTP*

Your OTP: *{otp}*

Share this with helper."""
                )
                
                send_message(
                    phone,
                    "✅ OTP sent to customer!\n\nPlease ask them for the 6-digit OTP and type it here to complete the delivery."
                )
                return

            # =================================================
            # RIDE DROP REACHED (RIDE COMPLETED BUTTON)
            # =================================================

            if btn_id.startswith("RIDE_COMPLETED|"):
                order_db_id = int(btn_id.split("|")[1])
                order = get_order_by_db_id(order_db_id)
                if not order:
                    send_message(phone, "❌ Order not found.")
                    return

                ride = get_ride_details(order_db_id)
                if not ride:
                    send_message(phone, "❌ Ride details not found.")
                    return

                end_otp = ride.get("end_otp", "UNKNOWN")

                # Notify customer to share end OTP
                send_message(
                    order["customer_number"],
                    f"📍 *You have reached your destination!*\n\n"
                    f"Please share your *END OTP* with the rider to complete the trip.\n\n"
                    f"🔐 END OTP: *{end_otp}*"
                )

                # Tell helper to ask for END OTP
                send_message(
                    phone,
                    f"✅ Drop Reached!\n\n"
                    f"We have notified the customer.\n"
                    f"Please ask them for the END OTP and reply:\n*END <otp>*"
                )
                return

            # =================================================
            # ARRIVED AT STORE (Custom Work Shopping / Buy & Bring)
            # =================================================
            if btn_id.startswith("ARRIVED_STORE|"):
                order_db_id = int(btn_id.split("|")[1])
                order = get_order_by_db_id(order_db_id)
                if not order:
                    send_message(phone, "❌ Order not found.")
                    return

                from db.mysql_conn import get_db
                db = get_db()
                cur = db.cursor()
                cur.execute("UPDATE orders SET status='ARRIVED_AT_STORE', updated_at=NOW() WHERE id=%s", (order_db_id,))
                db.commit()
                cur.close()
                db.close()

                log_event(order_db_id, "ARRIVED_AT_STORE", "Helper arrived at store", "HELPER")

                # Notify Customer
                send_message(
                    order["customer_number"],
                    f"📍 *Your Helper has arrived at the store!*\n\n"
                    f"👤 Helper {helper['name']} is purchasing your requested items..."
                )

                # Prompt Helper to upload Bill Photo
                send_message(
                    phone,
                    "📍 *Marked as ARRIVED AT STORE.*\n\n"
                    "🧾 Please purchase items and upload **STORE RECEIPT BILL PHOTO**, then reply with the exact bill amount (numbers only)."
                )
                return

            # ------------------------------------------------
            # BILL CONFIRMATION (High Amount > ₹200 vs Small Amount <= ₹200)
            # ------------------------------------------------
            if btn_id.startswith("CONFIRM_BILL|"):
                amount = float(btn_id.split("|")[1])
                active = get_active_order_for_helper(helper_id)
                if not active or active["status"] not in ("BILL_IMAGE_UPLOADED", "ARRIVED_AT_STORE", "HELPER_ACCEPTED"):
                    send_message(phone, "❌ Invalid order state for bill upload.")
                    return

                save_bill_amount(active["order_id"], amount)
                log_event(active["id"], "BILL_AMOUNT_SUBMITTED", f"Bill amount: ₹{amount}", "HELPER")

                if amount > 200:
                    # HIGH AMOUNT BILL (> ₹200): Mandatory Online UPI Payment request sent to customer
                    from db.mysql_conn import get_db
                    db = get_db()
                    cur = db.cursor()
                    cur.execute("UPDATE orders SET status='BILL_PENDING_ONLINE_PAYMENT', updated_at=NOW() WHERE id=%s", (active["id"],))
                    db.commit()
                    cur.close()
                    db.close()

                    pay_url = f"{TRACKING_BASE_URL}/pay?order_id={active['order_id']}&amount={amount}"

                    send_url_button(
                        to=active["customer_number"],
                        text=(
                            f"🧾 *Store Receipt Bill Uploaded (₹{amount})*\n"
                            f"━━━━━━━━━━━━━━━━━━━━━\n"
                            f"📝 Order: #{active['order_id']}\n"
                            f"🧾 Store Bill Amount: *₹{amount}*\n\n"
                            f"⚠️ *Payment Notice:* Since store bill exceeds ₹200, please complete online UPI payment for the items so your helper can pick up."
                        ),
                        button_text=f"💳 Pay Store Bill ₹{int(amount)}",
                        url=pay_url
                    )

                    send_message(
                        phone,
                        f"📸 Store bill photo & amount of *₹{amount}* submitted.\n\n"
                        f"⏳ *Store bill exceeds ₹200.* Online UPI payment link sent to customer.\n"
                        f"Please wait at the store. You will receive notification as soon as customer pays online."
                    )
                else:
                    # SMALL AMOUNT BILL (<= ₹200): Customer can pay COD or Online UPI at doorstep
                    if auto_approve_bill(active["order_id"]):
                        log_event(active["id"], "BILL_AUTO_APPROVED", "System auto-approved bill", "SYSTEM")

                        send_message(
                            active["customer_number"],
                            f"✅ *Store Bill Uploaded (₹{amount})*\n\n"
                            f"Your store bill is ₹{amount}. You can pay COD (Cash on Delivery) or Online UPI at doorstep."
                        )

                        msg = (
                            f"✅ Bill of ₹{amount} submitted.\n"
                            "🛍️ Pick up items from the store, then tap *Picked Up*."
                        )
                        send_reply_buttons(phone, msg, [
                            {"id": f"PICKED_UP|{active['id']}", "title": "🛍️ Picked Up"}
                        ])
                    else:
                        send_message(phone, "📤 Bill submitted. Waiting for processing.")
                return

            if btn_id == "REENTER_BILL":
                send_message(phone, "💰 Please send the BILL AMOUNT again (numbers only).")
                return

        # =================================================
        # LOCATION MESSAGE
        # =================================================

        if msg_type == "location":

            loc = msg.get("location", {})

            lat = loc.get("latitude")
            lng = loc.get("longitude")

            if lat is None or lng is None:
                send_message(phone, "❌ Invalid location.")
                return

            if not update_helper_location(helper_id, lat, lng):
                send_message(phone, "⚠️ Location update failed.")
                return

            # --- WALLET CHECK ---
            if float(helper.get("wallet_balance", 0)) < 0:
                send_message(phone, f"⚠️ You cannot go ONLINE because your wallet balance is negative (₹{helper.get('wallet_balance')}).\nPlease clear your pending COD dues.")
                return

            if not helper_login(helper_id):
                send_message(phone, "⚠️ Cannot go ONLINE during active order.")
                return

            send_message(phone, "🟢 Location updated. You are ONLINE.")
            
            # 🔥 Push unassigned orders
            push_unassigned_orders_to_helper(phone, lat, lng)
            return

        # =================================================
        # IMAGE HANDLING (UNCHANGED)
        # =================================================

        active = get_active_order_for_helper(helper_id)

        if msg_type == "image":

            if not active:
                send_message(phone, "❌ No active order.")
                return

            media_id = msg.get("image", {}).get("id")

            if not media_id:
                send_message(phone, "❌ Invalid image.")
                return

            if active["status"] in ("HELPER_ACCEPTED", "BILL_IMAGE_UPLOADED"):
                save_bill_image(active["order_id"], media_id)
                log_event(active["id"], "BILL_IMAGE_UPLOADED", "Bill image uploaded", "HELPER")
                
                # If prepaid or CART, auto-set bill amount and approve
                pm = active.get("payment_method")
                ps = active.get("payment_status")
                if (pm == "UPI" and ps == "PAID") or active.get("engine_type") == "CART" or active.get("service") == "Vegetables & Fruits":
                    amt = active.get("total_amount") or active.get("bill_amount")
                    if amt:
                        save_bill_amount(active["order_id"], amt)
                        from db.mysql_conn import get_db
                        db = get_db()
                        cur = db.cursor()
                        cur.execute("UPDATE orders SET status='ADMIN_APPROVED_BILL' WHERE id=%s", (active["id"],))
                        db.commit()
                        cur.close()
                        db.close()
                        
                        msg = (
                            f"✅ Bill image uploaded.\n"
                            f"💳 Customer has already paid ₹{amt}.\n\n"
                            "🛍️ Pick up items from the store, then tap *Picked Up*."
                        )
                        send_reply_buttons(phone, msg, [{"id": f"PICKED_UP|{active['id']}", "title": "🛍️ Picked Up"}])
                        return

                send_message(phone, "💰 Send BILL AMOUNT (numbers only).")
                return

            if active["status"] == "HELPER_ARRIVED":
                save_item_photo(active["order_id"], media_id)
                log_event(active["id"], "ITEM_PHOTO_UPLOADED", "Item photo uploaded", "HELPER")
                
                # -----------------------------------------------------
                # Check if already paid or chosen COD (Cart Orders)
                # -----------------------------------------------------
                pm = active.get("payment_method")
                ps = active.get("payment_status")
                
                if pm in ("UPI", "COD"):
                    from db.mysql_conn import get_db
                    db = get_db()
                    cur = db.cursor()
                    if pm == "UPI" and ps == "PAID":
                        cur.execute("UPDATE orders SET status='PAID', updated_at=NOW() WHERE id=%s", (active["id"],))
                        db.commit()
                        cur.close()
                        db.close()
                        log_event(active["id"], "STATUS_UPDATED", "Status updated to PAID (Upfront Payment)", "SYSTEM")
                        send_reply_buttons(
                            phone,
                            f"📸 Item photo uploaded.\n✅ Payment of ₹{active.get('total_amount') or active.get('bill_amount')} was already completed online.\nClick below to send the delivery OTP to the customer.",
                            [{"id": f"TRIGGER_OTP|{active['id']}", "title": "🔐 Trigger OTP"}]
                        )
                    elif pm == "COD":
                        cur.execute("UPDATE orders SET status='PAYMENT_GENERATED', updated_at=NOW() WHERE id=%s", (active["id"],))
                        db.commit()
                        cur.close()
                        db.close()
                        log_event(active["id"], "STATUS_UPDATED", "Status updated to PAYMENT_GENERATED (COD Upfront)", "SYSTEM")
                        
                        customer_phone = active.get("customer_number")
                        total = float(active.get("total_amount", 0))
                        
                        send_message(
                            customer_phone,
                            (
                                "💵 *Cash on Delivery*\n\n"
                                f"💰 Amount : ₹{total}\n\n"
                                "Your helper has arrived! Please pay the helper directly.\n"
                                "After payment, click *I HAVE PAID*."
                            )
                        )

                        send_reply_buttons(
                            to=customer_phone,
                            body="Confirm once cash is handed over:",
                            buttons=[
                                {
                                    "id": f"I_PAID_{active['id']}",
                                    "title": "✅ I Have Paid"
                                }
                            ]
                        )
                        
                        send_message(phone, f"📸 Item photo uploaded.\n💵 Collect ₹{total} from customer in CASH. Ask customer to click 'I HAVE PAID' to proceed.")
                    
                    return

                # 🔥 AUTOMATION: Transition to Payment Generated
                is_anywork = active.get("service") in ("AnyWork", 3, 5)
                bill_amt = ANYWORK_BASE_FEE if is_anywork else (active.get("bill_amount") or 0)
                
                # Use dynamic charges from the database (which already includes surge and distance logic)
                pricing_svc = get_service_pricing(active.get("service"))
                fallback_hc = pricing_svc["helper_charge"]
                fallback_pf = pricing_svc["platform_fee"]
                db_hc = active.get("helper_charge")
                db_pf = active.get("platform_fee")
                
                dynamic_h_charge = float(db_hc if db_hc is not None else fallback_hc)
                dynamic_p_fee = float(db_pf if db_pf is not None else fallback_pf)

                # Apply active discounts
                from config import get_live_pricing
                pricing = get_live_pricing()
                active_offers_str = pricing.get("ACTIVE_OFFERS", "[]")
                try:
                    offers = json.loads(active_offers_str)
                except:
                    offers = []
                
                discount_amount = 0
                subtotal = float(bill_amt) + float(dynamic_h_charge)
                svc_type = "ANYWORK" if is_anywork else "TASK"
                for offer in offers:
                    if offer.get("service") == svc_type:
                        val = float(offer.get("value", 0))
                        if offer.get("type") == "PERCENT":
                            discount_amount += subtotal * (val / 100)
                        elif offer.get("type") == "AMOUNT":
                            discount_amount += val

                discount_amount = round(discount_amount, 2)
                final_total = round(subtotal - discount_amount + dynamic_p_fee, 2)

                total = auto_generate_payment(active["order_id"], bill_amt, dynamic_h_charge, dynamic_p_fee, total_override=final_total)
                
                if total:
                    log_event(active["id"], "PAYMENT_REQUEST_AUTO_GENERATED", f"Total: {total}", "SYSTEM")
                    
                    customer_phone = active.get("customer_number")
                    if customer_phone:
                        label = "Service" if is_anywork else "Bill"
                        payment_msg = (
                            f"💰 *Payment Required – Need2Done*\n\n"
                            f"🆔 Order : {active['order_id']}\n"
                            f"🧾 {label}  : ₹{bill_amt}\n"
                            f"🚚 Delivery: ₹{dynamic_h_charge}\n"
                        )
                        if discount_amount > 0:
                            payment_msg += f"🎁 Discount: -₹{discount_amount}\n"
                        
                        payment_msg += (
                            f"📋 Platform: ₹{dynamic_p_fee}\n"
                            f"━━━━━━━━━━━━━━━\n"
                            f"💳 *Total : ₹{total}*\n\n"
                            f"Choose payment method:"
                        )
                        send_reply_buttons(customer_phone, payment_msg, [
                            {"id": f"PAY_UPI_{active['id']}", "title": "💳 UPI"},
                            {"id": f"PAY_COD_{active['id']}", "title": "💵 Cash on Delivery"}
                        ])
                        
                    send_message(phone, f"📸 Item photo uploaded.\n✅ Payment request for ₹{total} sent to customer.")
                else:
                    send_message(phone, "📸 Item photo uploaded.")
                return

        # =================================================
        # NUMERIC HANDLING (OTP / BILL)
        # =================================================
        try:
            # Check if input is purely numeric
            if text.isdigit():
                if active:
                    # Task Engine OTP (6 digits)
                    if len(text) == 6:
                        if submit_otp(active["order_id"], text):
                            log_event(active["id"], "OTP_SUBMITTED", f"OTP {text} submitted (Raw)", "HELPER")
                            if complete_order(active["order_id"]):
                                log_event(active["id"], "ORDER_AUTO_COMPLETED", "Order completed via raw OTP", "SYSTEM")
                                send_message(phone, "✅ OTP verified.\n🎉 *Order Completed!*\n\nYou are now back ONLINE and ready for new orders.")
                                
                                # CUSTOMER THANK YOU
                                send_reply_buttons(
                                    active["customer_number"],
                                    f"🎉 *Order Completed!* 🎉\n\nThank you for choosing *Need2Done*! 🙏\nHow was your experience with {helper['name']}?",
                                    [
                                        {"id": f"RATE_5|{active['id']}", "title": "⭐⭐⭐⭐⭐"},
                                        {"id": f"RATE_3|{active['id']}", "title": "⭐⭐⭐"},
                                        {"id": f"RATE_1|{active['id']}", "title": "⭐"}
                                    ]
                                )
                                return
                            else:
                                send_message(phone, "✅ OTP submitted. Waiting for finalization.")
                                return
                        else:
                            send_message(phone, "❌ Invalid OTP. Please check with the customer.")
                            return

                    # Ride Engine OTP (4 digits)
                    elif active.get("engine_type") == "RIDE" and len(text) == 4:
                        # Auto-detect if it's START or END based on current status
                        otp_type = 'START' if active["status"] == "HELPER_ARRIVED" else 'END'
                        
                        text = f"{otp_type} {text}"
                        upper = text.upper()

                    elif active.get("engine_type") == "RIDE":
                        # Numeric but not 4 digits for ride
                        send_message(phone, "ℹ️ Please enter the *4-digit OTP* provided by the customer.")
                        return

                    # Case 2: Bill Amount (When status is BILL_IMAGE_UPLOADED)
                    if active["status"] == "BILL_IMAGE_UPLOADED":
                        amount = float(text)
                        confirm_msg = f"📝 You entered ₹{amount}.\nIs this amount correct?"
                        send_reply_buttons(phone, confirm_msg, [
                            {"id": f"CONFIRM_BILL|{amount}", "title": "✅ Confirm"},
                            {"id": "REENTER_BILL", "title": "❌ Re-enter"}
                        ])
                        return

        except ValueError:
            pass

        # ------------------------------------------------
        # 🔑 START/END OTP (RIDES & HOME SERVICES)
        # ------------------------------------------------
        is_pure_digit_otp = upper.strip().isdigit() and len(upper.strip()) == 4

        if upper.startswith("START ") or upper.startswith("END ") or (is_pure_digit_otp and active):
            
            is_home_service = active and (active.get("service") == "Home Services" or str(active.get("service")) == "10")
            
            if not active or (active.get("engine_type") != "RIDE" and not is_home_service):
                send_message(phone, "❌ Only available for Rides and Home Services.")
                return
                
            if is_pure_digit_otp:
                current_status = active.get("status", "")
                if current_status in ("SERVICE_STARTED", "RIDE_STARTED"):
                    otp_type = 'END'
                else:
                    otp_type = 'START'
                otp = upper.strip()
            else:
                otp_type = 'START' if upper.startswith("START ") else 'END'
                otp = upper.replace("START ", "").replace("END ", "").strip()
            
            if is_home_service:
                payload = safe_parse_payload(active.get("payload"))
                
                if otp_type == 'START':
                    expected = payload.get("start_otp")
                    if str(otp) != str(expected):
                        send_message(phone, "❌ Invalid START OTP. Please check with customer.")
                        return
                    
                    # Calculate duration
                    duration_str = payload.get("duration", "1 Hour")
                    minutes = 60
                    if "1.5" in duration_str: minutes = 90
                    elif "2" in duration_str: minutes = 120
                    elif "3" in duration_str: minutes = 180
                    
                    # Update DB for Home Services
                    from db.mysql_conn import get_db
                    db = get_db()
                    cur = db.cursor()
                    cur.execute("UPDATE orders SET status='SERVICE_STARTED', tracking_status='STARTED', service_start_time=NOW(), service_end_time=DATE_ADD(NOW(), INTERVAL %s MINUTE) WHERE id=%s", (minutes, active["id"]))
                    db.commit()
                    cur.close()
                    db.close()
                    
                    # Notify Helper
                    send_reply_buttons(
                        phone,
                        f"✅ Service STARTED! 🎉\n\nTimer ({minutes} mins) has begun.",
                        [{"id": f"REQ_END_OTP|{active['id']}", "title": "🏁 Request End OTP"}, {"id": f"REQ_EXT|{active['id']}", "title": "⏱️ Request Extension"}]
                    )
                    
                    # Notify Customer
                    send_reply_buttons(
                        active["customer_number"],
                        f"🛠️ *Service Started!*\n\n"
                        f"Your professional has started the work. The scheduled duration is {duration_str}.",
                        [{"id": f"CUST_REQ_EXT|{active['id']}", "title": "⏱️ Request Extension"}]
                    )
                    return
                else:
                    # END OTP handling for Home Services
                    expected = payload.get("end_otp")
                    if not expected:
                        send_message(phone, "❌ End OTP not generated yet. Please tap 'Request End OTP'.")
                        return
                    if str(otp) != str(expected):
                        send_message(phone, "❌ Invalid END OTP. Please check with customer.")
                        return
                    
                    # Calculate Balance Due
                    total = active.get("total_amount", 0)
                    payload = safe_parse_payload(active.get("payload"))
                    
                    def safe_float(val, default=0.0):
                        try:
                            return float(val) if val is not None else default
                        except (ValueError, TypeError):
                            return default

                    if active.get("payment_status") == "PAID":
                        balance_due = 0
                    else:
                        balance_due = safe_float(payload.get("balance_due", total), default=safe_float(total))
                    
                    from db.mysql_conn import get_db
                    db = get_db()
                    cur = db.cursor()
                    
                    if balance_due > 0:
                        # Move to payment generated
                        cur.execute("UPDATE orders SET status='PAYMENT_GENERATED', tracking_status='COMPLETED', completed_at=NOW() WHERE id=%s", (active["id"],))
                        db.commit()
                        cur.close()
                        db.close()
                        
                        send_message(phone, f"✅ Service Completed!\n\n💵 Please collect ₹{balance_due} from the customer via Cash/UPI. Ask them to tap 'I HAVE PAID'.")
                        
                        send_message(
                            active["customer_number"],
                            f"🛠️ *Service Completed*\n\n"
                            f"💰 Total Amount : ₹{total}\n"
                            f"💵 Balance Due : ₹{balance_due}\n\n"
                            f"Please pay the professional and tap *I HAVE PAID*."
                        )
                        send_reply_buttons(
                            active["customer_number"],
                            "Please select your payment method to complete the order:",
                            [
                                {"id": f"PAY_UPI_{active['id']}", "title": "📱 Pay Online (UPI)"},
                                {"id": f"PAY_COD_{active['id']}", "title": "💵 Cash on Delivery"}
                            ]
                        )
                    else:
                        # Fully prepaid! Skip PAYMENT_GENERATED and go to PAID
                        cur.execute("UPDATE orders SET status='PAID', tracking_status='COMPLETED', completed_at=NOW() WHERE id=%s", (active["id"],))
                        db.commit()
                        cur.close()
                        db.close()
                        
                        send_message(phone, "✅ Service Completed!\n\n✅ Customer has already paid in full.\nTap 'Trigger OTP' to finalize.")
                        send_reply_buttons(phone, "Select Action:", [{"id": f"TRIGGER_OTP|{active['id']}", "title": "✅ Trigger OTP"}])
                        
                        send_message(
                            active["customer_number"],
                            f"🛠️ *Service Completed*\n\n"
                            f"💰 Total Amount : ₹{total}\n"
                            f"✅ Fully Paid\n\n"
                            f"Thank you for using Need2Done!"
                        )
                    return

            ok, msg = verify_ride_otp(active["order_id"], otp, otp_type)
            
            if not ok:
                send_message(phone, msg)
                return
                
            if otp_type == 'START':
                ride = get_ride_details(active["id"])
                drop_link = ""
                
                # Try coordinates first
                if ride and ride.get("drop_lat") and ride.get("drop_lng"):
                    drop_link = f"\n📍 *Drop location:*\nhttps://www.google.com/maps/dir/?api=1&destination={ride['drop_lat']},{ride['drop_lng']}\n"
                else:
                    # Fallback to Text Address from payload JSON
                    details = safe_parse_payload(active.get("payload"))
                    drop_address = details.get("drop")
                    if drop_address:
                        drop_link = f"\n🏁 *Destination:* {drop_address}\n📍 *Navigate:*\nhttps://www.google.com/maps/search/?api=1&query={quote(drop_address)}\n"
                
                send_reply_buttons(
                    phone,
                    f"✅ Ride STARTED! 🎉\n{drop_link}\n\nClick below when you reach the drop location.",
                    [{"id": f"RIDE_COMPLETED|{active['id']}", "title": "📍 Drop Reached"}]
                )

                # Notify customer that ride has started
                tracking_url = generate_tracking_link(active["id"])
                send_message(
                    active["customer_number"],
                    f"🚗 *Your Ride has started!*\n\n"
                    f"🆔 Order: {active['order_id']}\n\n"
                    f"📍 Track your ride:\n{tracking_url}"
                )

            else:
                # ---- END OTP VERIFIED: Request Payment ----
                # verify_ride_otp already transitioned RIDE_STARTED → PAYMENT_GENERATED
                fare = active.get('total_amount') or active.get('bill_amount', 0)

                # Use global PLATFORM_FEE imported at top of module
                
                payment_msg = f"✅ *Ride Complete!* You have arrived at the destination.\n\n🆔 Order : {active['order_id']}\n"
                payload_data = safe_parse_payload(active.get("payload"))
                if "breakdown_base" in payload_data:
                    payment_msg += f"🚕 Base Fare: ₹{payload_data['breakdown_base']}\n"
                    if payload_data.get("breakdown_discount"):
                        payment_msg += f"🎁 Discount: -₹{payload_data['breakdown_discount']}\n"
                    payment_msg += f"📋 Platform : +₹{payload_data['breakdown_platform']}\n"
                else:
                    ride_pf = get_service_pricing("Ride")["platform_fee"]
                    base_fare = max(0, float(fare) - ride_pf)
                    payment_msg += f"🚕 Base Fare: ₹{base_fare}\n📋 Platform : +₹{ride_pf}\n"

                payment_msg += (
                    f"━━━━━━━━━━━━━━━\n"
                    f"💰 *Total   : ₹{fare}*\n\n"
                    f"Please choose your payment method:"
                )
                send_reply_buttons(
                    active["customer_number"],
                    payment_msg,
                    [
                        {"id": f"PAY_UPI_{active['id']}", "title": "💳 UPI"},
                        {"id": f"PAY_COD_{active['id']}", "title": "💵 Cash"}
                    ]
                )
                # Notify helper to wait for payment
                send_message(
                    phone,
                    f"✅ END OTP verified!\n\n"
                    f"💰 Fare ₹{fare} payment request sent to customer.\n"
                    f"⏳ Please wait for customer to complete payment."
                )
            return

        # ------------------------------------------------
        # 🧾 TASK OTP (GENERIC)
        # ------------------------------------------------
        if upper.startswith("OTP "):

            otp = upper.replace("OTP ", "").strip()

            if not active:
                send_message(phone, "❌ No active order.")
                return

            if not submit_otp(active["order_id"], otp):
                send_message(phone, "❌ Invalid OTP.")
                return

            log_event(active["id"], "OTP_SUBMITTED", "OTP submitted", "HELPER")

            # 🔥 AUTOMATION: Auto-Complete Order
            if complete_order(active["order_id"]):
                log_event(active["id"], "ORDER_AUTO_COMPLETED", "Order completed via OTP", "SYSTEM")
                send_message(phone, "✅ OTP verified.\n🎉 *Order Completed!*\n\nYou are now back ONLINE and ready for new orders.")
                
                # ------------------------------------------------
                # CUSTOMER THANK YOU & FEEDBACK
                # ------------------------------------------------
                send_reply_buttons(
                    active["customer_number"],
                    f"🎉 *Order Completed!* 🎉\n\n"
                    f"Thank you for choosing *Need2Done*! 🙏\n"
                    f"How was your experience with {helper['name']}?",
                    [
                        {"id": f"RATE_5|{active['id']}", "title": "⭐⭐⭐⭐⭐"},
                        {"id": f"RATE_3|{active['id']}", "title": "⭐⭐⭐"},
                        {"id": f"RATE_1|{active['id']}", "title": "⭐"}
                    ]
                )
            else:
                send_message(phone, "✅ OTP submitted. Waiting for finalization.")
            return

        # =================================================
        # DEFAULT
        # =================================================

        send_message(phone, "ℹ️ Type *GO* to open menu.")

    except Exception:
        print("ERROR: HELPER ROUTER ERROR")
        traceback.print_exc()