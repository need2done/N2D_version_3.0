"""
=================================================
GramioGO – Vendor Router
=================================================
Handles vendor responses via WhatsApp.
"""

import traceback
from typing import Optional, Dict, Any

from whatsapp_client import send_message, send_reply_buttons
from utils.timeline import log_event
from db.order_repo import update_vendor_status, get_order

from config import ADMIN_NUMBER

def handle_vendor(phone: str, text: str, msg: Optional[Dict[str, Any]]):
    try:
        text = (text or "").strip()
        msg_type = msg.get("type") if isinstance(msg, dict) else None

        print("\nVENDOR MESSAGE:", phone, text, msg_type)

        if msg_type == "interactive":
            interactive = msg.get("interactive", {})
            btn = interactive.get("button_reply")
            lst = interactive.get("list_reply")

            if not btn and not lst:
                return

            btn_id = (btn.get("id") if btn else lst.get("id") if lst else "").strip()
            print("VENDOR ACTION CLICKED:", btn_id)

            if btn_id.startswith("VENDOR_ACCEPT|"):
                order_code = btn_id.split("|")[1]
                order = get_order(order_code)
                if not order:
                    send_message(phone, "❌ Order not found.")
                    return

                from db.mysql_conn import get_db
                from db.order_repo import claim_vendor_order
                
                db = get_db()
                v_id = None
                if db:
                    cur = db.cursor(buffered=True, dictionary=True)
                    clean_phone = phone.replace("+", "").strip()
                    cur.execute("SELECT id, name FROM vendors WHERE REPLACE(phone, '+', '')=%s", (clean_phone,))
                    v_row = cur.fetchone()
                    try:
                        cur.fetchall()
                    except Exception:
                        pass
                    if v_row:
                        v_id = v_row["id"]
                    cur.close()
                    db.close()

                if not v_id:
                    send_message(phone, "❌ Vendor profile not found.")
                    return

                claimed = claim_vendor_order(order_code, v_id)
                if claimed:
                    send_reply_buttons(
                        to=phone,
                        body=f"✅ *Order Accepted!*\n\nPlease pack the items for Order *{order_code}*.\nTap below once all items are ready for pickup:",
                        buttons=[
                            {"id": f"VENDOR_PACKED|{order_code}", "title": "🛍️ Mark as Packed"}
                        ]
                    )

                    # Send item photos if any
                    try:
                        from db.order_repo import get_order_images
                        from whatsapp_client import send_image
                        images = get_order_images(order["id"], 'ITEM')
                        if images:
                            send_message(phone, "📸 *Customer uploaded item photos:*")
                            for img in images:
                                mid = img.get("media_id") or img.get("image_url")
                                if mid:
                                    send_image(phone, mid, f"Order: {order_code}")
                    except Exception as e:
                        print("Failed to send images to vendor:", e)

                    # Notify Admin & Helper
                    send_message(ADMIN_NUMBER, f"🏪 Vendor ({v_row.get('name', v_id)}) accepted order {order_code}.")
                    if order.get("helper_id"):
                        from db.mysql_conn import get_db
                        hdb = get_db()
                        hcur = hdb.cursor(buffered=True, dictionary=True)
                        hcur.execute("SELECT phone FROM helpers WHERE id=%s", (order["helper_id"],))
                        h_row = hcur.fetchone()
                        try:
                            hcur.fetchall()
                        except Exception:
                            pass
                        hcur.close()
                        hdb.close()
                        if h_row:
                            send_message(h_row["phone"], f"🏪 Vendor accepted Order *{order_code}* and is currently packing your items!")
                else:
                    send_message(phone, f"⚠️ *Order Already Claimed*\n\nOrder *{order_code}* has already been accepted by another vendor!")
                return

            if btn_id.startswith("VENDOR_REJECT|"):
                order_code = btn_id.split("|")[1]
                order = get_order(order_code)
                if not order:
                    send_message(phone, "❌ Order not found.")
                    return
                
                if update_vendor_status(order_code, "REJECTED"):
                    send_message(phone, "❌ You rejected the order. Admin will be notified.")
                    send_message(ADMIN_NUMBER, f"🚨 Vendor REJECTED order {order_code}. Please reassign.")
                return

            if btn_id.startswith("VENDOR_PACKED|"):
                order_code = btn_id.split("|")[1]
                order = get_order(order_code)
                if not order:
                    send_message(phone, "❌ Order not found.")
                    return

                if update_vendor_status(order_code, "PACKED"):
                    send_message(phone, "🛍️ Marked as Packed! Please hand over the items to the helper when they arrive.")
                    
                    if order.get("customer_number"):
                        send_message(
                            order["customer_number"],
                            f"🛍️ *Order Packed!*\n\n"
                            f"Your items for Order {order['order_id']} have been packed by the vendor. The helper will pick it up soon."
                        )
                    
                    if order.get("helper_id"):
                        from db.mysql_conn import get_db
                        hdb = get_db()
                        hcur = hdb.cursor(buffered=True, dictionary=True)
                        hcur.execute("SELECT phone FROM helpers WHERE id=%s", (order["helper_id"],))
                        h_row = hcur.fetchone()
                        store_name = "The store"
                        if order.get("vendor_id"):
                            hcur.execute("SELECT name FROM vendors WHERE id=%s", (order["vendor_id"],))
                            v_row = hcur.fetchone()
                            try:
                                hcur.fetchall()
                            except Exception:
                                pass
                            if v_row:
                                store_name = v_row["name"]
                        hcur.close()
                        hdb.close()
                        
                        if h_row:
                            send_message(
                                h_row["phone"],
                                f"🛍️ *Order {order['order_id']} is PACKED!*\n\n"
                                f"*{store_name}* has packed the items.\n"
                                f"Please proceed to pick them up."
                            )
                            send_reply_buttons(h_row["phone"], "Tap below once you have picked up the items:", [
                                {"id": f"PICKED_UP|{order['id']}", "title": "🛍️ Picked Up"}
                            ])
                return

        if text and msg_type != "interactive":
            if text.isdigit() or (text.replace('.', '', 1).isdigit() and text.count('.') < 2):
                amount = float(text)
                from db.mysql_conn import get_db
                db = get_db()
                cur = db.cursor(buffered=True, dictionary=True)
                try:
                    cur.execute("SELECT id FROM vendors WHERE phone=%s", (phone,))
                    vendor = cur.fetchone()
                    try:
                        cur.fetchall()
                    except Exception:
                        pass
                    if vendor:
                        cur.execute(
                            "SELECT * FROM orders WHERE vendor_id=%s AND vendor_status='ACCEPTED' AND bill_amount IS NULL",
                            (vendor["id"],)
                        )
                        order = cur.fetchone()
                        try:
                            cur.fetchall()
                        except Exception:
                            pass
                        if order:
                            from db.order_repo import save_bill_amount
                            save_bill_amount(order["order_id"], amount)
                            
                            if order["status"] in ("HELPER_ACCEPTED", "CONFIRMED"):
                                cur.execute("UPDATE orders SET status='BILL_IMAGE_UPLOADED' WHERE id=%s", (order["id"],))
                                db.commit()
                            
                            from db.order_repo import auto_approve_bill
                            auto_approve_bill(order["order_id"])
                            
                            # Generate Payment Link for Customer
                            is_anywork = order.get("service") in ("AnyWork", 3, 5)
                            bill_amt = amount
                            from config import get_service_pricing, get_live_pricing
                            import json
                            pricing_svc = get_service_pricing(order.get("service"))
                            fallback_hc = pricing_svc["helper_charge"]
                            fallback_pf = pricing_svc["platform_fee"]
                            db_hc = order.get("helper_charge")
                            db_pf = order.get("platform_fee")
                            
                            dynamic_h_charge = float(db_hc if db_hc is not None else fallback_hc)
                            dynamic_p_fee = float(db_pf if db_pf is not None else fallback_pf)
                            
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

                            from db.order_repo import auto_generate_payment
                            from utils.timeline import log_event
                            total_req = auto_generate_payment(order["order_id"], bill_amt, dynamic_h_charge, dynamic_p_fee, total_override=final_total)
                            
                            if total_req:
                                log_event(order["id"], "PAYMENT_REQUEST_AUTO_GENERATED", f"Total: {total_req} (Vendor Input)", "SYSTEM")
                                customer_phone = order.get("customer_number")
                                if customer_phone:
                                    label = "Service" if is_anywork else "Bill"
                                    payment_msg = (
                                        f"💰 *Payment Required – Need2Done*\n\n"
                                        f"🆔 Order : {order['order_id']}\n"
                                        f"🧾 {label}  : ₹{bill_amt}\n"
                                        f"🚚 Delivery: ₹{dynamic_h_charge}\n"
                                    )
                                    if discount_amount > 0:
                                        payment_msg += f"🎁 Discount: -₹{discount_amount}\n"
                                    payment_msg += (
                                        f"📋 Platform: ₹{dynamic_p_fee}\n"
                                        f"━━━━━━━━━━━━━━━\n"
                                        f"💳 *Total : ₹{total_req}*\n\n"
                                        f"Choose payment method:"
                                    )
                                    send_reply_buttons(customer_phone, payment_msg, [
                                        {"id": f"PAY_UPI_{order['id']}", "title": "💳 UPI"},
                                        {"id": f"PAY_COD_{order['id']}", "title": "💵 Cash on Delivery"}
                                    ])

                            send_reply_buttons(
                                phone,
                                f"✅ Bill amount of ₹{amount} saved! Payment link sent to customer.\n\nPlease start packing the items. Tap below when they are ready.",
                                [{"id": f"VENDOR_PACKED|{order['order_id']}", "title": "🛍️ Packed & Ready"}]
                            )
                            return
                except Exception as e:
                    print("Error handling vendor text input:", e)
                finally:
                    cur.close()
                    db.close()

    except Exception as e:
        print("Error in vendor_router:", e)
        traceback.print_exc()
