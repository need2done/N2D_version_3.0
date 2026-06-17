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
    complete_ride_order
)


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

        # =================================================
        # MAIN MENU
        # =================================================

        if upper == "GO":
            menu_body = (
                f"👋 *Welcome to NEED2DONE*\n\n"
                f"👤 Name  : {helper['name']}\n"
                f"🆔 Code  : {helper['helper_code']}\n"
                f"🟢 Status: {helper_state}\n\n"
                "Choose an action from the menu below:"
            )
            
            rows = [
                {"id": "H_TOGGLE", "title": "Online/Offline", "description": "Toggle your availability"},
                {"id": "H_LOCATION", "title": "Update Location", "description": "Share your live location"},
                {"id": "H_ACTIVE", "title": "My Active Order", "description": "View CURRENT order details"},
                {"id": "H_EARNINGS", "title": "My Earnings", "description": "Check your daily & total income"}
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

                    send_message(phone, "🔴 You are now OFFLINE.")

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
                    f"📦 Orders  : {stats['today_count']}\n"
                    f"💸 Earnings: ₹{stats['today_sum']}\n\n"
                )

                if stats.get('today_orders'):
                    msg_body += "📝 *Today's Orders:*\n"
                    for o in stats['today_orders']:
                        msg_body += f"▫️ {o['order_id']} ({o['time_str']}) - ₹{o['helper_charge']}\n"
                    msg_body += "\n"

                msg_body += (
                    f"🏆 *All Time*\n"
                    f"📦 Orders  : {stats['total_count']}\n"
                    f"💸 Earnings: ₹{stats['total_sum']}"
                )
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
                    if is_ride or is_anywork:
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
                    info += "\n📍 Go to customer. Tap *Arrived* when there."
                    send_reply_buttons(phone, info, [
                        {"id": f"ARRIVED|{active['id']}", "title": "📍 Arrived"}
                    ])

                elif status == "HELPER_ARRIVED":
                    if is_ride:
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

                else:
                    send_message(phone, info)

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

                if existing_order.get("helper_id"):
                    send_message(phone, "❌ Order already assigned")
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
                # MESSAGES
                # ------------------------------------------------

                # Determine next instruction based on engine
                is_anywork = order.get("service") in ("AnyWork", 3, 5)
                if order.get("engine_type") == "RIDE":
                    instr = "🏁 Go to Pickup location. Tap 'ARRIVED' once there."
                elif is_anywork:
                    instr = "🏁 Go to task location. Tap 'ARRIVED' once there."
                else:
                    instr = "🧾 Upload BILL IMAGE after purchase."

                # ------------------------------------------------
                # 📍 LOCATION LINK
                # ------------------------------------------------
                nav_link = ""
                loc_label = "📍 *Pickup location:*"
                
                if order.get("engine_type") == "RIDE":
                    # For rides, we go to the pickup coordinates
                    if order.get("customer_lat") and order.get("customer_lng"):
                        nav_link = f"https://www.google.com/maps/dir/?api=1&destination={order['customer_lat']},{order['customer_lng']}"
                    loc_label = "📍 *Pickup location:*"
                else:
                    # For tasks, we go to the customer coordinates for delivery
                    if order.get("customer_lat") and order.get("customer_lng"):
                        nav_link = f"https://www.google.com/maps/dir/?api=1&destination={order['customer_lat']},{order['customer_lng']}"
                    loc_label = "📍 *Delivery location:*"

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
                    try:
                        payload_data = json.loads(order.get("payload", "{}"))
                        items = payload_data.get("items", [])
                        if items:
                            items_text = "🛍️ *Items:*\n" + "\n".join(f"• {item}" for item in items) + "\n\n"
                    except:
                        pass

                accept_body = (
                    f"✅ *Order Accepted*\n\n"
                    f"🆔 Order : {order['order_id']}\n"
                    f"👤 Customer : {order['customer_name']}\n"
                    f"📞 Phone    : {order['customer_number']}\n\n"
                    f"{items_text}"
                    f"{loc_label}\n{nav_link or 'Check details'}\n\n"
                    f"📱 *Open Agent App:*\n{helper_live_url}\n\n"
                    f"{instr}"
                )


                if order.get("engine_type") == "RIDE" or is_anywork:
                    # RIDE or AnyWork: Include "Arrived" button directly
                    send_reply_buttons(phone, accept_body, [
                        {"id": f"ARRIVED|{order['id']}", "title": "📍 Arrived"}
                    ])
                else:
                    # TASK (Groceries): Plain message
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
                        f"Your rider is on the way to pick you up!"
                    )
                else:
                    send_message(
                        order["customer_number"],
                        f"🚗 *Your Order is on the way!*\n\n"
                        f"Your helper {helper['name']} is working on your order.\n"
                        f"📞 Contact: {phone}"
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
                    try:
                        payload = json.loads(order.get("payload", "{}"))
                    except:
                        payload = {}
                    start_otp = payload.get("start_otp", "----")
                    
                    send_message(phone, "📍 Arrived at Pickup.\n🔐 Please ask the customer for the *START OTP* and reply:\n*START <otp>*")
                    # Notify customer that rider has arrived
                    send_message(
                        order["customer_number"],
                        f"📍 *Your Rider has arrived!*\n\n"
                        f"👤 Rider: {helper['name']}\n"
                        f"Please share your *START OTP ({start_otp})* with the rider to begin the trip."
                    )
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

            # ------------------------------------------------
            # BILL CONFIRMATION
            # ------------------------------------------------
            if btn_id.startswith("CONFIRM_BILL|"):
                amount = float(btn_id.split("|")[1])
                active = get_active_order_for_helper(helper_id)
                if not active or active["status"] != "BILL_IMAGE_UPLOADED":
                    send_message(phone, "❌ Invalid order state.")
                    return

                save_bill_amount(active["order_id"], amount)
                log_event(active["id"], "BILL_AMOUNT_SUBMITTED", f"Bill amount: {amount}", "HELPER")

                # 🔥 AUTOMATION: Auto-Approve Bill
                if auto_approve_bill(active["order_id"]):
                    log_event(active["id"], "BILL_AUTO_APPROVED", "System auto-approved bill", "SYSTEM")
                    
                    # Add delivery link
                    delivery_link = f"https://www.google.com/maps/dir/?api=1&destination={active['customer_lat']},{active['customer_lng']}" if active.get('customer_lat') else ""
                    
                    msg = (
                        f"✅ Bill of ₹{amount} confirmed.\n"
                        f"📍 *Delivery Location:*\n{delivery_link}\n\n"
                        "Tap *Arrived* button below when you reach the customer."
                    )
                    send_reply_buttons(phone, msg, [
                        {"id": f"ARRIVED|{active['id']}", "title": "📍 Arrived"}
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

            if active["status"] == "HELPER_ACCEPTED":
                save_bill_image(active["order_id"], media_id)
                log_event(active["id"], "BILL_IMAGE_UPLOADED", "Bill image uploaded", "HELPER")
                send_message(phone, "💰 Send BILL AMOUNT (numbers only).")
                return

            if active["status"] == "HELPER_ARRIVED":
                save_item_photo(active["order_id"], media_id)
                log_event(active["id"], "ITEM_PHOTO_UPLOADED", "Item photo uploaded", "HELPER")
                
                # 🔥 AUTOMATION: Transition to Payment Generated
                is_anywork = active.get("service") in ("AnyWork", 3, 5)
                bill_amt = ANYWORK_BASE_FEE if is_anywork else active.get("bill_amount", 0)
                
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
                    import json
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
                    # Case 1: OTP Handling (When status is PAID or RIDE-related)
                    if active["status"] == "PAID" or active.get("engine_type") == "RIDE":
                        
                        # Task Engine OTP (6 digits)
                        if active["status"] == "PAID" and len(text) == 6:
                            if submit_otp(active["order_id"], text):
                                # ... existing task completion logic ...
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
                                send_message(phone, "❌ Invalid OTP. Please check with the customer.")
                                return

                        # Ride Engine OTP (4 digits)
                        elif active.get("engine_type") == "RIDE" and len(text) == 4:
                            # Auto-detect if it's START or END based on current status
                            otp_type = 'START' if active["status"] == "HELPER_ARRIVED" else 'END'
                            
                            # We don't call verify_ride_otp here directly if we want to reuse the START/END block.
                            # Instead, we just "fake" the message text and let it fall through to the START/END block below.
                            text = f"{otp_type} {text}"
                            upper = text.upper()
                            # Do NOT return, let it fall through to the "if upper.startswith('START ')" block below.

                        elif active["status"] == "PAID":
                            # Numeric but not 6 digits - give specific hint instead of falling through
                            send_message(phone, "ℹ️ Please enter the *6-digit OTP* provided by the customer.")
                            return
                        
                        elif active.get("engine_type") == "RIDE":
                            # Numeric but not 4 digits
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
        # 🔑 START/END OTP (RIDES)
        # ------------------------------------------------
        if upper.startswith("START ") or upper.startswith("END "):
            
            if not active or active.get("engine_type") != "RIDE":
                send_message(phone, "❌ Only available for Rides.")
                return
                
            otp_type = 'START' if upper.startswith("START ") else 'END'
            otp = upper.replace("START ", "").replace("END ", "").strip()
            
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
                    try:
                        details = json.loads(active.get("payload", "{}"))
                        drop_address = details.get("drop")
                        if drop_address:
                            drop_link = f"\n🏁 *Destination:* {drop_address}\n📍 *Navigate:*\nhttps://www.google.com/maps/search/?api=1&query={quote(drop_address)}\n"
                    except:
                        pass
                
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
                try:
                    import json
                    payload_data = json.loads(active.get("payload", "{}"))
                    if "breakdown_base" in payload_data:
                        payment_msg += f"🚕 Base Fare: ₹{payload_data['breakdown_base']}\n"
                        if payload_data.get("breakdown_discount"):
                            payment_msg += f"🎁 Discount: -₹{payload_data['breakdown_discount']}\n"
                        payment_msg += f"📋 Platform : +₹{payload_data['breakdown_platform']}\n"
                    else:
                        ride_pf = get_service_pricing("Ride")["platform_fee"]
                        base_fare = max(0, float(fare) - ride_pf)
                        payment_msg += f"🚕 Base Fare: ₹{base_fare}\n📋 Platform : +₹{ride_pf}\n"
                except:
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