"""
=================================================
Need2Done – Custom Work Service Case Handler (v3.0)
Bhongir Pilot Interactive WhatsApp Handler
=================================================
✔ Audio download & Gemini / Sarvam STT voice recognition
✔ Auto-translated and cleaned voice transcripts
✔ Step-by-step Pickup & Drop Location Collection (Pin or Address)
✔ Ola Maps road distance & itemized fee calculation
✔ Explicit item payment policy & helper dispatch
"""

import requests
import json
import traceback
from typing import Optional, Dict, Any

from utils.ai_service import classify_custom_work_intent_gemini, transcribe_audio_sarvam_or_whisper, process_voice_note_with_translation
from utils.location import to_map_link, get_road_distance, haversine
from whatsapp_client import download_whatsapp_media, send_reply_buttons, send_message, send_url_button
from core.order_finalizer import finalize_order
from config import TRACKING_BASE_URL
import re

NODE_BACKEND_URL = "http://localhost:5000/api/custom-work/quote"

def handle(session: Dict[str, Any], text: Optional[str], raw: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    Handles customer interactions during Custom Work ordering flow in WhatsApp.
    Collects Pickup & Drop Locations, calculates exact distance via Ola Maps, and provides itemized quote.
    """
    try:
        step = session.get("custom_work_step", "INIT")
        text_clean = (text or "").strip()
        user = session.get("user_id") or session.get("phone") or session.get("user")

        # Step 1: Init / Task Description Intake
        if step == "INIT":
            session["custom_work_step"] = "WAITING_DETAILS"
            session.pop("pickup_location", None)
            session.pop("drop_location", None)
            session.pop("pickup_lat", None)
            session.pop("pickup_lng", None)
            session.pop("drop_lat", None)
            session.pop("drop_lng", None)

            body = (
                "💼 *Need2Done Custom Work (Bhongir Pilot)*\n"
                "━━━━━━━━━━━━━━━━━━━━━\n"
                "Please describe your task in plain text or send a voice note.\n\n"
                "💡 *Example:* _'Collect charger from home and bring to my office in Degree College'_"
            )
            buttons = [
                {"id": "CW_VOICE_GUIDE", "title": "🎙️ Send Voice Note"},
                {"id": "CW_TEXT_GUIDE", "title": "✍️ Type Task"}
            ]
            if user:
                send_reply_buttons(to=user, body=body, buttons=buttons)
                return None
            return body

        # Step 2: Intake Details (Text or Audio Voice Note)
        if step == "WAITING_DETAILS":
            if text_clean == "CW_VOICE_GUIDE":
                if user:
                    send_message(user, "🎙️ *Voice Note Instructions:*\n\nHold the microphone button in WhatsApp and describe your task clearly in **Telugu, Hindi, English, or Teluglish**.")
                    return None
            elif text_clean == "CW_TEXT_GUIDE":
                if user:
                    send_message(user, "✍️ Please type your task description in plain text below:")
                    return None

            # Voice Note Audio Intake
            if text_clean.startswith("AUDIO") or (raw and raw.get("type") in ["audio", "voice"]):
                media_id = ""
                if text_clean.startswith("AUDIO:"):
                    media_id = text_clean.split("AUDIO:")[1]
                elif raw and raw.get("type") in ["audio", "voice"]:
                    media_id = raw.get(raw.get("type"), {}).get("id", "")

                if media_id:
                    audio_bytes = download_whatsapp_media(media_id)
                    if audio_bytes:
                        voice_res = process_voice_note_with_translation(audio_bytes, "voice.ogg")
                        orig_text = voice_res.get("original_text", "").strip()
                        eng_text = voice_res.get("english_text", "").strip()

                        if not orig_text and not eng_text:
                            body = (
                                "⚠️ *Could not hear audio clearly*\n"
                                "━━━━━━━━━━━━━━━━━━━━━\n"
                                "We could not detect clear speech in your voice note.\n\n"
                                "Please tap 🎙️ to **record again** or **type your task** in plain text."
                            )
                            buttons = [
                                {"id": "CW_RETRY_VOICE", "title": "🔄 Record Again"},
                                {"id": "CW_CANCEL_TASK", "title": "❌ Cancel"}
                            ]
                            if user:
                                send_reply_buttons(to=user, body=body, buttons=buttons)
                                return None
                            return body

                        has_regional = bool(re.search(r'[\u0C00-\u0C7F\u0900-\u097F]', orig_text))
                        if has_regional and (not eng_text or eng_text.strip() == orig_text.strip()):
                            from utils.ai_service import clean_and_translate_transcript
                            eng_text = clean_and_translate_transcript(orig_text)

                        session["pending_task_text"] = eng_text or orig_text
                        session["custom_work_step"] = "CONFIRM_AUDIO_TRANSCRIPT"

                        if orig_text and eng_text and orig_text.strip() != eng_text.strip():
                            body = (
                                f"🎙️ *Voice Note Transcribed:*\n"
                                f"_{orig_text}_\n\n"
                                f"🔤 *English Translation:*\n"
                                f"_{eng_text}_\n\n"
                                f"━━━━━━━━━━━━━━━━━━━━━\n"
                                f"*Is this task description correct?*"
                            )
                        else:
                            body = (
                                f"🎙️ *Voice Note Transcribed:*\n"
                                f"_{eng_text or orig_text}_\n\n"
                                f"━━━━━━━━━━━━━━━━━━━━━\n"
                                f"*Is this task description correct?*"
                            )

                        buttons = [
                            {"id": "CW_CONFIRM_VOICE", "title": "✅ Confirm & Proceed"},
                            {"id": "CW_RETRY_VOICE", "title": "🔄 Record Again"}
                        ]
                        if user:
                            send_reply_buttons(to=user, body=body, buttons=buttons)
                            return None
                        return body

                body = "⚠️ Please type your task description in plain text or send a clear voice note."
                if user:
                    send_message(user, body)
                    return None
                return body

            if len(text_clean) < 3:
                return "Please provide a brief description of your task (at least a few words)."

            session["pending_task_text"] = text_clean
            return prompt_for_locations_or_quote(session, text_clean, user)

        # Step 3: Voice Note Transcript Confirmation
        if step == "CONFIRM_AUDIO_TRANSCRIPT":
            if text_clean.upper() in ["1", "YES", "Y", "CONFIRM", "OK", "CW_CONFIRM_VOICE"]:
                task_text = session.get("pending_task_text", "Custom Errand Task")
                return prompt_for_locations_or_quote(session, task_text, user)
            else:
                session["custom_work_step"] = "WAITING_DETAILS"
                body = (
                    "🔄 *Re-recording / Editing Task*\n"
                    "━━━━━━━━━━━━━━━━━━━━━\n"
                    "Please tap 🎙️ to **record your voice note again** or **type your task** in plain text."
                )
                if user:
                    send_message(user, body)
                    return None
                return body

        # Step 3.5: Collect Quantity / Specs Clarification
        if step == "WAITING_QUANTITY_DETAILS":
            if text_clean in ["CW_QTY_DEFAULT_PETROL", "CW_QTY_1L", "DEFAULT 1 LITRE"]:
                qty_str = "1 Litre Emergency Petrol"
            elif text_clean == "CW_QTY_TYPE":
                if user:
                    send_message(user, "✍️ Please type the exact quantity / details below (e.g. *1 Litre petrol* or *5kg Rice, 1L Oil*):")
                    return None
            elif len(text_clean) >= 2 and text_clean.upper() not in ["CW_CANCEL_TASK"]:
                qty_str = text_clean
            else:
                return "Please specify the item quantity (e.g. 1 Litre petrol or 5kg Rice)."

            session["quantity_clarified"] = True
            current_task = session.get("pending_task_text") or session.get("task_description") or "Custom Errand Task"
            updated_task = f"{current_task} (Quantity/Specs: {qty_str})"
            session["pending_task_text"] = updated_task
            session["task_description"] = updated_task

            return prompt_for_locations_or_quote(session, updated_task, user)

        # Step 4: Collect Pickup Location
        if step == "WAITING_PICKUP_LOCATION":
            if text_clean == "CW_SEND_LOC_GUIDE":
                if user:
                    send_message(user, "📍 *Location Pin Instructions:*\n\nTap the attachment icon (📎) in WhatsApp and select *Location* to send your live location pin.")
                    return None

            p_name = session.get("pickup_name_label", "Pickup Point")
            if raw and raw.get("type") == "location":
                loc = raw.get("location", {})
                lat = loc.get("latitude")
                lng = loc.get("longitude")
                if lat and lng:
                    session["pickup_lat"] = lat
                    session["pickup_lng"] = lng
                    session["pickup_location"] = to_map_link(lat, lng, name=p_name, address=loc.get("address"))
            elif len(text_clean) >= 3 and text_clean.upper() not in ["CW_CANCEL_TASK"]:
                session["pickup_location"] = f"{text_clean}, Bhongir"
            else:
                return f"📍 Please type your exact pickup address for '{p_name}' or send a location pin."

            # Now prompt for Drop Location
            d_name = session.get("drop_name_label", "Drop-off Point")
            session["custom_work_step"] = "WAITING_DROP_LOCATION"
            body = (
                f"🏁 *Step 2 of 2: Drop-off Location Needed*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"✅ *Pickup set:* {session['pickup_location']}\n\n"
                f"Please provide the **DROP-OFF location** for *'{d_name}'*:\n"
                f"• Tap 📎 in WhatsApp to send **Location Pin** 📍, or\n"
                f"• Type exact street address / landmark below."
            )
            buttons = [
                {"id": "CW_SEND_LOC_GUIDE", "title": "📍 Share Location Pin"},
                {"id": "CW_CANCEL_TASK", "title": "❌ Cancel"}
            ]
            if user:
                send_reply_buttons(to=user, body=body, buttons=buttons)
                return None
            return body

        # Step 5: Collect Drop Location
        if step == "WAITING_DROP_LOCATION":
            if text_clean == "CW_SEND_LOC_GUIDE":
                if user:
                    send_message(user, "📍 *Location Pin Instructions:*\n\nTap the attachment icon (📎) in WhatsApp and select *Location* to send your live location pin.")
                    return None

            d_name = session.get("drop_name_label", "Drop-off Point")
            if raw and raw.get("type") == "location":
                loc = raw.get("location", {})
                lat = loc.get("latitude")
                lng = loc.get("longitude")
                if lat and lng:
                    session["drop_lat"] = lat
                    session["drop_lng"] = lng
                    session["drop_location"] = to_map_link(lat, lng, name=d_name, address=loc.get("address"))
            elif len(text_clean) >= 3 and text_clean.upper() not in ["CW_CANCEL_TASK"]:
                session["drop_location"] = f"{text_clean}, Bhongir"
            else:
                return f"🏁 Please type your exact drop-off address for '{d_name}' or send a location pin."

            # Both locations collected -> Generate exact quote!
            task_text = session.get("pending_task_text") or session.get("task_description") or "Custom Errand Task"
            return _generate_price_quote(session, task_text, user)

        # Step 6: Final Price Quote Confirmation
        if step == "CONFIRM_QUOTE":
            if text_clean.upper() in ["YES", "Y", "CONFIRM", "OK", "1", "CW_ACCEPT_QUOTE"]:
                task_text = session.get("task_description", "Custom Errand Task")
                quoted = session.get("quoted_fee", 119)
                has_shop = session.get("has_shopping", False)
                p_loc = session.get("pickup_location", "Shared via WhatsApp")
                d_loc = session.get("drop_location", "Shared via WhatsApp")
                dist = session.get("calculated_distance", 2.5)

                if "data" not in session or not isinstance(session["data"], dict):
                    session["data"] = {}
                session["data"]["items"] = [task_text]
                session["data"]["estimated_cost"] = quoted
                session["data"]["service_name"] = "AnyWork"
                session["data"]["pickup_location"] = p_loc
                session["data"]["drop_location"] = d_loc
                session["data"]["location"] = d_loc

                try:
                    order_id = finalize_order(session, payment_method='COD')
                except Exception as finalize_err:
                    print(f"[CUSTOM_WORK] Error finalizing order: {finalize_err}")
                    order_id = f"N2DCW_{user[-4:] if user else '101'}"

                session["custom_work_step"] = "DONE"
                session["stage"] = "COMPLETED"

                tracking_url = f"{TRACKING_BASE_URL}/track/{order_id}"
                
                item_pay_note = (
                    "💳 *Payment Method & Amount Payable on Delivery:*\n"
                    "• *Actual Store Receipt Bill* (Advanced by Helper at store/pump)\n"
                    f"• *Quoted Service Fee:* ₹{quoted}\n"
                    "• Pay via *Cash to Helper* or *Instant UPI* upon delivery."
                ) if has_shop or any(w in task_text.lower() for w in ['petrol', 'fuel', 'buy', 'bring', 'grocery', 'medicine']) else (
                    "💳 *Payment Method & Amount Payable on Delivery:*\n"
                    f"• *Quoted Service Fee:* ₹{quoted}\n"
                    "• Pay via *Cash to Helper* or *Instant UPI* upon delivery."
                )

                body = (
                    f"✅ *Order Confirmed! (#{order_id})*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🛵 *Helper Dispatch:* Assigning nearest verified Need2Done helper in Bhongir...\n\n"
                    f"📍 *Pickup:* {p_loc}\n"
                    f"🏁 *Drop:* {d_loc}\n"
                    f"🛣️ *Route Distance:* {dist} km (via Ola Maps)\n\n"
                    f"{item_pay_note}\n\n"
                    f"Thank you for choosing Need2Done!"
                )
                if user:
                    send_url_button(
                        to=user,
                        text=body,
                        button_text="📍 Track Order",
                        url=tracking_url
                    )
                    return None
                return body
            elif text_clean.upper() in ["CW_EDIT_LOCATIONS", "EDIT_LOC", "CW_EDIT_TASK", "EDIT"]:
                task_text = session.get("task_description", "Custom Errand Task")
                session.pop("pickup_location", None)
                session.pop("drop_location", None)
                return prompt_for_locations_or_quote(session, task_text, user)
            else:
                session["custom_work_step"] = "INIT"
                session["stage"] = "MENU"
                body = "❌ *Task Canceled.* You can start a new request anytime by typing *HI*."
                if user:
                    send_message(user, body)
                    return None
                return body

        return None

    except Exception:
        print("🔥 ERROR INSIDE case_custom_work.py")
        traceback.print_exc()
        return "An error occurred while processing your request. Please try again."

def prompt_for_locations_or_quote(session: Dict[str, Any], task_text: str, user: Optional[str] = None) -> Optional[str]:
    """
    Intelligently determines whether task requires Pickup & Drop location collection from customer before quoting.
    """
    session["task_description"] = task_text
    ai_intent = classify_custom_work_intent_gemini(task_text)
    session["ai_intent"] = ai_intent

    if ai_intent.get("safety_flag") == "BLOCKED_RESTRICTED":
        session["custom_work_step"] = "INIT"
        session["stage"] = "MENU"
        body = (
            "⛔ *Task Restricted*\n"
            "━━━━━━━━━━━━━━━━━━━━━\n"
            "This request contains restricted or prohibited items (alcohol, cash transfers, adult services, etc.) and cannot be auto-assigned."
        )
        if user:
            send_message(user, body)
            return None
        return body

    task_type = ai_intent.get("task_type", "unique_custom_task")
    p_name = ai_intent.get("pickup_location") or "Pickup Point"
    d_name = ai_intent.get("drop_location") or "Drop-off Point"
    has_shopping = ai_intent.get("has_shopping", False)
    session["has_shopping"] = has_shopping

    session["pickup_name_label"] = p_name
    session["drop_name_label"] = d_name

    requires_two_locs = task_type in ["retrieve", "direct_pickup", "multi_stop"] or (not has_shopping and p_name not in ["Pickup Point", "Nearest Store"])

    # 0. Check if Quantity/Details are missing for petrol, groceries, or items
    if ai_intent.get("is_quantity_missing") and not session.get("quantity_clarified"):
        session["custom_work_step"] = "WAITING_QUANTITY_DETAILS"
        is_petrol = any(w in task_text.lower() for w in ['petrol', 'fuel', 'bike'])
        if is_petrol:
            body = (
                f"⛽ *Item Quantity & Specifications Needed*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"📝 *Task:* {task_text[:100]}\n\n"
                f"Please specify how much petrol you need:\n"
                f"• E.g. *1 Litre (~₹105)*, *₹100 worth*, or *2 Litres*.\n\n"
                f"_(Default for stranded bikes is 1 Litre)_"
            )
            buttons = [
                {"id": "CW_QTY_1L", "title": "⛽ Default 1 Litre"},
                {"id": "CW_QTY_TYPE", "title": "✍️ Type Quantity"}
            ]
        else:
            body = (
                f"🛒 *Item Quantities & Details Needed*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"📝 *Task:* {task_text[:100]}\n\n"
                f"Please specify exact items and quantities:\n"
                f"• E.g. *5kg Sona Masoori Rice, 1L Sunflower Oil, 1kg Sugar*"
            )
            buttons = [
                {"id": "CW_QTY_TYPE", "title": "✍️ Type Item List"}
            ]

        if user:
            send_reply_buttons(to=user, body=body, buttons=buttons)
            return None
        return body

    # 1. Ask for Pickup Location if missing
    if requires_two_locs and not session.get("pickup_location"):
        session["custom_work_step"] = "WAITING_PICKUP_LOCATION"
        body = (
            f"📍 *Step 1 of 2: Pickup Location Needed*\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"📝 *Task:* {task_text[:100]}\n\n"
            f"Please provide the **PICKUP location** for *'{p_name}'*:\n"
            f"• Tap 📎 in WhatsApp to send **Location Pin** 📍, or\n"
            f"• Type exact street address / landmark below."
        )
        buttons = [
            {"id": "CW_SEND_LOC_GUIDE", "title": "📍 Share Location Pin"},
            {"id": "CW_CANCEL_TASK", "title": "❌ Cancel"}
        ]
        if user:
            send_reply_buttons(to=user, body=body, buttons=buttons)
            return None
        return body

    # 2. Ask for Drop Location if missing
    if not session.get("drop_location"):
        session["custom_work_step"] = "WAITING_DROP_LOCATION"
        if not session.get("pickup_location"):
            session["pickup_location"] = "Nearest Store / Fuel Station (Bhongir)"

        body = (
            f"🏁 *{'Step 2 of 2: ' if requires_two_locs else ''}Drop-off Location Needed*\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"📝 *Task:* {task_text[:100]}\n\n"
            f"Please provide the **DROP-OFF / DELIVERY location** for *'{d_name}'*:\n"
            f"• Tap 📎 in WhatsApp to send **Location Pin** 📍, or\n"
            f"• Type exact street address / landmark below."
        )
        buttons = [
            {"id": "CW_SEND_LOC_GUIDE", "title": "📍 Share Location Pin"},
            {"id": "CW_CANCEL_TASK", "title": "❌ Cancel"}
        ]
        if user:
            send_reply_buttons(to=user, body=body, buttons=buttons)
            return None
        return body

    # 3. Both locations available -> Generate quote!
    return _generate_price_quote(session, task_text, user)

def _generate_price_quote(session: Dict[str, Any], task_text: str, user: Optional[str] = None) -> Optional[str]:
    """
    Calculates final quote using exact Pickup & Drop locations and Ola Maps routing distance.
    """
    session["task_description"] = task_text
    session["custom_work_step"] = "CONFIRM_QUOTE"

    ai_intent = session.get("ai_intent") or classify_custom_work_intent_gemini(task_text)
    task_type = ai_intent.get("task_type", "unique_custom_task")
    has_shopping = session.get("has_shopping", False)

    pickup_loc = session.get("pickup_location") or ai_intent.get("pickup_location") or "Nearest Store / Fuel Station (Bhongir)"
    drop_loc = session.get("drop_location") or ai_intent.get("drop_location") or "Customer Location (Bhongir)"

    p_lat = session.get("pickup_lat")
    p_lng = session.get("pickup_lng")
    d_lat = session.get("drop_lat")
    d_lng = session.get("drop_lng")

    est_dist = 2.5
    if p_lat and p_lng and d_lat and d_lng:
        est_dist = round(get_road_distance(p_lat, p_lng, d_lat, d_lng), 1)

    service_fee = 119
    breakdown_list = []

    try:
        payload = {
            "taskType": task_type,
            "pickupLat": p_lat,
            "pickupLng": p_lng,
            "dropLat": d_lat,
            "dropLng": d_lng,
            "distanceKm": est_dist,
            "hasAccessCoordination": ai_intent.get("has_access_coordination", False),
            "hasShopping": has_shopping,
            "itemLines": ai_intent.get("item_lines_count", 0),
            "extraStops": ai_intent.get("extra_stops", 0),
            "description": task_text
        }
        res = requests.post(NODE_BACKEND_URL, json=payload, timeout=4)
        if res.status_code == 200:
            data = res.json()
            if data.get("success"):
                summary = data.get("summary", {})
                service_fee = summary.get("serviceFee", 119)
                est_dist = data.get('calculatedDistanceKm', est_dist)
                breakdown_list = data.get("breakdown", [])
    except Exception as e:
        print(f"[CUSTOM_WORK_BOT] Pricing engine notice: {e}")

    session["quoted_fee"] = service_fee
    session["calculated_distance"] = est_dist

    # Build Breakdown Text
    breakdown_lines = []
    if breakdown_list:
        for item in breakdown_list:
            lbl = item.get("label", "")
            amt = item.get("amount", 0)
            breakdown_lines.append(f"• {lbl}: ₹{int(amt)}")
    else:
        extra_dist_km = max(0.0, round(est_dist - 3.0, 1))
        dist_charge = int(extra_dist_km * 8)
        base_fee = service_fee - dist_charge
        breakdown_lines = [
            f"• Base Fare (incl. 3km & 15m handling): ₹{base_fee}",
            f"• Route Distance Charge ({extra_dist_km} km extra @ ₹8/km): ₹{dist_charge}"
        ]

    breakdown_text = "\n".join(breakdown_lines)

    if has_shopping or any(w in task_text.lower() for w in ['petrol', 'fuel', 'buy', 'bring', 'grocery', 'medicine', 'store']):
        goods_policy = (
            "🛒 *Item Purchase & Goods Payment Policy:*\n"
            "• *Who pays for petrol/items?* The assigned Helper advances cash at the store/pump on your behalf.\n"
            "• *Quantity & Specifications:* Helper will confirm exact quantity (e.g. 1L / ₹100 petrol or specific brand) via WhatsApp/Call before paying at the store.\n"
            "• *Upon Delivery:* You reimburse Helper for: *Actual Store Receipt Amount + Quoted Service Fee (₹" + str(service_fee) + ")*.\n"
            "• *Payment Options:* Cash to Helper (COD) or Instant UPI on delivery."
        )
    else:
        goods_policy = (
            "📦 *Pickup & Delivery Policy:*\n"
            "• Helper will collect item at Pickup location and deliver directly to Drop location.\n"
            "• *Upon Delivery:* You pay the Helper: *Quoted Service Fee (₹" + str(service_fee) + ")* via Cash or UPI."
        )

    cat_title = task_type.replace('_', ' ').title()
    body = (
        f"🧾 *Need2Done Custom Work Quote*\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"📝 *Task:* {task_text[:120]}\n"
        f"🏷️ *Category:* {cat_title}\n\n"
        f"📍 *Pickup:* {pickup_loc}\n"
        f"🏁 *Drop:* {drop_loc}\n"
        f"🛣️ *Est. Route Distance:* {est_dist} km (via Ola Maps road route)\n"
        f"⏱️ *Included Handling:* Up to 15 mins\n\n"
        f"📊 *Itemized Fee Breakdown:*\n"
        f"{breakdown_text}\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"💵 *Quoted Service Fee:* *₹{service_fee}*\n"
        f"_(No percentage markups on merchant goods)_\n\n"
        f"{goods_policy}"
    )

    buttons = [
        {"id": "CW_ACCEPT_QUOTE", "title": "✅ Confirm & Dispatch"},
        {"id": "CW_EDIT_LOCATIONS", "title": "📍 Edit Locations"},
        {"id": "CW_CANCEL_TASK", "title": "❌ Cancel"}
    ]

    if user:
        send_reply_buttons(to=user, body=body, buttons=buttons)
        return None

    return body
