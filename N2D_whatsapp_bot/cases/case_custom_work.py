"""
=================================================
Need2Done – Custom Work Service Case Handler (v1.0)
Bhongir Pilot Interactive WhatsApp Handler
=================================================
"""

import requests
import json
import traceback
from typing import Optional, Dict, Any

NODE_BACKEND_URL = "http://localhost:5000/api/custom-work/quote"

def handle(session: Dict[str, Any], text: Optional[str], raw: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    Handles customer interactions during Custom Work ordering flow in WhatsApp.
    """
    try:
        step = session.get("custom_work_step", "INIT")
        text_clean = (text or "").strip()

        # Step 1: Init / Task Description Intake
        if step == "INIT":
            session["custom_work_step"] = "WAITING_DETAILS"
            return (
                "💼 *Need2Done Custom Work (Bhongir Pilot)*\n"
                "━━━━━━━━━━━━━━━━━━━━━\n"
                "Please describe your task in plain text or send a voice note.\n\n"
                " *Example:* _'Collect charger from home and bring to my office in Degree College'_"
            )

        # Step 2: Calculate Fare via Backend API
        if step == "WAITING_DETAILS":
            session["task_description"] = text_clean
            session["custom_work_step"] = "CONFIRM_QUOTE"

            # Call Node.js Pricing Engine Endpoint
            try:
                payload = {
                    "taskType": "unique_custom_task",
                    "distanceKm": 4.5, # Default pilot route estimation
                    "description": text_clean
                }
                res = requests.post(NODE_BACKEND_URL, json=payload, timeout=5)
                data = res.json()

                if data.get("success"):
                    summary = data.get("summary", {})
                    service_fee = summary.get("serviceFee", 119)
                    payout = summary.get("guaranteedHelperPayout", 75)
                    session["quoted_fee"] = service_fee

                    return (
                        f"🧾 *Custom Work Price Quote*\n"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"📝 *Task:* {text_clean[:60]}...\n"
                        f"🛣️ *Est. Distance:* {data.get('calculatedDistanceKm', 4.5)} km\n"
                        f"⏱️ *Included Time:* Up to 15 mins handling\n\n"
                        f"💵 *Quoted Service Fee:* *₹{service_fee}*\n"
                        f"_(No percentage markups, goods charged at cost)_\n\n"
                        f"Reply *YES* to confirm and dispatch helper, or *CANCEL* to stop."
                    )
            except Exception as e:
                print(f"[CUSTOM_WORK_BOT] Backend pricing call notice: {e}")

            # Fallback quote
            session["quoted_fee"] = 119
            return (
                f"🧾 *Custom Work Price Quote*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"📝 *Task:* {text_clean[:60]}...\n"
                f"💵 *Quoted Service Fee:* *₹119*\n\n"
                f"Reply *YES* to confirm and dispatch helper, or *CANCEL* to stop."
            )

        # Step 3: Confirmation
        if step == "CONFIRM_QUOTE":
            if text_clean.upper() in ["YES", "Y", "CONFIRM", "OK"]:
                session["custom_work_step"] = "DONE"
                session["stage"] = "COMPLETED"
                quoted = session.get("quoted_fee", 119)
                return (
                    f"✅ *Order Confirmed! (#CW-{session.get('user_id', '101')[-4:]})*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                    f"A helper is being assigned to your location.\n"
                    f"💰 *Quoted Fee:* ₹{quoted}\n\n"
                    f"📲 *Live Tracking Link:* http://need2done.in/track/CW-{session.get('user_id', '101')[-4:]}\n\n"
                    f"Thank you for using Need2Done!"
                )
            else:
                session["custom_work_step"] = "INIT"
                session["stage"] = "MENU"
                return "❌ *Task Canceled.* You can start a new request anytime by typing *HI*."

        return None

    except Exception:
        print("🔥 ERROR INSIDE case_custom_work.py")
        traceback.print_exc()
        return "An error occurred while processing your request. Please try again."
