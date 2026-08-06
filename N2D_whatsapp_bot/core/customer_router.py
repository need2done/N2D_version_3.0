"""
=================================================
GramioGO – Customer Interactive Router (FastAPI Compatible)
=================================================

✔ Strict state enforcement
✔ Prevents double payment
✔ Clean UPI / COD handling
✔ Safe webhook (never crashes)
✔ Fully aligned with payment → OTP flow
✔ Framework independent (Flask / FastAPI)
"""

import traceback
from typing import Dict, Any

from whatsapp_client import send_message, send_reply_buttons, send_payment_button

from db.order_repo import (
    get_order_by_db_id,
    mark_payment_received,
    mark_payment_method,
    save_order_rating,
    complete_ride_order
)

from config import ADMIN_NUMBER, UPI_ID, TRACKING_BASE_URL


# =================================================
# CUSTOMER INTERACTIVE HANDLER
# =================================================

def handle_customer_interactive(
    from_number: str,
    msg: Dict[str, Any]
) -> bool:
    """
    Handles ONLY customer button interactions.

    Returns
    -------
    True  -> handled, STOP routing
    False -> not handled
    """

    try:

        if not isinstance(msg, dict):
            return False

        interactive = msg.get("interactive")

        if not interactive:
            return False

        button = interactive.get("button_reply")

        if not button:
            return False

        btn_id = str(button.get("id", "")).strip()

        print("LOG: CUSTOMER BUTTON:", btn_id)


        # =================================================
        # EXTENSION HANDLING
        # =================================================
        if btn_id.startswith("CUST_"):
            parts = btn_id.split("|")
            action = parts[0]
            
            if action in ("CUST_EXT_APPROVE", "CUST_EXT_DECLINE"):
                order_db_id = int(parts[1])
                order = get_order_by_db_id(order_db_id)
                if not order: return True
                
                helper_phone = order.get("helper_phone")
                
                if action == "CUST_EXT_APPROVE":
                    ext_mins = int(parts[2])
                    ext_price = float(parts[3])
                    
                    from db.mysql_conn import get_db
                    db = get_db()
                    cur = db.cursor()
                    cur.execute(
                        "UPDATE orders SET extension_status='APPROVED', service_end_time = DATE_ADD(service_end_time, INTERVAL %s MINUTE), total_amount = total_amount + %s, bill_amount = bill_amount + %s WHERE id=%s",
                        (ext_mins, ext_price, ext_price, order_db_id)
                    )
                    db.commit()
                    cur.close()
                    db.close()
                    
                    send_message(from_number, f"✅ Extension Approved. {ext_mins} mins added to the service.")
                    if helper_phone:
                        send_reply_buttons(
                            helper_phone,
                            f"✅ Customer approved the extension. Extra {ext_mins} mins granted.\nCost added: +₹{ext_price}",
                            [
                                {"id": f"REQ_END_OTP|{order_db_id}", "title": "🏁 Request End OTP"},
                                {"id": f"REQ_EXT|{order_db_id}", "title": "⏱️ Request Extension"}
                            ]
                        )
                        
                elif action == "CUST_EXT_DECLINE":
                    from db.mysql_conn import get_db
                    db = get_db()
                    cur = db.cursor()
                    cur.execute("UPDATE orders SET extension_status='REJECTED' WHERE id=%s", (order_db_id,))
                    db.commit()
                    cur.close()
                    db.close()
                    
                    send_message(from_number, "❌ Extension Declined.")
                    if helper_phone:
                        send_reply_buttons(
                            helper_phone,
                            "❌ Customer declined the extension.\nPlease wrap up work at the original scheduled time.",
                            [
                                {"id": f"REQ_END_OTP|{order_db_id}", "title": "🏁 Request End OTP"}
                            ]
                        )
                return True

            elif action == "CUST_REQ_EXT":
                order_db_id = int(parts[1])
                order = get_order_by_db_id(order_db_id)
                if not order: return True
                
                from core.helper_router import safe_parse_payload
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
                    from_number,
                    "⏱️ *Request Extension*\nSelect extra time needed:",
                    [
                        {"id": f"CUST_EXT_SELECT|60|{p60}|{order_db_id}", "title": f"1 Hr (+₹{p60})"},
                        {"id": f"CUST_EXT_SELECT|30|{p30}|{order_db_id}", "title": f"30 Mins (+₹{p30})"},
                        {"id": f"CUST_EXT_SELECT|15|{p15}|{order_db_id}", "title": f"15 Mins (+₹{p15})"}
                    ]
                )
                return True

            elif action == "CUST_EXT_SELECT":
                ext_mins = int(parts[1])
                ext_price = float(parts[2])
                order_db_id = int(parts[3])
                order = get_order_by_db_id(order_db_id)
                if not order: return True
                
                helper_phone = order.get("helper_phone")
                send_message(from_number, f"✅ Extension request (+{ext_mins} mins, +₹{ext_price}) sent to professional.")
                
                if helper_phone:
                    send_reply_buttons(
                        helper_phone,
                        f"⏱️ *Customer Requested Extension*\n\nThe customer requested to extend the service by *{ext_mins} Minutes* (+₹{ext_price}).\n\nDo you accept?",
                        [
                            {"id": f"HLPR_EXT_ACCEPT|{ext_mins}|{ext_price}|{order_db_id}", "title": "✅ Accept"},
                            {"id": f"HLPR_EXT_REJECT|{order_db_id}", "title": "❌ Reject"}
                        ]
                    )
                return True

        # =================================================
        # PAY VIA UPI
        # =================================================

        if btn_id.startswith("PAY_UPI_"):

            order_db_id = int(btn_id.split("_")[-1])

            order = get_order_by_db_id(order_db_id)

            if not order:

                send_message(from_number, "❌ Order not found.")

                return True

            if order["status"] != "PAYMENT_GENERATED":

                send_message(from_number, "⚠️ Payment not allowed yet.")

                return True

            if order.get("payment_method"):

                send_message(
                    from_number,
                    "⚠️ Payment method already selected."
                )

                return True

            from core.helper_router import safe_parse_payload
            payload = safe_parse_payload(order.get("payload"))
            total = float(payload.get("balance_due", order["total_amount"]))

            # save payment method
            mark_payment_method(order_db_id, "UPI")

            upi_link = (
                f"upi://pay?"
                f"pa={UPI_ID}"
                f"&pn=Need2Done"
                f"&am={total}"
                f"&cu=INR"
            )

            send_payment_button(
                to=from_number,
                body=(
                    "💳 *UPI Payment*\n\n"
                    f"💰 Amount : ₹{total}\n\n"
                    "Tap the button below to pay 👇"
                ),
                button_text="Pay ₹" + str(total),
                url=upi_link
            )

            send_reply_buttons(
                to=from_number,
                body="Confirm once payment is completed:",
                buttons=[
                    {
                        "id": f"I_PAID_{order_db_id}",
                        "title": "✅ I Have Paid"
                    }
                ]
            )

            return True


        # =================================================
        # CASH ON DELIVERY
        # =================================================

        if btn_id.startswith("PAY_COD_"):

            order_db_id = int(btn_id.split("_")[-1])

            order = get_order_by_db_id(order_db_id)

            if not order:

                send_message(from_number, "❌ Order not found.")

                return True

            if order["status"] != "PAYMENT_GENERATED":

                send_message(from_number, "⚠️ Payment not allowed yet.")

                return True

            if order.get("payment_method"):

                send_message(
                    from_number,
                    "⚠️ Payment method already selected."
                )

                return True

            from core.helper_router import safe_parse_payload
            payload = safe_parse_payload(order.get("payload"))
            total = float(payload.get("balance_due", order["total_amount"]))

            mark_payment_method(order_db_id, "COD")

            send_message(
                from_number,
                (
                    "💵 *Cash on Delivery*\n\n"
                    f"💰 Amount : ₹{total}\n\n"
                    "Please pay the helper directly.\n"
                    "After payment, click *I HAVE PAID*."
                )
            )

            send_reply_buttons(
                to=from_number,
                body="Confirm once cash is handed over:",
                buttons=[
                    {
                        "id": f"I_PAID_{order_db_id}",
                        "title": "✅ I Have Paid"
                    }
                ]
            )

            return True


        # =================================================
        # CUSTOMER CONFIRMS PAYMENT
        # =================================================

        if btn_id.startswith("I_PAID_") or btn_id.startswith("PAID_CASH_") or btn_id.startswith("PAID_UPI_"):

            order_db_id = int(btn_id.split("_")[-1])

            order = get_order_by_db_id(order_db_id)

            if not order:

                send_message(from_number, "❌ Order not found.")

                return True

            if order["status"] != "PAYMENT_GENERATED":

                send_message(from_number, "⚠️ Payment not active.")

                return True

            if order.get("payment_status") == "PAID":

                send_message(
                    from_number,
                    "⚠️ Payment already confirmed."
                )

                return True

            method = order.get("payment_method")
            if btn_id.startswith("PAID_CASH_"):
                method = "Cash"
            elif btn_id.startswith("PAID_UPI_"):
                method = "UPI"

            if not method:
                if order["service"] == "Home Services":
                    method = "Cash/UPI"
                else:
                    send_message(
                        from_number,
                        "⚠️ Payment method not selected."
                    )
                    return True

            # ------------------------------------------------
            # Mark payment received
            # ------------------------------------------------

            mark_payment_received(
                order_db_id,
                method=method
            )

            send_message(
                from_number,
                "✅ Payment confirmed. Thank you!"
            )

            # ------------------------------------------------
            # Notify Admin
            # ------------------------------------------------

            send_message(
                ADMIN_NUMBER,
                (
                    "💳 *Payment Confirmed*\n\n"
                    f"Order ID : {order['order_id']}\n"
                    f"Amount   : ₹{order['total_amount']}\n"
                    f"Method   : {order['payment_method']}"
                )
            )

            # ------------------------------------------------
            # RIDE: complete directly + notify helper + rate
            # TASK: send OTP trigger to helper
            # ------------------------------------------------

            is_ride = order.get("engine_type") == "RIDE"
            helper_phone = order.get("helper_phone")
            fare = order.get("total_amount", 0)

            if is_ride:
                # Complete the ride order in DB
                complete_ride_order(order_db_id)

                # Notify helper: ride done
                if helper_phone:
                    send_message(
                        helper_phone,
                        f"✅ *Ride Completed!* 🎉\n\n"
                        f"🆔 Order: {order['order_id']}\n"
                        f"💰 Fare: ₹{fare}\n"
                        f"💳 Method: {order['payment_method']}\n\n"
                        f"You are now back ONLINE and ready for new orders."
                    )

                # Send rating prompt to customer
                send_reply_buttons(
                    from_number,
                    f"🚗 *Thank you for riding with Need2Done!* 🙏\n\n"
                    f"How was your experience?",
                    [
                        {"id": f"RATE_5|{order_db_id}", "title": "⭐⭐⭐⭐⭐"},
                        {"id": f"RATE_3|{order_db_id}", "title": "⭐⭐⭐"},
                        {"id": f"RATE_1|{order_db_id}", "title": "⭐"}
                    ]
                )

            else:
                # TASK: Enable OTP trigger for helper
                if helper_phone:
                    send_reply_buttons(
                        to=helper_phone,
                        body="Payment confirmed. Trigger OTP to complete order:",
                        buttons=[
                            {
                                "id": f"TRIGGER_OTP|{order_db_id}",
                                "title": "🔐 Trigger OTP"
                            }
                        ]
                    )

            return True


        # =================================================
        # CUSTOMER RATING
        # =================================================

        if btn_id.startswith("RATE_"):

            try:
                parts = btn_id.split("|")
                # ID format: RATE_5|123 (5 is rating, 123 is order_db_id)
                rating = int(parts[0].split("_")[1])
                order_db_id = int(parts[1])

                order = save_order_rating(order_db_id, rating)

                if order == "ALREADY_RATED":
                    send_message(
                        from_number,
                        "⚠️ You have already submitted feedback for this order."
                    )
                    return True

                if order:
                    # ── Thank the customer ───────────────────────────
                    stars = "⭐" * rating
                    send_message(
                        from_number,
                        f"🌟 *Thank you for your feedback!*\n\n"
                        f"You rated: {stars}\n\n"
                        "We appreciate your rating. It helps us improve our service.\n"
                        "Have a great day! 👋"
                    )

                    # ── Notify the helper about their rating ─────────
                    helper_phone = order.get("helper_phone")
                    helper_name  = order.get("helper_name") or "Helper"
                    order_code   = order.get("order_id", "N/A")
                    service      = order.get("service", "")

                    if helper_phone:
                        stars_msg = "⭐" * rating
                        if rating >= 4:
                            tone = "Excellent work! Keep it up! 🎉"
                        elif rating == 3:
                            tone = "Good job! There's room to grow. 💪"
                        else:
                            tone = "Please try to improve your service. 🙏"

                        send_message(
                            helper_phone,
                            f"📊 *Customer Feedback – {order_code}*\n\n"
                            f"Service : {service}\n"
                            f"Rating  : {stars_msg} ({rating}/5)\n\n"
                            f"{tone}"
                        )

                    # ── Sync rating to admin dashboard ───────────────
                    try:
                        import requests, os
                        backend = os.getenv("BACKEND_URL", "http://localhost:5000")
                        requests.patch(
                            f"{backend}/api/orders/{order_db_id}/rating",
                            json={"rating": rating},
                            timeout=3
                        )
                    except Exception:
                        pass  # non-fatal – admin can see in DB directly

                else:
                    send_message(from_number, "❌ Error saving feedback. Please try again later.")

                return True

            except Exception as e:
                print("ERROR handling rating:", str(e))
                send_message(from_number, "✅ Thank you for your feedback!")
                return True


        # =================================================
        # NOT HANDLED
        # =================================================

        return False


    except Exception as e:

        print("ERROR: CUSTOMER ROUTER ERROR:", str(e))

        traceback.print_exc()

        # Never crash webhook
        return True