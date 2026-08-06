import json
import uuid
import traceback
from typing import Optional, Dict, Any

from db.mysql_conn import get_db, close_cursor, close_db
from whatsapp_client import send_message, send_reply_buttons, send_payment_button
from config import TRACKING_BASE_URL

# Default constants
DELIVERY_FEE = 20.0
PLATFORM_FEE = 5.0
COD_MIN_VALUE = 100.0

def handle(
    session: Dict[str, Any],
    text: Optional[str],
    raw: Optional[Dict[str, Any]]
) -> Optional[str]:
    """
    State machine for Vegetables & Fruits ordering flow (Service ID: 7).
    """
    user_phone = session.get("user_id")
    state = session.get("case_state", "")
    order_id = session.get("order_id")

    try:
        # 1. INITIAL STATE: Start shopping
        if not state:
            # Upsert customer
            db = get_db()
            cur = db.cursor(dictionary=True)
            cur.execute("SELECT id, name FROM customers WHERE phone=%s", (user_phone,))
            cust = cur.fetchone()
            
            customer_name = session.get("name", "Customer")
            if cust:
                customer_id = cust["id"]
                if cust["name"] != customer_name:
                    cur.execute("UPDATE customers SET name=%s WHERE id=%s", (customer_name, customer_id))
            else:
                cur.execute("INSERT INTO customers (phone, name) VALUES (%s, %s)", (user_phone, customer_name))
                customer_id = cur.lastrowid
            
            service_id = session.get("service")
            prefix_map = {1: "N2DGR", 7: "N2DVF", 9: "N2DFD", 2: "N2DMD", 4: "N2DRD", 3: "N2DAW", 5: "N2DAW", 10: "N2DHS"}
            order_prefix = prefix_map.get(service_id, "N2D")
            order_code = f"{order_prefix}{uuid.uuid4().hex[:4].upper()}"
            svc_name = "Groceries" if service_id == 1 else "Food Service" if service_id == 9 else "Vegetables & Fruits"
            
            cur.execute(
                """INSERT INTO orders (order_id, engine_type, customer_id, customer_number, customer_name, service, status, payment_status, total_amount, created_at)
                   VALUES (%s, 'TASK', %s, %s, %s, %s, 'DRAFT', 'PENDING', 0.0, NOW())""",
                (order_code, customer_id, user_phone, customer_name, svc_name)
            )
            db.commit()
            close_cursor(cur)
            close_db(db)
            
            session["order_id"] = order_code
            session["case_state"] = "WAITING_FOR_CART"
            
            if service_id == 1:
                url = f"{TRACKING_BASE_URL}/groceries?orderId={order_code}"
                welcome_msg = "Welcome to *Need2Done Groceries*! 🛒🥛\n\nPlease click the button below to browse our grocery catalog, add items to your cart, and click Checkout when ready:"
            elif service_id == 9:
                url = f"{TRACKING_BASE_URL}/food?orderId={order_code}"
                welcome_msg = "Welcome to *Need2Done Food Service*! 🍔\n\nPlease click the button below to browse our food catalog, add items to your cart, and click Checkout when ready:"
            else:
                url = f"{TRACKING_BASE_URL}/vegetables-fruits?orderId={order_code}"
                welcome_msg = "Welcome to *Need2Done Vegetables & Fruits*! 🥦🍅\n\nPlease click the button below to browse our fresh daily-priced catalog, add items to your cart, and click Checkout when ready:"
            
            send_payment_button(
                to=user_phone,
                body=welcome_msg,
                button_text="Start Shopping",
                url=url
            )
            return None

        # 2. WAITING FOR WEB CHECKOUT
        if state == "WAITING_FOR_CART":
            if text and text.startswith("ORDER_"):
                real_code = text.replace("ORDER_", "").strip()
                if real_code and real_code.upper() != "NONE":
                    session["order_id"] = real_code
                    session["case_state"] = "CART_REVIEW"
                    return handle(session, "", {})

            if text and ("New Order Request" in text or "Items:" in text):
                session["case_state"] = "CART_REVIEW"
                return handle(session, "", {})

            db = get_db()
            cur = db.cursor(dictionary=True)
            cur.execute("SELECT service FROM orders WHERE order_id=%s", (order_id,))
            order_row = cur.fetchone()
            service_name = order_row["service"] if order_row else "Vegetables & Fruits"
            close_cursor(cur)
            close_db(db)

            if service_name == "Groceries":
                url = f"{TRACKING_BASE_URL}/groceries?orderId={order_id}"
            elif service_name == "Food Service":
                url = f"{TRACKING_BASE_URL}/food?orderId={order_id}"
            else:
                url = f"{TRACKING_BASE_URL}/vegetables-fruits?orderId={order_id}"

            send_payment_button(
                to=user_phone,
                body="Please click below to finish adding items to your cart:",
                button_text="Browse Catalog",
                url=url
            )
            return None

        # 3. CART REVIEW: Render cart items and ask for next step
        if state == "CART_REVIEW":
            # Fetch cart items & service
            db = get_db()
            cur = db.cursor(dictionary=True)
            cur.execute("SELECT service FROM orders WHERE order_id=%s", (order_id,))
            order_row = cur.fetchone()
            service_name = order_row["service"] if order_row else "Vegetables & Fruits"
            
            cur.execute("SELECT * FROM cart_items WHERE order_id=%s", (order_id,))
            items = cur.fetchall()
            close_cursor(cur)
            close_db(db)

            if not items:
                # Cart is empty, prompt shopping again
                session["case_state"] = "WAITING_FOR_CART"
                if service_name == "Groceries":
                    url = f"{TRACKING_BASE_URL}/groceries?orderId={order_id}"
                elif service_name == "Food Service":
                    url = f"{TRACKING_BASE_URL}/food?orderId={order_id}"
                else:
                    url = f"{TRACKING_BASE_URL}/vegetables-fruits?orderId={order_id}"
                send_payment_button(
                    to=user_phone,
                    body="⚠️ Your cart is currently empty. Please select items from our catalog to continue:",
                    button_text="Add Items",
                    url=url
                )
                return None

            # Fetch dynamic pricing from config
            from config import get_service_pricing
            pricing = get_service_pricing(service_name)
            delivery_fee = float(pricing.get("helper_charge", 30.0))
            platform_fee = float(pricing.get("platform_fee", 8.0))

            is_food = (service_name == "Food Service")
            packaging_fee = 10.0 if is_food else 0.0

            # Compile cart text summary
            summary_lines = ["🛒 *Your Cart Items:*", "-------------------------"]
            subtotal = 0.0
            for item in items:
                qty = float(item["quantity"])
                price = float(item["price"])
                total = qty * price
                subtotal += total
                qty_str = f"{qty:g}"
                summary_lines.append(f"• {item['product_name']} ({qty_str} {item['unit']}) — ₹{total:g}")
            
            grand_total = subtotal + delivery_fee + platform_fee + packaging_fee
            summary_lines.append("-------------------------")
            summary_lines.append(f"Subtotal: ₹{subtotal:g}")
            if packaging_fee > 0:
                summary_lines.append(f"Packaging Fee: ₹{packaging_fee:g}")
            summary_lines.append(f"Delivery Fee: ₹{delivery_fee:g}")
            summary_lines.append(f"Platform Fee: ₹{platform_fee:g}")
            summary_lines.append("-------------------------")
            summary_lines.append(f"✅ *Grand Total: ₹{grand_total:g}*")
            summary_lines.append("\nHow would you like to proceed? 👇")

            buttons = [
                {"id": "CART_CONTINUE", "title": "➡ Continue"},
                {"id": "CART_EDIT", "title": "✏ Edit Cart"},
                {"id": "CART_CANCEL", "title": "❌ Cancel"}
            ]

            send_reply_buttons(
                to=user_phone,
                body="\n".join(summary_lines),
                buttons=buttons
            )
            session["case_state"] = "CART_REVIEW_WAIT"
            return None

        # 4. CART REVIEW BUTTON ACTION
        if state == "CART_REVIEW_WAIT":
            btn_id = raw.get("interactive", {}).get("button_reply", {}).get("id", "") if raw else ""
            
            if btn_id == "CART_CONTINUE":
                db = get_db()
                cur = db.cursor(dictionary=True)
                cur.execute("SELECT customer_lat, customer_lng, payload FROM orders WHERE order_id=%s", (order_id,))
                order_row = cur.fetchone()
                close_cursor(cur)
                close_db(db)

                lat = order_row.get("customer_lat") if order_row else None
                lng = order_row.get("customer_lng") if order_row else None
                payload = order_row.get("payload") if order_row else None
                
                addr = None
                if payload:
                    try:
                        if isinstance(payload, str):
                            p = json.loads(payload)
                        else:
                            p = payload
                        addr = p.get("address")
                    except Exception:
                        pass

                if lat and lng and addr:
                    session["case_state"] = "PAYMENT_SELECT"
                    # Nudge immediately
                    send_reply_buttons(
                        to=user_phone,
                        body="Please select a payment method:",
                        buttons=[
                            {"id": "PAY_ONLINE", "title": "💳 Pay Online"},
                            {"id": "PAY_COD", "title": "💵 Cash on Delivery"}
                        ]
                    )
                    return None
                elif lat and lng:
                    session["case_state"] = "ASK_ADDRESS_DETAILS"
                    send_message(user_phone, "🏠 Please enter your complete delivery address (e.g. Flat No, Building Name, Landmark):")
                    return None
                else:
                    session["case_state"] = "ASK_LOCATION"
                    send_message(user_phone, "📍 Please share your *delivery location* using the WhatsApp location sharing feature.")
                    return None
            elif btn_id == "CART_EDIT":
                session["case_state"] = "WAITING_FOR_CART"
                db = get_db()
                cur = db.cursor(dictionary=True)
                cur.execute("SELECT service FROM orders WHERE order_id=%s", (order_id,))
                order_row = cur.fetchone()
                service_name = order_row["service"] if order_row else "Vegetables & Fruits"
                close_cursor(cur)
                close_db(db)

                if service_name == "Groceries":
                    url = f"{TRACKING_BASE_URL}/groceries?orderId={order_id}&edit=true"
                elif service_name == "Food Service":
                    url = f"{TRACKING_BASE_URL}/food?orderId={order_id}&edit=true"
                else:
                    url = f"{TRACKING_BASE_URL}/vegetables-fruits?orderId={order_id}&edit=true"

                send_payment_button(
                    to=user_phone,
                    body="✏ Click the button below to edit your cart items:",
                    button_text="Edit Cart",
                    url=url
                )
                return None
            elif btn_id == "CART_CANCEL":
                session["case_state"] = "CANCEL_CONFIRM"
                send_reply_buttons(
                    to=user_phone,
                    body="⚠️ Are you sure you want to cancel this order?",
                    buttons=[
                        {"id": "CANCEL_CONFIRM_YES", "title": "Yes, Cancel"},
                        {"id": "CANCEL_CONFIRM_NO", "title": "No, Go back"}
                    ]
                )
                return None
            else:
                # Nudge user to click buttons
                session["case_state"] = "CART_REVIEW"
                return handle(session, text, raw)

        # 5. ASK LOCATION: Expect coordinates
        if state == "ASK_LOCATION":
            msg_type = raw.get("type") if raw else None
            
            if msg_type == "location":
                loc = raw.get("location", {})
                lat = loc.get("latitude")
                lng = loc.get("longitude")

                if lat is not None and lng is not None:
                    db = get_db()
                    cur = db.cursor()
                    cur.execute(
                        "UPDATE orders SET customer_lat=%s, customer_lng=%s WHERE order_id=%s",
                        (lat, lng, order_id)
                    )
                    db.commit()
                    close_cursor(cur)
                    close_db(db)

                    session["latitude"] = lat
                    session["longitude"] = lng
                    session["case_state"] = "ASK_ADDRESS_DETAILS"
                    send_message(user_phone, "✅ Delivery location validated!\n\nPlease enter your *detailed address*:\n_(e.g., House No, Building/Apartment name, Street, Landmark)_")
                    return None

            # If user typed text address directly instead of sending location pin
            if text and text.upper() != "LOCATION":
                session["case_state"] = "ASK_ADDRESS_DETAILS"
                send_message(user_phone, f"✅ Delivery location noted: *{text}*\n\nPlease enter your *detailed address / landmark*:\n_(e.g., House No, Building/Apartment name, Street, Landmark)_")
                return None
            
            # If not location, prompt location sharing
            send_message(user_phone, "❗ Please share your location using WhatsApp location pin (📎 -> Location) or type your local address.")
            return None
            send_message(user_phone, "❗ Please share your location using the *location feature* in WhatsApp (tap 📎 -> Location).")
            return None

        # 6. ASK ADDRESS DETAILS
        if state == "ASK_ADDRESS_DETAILS":
            if not text:
                send_message(user_phone, "Please type and send your address details:")
                return None

            address_str = text.strip()
            
            # Fetch cart & calculate final totals
            db = get_db()
            cur = db.cursor(dictionary=True)
            
            cur.execute("SELECT service FROM orders WHERE order_id=%s", (order_id,))
            order_row = cur.fetchone()
            service_name = order_row["service"] if order_row else "Vegetables & Fruits"
            
            # Update order address payload
            cur.execute("SELECT * FROM cart_items WHERE order_id=%s", (order_id,))
            items = cur.fetchall()
            
            subtotal = sum(float(item["quantity"]) * float(item["price"]) for item in items)
            # Calculate fees based on service type
            is_food = (service_name == "Food Service")
            current_delivery_fee = 40.0 if is_food else DELIVERY_FEE
            current_packaging_fee = 10.0 if is_food else 0.0
            
            grand_total = subtotal + current_delivery_fee + PLATFORM_FEE + current_packaging_fee

            # Save address & costs
            payload_data = {
                "address": address_str,
                "subtotal": subtotal,
                "delivery_fee": current_delivery_fee,
                "platform_fee": PLATFORM_FEE,
                "packaging_fee": current_packaging_fee
            }
            cur.execute(
                """
                UPDATE orders 
                SET payload=%s, total_amount=%s, helper_charge=%s, platform_fee=%s 
                WHERE order_id=%s
                """,
                (json.dumps(payload_data), grand_total, current_delivery_fee, PLATFORM_FEE, order_id)
            )
            db.commit()
            close_cursor(cur)
            close_db(db)

            # Build summary
            summary_lines = [
                "📝 *Final Order Summary*",
                f"Order ID: {order_id}",
                f"Address: {address_str}",
                "-------------------------",
            ]
            for item in items:
                qty = float(item["quantity"])
                price = float(item["price"])
                total = qty * price
                qty_str = f"{qty:g}"
                summary_lines.append(f"• {item['product_name']} ({qty_str} {item['unit']}) — ₹{total:g}")
            
            summary_lines.extend([
                "-------------------------",
                f"Subtotal: ₹{subtotal:g}",
                f"Packaging: ₹{current_packaging_fee:g}",
                f"Delivery: ₹{current_delivery_fee:g}",
                f"Platform Fee: ₹{PLATFORM_FEE:g}",
                f"-------------------------",
                f"✅ *Grand Total: ₹{grand_total:g}*",
                "-------------------------",
                "\nWould you like to place this order? 👇"
            ])

            buttons = [
                {"id": "PLACE_ORDER", "title": "✅ Place Order"},
                {"id": "CHANGE_ADDRESS", "title": "📍 Change Address"},
                {"id": "CART_CANCEL", "title": "❌ Cancel"}
            ]

            send_reply_buttons(
                to=user_phone,
                body="\n".join(summary_lines),
                buttons=buttons
            )
            session["case_state"] = "FINAL_SUMMARY"
            return None

        # 7. FINAL SUMMARY BUTTON ACTIONS
        if state == "FINAL_SUMMARY":
            btn_id = raw.get("interactive", {}).get("button_reply", {}).get("id", "") if raw else ""

            if btn_id == "PLACE_ORDER":
                session["case_state"] = "PAYMENT_SELECT"
                send_reply_buttons(
                    to=user_phone,
                    body="💳 *Select Payment Method*:",
                    buttons=[
                        {"id": "PAY_ONLINE", "title": "💳 Pay Online"},
                        {"id": "PAY_COD", "title": "💵 Cash on Delivery"}
                    ]
                )
                return None
            elif btn_id == "CHANGE_ADDRESS":
                session["case_state"] = "ASK_LOCATION"
                send_message(user_phone, "📍 Please share your new location using the WhatsApp location feature.")
                return None
            elif btn_id == "CART_CANCEL":
                session["case_state"] = "CANCEL_CONFIRM"
                send_reply_buttons(
                    to=user_phone,
                    body="⚠️ Are you sure you want to cancel this order?",
                    buttons=[
                        {"id": "CANCEL_CONFIRM_YES", "title": "Yes, Cancel"},
                        {"id": "CANCEL_CONFIRM_NO", "title": "No, Go back"}
                    ]
                )
                return None
            else:
                session["case_state"] = "ASK_ADDRESS_DETAILS"
                return handle(session, text, raw)

        # 8. PAYMENT METHOD SELECTION
        if state == "PAYMENT_SELECT":
            btn_id = raw.get("interactive", {}).get("button_reply", {}).get("id", "") if raw else ""

            if btn_id == "CART_EDIT":
                session["case_state"] = "WAITING_FOR_CART"
                db = get_db()
                cur = db.cursor(dictionary=True)
                cur.execute("SELECT service FROM orders WHERE order_id=%s", (order_id,))
                order_row = cur.fetchone()
                service_name = order_row["service"] if order_row else "Vegetables & Fruits"
                close_cursor(cur)
                close_db(db)

                if service_name == "Groceries":
                    url = f"{TRACKING_BASE_URL}/groceries?orderId={order_id}&edit=true"
                elif service_name == "Food Service":
                    url = f"{TRACKING_BASE_URL}/food?orderId={order_id}&edit=true"
                else:
                    url = f"{TRACKING_BASE_URL}/vegetables-fruits?orderId={order_id}&edit=true"

                send_payment_button(
                    to=user_phone,
                    body="✏ Click the button below to edit your cart items:",
                    button_text="Edit Cart",
                    url=url
                )
                return None

            elif btn_id == "CART_CANCEL":
                session["case_state"] = "CANCEL_CONFIRM"
                send_reply_buttons(
                    to=user_phone,
                    body="⚠️ Are you sure you want to cancel this order?",
                    buttons=[
                        {"id": "CANCEL_CONFIRM_YES", "title": "Yes, Cancel"},
                        {"id": "CANCEL_CONFIRM_NO", "title": "No, Go back"}
                    ]
                )
                return None

            # Fetch order total
            db = get_db()
            cur = db.cursor(dictionary=True)
            cur.execute("SELECT total_amount FROM orders WHERE order_id=%s", (order_id,))
            row = cur.fetchone()
            close_cursor(cur)
            close_db(db)

            total = float(row["total_amount"]) if row else 0.0

            if btn_id == "PAY_ONLINE":
                # Redirect to Mock Payment Simulator
                url = f"{TRACKING_BASE_URL}/payment.html?orderId={order_id}&amount={total}"
                
                send_payment_button(
                    to=user_phone,
                    body=(
                        f"Please click the button below to complete your online payment of *₹{total:g}* "
                        f"via Razorpay Sandbox:"
                    ),
                    button_text="Pay Online",
                    url=url
                )
                return None

            elif btn_id == "PAY_COD":
                # Validate COD rule (Minimum ₹100 order value)
                if total >= COD_MIN_VALUE:
                    # Place order as COD
                    db = get_db()
                    cur = db.cursor()
                    cur.execute(
                        "UPDATE orders SET status='CONFIRMED', payment_method='COD', payment_status='PENDING' WHERE order_id=%s",
                        (order_id,)
                    )
                    db.commit()
                    close_cursor(cur)
                    close_db(db)

                    # Trigger helper auto assignment
                    try:
                        from core.helper_matcher import trigger_helper_assignment
                        trigger_helper_assignment(order_id)
                    except Exception as assign_err:
                        print("Error triggers auto assignment:", assign_err)

                    # Fetch service name
                    db = get_db()
                    cur = db.cursor(dictionary=True)
                    cur.execute("SELECT service FROM orders WHERE order_id=%s", (order_id,))
                    order_row = cur.fetchone()
                    service_name = order_row["service"] if order_row else "Vegetables & Fruits"
                    close_cursor(cur)
                    close_db(db)

                    if service_name == "Groceries":
                        items_desc = "groceries"
                    elif service_name == "Food Service":
                        items_desc = "delicious food"
                    else:
                        items_desc = "fresh vegetables & fruits"

                    send_message(
                        user_phone,
                        f"🎉 *Order Confirmed! (COD)*\n\n"
                        f"Your order `#{order_id}` has been successfully placed. "
                        f"A delivery agent is being assigned to fetch your {items_desc}. "
                        f"Expected delivery: 15-20 minutes.\n\nThank you for choosing Need2Done! 🙏"
                    )
                    
                    # Reset Session
                    from core.role_router import reset_session
                    reset_session(user_phone)
                    return None
                else:
                    # Fail COD validation
                    send_reply_buttons(
                        to=user_phone,
                        body=(
                            f"❌ *COD Rejected*\n\n"
                            f"Cash on Delivery is only available for orders of *₹{COD_MIN_VALUE:g}* or above. "
                            f"Your order total is *₹{total:g}*.\n\nPlease complete payment online, add more items, or cancel the order."
                        ),
                        buttons=[
                            {"id": "PAY_ONLINE", "title": "💳 Pay Online"},
                            {"id": "CART_EDIT", "title": "🛒 Add Items"},
                            {"id": "CART_CANCEL", "title": "❌ Cancel"}
                        ]
                    )
                    return None
            else:
                # Nudge
                send_reply_buttons(
                    to=user_phone,
                    body="Please select a payment method:",
                    buttons=[
                        {"id": "PAY_ONLINE", "title": "💳 Pay Online"},
                        {"id": "PAY_COD", "title": "💵 Cash on Delivery"}
                    ]
                )
                return None

        # 9. CANCEL CONFIRMATION ACTIONS
        if state == "CANCEL_CONFIRM":
            btn_id = raw.get("interactive", {}).get("button_reply", {}).get("id", "") if raw else ""

            if btn_id == "CANCEL_CONFIRM_YES":
                db = get_db()
                cur = db.cursor()
                cur.execute("UPDATE orders SET status='CANCELLED' WHERE order_id=%s", (order_id,))
                db.commit()
                close_cursor(cur)
                close_db(db)

                send_message(user_phone, f"❌ Order `#{order_id}` has been cancelled successfully.")
                
                from core.role_router import reset_session
                reset_session(user_phone)
                return None
            else:
                # Go back to cart review
                session["case_state"] = "CART_REVIEW"
                return handle(session, text, raw)

    except Exception:
        print("🔥 ERROR INSIDE case7_veg_fruits.py:")
        traceback.print_exc()
        send_message(user_phone, "⚠️ An unexpected error occurred. Please start again by typing *Hi*.")
        from core.role_router import reset_session
        reset_session(user_phone)
        return None
