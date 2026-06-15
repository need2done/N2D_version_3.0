import random
from utils.location import to_map_link
from core.order_finalizer import finalize_order
from whatsapp_client import send_reply_buttons, send_message
from session_store import reset_session

# =================================================
# MAIN CASE HANDLER
# =================================================
def handle(session: dict, text: str, raw: dict):
    try:
        user = session.get("user_id")
        if not user:
            return None

        # ---------- INIT ----------
        if not session.get("case_state"):
            session["case_state"] = "MODE_SELECT"
            session["data"] = {
                "mode": "",
                "items": [],
                "images": [],
                "location": "",
                "cost": ""
            }
            send_reply_buttons(
                to=user,
                body=(
                    "💊 *N2D Medicines Service*\n\n"
                    "Order health supplies or medicines safely with your prescription.\n\n"
                    "How would you like to share details?"
                ),
                buttons=[
                    {"id": "MED_UPLOAD", "title": "📸 Upload photo"},
                    {"id": "MED_TYPE", "title": "✍️ Type details"}
                ]
            )
            return None

        s = session["data"]
        state = session["case_state"]

        # ---------- MODE SELECT ----------
        if state == "MODE_SELECT":
            if text == "MED_UPLOAD" or text == "1":
                s["mode"] = "UPLOAD"
                session["case_state"] = "UPLOAD_IMAGE"
                return "📸 Please upload prescription photo."
            if text == "MED_TYPE" or text == "2":
                s["mode"] = "TYPE"
                session["case_state"] = "TYPE_DETAILS"
                return "📝 Please type medicine details."
            return "❌ Please select an option using buttons above."

        # ---------- FIRST-TIME UPLOAD ----------
        if state == "UPLOAD_IMAGE":
            if text != "IMAGE" and raw.get("type") != "image":
                return "❌ Please upload prescription image."
            
            media_id = raw.get("image", {}).get("id")
            if media_id:
                s.setdefault("images", []).append(media_id)
                s.setdefault("items", []).append("📸 Prescription image uploaded")
            
            session["case_state"] = "ASK_LOCATION"
            return (
                "✅ Prescription received.\n\n"
                "📍 Please share your location using WhatsApp location feature."
            )

        # ---------- FIRST-TIME TYPE ----------
        if state == "TYPE_DETAILS":
            if not text or len(text) < 2:
                return "❌ Please type valid medicine details."
            s["items"] = [text]
            session["case_state"] = "ASK_LOCATION"
            return (
                "✅ Medicine details noted.\n\n"
                "📍 Please share your location using WhatsApp location feature."
            )

        # ---------- LOCATION ----------
        if state == "ASK_LOCATION":
            if text == "LOCATION" or raw.get("type") == "location":
                lat = raw.get("location", {}).get("latitude") or session.get("latitude")
                lng = raw.get("location", {}).get("longitude") or session.get("longitude")
                
                if lat and lng:
                    session["latitude"] = lat
                    session["longitude"] = lng
                    s["location"] = to_map_link(lat, lng)
                    session["case_state"] = "ASK_COST"
                    
                    send_reply_buttons(
                        to=user,
                        body=(
                            "💰 *How much cash will the helper need for these medicines?*\n\n"
                            "💡 *Why this matters?*\n"
                            "This helps us ensure our helper carries enough cash to purchase your medicines. 🤝\n\n"
                            "📝 *Example:* If your prescription has 3 strips of Paracetamol, you might enter ₹150.\n\n"
                            "👉 *Not sure?* No problem! Just tap 'Skip' below. Our helper will pay as per the actual bill."
                        ),
                        buttons=[
                            {"id": "MED_SKIP_COST", "title": "⏭️ Skip / I don't know"}
                        ]
                    )
                    return None
            
            # If session already has GPS
            if session.get("latitude") and session.get("longitude"):
                s["location"] = to_map_link(session["latitude"], session["longitude"])
                session["case_state"] = "ASK_COST"
                send_reply_buttons(
                    to=user,
                    body=(
                        "💰 *How much cash will the helper need for these medicines?*\n\n"
                        "💡 *Why this matters?*\n"
                        "This helps us ensure our helper carries enough cash to purchase your medicines. 🤝\n\n"
                        "📝 *Example:* If your prescription has 3 strips of Paracetamol, you might enter ₹150.\n\n"
                        "👉 *Not sure?* No problem! Just tap 'Skip' below. Our helper will pay as per the actual bill."
                    ),
                    buttons=[
                        {"id": "MED_SKIP_COST", "title": "⏭️ Skip / I don't know"}
                    ]
                )
                return None

            return "📍 Please share your location using WhatsApp location feature."

        # ---------- COST ----------
        if state == "ASK_COST":
            if text == "MED_SKIP_COST":
                s["cost"] = "TBD"
            else:
                if not text or not text.isdigit():
                    return "❌ Please enter a number or use the Skip button."
                s["cost"] = text
            
            session["case_state"] = "SUMMARY"
            
            send_reply_buttons(
                to=user,
                body=_summary(session),
                buttons=[
                    {"id": "MED_CONFIRM", "title": "✅ Confirm"},
                    {"id": "MED_EDIT", "title": "✏️ Edit"},
                    {"id": "MED_CANCEL", "title": "❌ Cancel"}
                ]
            )
            return None

        # ---------- SUMMARY ----------
        if state == "SUMMARY":
            if text == "MED_CONFIRM" or text == "1":
                order_id = finalize_order(session)
                reset_session(user)
                return (
                    f"✅ Medicine order confirmed! 🎉\n"
                    f"🆔 Order ID: {order_id}\n"
                    "🙏 Thank you for choosing Need2Done!"
                )
            if text == "MED_EDIT" or text == "2":
                session["case_state"] = "EDIT_MENU"
                send_reply_buttons(
                    to=user,
                    body="✏️ What do you want to edit?",
                    buttons=[
                        {"id": "MED_ED_ITEM", "title": "📄 Details"},
                        {"id": "MED_ED_LOC", "title": "📍 Location"},
                        {"id": "MED_ED_COST", "title": "💰 Cost"}
                    ]
                )
                return None
            if text == "MED_CANCEL" or text == "3":
                reset_session(user)
                return "❌ Order cancelled.\nType Hi to start again."
            return "❌ Please use buttons to Confirm, Edit or Cancel."

        # ---------- EDIT MENU ----------
        if state == "EDIT_MENU":
            if text == "MED_ED_ITEM":
                if s.get("mode") == "UPLOAD":
                    session["case_state"] = "UPLOAD_IMAGE"
                    return "📸 Please upload prescription image again."
                else:
                    session["case_state"] = "TYPE_DETAILS"
                    return "📝 Please type updated medicine details."

            if text == "MED_ED_LOC":
                session["case_state"] = "ASK_LOCATION"
                return "📍 Please share updated location."

            if text == "MED_ED_COST":
                session["case_state"] = "ASK_COST"
                send_reply_buttons(
                    to=user,
                    body="💰 Enter updated estimated cost.",
                    buttons=[
                        {"id": "MED_SKIP_COST", "title": "⏭️ Skip / I don't know"}
                    ]
                )
                return None

            return "❌ Please select an option to edit."

        return "❌ I didn't understand that. Please use the buttons or type *Hi* to restart."

    except Exception as e:
        print("🔥 ERROR in case4_medicine:", str(e))
        return "❌ Error in medicine service. Type *Hi* to restart."


# ---------- SUMMARY HELPER ----------
def _summary(session):
    s = session["data"]
    items = "\n".join([f"• {i}" for i in s.get("items", [])])
    
    budget = s.get("cost", "TBD")
    if budget != "TBD":
        budget = f"₹{budget}"
    
    return (
        f"📋 *Medicine Order Summary*\n\n"
        f"👤 *Name:* {session.get('name', 'Customer')}\n"
        f"📝 *Details:* \n{items}\n"
        f"📍 *Location:* {s.get('location', 'Shared')}\n"
        f"💰 *Budget:* {budget}\n\n"
        "✅ *Confirm your order?*"
    )

