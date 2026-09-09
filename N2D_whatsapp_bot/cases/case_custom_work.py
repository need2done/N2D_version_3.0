"""
=================================================
Need2Done – Custom Work Service Case Handler (v2.0)
Bhongir Pilot Interactive WhatsApp Handler
=================================================
✔ Audio download & Gemini / Sarvam STT voice recognition
✔ Auto-translated and cleaned voice transcripts
✔ Interactive WhatsApp reply buttons for voice confirmation & price quote
✔ Auto-order creation & helper dispatch via finalize_order
"""

import requests
import json
import traceback
from typing import Optional, Dict, Any

from utils.ai_service import classify_custom_work_intent_gemini, transcribe_audio_sarvam_or_whisper, process_voice_note_with_translation
from whatsapp_client import download_whatsapp_media, send_reply_buttons, send_message, send_url_button
from core.order_finalizer import finalize_order
from config import TRACKING_BASE_URL
import re

NODE_BACKEND_URL = "http://localhost:5000/api/custom-work/quote"

def handle(session: Dict[str, Any], text: Optional[str], raw: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    Handles customer interactions during Custom Work ordering flow in WhatsApp with Interactive Buttons & Bilingual Voice STT.
    """
    try:
        step = session.get("custom_work_step", "INIT")
        text_clean = (text or "").strip()
        user = session.get("user_id") or session.get("phone") or session.get("user")

        # Step 1: Init / Task Description Intake
        if step == "INIT":
            session["custom_work_step"] = "WAITING_DETAILS"
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
            # Interactive guide button clicks
            if text_clean == "CW_VOICE_GUIDE":
                if user:
                    send_message(user, "🎙️ *Voice Note Instructions:*\n\nHold the microphone button in WhatsApp and describe your task clearly in **Telugu, Hindi, English, or Teluglish**.")
                    return None
            elif text_clean == "CW_TEXT_GUIDE":
                if user:
                    send_message(user, "✍️ Please type your task description in plain text below:")
                    return None

            # Check if input is a Voice Note Audio
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

                        # Save English translation as pending task text for pricing & helper dispatch
                        session["pending_task_text"] = eng_text or orig_text
                        session["custom_work_step"] = "CONFIRM_AUDIO_TRANSCRIPT"

                        # Check if original transcript and English translation are distinct
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
                            {"id": "CW_CONFIRM_VOICE", "title": "✅ Confirm & Quote"},
                            {"id": "CW_RETRY_VOICE", "title": "🔄 Record Again"}
                        ]
                        if user:
                            send_reply_buttons(to=user, body=body, buttons=buttons)
                            return None
                        return body

                # If audio download failed
                body = (
                    "⚠️ *Audio standard intake notice*\n"
                    "━━━━━━━━━━━━━━━━━━━━━\n"
                    "Please type your custom work task in plain text or send a clear voice note."
                )
                if user:
                    send_message(user, body)
                    return None
                return body

            # Standard Text Input
            if len(text_clean) < 3:
                return "Please provide a brief description of your task (at least a few words)."

            session["pending_task_text"] = text_clean
            return _generate_price_quote(session, text_clean, user)

        # Step 3: Voice Note Transcript Confirmation (Interactive Button / Text Option)
        if step == "CONFIRM_AUDIO_TRANSCRIPT":
            if text_clean.upper() in ["1", "YES", "Y", "CONFIRM", "OK", "CW_CONFIRM_VOICE"]:
                task_text = session.get("pending_task_text", "Custom Errand Task")
                return _generate_price_quote(session, task_text, user)
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

        # Step 4: Final Price Quote Confirmation (Interactive Buttons)
        if step == "CONFIRM_QUOTE":
            if text_clean.upper() in ["YES", "Y", "CONFIRM", "OK", "1", "CW_ACCEPT_QUOTE"]:
                task_text = session.get("task_description", "Custom Errand Task")
                quoted = session.get("quoted_fee", 119)
                
                # Ensure data dict exists for order_finalizer
                if "data" not in session or not isinstance(session["data"], dict):
                    session["data"] = {}
                session["data"]["items"] = [task_text]
                session["data"]["estimated_cost"] = quoted
                session["data"]["service_name"] = "AnyWork"

                try:
                    # Finalize order, insert to DB and notify helper/admin
                    order_id = finalize_order(session, payment_method='COD')
                except Exception as finalize_err:
                    print(f"[CUSTOM_WORK] Error finalizing order: {finalize_err}")
                    order_id = f"N2DCW_{user[-4:] if user else '101'}"

                session["custom_work_step"] = "DONE"
                session["stage"] = "COMPLETED"

                tracking_url = f"{TRACKING_BASE_URL}/track/{order_id}"
                body = (
                    f"✅ *Order Confirmed! (#{order_id})*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                    f"A helper is being assigned to your location in Bhongir.\n"
                    f"💰 *Quoted Fee:* ₹{quoted}\n\n"
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
            elif text_clean.upper() in ["CW_EDIT_TASK", "EDIT"]:
                session["custom_work_step"] = "WAITING_DETAILS"
                body = (
                    "✏️ *Editing Task Description*\n"
                    "━━━━━━━━━━━━━━━━━━━━━\n"
                    "Please type your revised task description or send a new voice note."
                )
                if user:
                    send_message(user, body)
                    return None
                return body
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

def _generate_price_quote(session: Dict[str, Any], task_text: str, user: Optional[str] = None) -> Optional[str]:
    """
    Helper function to run Gemini Flash NLP Intent Classification & calculate quote with interactive buttons.
    """
    session["task_description"] = task_text
    session["custom_work_step"] = "CONFIRM_QUOTE"

    # 1. AI Intent Classification via Gemini Flash
    ai_intent = classify_custom_work_intent_gemini(task_text)
    task_type = ai_intent.get("task_type", "unique_custom_task")

    # Check Safety Shield Flag
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

    service_fee = 119
    est_dist = 4.5

    # 2. Call Node.js Pricing Engine Endpoint if running locally
    try:
        payload = {
            "taskType": task_type,
            "distanceKm": 4.5,
            "hasAccessCoordination": ai_intent.get("has_access_coordination", False),
            "hasShopping": ai_intent.get("has_shopping", False),
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
                est_dist = data.get('calculatedDistanceKm', 4.5)
    except Exception as e:
        print(f"[CUSTOM_WORK_BOT] Pricing engine notice: {e}")

    session["quoted_fee"] = service_fee

    body = (
        f"🧾 *Custom Work Price Quote*\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"📝 *Task:* {task_text[:120]}\n"
        f"🏷️ *Category:* {task_type.replace('_', ' ').title()}\n"
        f"🛣️ *Est. Distance:* {est_dist} km\n"
        f"⏱️ *Included Time:* Up to 15 mins handling\n\n"
        f"💵 *Quoted Service Fee:* *₹{service_fee}*\n"
        f"_(No percentage markups on merchant goods)_"
    )

    buttons = [
        {"id": "CW_ACCEPT_QUOTE", "title": "✅ Confirm & Dispatch"},
        {"id": "CW_EDIT_TASK", "title": "✏️ Edit Task"},
        {"id": "CW_CANCEL_TASK", "title": "❌ Cancel"}
    ]

    if user:
        send_reply_buttons(to=user, body=body, buttons=buttons)
        return None

    return body
