"""
=================================================
GramioGO – Admin Router (FastAPI Compatible)
=================================================

✔ No direct DB mutations
✔ Strict state enforcement
✔ Repo-controlled transitions
✔ Clean WhatsApp separation
✔ Crash-safe
✔ Fully aligned to final state machine
✔ Framework independent (Flask / FastAPI)
"""

import traceback
from typing import Dict, Any

from whatsapp_client import (
    send_message,
    send_helper_assignment_list,
    send_helper_auto_assign,
    send_reply_buttons
)

from db.helper_repo import get_available_helpers

from db.order_repo import (
    get_order_by_db_id,
    mark_admin_verify,
    mark_payment_generated,
    complete_order
)

from config import ADMIN_NUMBER, HELPER_CHARGE, PLATFORM_FEE


# =================================================
# ADMIN INTERACTIVE HANDLER
# =================================================

def handle_admin_interactive(payload: Dict[str, Any]):

    try:

        interactive = payload.get("interactive", {})

        button = interactive.get("button_reply")

        if not button:
            return

        btn_id = str(button.get("id", "")).strip()

        print("👑 ADMIN BUTTON:", btn_id)


        # =================================================
        # AUTO ASSIGN
        # =================================================

        if btn_id.startswith("AUTO_ASSIGN|"):

            order_db_id = int(btn_id.split("|")[1])

            order = get_order_by_db_id(order_db_id)

            if not order or order["status"] != "CONFIRMED":

                send_message(
                    ADMIN_NUMBER,
                    "❌ Order not eligible for assignment."
                )

                return

            helpers = get_available_helpers()

            if not helpers:

                send_message(
                    ADMIN_NUMBER,
                    "❌ No helpers available."
                )

                return

            for h in helpers:

                send_helper_auto_assign(
                    to=h["phone"],
                    order_id=order["order_id"],
                    message_text=(
                        "📦 *New Order*\n\n"
                        f"🆔 Order: {order['order_id']}\n"
                        "⏱ First to accept gets it."
                    )
                )

            send_message(
                ADMIN_NUMBER,
                f"📣 Auto-assign sent to {len(helpers)} helpers"
            )

            return


        # =================================================
        # MANUAL ASSIGN
        # =================================================

        if btn_id.startswith("ASSIGN_HELPER|"):

            order_db_id = int(btn_id.split("|")[1])

            order = get_order_by_db_id(order_db_id)

            if not order or order["status"] != "CONFIRMED":

                send_message(
                    ADMIN_NUMBER,
                    "❌ Order not eligible."
                )

                return

            helpers = get_available_helpers()

            if not helpers:

                send_message(
                    ADMIN_NUMBER,
                    "❌ No helpers available."
                )

                return

            send_helper_assignment_list(
                ADMIN_NUMBER,
                order["order_id"],
                helpers
            )

            return


        # =================================================
        # VERIFY ITEMS → PAYMENT
        # =================================================

        if btn_id.startswith("VERIFY_ITEMS|"):

            order_db_id = int(btn_id.split("|")[1])

            order = get_order_by_db_id(order_db_id)

            if not order or order["status"] != "ITEM_PHOTO_UPLOADED":

                send_message(
                    ADMIN_NUMBER,
                    "⚠️ Items not ready."
                )

                return

            if not mark_admin_verify(order["order_id"]):

                send_message(
                    ADMIN_NUMBER,
                    "⚠️ Cannot verify items."
                )

                return

            total = (
                float(order["bill_amount"])
                + HELPER_CHARGE
                + PLATFORM_FEE
            )

            if not mark_payment_generated(order["order_id"], total):

                send_message(
                    ADMIN_NUMBER,
                    "⚠️ Payment already generated."
                )

                return


            # ------------------------------------------------
            # Send payment options to customer
            # ------------------------------------------------

            send_reply_buttons(
                to=order["customer_number"],
                body=(
                    "💰 *Payment Required – GramioGO*\n\n"
                    f"🆔 Order : {order['order_id']}\n"
                    f"💳 Total : ₹{total}\n\n"
                    "Choose payment method."
                ),
                buttons=[
                    {
                        "id": f"PAY_UPI_{order['id']}",
                        "title": "💳 UPI"
                    },
                    {
                        "id": f"PAY_COD_{order['id']}",
                        "title": "💵 COD"
                    }
                ]
            )

            send_message(
                ADMIN_NUMBER,
                f"💳 Payment generated for Order {order['order_id']}"
            )

            return


        # =================================================
        # VERIFY OTP → COMPLETE ORDER
        # =================================================

        if btn_id.startswith("VERIFY_OTP|"):

            order_db_id = int(btn_id.split("|")[1])

            order = get_order_by_db_id(order_db_id)

            if not order or order["status"] != "OTP_SUBMITTED":

                send_message(
                    ADMIN_NUMBER,
                    "❌ OTP not ready for verification."
                )

                return

            if not complete_order(order["order_id"]):

                send_message(
                    ADMIN_NUMBER,
                    "❌ Order completion failed."
                )

                return

            send_message(
                ADMIN_NUMBER,
                f"🎉 Order {order['order_id']} completed successfully."
            )

            return


        # =================================================
        # REJECT BILL
        # =================================================

        if btn_id.startswith("REJECT_BILL|"):

            order_db_id = int(btn_id.split("|")[1])

            order = get_order_by_db_id(order_db_id)

            if not order or order["status"] != "BILL_IMAGE_UPLOADED":

                send_message(
                    ADMIN_NUMBER,
                    "❌ Cannot reject bill."
                )

                return

            # ------------------------------------------------
            # Safe revert
            # ------------------------------------------------

            from db.mysql_conn import get_db

            db = get_db()

            cur = db.cursor()

            try:

                db.start_transaction()

                cur.execute(
                    """
                    UPDATE orders
                    SET bill_amount=NULL,
                        status='HELPER_ACCEPTED'
                    WHERE id=%s
                    """,
                    (order_db_id,)
                )

                db.commit()

            except Exception:

                db.rollback()

                send_message(
                    ADMIN_NUMBER,
                    "❌ Rejection failed."
                )

                return

            finally:

                cur.close()

                db.close()

            send_message(
                ADMIN_NUMBER,
                f"❌ Bill rejected for Order {order['order_id']}"
            )

            send_message(
                order["helper_phone"],
                "❌ Bill rejected. Please re-upload."
            )

            return


        # =================================================
        # FALLBACK
        # =================================================

        send_message(
            ADMIN_NUMBER,
            "❌ Unknown admin action."
        )


    except Exception:

        print("🔥 ADMIN ROUTER ERROR")

        traceback.print_exc()