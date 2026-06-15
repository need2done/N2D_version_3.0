"""
=================================================
Need2Done – Case Router (FastAPI Compatible)
=================================================

✔ Routes ONLY during service flow
✔ Handles location safely
✔ Prevents double validation
✔ Never interferes with payment/admin
✔ Never crashes
✔ Always returns None or reply string
✔ Fully framework independent
"""

import traceback
from typing import Optional, Dict, Any

from whatsapp_client import send_message
from config import ADMIN_NUMBER
from db.mysql_conn import get_db


# =================================================
# CASE HANDLERS
# =================================================

from cases.case1_type import handle as case1
from cases.case4_medicine import handle as case4
from cases.case_ride import handle as case_ride


# =================================================
# MAIN CASE ROUTER
# =================================================

def route(
    session: Dict[str, Any],
    text: Optional[str],
    raw: Optional[Dict[str, Any]]
) -> Optional[str]:
    """
    Routes customer messages ONLY during service flow.
    """

    try:

        if not isinstance(session, dict):
            return None

        # Only process inside active service case
        if session.get("stage") != "IN_CASE":
            return None

        service = session.get("service")

        if not isinstance(raw, dict):
            raw = {}

        # -------------------------------------------------
        # SERVICE ROUTING
        # -------------------------------------------------

        # 1 = Groceries Service
        if service == 1:
            return case1(session, text, raw)

        # 2 = Medicines Service
        if service == 2:
            return case4(session, text, raw)

        # 3 = Parcel (Merged into Any Work Service)
        if service == 3:
            return case1(session, text, raw)

        # 4 = Ride Service
        if service == 4:
            return case_ride(session, text, raw)

        # 5 = Any Work Service (Reuse case1 logic)
        # Handles Parcel, Errands, custom tasks
        if service == 5:
            return case1(session, text, raw)

        # 6 = Support
        if service == 6:
            # Notify Admin
            customer_name = session.get("name", "Unknown")
            customer_phone = session.get("user_id", "Unknown")
            
            support_msg = (
                f"🚨 *SUPPORT REQUEST* 🚨\n\n"
                f"👤 Customer: {customer_name}\n"
                f"📱 Phone: {customer_phone}\n\n"
                f"Please contact them as soon as possible."
            )
            send_message(ADMIN_NUMBER, support_msg)
            
            # Save to Database for Dashboard
            try:
                db = get_db()
                cur = db.cursor()
                cur.execute(
                    "INSERT INTO support_requests (customer_name, customer_phone) VALUES (%s, %s)",
                    (customer_name, customer_phone)
                )
                db.commit()
                cur.close()
                db.close()
            except Exception as e:
                print(f"Error saving support request: {e}")
            
            return "📞 *Need2Done Support*\n\nOur team has been notified! Someone will contact you shortly, or you can call us directly at +91 7981072623."

        print("⚠️ UNKNOWN SERVICE:", service)

        return None

    except Exception:
        print("🔥 ERROR INSIDE router.py")
        traceback.print_exc()
        return None