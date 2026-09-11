"""
=================================================
Need2Done – Custom Work Stateful Session Handler (v3.5)
=================================================
✔ Stateful Session Manager & Confidence Gate Engine
✔ Decoupled Task Category + Operational Flow Routing
✔ 3-Tier Confidence Check (High -> Auto, Med -> Clarify, Low -> Interactive Options)
✔ Location Message Mapping by Active Session State (No re-classification)
✔ Server-Side Quoting & Itemized Payment Policy Engine
"""

import requests
import json
import traceback
import re
from typing import Optional, Dict, Any

from utils.ai_service import classify_custom_work_intent_gemini, transcribe_audio_sarvam_or_whisper, process_voice_note_with_translation
from utils.location import to_map_link, get_road_distance, haversine
from whatsapp_client import download_whatsapp_media, send_reply_buttons, send_message, send_url_button
from core.order_finalizer import finalize_order
from config import TRACKING_BASE_URL

NODE_BACKEND_URL = "http://localhost:5000/api/custom-work/quote"


def handle(session: Dict[str, Any], text: Optional[str], raw: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    Stateful handler for Custom Work task processing over WhatsApp.
    Processes messages against active session state, enforces confidence gates, and maps location pins accurately.
    """
    try:
        step = session.get("custom_work_step", "INIT")
        text_clean = (text or "").strip()
        user = session.get("user_id") or session.get("phone") or session.get("user")

        # =========================================================================
        # LOCATION MESSAGE ROUTER (State-Aware Location Pin Handler)
        # =========================================================================
        if raw and raw.get("type") == "location":
            loc_data = raw.get("location", {})
            lat = loc_data.get("latitude")
            lng = loc_data.get("longitude")
            address = loc_data.get("address") or loc_data.get("name") or "GPS Location Pin"

            if lat and lng:
                if step == "WAITING_WORK_LOCATION":
                    session["work_location"] = to_map_link(lat, lng, name="Work Location", address=address)
                    session["pickup_location"] = session["work_location"]
                    session["pickup_lat"] = lat
                    session["pickup_lng"] = lng
                    session["drop_location"] = "On-Site Work Location (No Drop Required)"
                    task_text = session.get("pending_task_text") or session.get("task_description") or "Custom Work Task"
                    return _generate_price_quote(session, task_text, user)

                elif step == "WAITING_PICKUP_LOCATION":
                    p_name = session.get("pickup_name_label", "Pickup Point")
                    session["pickup_location"] = to_map_link(lat, lng, name=p_name, address=address)
                    session["pickup_lat"] = lat
                    session["pickup_lng"] = lng

                    # Single location flow bypass check
                    if session.get("flow") in ["single_location", "queueing"] or session.get("is_single_location"):
                        session["drop_location"] = "On-Site Work Location (No Drop Required)"
                        task_text = session.get("pending_task_text") or session.get("task_description") or "Custom Work Task"
                        return _generate_price_quote(session, task_text, user)

                    session["custom_work_step"] = "WAITING_DROP_LOCATION"
                    d_name = session.get("drop_name_label", "Drop-off Point")
                    body = (
                        f"🏁 *Step 2 of 2: Drop-off Location Needed*\n"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"✅ *Pickup Location set:* {session['pickup_location']}\n\n"
                        f"Please share the **DROP-OFF location** for *'{d_name}'*:\n"
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

                elif step == "WAITING_DROP_LOCATION":
                    d_name = session.get("drop_name_label", "Drop-off Point")
                    session["drop_location"] = to_map_link(lat, lng, name=d_name, address=address)
                    session["drop_lat"] = lat
                    session["drop_lng"] = lng
                    task_text = session.get("pending_task_text") or session.get("task_description") or "Custom Work Task"
                    return _generate_price_quote(session, task_text, user)

        # =========================================================================
        # STEP 1: INIT / TASK INTAKE PROMPT
        # =========================================================================
        if step == "INIT":
            session["custom_work_step"] = "WAITING_DETAILS"
            session.pop("pickup_location", None)
            session.pop("drop_location", None)
            session.pop("work_location", None)
            session.pop("pickup_lat", None)
            session.pop("pickup_lng", None)
            session.pop("drop_lat", None)
            session.pop("drop_lng", None)
            session.pop("ai_intent", None)

            body = (
                "💼 *Need2Done Custom Work (Bhongir Pilot)*\n"
                "━━━━━━━━━━━━━━━━━━━━━\n"
                "Please describe your task in plain text or send a voice note.\n\n"
                "💡 *Examples:*\n"
                "• _'My bike is not starting near SBI bank'_\n"
                "• _'Collect charger from home and bring to my office'_\n"
                "• _'Bring 2L emergency petrol to Bhongir bypass'_\n"
                "• _'Stand in line at MeeSeva counter'_"
            )
            buttons = [
                {"id": "CW_VOICE_GUIDE", "title": "🎙️ Send Voice Note"},
                {"id": "CW_TEXT_GUIDE", "title": "✍️ Type Task"}
            ]
            if user:
                send_reply_buttons(to=user, body=body, buttons=buttons)
                return None
            return body

        # =========================================================================
        # STEP 2: DETAILS INTAKE (TEXT OR VOICE) & AI PARSING
        # =========================================================================
        if step == "WAITING_DETAILS":
            if text_clean == "CW_VOICE_GUIDE":
                if user:
                    send_message(user, "🎙️ *Voice Note Instructions:*\n\nHold the microphone button in WhatsApp and describe your task clearly in **Telugu, Hindi, English, or Teluglish**.")
                    return None
            elif text_clean == "CW_TEXT_GUIDE":
                if user:
                    send_message(user, "✍️ Please type your task description below:")
                    return None

            # Audio Voice Note Processing
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
                                "Please record again or type your task in plain text."
                            )
                            buttons = [
                                {"id": "CW_RETRY_VOICE", "title": "🔄 Record Again"},
                                {"id": "CW_CANCEL_TASK", "title": "❌ Cancel"}
                            ]
                            if user:
                                send_reply_buttons(to=user, body=body, buttons=buttons)
                                return None
                            return body

                        session["pending_task_text"] = eng_text or orig_text
                        session["custom_work_step"] = "CONFIRM_AUDIO_TRANSCRIPT"

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

            if len(text_clean) < 3:
                return "Please provide a brief description of your task (at least a few words)."

            session["pending_task_text"] = text_clean
            return _evaluate_intent_and_route(session, text_clean, user)

        # Confirm Voice Note Transcript
        if step == "CONFIRM_AUDIO_TRANSCRIPT":
            if text_clean.upper() in ["1", "YES", "Y", "CONFIRM", "OK", "CW_CONFIRM_VOICE"]:
                task_text = session.get("pending_task_text", "Custom Task Errand")
                return _evaluate_intent_and_route(session, task_text, user)
            else:
                session["custom_work_step"] = "WAITING_DETAILS"
                body = "🔄 Please tap 🎙️ to record your voice note again or type your task description in plain text."
                if user:
                    send_message(user, body)
                    return None
                return body

        # Targeted Clarification Intake (Medium Confidence Gate)
        if step == "WAITING_CLARIFICATION":
            session["pending_task_text"] = f"{session.get('pending_task_text', '')} (Clarification: {text_clean})"
            return _evaluate_intent_and_route(session, session["pending_task_text"], user)

        # Quantity / Specs Intake
        if step == "WAITING_QUANTITY_DETAILS":
            if text_clean in ["CW_QTY_DEFAULT_PETROL", "CW_QTY_1L", "DEFAULT 1 LITRE"]:
                qty_str = "1 Litre Emergency Petrol"
            elif text_clean == "CW_QTY_TYPE":
                if user:
                    send_message(user, "✍️ Please type exact quantity / details (e.g. *1 Litre petrol* or *5kg Rice, 1L Oil*):")
                    return None
            elif len(text_clean) >= 2 and text_clean.upper() not in ["CW_CANCEL_TASK"]:
                qty_str = text_clean
            else:
                return "Please specify the item quantity (e.g. 1 Litre petrol or 5kg Rice)."

            session["quantity_clarified"] = True
            current_task = session.get("pending_task_text") or session.get("task_description") or "Custom Task"
            updated_task = f"{current_task} (Quantity/Specs: {qty_str})"
            session["pending_task_text"] = updated_task
            session["task_description"] = updated_task

            return prompt_for_locations_or_quote(session, updated_task, user)

        # Work Location Intake (Single-Location / Breakdown)
        if step == "WAITING_WORK_LOCATION":
            if text_clean == "CW_SEND_LOC_GUIDE":
                if user:
                    send_message(user, "📍 *Location Pin Instructions:*\n\nTap the attachment icon (📎) in WhatsApp and select *Location* to send your live location pin.")
                    return None

            if len(text_clean) >= 3 and text_clean.upper() not in ["CW_CANCEL_TASK"]:
                session["work_location"] = f"{text_clean}, Bhongir"
                session["pickup_location"] = session["work_location"]
                session["drop_location"] = "On-Site Work Location (No Drop Required)"
                task_text = session.get("pending_task_text") or session.get("task_description") or "Custom Work Task"
                return _generate_price_quote(session, task_text, user)
            else:
                return "📍 Please share your breakdown/work location pin 📍 or type landmark address below."

        # Pickup Location Intake (2-Location / Store Transfer)
        if step == "WAITING_PICKUP_LOCATION":
            if text_clean in ["CW_USE_NEAREST_STORE", "USE NEAREST STORE", "NEAREST STORE"]:
                session["pickup_location"] = "Nearest Store / Vendor, Bhongir"
            elif text_clean == "CW_SEND_LOC_GUIDE":
                if user:
                    send_message(user, "📍 *Location Pin Instructions:*\n\nTap the attachment icon (📎) in WhatsApp and select *Location* to send your live location pin.")
                    return None
            elif len(text_clean) >= 3 and text_clean.upper() not in ["CW_CANCEL_TASK"]:
                session["pickup_location"] = f"{text_clean}, Bhongir"
            else:
                p_name = session.get("pickup_name_label", "Pickup Point")
                return f"📍 Please type store/pickup location for '{p_name}', send a location pin, or tap 'Use Nearest Store'."

            if session.get("flow") in ["single_location", "queueing"] or session.get("is_single_location"):
                session["drop_location"] = "On-Site Work Location (No Drop Required)"
                task_text = session.get("pending_task_text") or session.get("task_description") or "Custom Work Task"
                return _generate_price_quote(session, task_text, user)

            session["custom_work_step"] = "WAITING_DROP_LOCATION"
            d_name = session.get("drop_name_label", "Drop-off Point")
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

        # Drop Location Intake
        if step == "WAITING_DROP_LOCATION":
            if text_clean == "CW_SEND_LOC_GUIDE":
                if user:
                    send_message(user, "📍 *Location Pin Instructions:*\n\nTap the attachment icon (📎) in WhatsApp and select *Location* to send your live location pin.")
                    return None

            if len(text_clean) >= 3 and text_clean.upper() not in ["CW_CANCEL_TASK"]:
                session["drop_location"] = f"{text_clean}, Bhongir"
            else:
                d_name = session.get("drop_name_label", "Drop-off Point")
                return f"🏁 Please type your exact drop-off address for '{d_name}' or send a location pin."

            task_text = session.get("pending_task_text") or session.get("task_description") or "Custom Work Task"
            return _generate_price_quote(session, task_text, user)

        # Step 6: Quote Confirmation & Dispatch
        if step == "CONFIRM_QUOTE":
            if text_clean.upper() in ["YES", "Y", "CONFIRM", "OK", "1", "CW_ACCEPT_QUOTE"]:
                task_text = session.get("task_description", "Custom Errand Task")
                quoted = session.get("quoted_fee", 119)
                has_shop = session.get("has_shopping", False)
                p_loc = session.get("pickup_location") or session.get("work_location") or "Shared via WhatsApp"
                d_loc = session.get("drop_location", "Shared via WhatsApp")
                dist = session.get("calculated_distance", 2.5)

                session["service"] = 3
                if user:
                    session["user_id"] = str(user)
                if "data" not in session or not isinstance(session["data"], dict):
                    session["data"] = {}
                session["data"]["items"] = [task_text]
                session["data"]["estimated_cost"] = quoted
                session["data"]["cost"] = quoted
                session["data"]["service_name"] = "AnyWork"
                session["data"]["pickup_location"] = p_loc
                session["data"]["drop_location"] = d_loc
                session["data"]["location"] = d_loc

                try:
                    order_id = finalize_order(session)
                except Exception as finalize_err:
                    print(f"[CUSTOM_WORK] Error finalizing order: {finalize_err}")
                    traceback.print_exc()
                    order_id = None

                if not order_id:
                    print(f"[CUSTOM_WORK] Order finalization failed for session user {user}")
                    body = "❌ *Order placement failed.* Please try confirming again or type *HI* to restart."
                    if user:
                        send_message(user, body)
                        return None
                    return body

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
                    f"📍 *Work / Pickup:* {p_loc}\n"
                    f"🏁 *Drop:* {d_loc}\n"
                    f"🛣️ *Route Distance:* {dist} km (via Ola Maps)\n\n"
                    f"{item_pay_note}\n\n"
                    f"Thank you for choosing Need2Done!"
                )
                if user:
                    send_url_button(to=user, text=body, button_text="📍 Track Order", url=tracking_url)
                    return None
                return body
            elif text_clean.upper() in ["CW_EDIT_LOCATIONS", "EDIT_LOC", "CW_EDIT_TASK", "EDIT"]:
                task_text = session.get("task_description", "Custom Errand Task")
                session.pop("pickup_location", None)
                session.pop("drop_location", None)
                session.pop("work_location", None)
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


def _evaluate_intent_and_route(session: Dict[str, Any], task_text: str, user: Optional[str] = None) -> Optional[str]:
    """
    Evaluates intent via Gemini Flash 2.5 and routes through the 3-Tier Confidence Gate:
    - High Confidence (>= 0.85): Automatically start category flow.
    - Med Confidence (0.70 - 0.84): Ask 1 targeted clarification question.
    - Low Confidence (< 0.70): Present task category options menu or human review.
    """
    ai_intent = classify_custom_work_intent_gemini(task_text)
    session["ai_intent"] = ai_intent
    session["task_description"] = task_text

    # Safety Guardrail Check (Layer 1)
    if ai_intent.get("safety_flag") == "BLOCKED_RESTRICTED" or ai_intent.get("safety", {}).get("status") == "blocked":
        session["custom_work_step"] = "INIT"
        session["stage"] = "MENU"
        body = (
            "⛔ *Task Restricted*\n"
            "━━━━━━━━━━━━━━━━━━━━━\n"
            "I cannot accept that task. Requests involving restricted or illegal items (alcohol, unverified cash transfers, adult services, etc.) cannot be auto-assigned."
        )
        if user:
            send_message(user, body)
            return None
        return body

    cat_conf = ai_intent.get("confidence", {}).get("category", 0.90)
    flow_conf = ai_intent.get("confidence", {}).get("flow", 0.90)
    avg_conf = (cat_conf + flow_conf) / 2.0

    session["category"] = ai_intent.get("category") or "unique_custom_task"
    session["flow"] = ai_intent.get("flow") or "single_location"
    session["is_single_location"] = (session["flow"] in ["single_location", "queueing"])

    # TIER 3: LOW CONFIDENCE (< 0.70) -> Present Task Option Buttons
    if avg_conf < 0.70:
        session["custom_work_step"] = "WAITING_DETAILS"
        body = (
            "🤔 *Let's clarify your request*\n"
            "━━━━━━━━━━━━━━━━━━━━━\n"
            f"📝 *You requested:* _{task_text[:100]}_\n\n"
            "Which of these best describes what you need?"
        )
        buttons = [
            {"id": "CW_OPT_BUY", "title": "🛒 Buy & Bring"},
            {"id": "CW_OPT_PICK", "title": "📦 Pick & Drop"},
            {"id": "CW_OPT_REPAIR", "title": "🛠️ Repair / Breakdown"}
        ]
        if user:
            send_reply_buttons(to=user, body=body, buttons=buttons)
            return None
        return body

    # TIER 2: MEDIUM CONFIDENCE (0.70 - 0.84) -> Ask 1 Targeted Clarification Question
    if avg_conf < 0.85 and ai_intent.get("clarification_question"):
        session["custom_work_step"] = "WAITING_CLARIFICATION"
        clarify_q = ai_intent.get("clarification_question")
        body = (
            "❓ *Clarification Needed*\n"
            "━━━━━━━━━━━━━━━━━━━━━\n"
            f"📝 *Task:* _{task_text[:100]}_\n\n"
            f"{clarify_q}"
        )
        if user:
            send_message(user, body)
            return None
        return body

    # TIER 1: HIGH CONFIDENCE (>= 0.85) -> Confirm Bot Understanding & Start Flow
    return prompt_for_locations_or_quote(session, task_text, user)


def prompt_for_locations_or_quote(session: Dict[str, Any], task_text: str, user: Optional[str] = None) -> Optional[str]:
    """
    Intelligently determines intake steps based on operational flow (single_location vs store_to_drop vs pickup_to_drop).
    """
    ai_intent = session.get("ai_intent") or classify_custom_work_intent_gemini(task_text)
    task_type = ai_intent.get("category") or "unique_custom_task"
    flow = ai_intent.get("flow") or "single_location"
    is_single_loc = (flow in ["single_location", "queueing"])

    session["task_type"] = task_type
    session["flow"] = flow
    session["is_single_location"] = is_single_loc
    session["has_shopping"] = (task_type == "buy_and_bring")

    p_name = ai_intent.get("pickup_location") or ("Store / Pickup Point" if task_type == "buy_and_bring" else "Pickup Point")
    d_name = ai_intent.get("drop_location") or "Drop-off Point"
    session["pickup_name_label"] = p_name
    session["drop_name_label"] = d_name

    # Check for missing quantities/specs in fuel or shopping requests
    if (task_type == "buy_and_bring" or "petrol" in task_text.lower()) and not session.get("quantity_clarified"):
        is_fuel = any(w in task_text.lower() for w in ['petrol', 'fuel', 'bike'])
        if is_fuel and not any(q in task_text.lower() for q in ['1l', '2l', 'litre', 'liter', '100rs', '200rs']):
            session["custom_work_step"] = "WAITING_QUANTITY_DETAILS"
            body = (
                f"⛽ *Emergency Fuel Quantity Needed*\n"
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
            if user:
                send_reply_buttons(to=user, body=body, buttons=buttons)
                return None
            return body

    # Single-Location Work Site / Breakdown Flow (Bypasses Drop Location Prompt!)
    if is_single_loc:
        if not session.get("work_location") and not session.get("pickup_location"):
            session["custom_work_step"] = "WAITING_WORK_LOCATION"
            body = (
                f"📍 *Work Site / Stranded Location Needed*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"📝 *Task:* {task_text[:100]}\n\n"
                f"Please share your **exact location pin 📍** or landmark address where the helper/mechanic should arrive to assist you:\n"
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

        session["drop_location"] = "On-Site Work Location (No Drop Required)"
        return _generate_price_quote(session, task_text, user)

    # Two-Location Flow: Pickup/Store Location Intake
    if not session.get("pickup_location"):
        session["custom_work_step"] = "WAITING_PICKUP_LOCATION"
        body = (
            f"📍 *Step 1 of 2: Store / Pickup Location Needed*\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"📝 *Task:* {task_text[:100]}\n\n"
            f"Please specify where to pick up or buy items from (*'{p_name}'*):\n"
            f"• Type store name or address below, or\n"
            f"• Tap 📎 to send **Location Pin** 📍, or\n"
            f"• Tap **Use Nearest Store** if helper can select nearest vendor."
        )
        buttons = [
            {"id": "CW_USE_NEAREST_STORE", "title": "🏪 Use Nearest Store"},
            {"id": "CW_SEND_LOC_GUIDE", "title": "📍 Share Location Pin"}
        ]
        if user:
            send_reply_buttons(to=user, body=body, buttons=buttons)
            return None
        return body

    # Two-Location Flow: Drop Location Intake
    if not session.get("drop_location"):
        session["custom_work_step"] = "WAITING_DROP_LOCATION"
        body = (
            f"🏁 *Step 2 of 2: Drop-off Location Needed*\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"📝 *Task:* {task_text[:100]}\n"
            f"📍 *Pickup set:* {session.get('pickup_location', 'Shared')}\n\n"
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

    return _generate_price_quote(session, task_text, user)


def _generate_price_quote(session: Dict[str, Any], task_text: str, user: Optional[str] = None) -> Optional[str]:
    """
    Calculates server-side quote via Express REST Backend & distance engine.
    """
    session["task_description"] = task_text
    session["custom_work_step"] = "CONFIRM_QUOTE"

    ai_intent = session.get("ai_intent") or classify_custom_work_intent_gemini(task_text)
    task_type = session.get("task_type") or ai_intent.get("category") or "unique_custom_task"
    has_shopping = session.get("has_shopping", False)

    pickup_loc = session.get("pickup_location") or session.get("work_location") or "Nearest Store / Vendor (Bhongir)"
    drop_loc = session.get("drop_location") or "Customer Location (Bhongir)"

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
        print(f"[CUSTOM_WORK_BOT] Server quote notice: {e}")

    session["quoted_fee"] = service_fee
    session["calculated_distance"] = est_dist

    # Itemized Breakdown
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

    if session.get("is_single_location"):
        loc_block = f"📍 *Work Site Location:* {pickup_loc}\n"
        goods_policy = (
            "🛠️ *On-Site Service & Breakdown Policy:*\n"
            "• *On-Site Arrival:* Assigned helper/mechanic will arrive directly at your specified breakdown/work location.\n"
            "• *Upon Completion:* Pay Helper: *Quoted Service Fee (₹" + str(service_fee) + ")* + actual parts cost (if advanced by helper).\n"
            "• *Payment Options:* Cash to Helper (COD) or Instant UPI."
        )
    elif has_shopping or any(w in task_text.lower() for w in ['petrol', 'fuel', 'buy', 'bring', 'grocery', 'medicine', 'store']):
        loc_block = f"📍 *Pickup:* {pickup_loc}\n🏁 *Drop:* {drop_loc}\n"
        goods_policy = (
            "🛒 *Item Purchase & Goods Payment Policy:*\n"
            "• *Item Purchase:* Helper advances cash at store/pump on your behalf.\n"
            "• *Upon Delivery:* Reimburse Helper for: *Actual Store Receipt Amount + Quoted Service Fee (₹" + str(service_fee) + ")*.\n"
            "• *Payment Options:* Cash to Helper (COD) or Instant UPI."
        )
    else:
        loc_block = f"📍 *Pickup:* {pickup_loc}\n🏁 *Drop:* {drop_loc}\n"
        goods_policy = (
            "📦 *Pickup & Delivery Policy:*\n"
            "• Helper will collect item at Pickup location and deliver directly to Drop location.\n"
            "• *Upon Delivery:* Pay Helper: *Quoted Service Fee (₹" + str(service_fee) + ")* via Cash or UPI."
        )

    cat_title = task_type.replace('_', ' ').title()
    body = (
        f"🧾 *Need2Done Custom Work Quote*\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"📝 *Task:* {task_text[:120]}\n"
        f"🏷️ *Category:* {cat_title}\n\n"
        f"{loc_block}"
        f"🛣️ *Est. Service Distance:* {est_dist} km (via Ola Maps road route)\n"
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
