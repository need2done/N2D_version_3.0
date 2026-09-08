"""
=================================================
Need2Done – Custom Work Service Case Handler (v2.0)
Bhongir Pilot Interactive WhatsApp Handler
=================================================
✔ Audio download & Sarvam/Whisper STT voice recognition
✔ Voice transcript confirmation / re-record options
✔ Gemini Flash NLP intent classification & price quote
"""

import requests
import json
import traceback
from typing import Optional, Dict, Any

from utils.ai_service import classify_custom_work_intent_gemini, transcribe_audio_sarvam_or_whisper
from whatsapp_client import download_whatsapp_media

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
                "💡 *Example:* _'Collect charger from home and bring to my office in Degree College'_"
            )

        # Step 2: Intake Details (Text or Audio Voice Note)
        if step == "WAITING_DETAILS":
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
                        transcript = transcribe_audio_sarvam_or_whisper(audio_bytes, "voice.ogg")
                        if not transcript or len(transcript.strip()) < 3:
                            return (
                                "⚠️ *Could not hear audio clearly*\n"
                                "━━━━━━━━━━━━━━━━━━━━━\n"
                                "We could not detect clear speech in your voice note.\n\n"
                                "Please tap 🎙️ to **record again** or **type your task** in plain text."
                            )

                        # Save transcript & ask confirmation
                        session["pending_task_text"] = transcript
                        session["custom_work_step"] = "CONFIRM_AUDIO_TRANSCRIPT"
                        return (
                            f"🎙️ *Voice Note Transcribed:*\n"
                            f"_{transcript}_\n\n"
                            f"━━━━━━━━━━━━━━━━━━━━━\n"
                            f"*Is this transcription correct?*\n\n"
                            f"1️⃣ Reply *1* (or *YES*) to confirm & get Price Quote\n"
                            f"2️⃣ Reply *2* (or *RETRY*) to record again or type text"
                        )
                
                # If audio download failed
                return (
                    "⚠️ *Audio standard intake notice*\n"
                    "━━━━━━━━━━━━━━━━━━━━━\n"
                    "Please type your custom work task in plain text or send a clear voice note."
                )

            # Standard Text Input
            if len(text_clean) < 3:
                return "Please provide a brief description of your task (at least a few words)."

            session["pending_task_text"] = text_clean
            return _generate_price_quote(session, text_clean)

        # Step 3: Voice Note Transcript Confirmation (Option 1 vs 2)
        if step == "CONFIRM_AUDIO_TRANSCRIPT":
            if text_clean.upper() in ["1", "YES", "Y", "CONFIRM", "OK"]:
                task_text = session.get("pending_task_text", "Custom Errand Task")
                return _generate_price_quote(session, task_text)
            else:
                session["custom_work_step"] = "WAITING_DETAILS"
                return (
                    "🔄 *Re-recording / Editing Task*\n"
                    "━━━━━━━━━━━━━━━━━━━━━\n"
                    "Please tap 🎙️ to **record your voice note again** or **type your task** in plain text."
                )

        # Step 4: Final Price Quote Confirmation
        if step == "CONFIRM_QUOTE":
            if text_clean.upper() in ["YES", "Y", "CONFIRM", "OK", "1"]:
                session["custom_work_step"] = "DONE"
                session["stage"] = "COMPLETED"
                quoted = session.get("quoted_fee", 119)
                order_id = f"CW-{session.get('user_id', '101')[-4:]}"
                return (
                    f"✅ *Order Confirmed! (#{order_id})*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                    f"A helper is being assigned to your location in Bhongir.\n"
                    f"💰 *Quoted Fee:* ₹{quoted}\n\n"
                    f"📲 *Live Tracking Link:* http://need2done.in/track/{order_id}\n\n"
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

def _generate_price_quote(session: Dict[str, Any], task_text: str) -> str:
    """
    Helper function to run Gemini Flash NLP Intent Classification & calculate quote.
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
        return (
            "⛔ *Task Restricted*\n"
            "━━━━━━━━━━━━━━━━━━━━━\n"
            "This request contains restricted or prohibited items (alcohol, cash transfers, adult services, etc.) and cannot be auto-assigned."
        )

    # 2. Call Node.js Pricing Engine Endpoint
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
        res = requests.post(NODE_BACKEND_URL, json=payload, timeout=5)
        data = res.json()

        if data.get("success"):
            summary = data.get("summary", {})
            service_fee = summary.get("serviceFee", 119)
            session["quoted_fee"] = service_fee

            return (
                f"🧾 *Custom Work Price Quote*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"📝 *Task:* {task_text[:80]}\n"
                f"🏷️ *Category:* {task_type.replace('_', ' ').title()}\n"
                f"🛣️ *Est. Distance:* {data.get('calculatedDistanceKm', 4.5)} km\n"
                f"⏱️ *Included Time:* Up to 15 mins handling\n\n"
                f"💵 *Quoted Service Fee:* *₹{service_fee}*\n"
                f"_(No percentage markups on merchant goods)_\n\n"
                f"Reply *YES* to confirm and dispatch helper, or *CANCEL* to stop."
            )
    except Exception as e:
        print(f"[CUSTOM_WORK_BOT] Backend pricing call notice: {e}")

    # Fallback quote
    session["quoted_fee"] = 119
    return (
        f"🧾 *Custom Work Price Quote*\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"📝 *Task:* {task_text[:80]}\n"
        f"💵 *Quoted Service Fee:* *₹119*\n\n"
        f"Reply *YES* to confirm and dispatch helper, or *CANCEL* to stop."
    )
