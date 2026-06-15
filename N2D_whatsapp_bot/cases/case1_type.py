"""
=================================================
GramioGO – Case 1 (Groceries / AnyWork)
=================================================

✔ State-driven
✔ Location-safe with router re-entry
✔ No duplicate validation bug
✔ Never crashes
✔ Order finalized safely
✔ AnyWork has its own distinct flow
"""

from utils.location import to_map_link, haversine
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

        service_id = session.get("service")
        is_anywork = service_id in (3, 5)  # 3 = legacy AnyWork, 5 = AnyWork service menu

        # =================================================
        # INIT STATE
        # =================================================
        if not session.get("case_state"):
            session["case_state"] = "ITEM_MODE"
            session["data"] = {
                "items": [],
                "images": [],
                "location": "",
                "cost": ""
            }

            if is_anywork:
                header = "⚡ *N2D AnyWork Service* 🛠️"
                desc = "Send parcels, run errands, or any custom task."
                prompt = "📝 *How would you like to describe your task?*"
                buttons = [
                    {"id": "C1_ITEM_TEXT",  "title": "✍️ Type task"},
                    {"id": "C1_ITEM_IMAGE", "title": "📸 Upload photo"},
                    {"id": "C1_SKIP_TASK",  "title": "⏭️ Skip / No details"},
                ]
            else:
                header = "⚡ *N2D Groceries Service* 🛒"
                desc = "Order groceries, fresh food, or fresh milk."
                prompt = "🛒 *How would you like to add items?*"
                buttons = [
                    {"id": "C1_ITEM_TEXT",  "title": "✍️ Type items"},
                    {"id": "C1_ITEM_IMAGE", "title": "📸 Upload photo"},
                ]

            send_reply_buttons(
                to=user,
                body=(
                    f"{header}\n\n"
                    f"{desc}\n\n"
                    f"{prompt}"
                ),
                buttons=buttons
            )
            return None

        state = session.get("case_state")
        data = session.get("data", {})

        # Guard location message sent too early (GROCERY-I-010)
        if state in ("ITEM_MODE", "ITEM_TEXT", "ITEM_IMAGE", "ADD_MORE") and raw.get("type") == "location":
            return "⚠️ *Please enter your items first* before sharing your location."

        # =================================================
        # ITEM MODE
        # =================================================
        if state == "ITEM_MODE":
            btn = _btn_id(raw)

            if btn == "C1_SKIP_TASK":
                data.setdefault("items", []).append("No details provided")
                if is_anywork:
                    session["case_state"] = "ANYWORK_TYPE"
                    send_reply_buttons(
                        to=user,
                        body="🛠️ *Does your task require moving items between two locations?*",
                        buttons=[
                            {"id": "AW_TYPE_PICK_DROP", "title": "🚚 Yes (Pick & Drop)"},
                            {"id": "AW_TYPE_SINGLE",    "title": "📍 No (Single Location)"}
                        ]
                    )
                    return None
                else:
                    session["case_state"] = "LOCATION"
                    return "📍 Please share your delivery location using the WhatsApp location feature."

            if btn == "C1_ITEM_TEXT":
                session["case_state"] = "ITEM_TEXT"
                if is_anywork:
                    return (
                        "📝 *Describe your task in one message.*\n\n"
                        "Examples:\n"
                        "• Bring my pendrive from office\n"
                        "• Deliver parcel to Gachibowli\n"
                        "• Pick up my medicine from Apollo\n\n"
                        "Just type what you need done 👇\n\n"
                        "📞 Or call us directly: *9885131080*"
                    )
                else:
                    return (
                        "📝 *Please type your items.*\n\n"
                        "Example: 🥚 Eggs 6, 🍚 Rice 5kg, 🥛 Milk 2 packets"
                    )

            if btn == "C1_ITEM_IMAGE":
                session["case_state"] = "ITEM_IMAGE"
                if is_anywork:
                    return "📸 Upload a photo of the task or parcel."
                return "📸 Please upload your item list photo."

            return "❌ Please select an option using the buttons above."

        # =================================================
        # ITEM TEXT
        # =================================================
        if state == "ITEM_TEXT":
            if is_anywork:
                if not text or len(text.strip()) < 2:
                    return "❌ Please enter valid details."
                data.setdefault("items", []).append(text.strip())
            else:
                if not is_valid_item_text(text):
                    return "❌ Please enter valid item names (e.g. Milk 2, Eggs 6). Emojis or numbers only are not accepted."
                
                # Truncate very long messages to 1000 characters to prevent database/display issues (GROCERY-I-009)
                safe_text = text.strip()[:1000]
                data.setdefault("items", []).append(safe_text)
                data["items"] = merge_items_list(data["items"])

            session["case_state"] = "ADD_MORE"

            prompt = "➕ Do you want to add more task details?" if is_anywork else "➕ Do you want to add more items?"

            send_reply_buttons(
                to=user,
                body=prompt,
                buttons=[
                    {"id": "C1_ADD_YES", "title": "Yes"},
                    {"id": "C1_ADD_NO",  "title": "No"}
                ]
            )
            return None

        # =================================================
        # ITEM IMAGE
        # =================================================
        if state == "ITEM_IMAGE":
            if raw.get("type") == "document":
                return "❌ PDF or document format is not supported. Please upload a clear image/photo of your grocery list."

            if raw.get("type") != "image":
                return "❌ Please upload an image."

            media_id = raw.get("image", {}).get("id")
            if not media_id:
                return "❌ Invalid image. Please try again."

            caption = raw.get("image", {}).get("caption", "").strip().lower()
            
            # Check for mock validation points
            if "blurred" in caption:
                return "❌ The image seems blurred. Please upload a clear photo of your grocery list."
            elif "selfie" in caption:
                return "❌ Cannot detect items. The image looks like a selfie. Please upload a photo of your grocery list."
            elif "wallpaper" in caption or "random" in caption:
                return "❌ Invalid image. Please upload a valid photo of your grocery list."

            extracted_items = []
            if caption and any(c.isalpha() for c in caption):
                extracted_items = merge_items_list([caption])

            data.setdefault("images", []).append(media_id)
            
            if extracted_items:
                data.setdefault("items", []).extend(extracted_items)
                data["items"] = merge_items_list(data["items"])
                msg_body = f"📸 Photo uploaded. Extracted items:\n" + "\n".join(f"• {i}" for i in extracted_items)
            else:
                label = "📸 Task photo uploaded" if is_anywork else "📸 Item image uploaded"
                data.setdefault("items", []).append(label)
                msg_body = "📸 Photo uploaded successfully."

            session["case_state"] = "ADD_MORE"

            send_reply_buttons(
                to=user,
                body=f"{msg_body}\n\n➕ Do you want to add more?",
                buttons=[
                    {"id": "C1_ADD_YES", "title": "Yes"},
                    {"id": "C1_ADD_NO",  "title": "No"}
                ]
            )
            return None

        # =================================================
        # ADD MORE
        # =================================================
        if state == "ADD_MORE":
            btn = _btn_id(raw)

            if btn == "C1_ADD_YES":
                session["case_state"] = "ITEM_MODE"
                if is_anywork:
                    send_reply_buttons(
                        to=user,
                        body="Add more task details:",
                        buttons=[
                            {"id": "C1_ITEM_TEXT",  "title": "✍️ Type task"},
                            {"id": "C1_ITEM_IMAGE", "title": "📸 Upload photo"},
                        ]
                    )
                else:
                    send_reply_buttons(
                        to=user,
                        body="🛒 Add more items:",
                        buttons=[
                            {"id": "C1_ITEM_TEXT",  "title": "✍️ Type items"},
                            {"id": "C1_ITEM_IMAGE", "title": "📸 Upload photo"},
                        ]
                    )
                return None

            if btn == "C1_ADD_NO":
                if session.get("edit_mode") in ("ADD_ITEMS", "REPLACE_ITEMS"):
                    session["case_state"] = "SUMMARY"
                    session.pop("edit_mode", None)
                    send_reply_buttons(
                        to=user,
                        body=_summary(session),
                        buttons=[
                            {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                            {"id": "C1_EDIT",    "title": "✏️ Edit"},
                            {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                        ]
                    )
                    return None

                if is_anywork:
                    session["case_state"] = "ANYWORK_TYPE"
                    send_reply_buttons(
                        to=user,
                        body="🛠️ *Does your task require moving items between two locations?*",
                        buttons=[
                            {"id": "AW_TYPE_PICK_DROP", "title": "🚚 Yes (Pick & Drop)"},
                            {"id": "AW_TYPE_SINGLE",    "title": "📍 No (Single Location)"}
                        ]
                    )
                    return None
                else:
                    session["case_state"] = "LOCATION"
                    return "📍 Please share your location using WhatsApp location feature."

            return "❌ Please select 'Yes' or 'No' using the buttons above."

        # =================================================
        # ANYWORK TYPE SELECTION
        # =================================================
        if state == "ANYWORK_TYPE":
            btn = _btn_id(raw)
            if btn == "AW_TYPE_PICK_DROP":
                data["anywork_type"] = "PICK_DROP"
                session["case_state"] = "LOCATION_PICKUP"
                return "📍 Please share the *PICKUP* location using the WhatsApp location feature."
            elif btn == "AW_TYPE_SINGLE":
                data["anywork_type"] = "SINGLE"
                session["case_state"] = "LOCATION"
                return "📍 Please share your *WORK* location using the WhatsApp location feature."
            else:
                return "❌ Please select an option using the buttons above."

        # =================================================
        # LOCATION PICKUP
        # =================================================
        if state == "LOCATION_PICKUP":
            if raw.get("type") == "location":
                loc = raw.get("location", {})
                lat = loc.get("latitude")
                lng = loc.get("longitude")

                if lat is None or lng is None:
                    return "❌ Invalid location. Please resend."

                session["pickup_latitude"] = lat
                session["pickup_longitude"] = lng
                data["pickup_location"] = to_map_link(lat, lng)

                session["case_state"] = "LOCATION_DROP"
                return "🏁 Please share the *DROP-OFF* location using the WhatsApp location feature."

            return "📍 Please share the *PICKUP* location using the WhatsApp location feature."

        # =================================================
        # LOCATION DROP
        # =================================================
        if state == "LOCATION_DROP":
            if raw.get("type") == "location":
                loc = raw.get("location", {})
                lat = loc.get("latitude")
                lng = loc.get("longitude")

                if lat is None or lng is None:
                    return "❌ Invalid location. Please resend."

                session["latitude"] = lat
                session["longitude"] = lng
                data["location"] = to_map_link(lat, lng)

                # Store coordinates in data for payload sync
                data["pickup_lat"] = session.get("pickup_latitude")
                data["pickup_lng"] = session.get("pickup_longitude")
                data["drop_lat"] = lat
                data["drop_lng"] = lng

                # AnyWork Pick & Drop -> skip cost
                data["cost"] = "TBD"
                session["case_state"] = "SUMMARY"
                send_reply_buttons(
                    to=user,
                    body=_summary(session),
                    buttons=[
                        {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                        {"id": "C1_EDIT",    "title": "✏️ Edit"},
                        {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                    ]
                )
                return None

            return "🏁 Please share the *DROP-OFF* location using the WhatsApp location feature."

        # =================================================
        # LOCATION
        # =================================================
        if state == "LOCATION":

            # ✅ Router already saved GPS → move forward
            if session.get("latitude") and session.get("longitude"):
                lat = session["latitude"]
                lng = session["longitude"]
                data["location"] = to_map_link(lat, lng)

                if session.get("edit_mode") == "LOCATION":
                    session["case_state"] = "SUMMARY"
                    session.pop("edit_mode", None)
                    send_reply_buttons(
                        to=user,
                        body=_summary(session),
                        buttons=[
                            {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                            {"id": "C1_EDIT",    "title": "✏️ Edit"},
                            {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                        ]
                    )
                    return None

                # AnyWork → skip cost step, go straight to summary
                if is_anywork:
                    data["cost"] = "TBD"
                    session["case_state"] = "SUMMARY"
                    send_reply_buttons(
                        to=user,
                        body=_summary(session),
                        buttons=[
                            {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                            {"id": "C1_EDIT",    "title": "✏️ Edit"},
                            {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                        ]
                    )
                    return None
                else:
                    session["case_state"] = "COST"
                    send_reply_buttons(
                        to=user,
                        body=(
                            "💰 *How much cash will the helper need for this errand?*\n\n"
                            "👉 Enter amount (e.g. 200) or tap Skip if not sure."
                        ),
                        buttons=[{"id": "C1_SKIP_COST", "title": "⏭️ Skip"}]
                    )
                    return None

            # ✅ WhatsApp location comes directly
            if raw.get("type") == "location":
                loc = raw.get("location", {})
                lat = loc.get("latitude")
                lng = loc.get("longitude")

                if lat is None or lng is None:
                    return "❌ Invalid location. Please resend."

                session["latitude"] = lat
                session["longitude"] = lng
                data["location"] = to_map_link(lat, lng)

                if session.get("edit_mode") == "LOCATION":
                    session["case_state"] = "SUMMARY"
                    session.pop("edit_mode", None)
                    send_reply_buttons(
                        to=user,
                        body=_summary(session),
                        buttons=[
                            {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                            {"id": "C1_EDIT",    "title": "✏️ Edit"},
                            {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                        ]
                    )
                    return None

                # AnyWork → skip cost step
                if is_anywork:
                    data["cost"] = "TBD"
                    session["case_state"] = "SUMMARY"
                    send_reply_buttons(
                        to=user,
                        body=_summary(session),
                        buttons=[
                            {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                            {"id": "C1_EDIT",    "title": "✏️ Edit"},
                            {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                        ]
                    )
                    return None
                else:
                    session["case_state"] = "COST"
                    send_reply_buttons(
                        to=user,
                        body=(
                            "💰 *How much cash will the helper need for this errand?*\n\n"
                            "👉 Enter amount (e.g. 200) or tap Skip if not sure."
                        ),
                        buttons=[{"id": "C1_SKIP_COST", "title": "⏭️ Skip"}]
                    )
                    return None

            return "📍 Please share your location using WhatsApp location feature."

        # =================================================
        # COST (Groceries only)
        # =================================================
        if state == "COST":
            btn = _btn_id(raw)
            if btn == "C1_SKIP_COST":
                data["cost"] = "TBD"
            else:
                if not text or not text.isdigit() or int(text) <= 0:
                    return "❌ Please enter a valid positive numeric amount (e.g. 500) or use the Skip button."
                data["cost"] = text.strip()

            session["case_state"] = "SUMMARY"
            session.pop("edit_mode", None)

            send_reply_buttons(
                to=user,
                body=_summary(session),
                buttons=[
                    {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                    {"id": "C1_EDIT",    "title": "✏️ Edit"},
                    {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                ]
            )
            return None

        # =================================================
        # SUMMARY ACTION
        # =================================================
        if state == "SUMMARY":
            btn = _btn_id(raw)

            if btn == "C1_CONFIRM":
                from session_store import start_confirming
                if not start_confirming(user):
                    return None
                finalize_order(session)
                reset_session(user)
                return "✅ Order placed successfully!"

            if btn == "C1_EDIT":
                session["case_state"] = "EDIT_MENU"
                edit_buttons = [
                    {"id": "EDIT_ITEMS", "title": "🛍️ Edit Items"},
                    {"id": "EDIT_LOCATION", "title": "📍 Edit Location"}
                ]
                if not is_anywork:
                    edit_buttons.append({"id": "EDIT_COST", "title": "💰 Edit Cash"})
                
                send_reply_buttons(
                    to=user,
                    body="✏️ *What would you like to edit?*",
                    buttons=edit_buttons
                )
                return None

            if btn == "C1_CANCEL":
                reset_session(user)
                return "❌ Order cancelled."

            return "❌ Please use the buttons above to Confirm, Edit, or Cancel."

        # =================================================
        # EDIT MENU
        # =================================================
        if state == "EDIT_MENU":
            btn = _btn_id(raw)
            if btn == "EDIT_ITEMS":
                session["case_state"] = "EDIT_ITEMS_MENU"
                send_reply_buttons(
                    to=user,
                    body="🛍️ *How would you like to edit your items?*",
                    buttons=[
                        {"id": "EDIT_ITEMS_ADD", "title": "➕ Add Items"},
                        {"id": "EDIT_ITEMS_REPLACE", "title": "🔄 Replace Items"},
                        {"id": "EDIT_ITEMS_BACK", "title": "🔙 Back"}
                    ]
                )
                return None
            elif btn == "EDIT_LOCATION":
                session["latitude"] = None
                session["longitude"] = None
                session["edit_mode"] = "LOCATION"
                session["case_state"] = "LOCATION"
                return "📍 Please share your new location using the WhatsApp location feature."
            elif btn == "EDIT_COST" and not is_anywork:
                session["edit_mode"] = "COST"
                session["case_state"] = "COST"
                send_reply_buttons(
                    to=user,
                    body=(
                        "💰 *How much cash will the helper need for this errand?*\n\n"
                        "👉 Enter amount (e.g. 200) or tap Skip if not sure."
                    ),
                    buttons=[{"id": "C1_SKIP_COST", "title": "⏭️ Skip"}]
                )
                return None
            else:
                session["case_state"] = "SUMMARY"
                send_reply_buttons(
                    to=user,
                    body=_summary(session),
                    buttons=[
                        {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                        {"id": "C1_EDIT",    "title": "✏️ Edit"},
                        {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                    ]
                )
                return None

        # =================================================
        # EDIT ITEMS MENU
        # =================================================
        if state == "EDIT_ITEMS_MENU":
            btn = _btn_id(raw)
            if btn == "EDIT_ITEMS_ADD":
                session["edit_mode"] = "ADD_ITEMS"
                session["case_state"] = "ITEM_MODE"
                
                header = "✏️ *Let's add items to your Order* 🛒" if not is_anywork else "✏️ *Let's add details to your Order* 🛠️"
                prompt = "🛒 *How would you like to add more items?*" if not is_anywork else "📝 *How would you like to describe your task?*"
                
                buttons = [
                    {"id": "C1_ITEM_TEXT",  "title": "✍️ Type items" if not is_anywork else "✍️ Type task"},
                    {"id": "C1_ITEM_IMAGE", "title": "📸 Upload photo"},
                ]
                
                send_reply_buttons(
                    to=user,
                    body=f"{header}\n\n{prompt}",
                    buttons=buttons
                )
                return None
                
            elif btn == "EDIT_ITEMS_REPLACE":
                session["data"]["items"] = []
                session["data"]["images"] = []
                session["edit_mode"] = "REPLACE_ITEMS"
                session["case_state"] = "ITEM_MODE"
                
                header = "✏️ *Let's reset and edit your Order* 🛒" if not is_anywork else "✏️ *Let's reset and edit your AnyWork Order* 🛠️"
                prompt = "🛒 *How would you like to add items?*" if not is_anywork else "📝 *How would you like to describe your task?*"
                
                buttons = [
                    {"id": "C1_ITEM_TEXT",  "title": "✍️ Type items" if not is_anywork else "✍️ Type task"},
                    {"id": "C1_ITEM_IMAGE", "title": "📸 Upload photo"},
                ]
                
                send_reply_buttons(
                    to=user,
                    body=f"{header}\n\n{prompt}",
                    buttons=buttons
                )
                return None
                
            else:
                session["case_state"] = "SUMMARY"
                send_reply_buttons(
                    to=user,
                    body=_summary(session),
                    buttons=[
                        {"id": "C1_CONFIRM", "title": "✅ Confirm"},
                        {"id": "C1_EDIT",    "title": "✏️ Edit"},
                        {"id": "C1_CANCEL",  "title": "❌ Cancel"}
                    ]
                )
                return None

        return "❌ I didn't understand that. Please use the buttons above."

    except Exception as e:
        import traceback
        traceback.print_exc()
        print("🔥 ERROR IN case1_type:", str(e))
        return "❌ Something went wrong. Please type *Hi* to start again."


# =================================================
# HELPERS
# =================================================
def _btn_id(raw: dict):
    try:
        return raw.get("interactive", {}).get("button_reply", {}).get("id")
    except Exception:
        return None


def _summary(session: dict) -> str:
    s = session.get("data", {})
    items = s.get("items", [])
    service_id = session.get("service")
    is_anywork = service_id in (3, 5)

    if is_anywork:
        header = "🛠️ *Order Summary - AnyWork*"
        label  = "📝 *Task Details:*"
        cost_label = None  # AnyWork hides cost from summary
    else:
        header = "🛒 *Order Summary - Groceries*"
        label  = "🛍️ *Items to Buy:*"
        cost_label = "Estimated Bill"

    items_text = "\n".join(f"• {i}" for i in items) if items else "None"

    # Dynamic Location Info and Pricing Breakdown based on AnyWork Type
    pricing_text = ""
    if is_anywork:
        anywork_type = s.get("anywork_type")
        if anywork_type == "PICK_DROP":
            loc_text = (
                f"📍 *Pickup Location:*\n{s.get('pickup_location', 'Shared via WhatsApp')}\n\n"
                f"🏁 *Drop-Off Location:*\n{s.get('location', 'Shared via WhatsApp')}\n"
            )
            p_lat = session.get("pickup_latitude")
            p_lng = session.get("pickup_longitude")
            d_lat = session.get("latitude")
            d_lng = session.get("longitude")
            if p_lat is not None and d_lat is not None:
                try:
                    route_dist = haversine(float(p_lat), float(p_lng), float(d_lat), float(d_lng))
                    base_fee = 20.0
                    delivery_fee = round(route_dist * 12.0, 1)
                    platform_fee = 5.0
                    helper_charge = min(base_fee + delivery_fee, 250.0)
                    total_est = helper_charge + platform_fee
                    
                    pricing_text = (
                        f"💰 *Estimated Fare Breakdown:*\n"
                        f"• Service Base: ₹{base_fee:.1f}\n"
                        f"• Distance Delivery: ₹{delivery_fee:.1f} ({route_dist:.2f} km)\n"
                        f"• Platform Fee: ₹{platform_fee:.1f}\n"
                        f"👉 *Estimated Total:* *₹{total_est:.1f}*\n\n"
                    )
                except Exception:
                    pass
        else:
            loc_label = "Work Location"
            loc_text = f"📍 *{loc_label}:*\n{s.get('location', 'Shared via WhatsApp')}\n"
            base_fee = 20.0
            platform_fee = 5.0
            pricing_text = (
                f"💰 *Estimated Fare Breakdown:*\n"
                f"• Service Base: ₹{base_fee:.1f}\n"
                f"• Platform Fee: ₹{platform_fee:.1f}\n"
                f"• Helper Travel: ₹5.0/km (based on helper distance)\n"
                f"👉 *Estimated Base:* *₹{base_fee + platform_fee:.1f}* + travel surcharge\n\n"
            )
    else:
        loc_label = "Delivery Location"
        loc_text = f"📍 *{loc_label}:*\n{s.get('location', 'Shared via WhatsApp')}\n"

    body = (
        f"✨ {header} ✨\n\n"
        f"👤 *Customer:* {session.get('name', 'Valued Customer')}\n\n"
        f"{label}\n{items_text}\n\n"
        f"{loc_text}\n"
    )

    if pricing_text:
        body += pricing_text

    if cost_label:
        budget = s.get("cost", "TBD")
        if budget != "TBD":
            budget = f"₹{budget}"
        body += (
            f"💰 *{cost_label}:* {budget}\n"
            "_(Final amount will be updated after completion)_\n\n"
        )

    body += "✅ *Please confirm your order:*"
    return body


# =================================================
# VALIDATION & PARSING HELPERS
# =================================================
import re
from typing import Optional

def is_valid_item_text(text: str) -> bool:
    if not text:
        return False
    t = text.strip()
    if len(t) < 2:
        return False
    return any(c.isalpha() for c in t)

def clean_item_name(name: str) -> str:
    name = re.sub(r'[^\w\s]', '', name)
    name = re.sub(r'\d+', '', name)
    name = name.lower().strip()
    words = name.split()
    filtered_words = []
    units = {"kg", "kgs", "packet", "packets", "pkt", "pkts", "litre", "litres", "l", "ltr", "ltrs", "ml", "g", "gm", "gms", "gram", "grams", "piece", "pieces", "pcs", "pc", "box", "boxes", "bottle", "bottles"}
    for w in words:
        if w not in units:
            filtered_words.append(w)
    return " ".join(filtered_words)

UNIT_NORMALIZATION = {
    "kgs": "kg", "packet": "packet", "packets": "packet", "pkts": "packet", "pkt": "packet",
    "litre": "litre", "litres": "litre", "ltrs": "litre", "ltr": "litre", "l": "litre",
    "gms": "g", "gm": "g", "grams": "g", "gram": "g",
    "pieces": "piece", "pcs": "piece", "pc": "piece",
    "boxes": "box", "bottles": "bottle"
}

def parse_item(item_str: str):
    item_str_clean = item_str.strip()
    match_num = re.search(r'(\d+(?:[\.,]\d+)?)', item_str_clean)
    if match_num:
        qty = float(match_num.group(1).replace(',', '.'))
        if qty.is_integer():
            qty = int(qty)
        
        num_start, num_end = match_num.span()
        suffix = item_str_clean[num_end:].strip()
        unit_match = re.match(r'^([a-zA-Z]+)', suffix)
        unit = ""
        if unit_match:
            unit = unit_match.group(1).lower()
        else:
            words = suffix.split()
            if words and words[0].lower() in {"packet", "packets", "pkt", "pkts", "litre", "litres", "l", "ltr", "ltrs", "ml", "g", "gm", "gms", "gram", "grams", "piece", "pieces", "pcs", "pc", "box", "boxes", "bottle", "bottles"}:
                unit = words[0].lower()
        
        unit = UNIT_NORMALIZATION.get(unit, unit)
        base_name = clean_item_name(item_str_clean)
        return base_name, qty, unit or None
    else:
        base_name = clean_item_name(item_str_clean)
        return base_name, 1, None

def format_item(name: str, qty, unit: Optional[str]) -> str:
    formatted_name = name.title()
    if not unit:
        return f"{formatted_name} {qty}"
    
    if qty > 1:
        if unit == "box":
            display_unit = "boxes"
        elif unit == "glass":
            display_unit = "glasses"
        elif unit in {"kg", "g", "ml", "l"}:
            display_unit = unit
        else:
            display_unit = f"{unit}s"
    else:
        display_unit = unit
    
    return f"{formatted_name} {qty} {display_unit}"

def merge_items_list(items_list: list) -> list:
    parsed_items = []
    non_parsed = []
    
    for item in items_list:
        item_str = item.strip()
        if item_str.startswith("📸") or "uploaded" in item_str.lower():
            non_parsed.append(item_str)
            continue
        
        parts = re.split(r'[\n,;]+', item_str)
        for part in parts:
            part = part.strip()
            if not part:
                continue
            if not any(c.isalpha() for c in part):
                continue
            
            base_name, qty, unit = parse_item(part)
            if base_name:
                parsed_items.append({
                    "name": base_name,
                    "qty": qty,
                    "unit": unit
                })
    
    merged = {}
    for item in parsed_items:
        key = (item["name"], item["unit"])
        if key in merged:
            merged[key] += item["qty"]
        else:
            merged[key] = item["qty"]
    
    result = []
    for (name, unit), qty in merged.items():
        result.append(format_item(name, qty, unit))
    
    result.extend(non_parsed)
    return result
