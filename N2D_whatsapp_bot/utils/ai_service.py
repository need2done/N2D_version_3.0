"""
=================================================
Need2Done – AI Voice STT & Gemini Flash Classifier (v3.5)
=================================================
✔ Sarvam AI / OpenAI Whisper Speech-to-Text (Telugu, Hindi, Teluglish)
✔ Gemini Flash 2.5 Structured Task Understanding & Entity Parser
✔ Decoupled Task Category + Operational Flow Engine
✔ Strict Safety Shield, Few-Shot Multilingual NLP & Confidence Scoring
"""

import os
import json
import requests
import traceback
import base64
import re
from typing import Dict, Any, Optional

from dotenv import load_dotenv
load_dotenv()

# API Keys from Environment
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY", ""))

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"]


def clean_and_translate_transcript(raw_transcript: str) -> str:
    """
    Translates or cleans raw Sarvam/Gemini transcript (Telugu, Hindi, Teluglish) into clean, readable English task text.
    """
    if not raw_transcript or len(raw_transcript.strip()) < 2:
        return ""

    has_telugu = bool(re.search(r'[\u0C00-\u0C7F]', raw_transcript))
    has_garbled = bool(re.search(r'[\"\'\(\)]', raw_transcript))

    api_key = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY", ""))
    if api_key and (has_telugu or has_garbled or len(raw_transcript.strip()) < 15):
        for model in GEMINI_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                prompt = (
                    "Translate and format the following raw speech transcript (Telugu/English/Teluglish) into a single concise English task description for a local delivery helper.\n"
                    "Example input: 'ల్యాప్‌టాప్\" (ly'\n"
                    "Example output: 'Laptop pick and drop task'\n\n"
                    f"Raw transcript: {raw_transcript}\n\n"
                    "Output ONLY the clear English task phrase, nothing else."
                )
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 60}
                }
                res = requests.post(url, json=payload, timeout=6)
                if res.status_code == 200:
                    res_json = res.json()
                    parts = res_json.get('candidates', [{}])[0].get('content', {}).get('parts', [])
                    cleaned = "".join([p.get('text', '') for p in parts if 'text' in p]).strip()
                    if cleaned:
                        print(f"[AI_CLEANED_TRANSCRIPT] '{raw_transcript}' -> '{cleaned}'")
                        return cleaned
            except Exception as e:
                print(f"[AI_CLEAN_ERROR] Notice: {e}")

    cleaned = re.sub(r'[\"\'\(\)]', '', raw_transcript).strip()
    return cleaned


def process_voice_note_with_translation(audio_bytes: bytes, filename: str = "voice.ogg") -> Dict[str, str]:
    """
    Transcribes audio voice notes and returns a dict with:
    - original_text: Verbatim spoken transcript in native script (Telugu/Hindi/English)
    - english_text: Simple, clear English translation suitable for customer & delivery worker.
    """
    result = {
        "original_text": "",
        "english_text": ""
    }
    if not audio_bytes:
        return result

    api_key = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY", ""))
    raw_original = ""

    # 1. Primary Native STT: Sarvam AI STT
    if SARVAM_API_KEY:
        try:
            headers = {"api-subscription-key": SARVAM_API_KEY}
            files = {"file": (filename, audio_bytes, "audio/ogg")}
            data = {"language_code": "unknown", "model": "saaras:v4"}
            res = requests.post(SARVAM_STT_URL, headers=headers, files=files, data=data, timeout=10)
            if res.status_code == 200:
                raw_original = res.json().get("transcript", "").strip()
                print(f"[SARVAM_NATIVE_STT] '{raw_original}'")
        except Exception as e:
            print(f"[SARVAM_STT_NOTICE] {e}")

    # Fallback to Gemini Multimodal Audio STT
    if not raw_original and api_key:
        for model in GEMINI_MODELS:
            try:
                b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
                mime_type = "audio/ogg"
                if filename.endswith(".mp3"): mime_type = "audio/mp3"
                elif filename.endswith(".wav"): mime_type = "audio/wav"

                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                prompt = (
                    "Transcribe this audio recording exactly into its native spoken language/script (Telugu script, Devanagari Hindi, or English).\n"
                    "Output ONLY the raw verbatim transcript, no markdown, no quotes or commentary."
                )
                payload = {
                    "contents": [{
                        "parts": [
                            {"inlineData": {"mimeType": mime_type, "data": b64_audio}},
                            {"text": prompt}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 200}
                }
                res = requests.post(url, json=payload, timeout=12)
                if res.status_code == 200:
                    res_json = res.json()
                    parts = res_json.get('candidates', [{}])[0].get('content', {}).get('parts', [])
                    raw_original = "".join([p.get('text', '') for p in parts if 'text' in p]).strip()
                    if raw_original:
                        break
            except Exception as e:
                print(f"[GEMINI_AUDIO_STT_ERROR] {e}")

    if not raw_original:
        return result

    result["original_text"] = raw_original

    # 2. Get English Translation via Gemini Flash
    if api_key:
        for model in GEMINI_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                prompt = (
                    "You are the Need2Done Delivery Assistant.\n"
                    "Translate the following spoken customer request into simple, clear English that normal people and delivery drivers can easily understand.\n\n"
                    "Spoken Request: " + raw_original + "\n\n"
                    "Output ONLY the clear English translation, without extra quotes or markdown."
                )
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 150}
                }
                res = requests.post(url, json=payload, timeout=8)
                if res.status_code == 200:
                    res_json = res.json()
                    parts = res_json.get('candidates', [{}])[0].get('content', {}).get('parts', [])
                    translated = "".join([p.get('text', '') for p in parts if 'text' in p]).strip()
                    translated = re.sub(r'^["\']|["\']$', '', translated).strip()
                    if translated:
                        result["english_text"] = translated
                        break
            except Exception as e:
                print(f"[GEMINI_TRANSLATE_ERROR] {e}")

    if not result["english_text"]:
        result["english_text"] = clean_and_translate_transcript(raw_original)

    return result


def transcribe_audio_sarvam_or_whisper(audio_bytes: bytes, filename: str = "audio.ogg") -> str:
    res = process_voice_note_with_translation(audio_bytes, filename)
    return res.get("english_text") or res.get("original_text") or ""


def classify_custom_work_intent_gemini(raw_text: str) -> Dict[str, Any]:
    """
    Enterprise Task Understanding & Entity Extraction via Gemini 2.5 Flash.
    Strictly decouples 'category' from 'flow' and evaluates confidence scores.
    """
    default_payload = {
        "category": "unique_custom_task",
        "subcategory": "custom_errand",
        "flow": "single_location",
        "task_summary": raw_text,
        "customer_language": "en",
        "urgency": "medium",
        "entities": {
            "item": raw_text,
            "problem": None,
            "quantity": None,
            "vehicle_required": False,
            "pickup_location": None,
            "drop_location": None,
            "work_location": "Bhongir Town",
            "stops": []
        },
        "customer_intent": {
            "needs_purchase": False,
            "needs_pickup": False,
            "needs_delivery": False,
            "needs_repair": False,
            "needs_queueing": False,
            "needs_transport": False
        },
        "safety": {
            "status": "allowed",
            "risk_level": "low",
            "reason": None
        },
        "confidence": {
            "category": 0.90,
            "flow": 0.90,
            "entities": 0.80
        },
        "missing_fields": [],
        "clarification_question": None,

        # Backward Compatibility Helpers
        "task_type": "unique_custom_task",
        "is_single_location_task": True,
        "safety_flag": "SAFE",
        "has_shopping": False,
        "has_access_coordination": False,
        "item_description": raw_text,
        "item_lines_count": 0,
        "extra_stops": 0,
        "pickup_location": None,
        "drop_location": None
    }

    if not raw_text or len(raw_text.strip()) < 3:
        default_payload["confidence"]["category"] = 0.20
        default_payload["confidence"]["flow"] = 0.20
        default_payload["missing_fields"] = ["task_description"]
        default_payload["clarification_question"] = "Please describe what task you would like us to help you with."
        return default_payload

    lower_req = raw_text.lower()

    # =========================================================================
    # LAYER 1: HARD SAFETY & POLICY CHECK (Pre-LLM Guardrail)
    # =========================================================================
    blocked_keywords = ['alcohol', 'beer', 'whiskey', 'toddy', 'vape', 'e-cigarette', 'gutka', 'sex', 'cash transfer', 'bank deposit', 'withdrawal', 'weapon', 'gun', 'explosive', 'illegal', 'drug', 'prescription missing']
    if any(b in lower_req for b in blocked_keywords):
        print(f"[SAFETY_GUARDRAIL] Task blocked due to restricted keyword: {raw_text}")
        default_payload["safety"]["status"] = "blocked"
        default_payload["safety"]["risk_level"] = "high"
        default_payload["safety"]["reason"] = "Restricted or illegal request"
        default_payload["flow"] = "restricted_task"
        default_payload["safety_flag"] = "BLOCKED_RESTRICTED"
        default_payload["confidence"]["category"] = 1.0
        default_payload["confidence"]["flow"] = 1.0
        return default_payload

    # Emergency Fuel Handling Policy Check
    if any(k in lower_req for k in ['petrol', 'fuel', 'diesel']) and any(k in lower_req for k in ['stranded', 'highway', 'empty', 'not starting', 'died', 'bike', 'car']):
        print(f"[SAFETY_POLICY] Approved Emergency Fuel Delivery request detected.")
        default_payload["category"] = "unique_custom_task"
        default_payload["subcategory"] = "emergency_fuel"
        default_payload["flow"] = "single_location"
        default_payload["entities"]["item"] = "Emergency Petrol"
        default_payload["customer_intent"]["needs_delivery"] = True
        default_payload["is_single_location_task"] = True

    # =========================================================================
    # LAYER 2 & 3: GEMINI FLASH PARSER WITH FEW-SHOT EXAMPLES & CONFIDENCE
    # =========================================================================
    system_prompt = (
        "You are the Need2Done Enterprise Task Understanding Parser for Bhongir, Telangana.\n"
        "Your role is to analyze customer WhatsApp requests (English, Telugu, or Teluglish/mixed) and extract structured JSON.\n\n"
        "RULES:\n"
        "1. Do NOT classify based on keywords alone. Analyze the full sentence meaning, action, object, origin, and destination.\n"
        "2. TASK CATEGORY must be one of: ['buy_and_bring', 'direct_pickup', 'retrieve', 'prepaid_pickup', 'queue_paperwork', 'multi_stop', 'heavy_cargo_auto', 'unique_custom_task']\n"
        "3. OPERATIONAL FLOW must be one of: ['single_location', 'pickup_to_drop', 'store_to_drop', 'multi_stop', 'queueing', 'custom_review', 'restricted_task']\n"
        "   - Use 'single_location' for vehicle breakdown, bike not starting, flat tyre, plumber, electrician, mechanic, or emergency fuel stranded at 1 spot.\n"
        "   - Use 'pickup_to_drop' for parcel, charger, keys, retrieving forgotten items from someone.\n"
        "   - Use 'store_to_drop' for buying groceries, medicines, fuel from pump to home.\n"
        "   - Use 'queueing' for standing in line at MeeSeva, bank, post office.\n"
        "   - Use 'multi_stop' for 2+ places in 1 run.\n"
        "4. Assign realistic CONFIDENCE SCORES (0.0 to 1.0) for category, flow, and entities.\n"
        "5. If request is ambiguous (e.g. 'I need something from bank'), set category=null, flow=null, confidence low (<0.4), and provide a targeted 'clarification_question'.\n\n"
        "FEW-SHOT EXAMPLES:\n"
        "Example 1: 'My bike died beside SBI and I need help'\n"
        "=> {\"category\": \"unique_custom_task\", \"subcategory\": \"vehicle_breakdown\", \"flow\": \"single_location\", \"task_summary\": \"Roadside bike breakdown assistance near SBI\", \"customer_language\": \"en\", \"urgency\": \"high\", \"entities\": {\"item\": \"bike\", \"problem\": \"died/not starting\", \"quantity\": null, \"vehicle_required\": false, \"pickup_location\": null, \"drop_location\": null, \"work_location\": \"SBI Bank\", \"stops\": []}, \"customer_intent\": {\"needs_purchase\": false, \"needs_pickup\": false, \"needs_delivery\": false, \"needs_repair\": true, \"needs_queueing\": false, \"needs_transport\": false}, \"safety\": {\"status\": \"allowed\", \"risk_level\": \"low\", \"reason\": null}, \"confidence\": {\"category\": 0.95, \"flow\": 0.98, \"entities\": 0.85}, \"missing_fields\": [\"work_location\"], \"clarification_question\": null}\n\n"
        "Example 2: 'Please take the charger from my cousin's office and bring it to my house'\n"
        "=> {\"category\": \"retrieve\", \"subcategory\": \"item_retrieval\", \"flow\": \"pickup_to_drop\", \"task_summary\": \"Retrieve charger from cousin's office and deliver home\", \"customer_language\": \"en\", \"urgency\": \"medium\", \"entities\": {\"item\": \"laptop charger\", \"problem\": null, \"quantity\": \"1\", \"vehicle_required\": false, \"pickup_location\": \"Cousin Office\", \"drop_location\": \"Customer House\", \"work_location\": null, \"stops\": []}, \"customer_intent\": {\"needs_purchase\": false, \"needs_pickup\": true, \"needs_delivery\": true, \"needs_repair\": false, \"needs_queueing\": false, \"needs_transport\": false}, \"safety\": {\"status\": \"allowed\", \"risk_level\": \"low\", \"reason\": null}, \"confidence\": {\"category\": 0.96, \"flow\": 0.96, \"entities\": 0.90}, \"missing_fields\": [\"pickup_location\", \"drop_location\"], \"clarification_question\": null}\n\n"
        "Example 3: 'I need something from the bank'\n"
        "=> {\"category\": null, \"subcategory\": null, \"flow\": null, \"task_summary\": null, \"customer_language\": \"en\", \"urgency\": \"medium\", \"entities\": {\"item\": null, \"problem\": null, \"quantity\": null, \"vehicle_required\": false, \"pickup_location\": null, \"drop_location\": null, \"work_location\": \"Bank\", \"stops\": []}, \"customer_intent\": {\"needs_purchase\": false, \"needs_pickup\": false, \"needs_delivery\": false, \"needs_repair\": false, \"needs_queueing\": false, \"needs_transport\": false}, \"safety\": {\"status\": \"allowed\", \"risk_level\": \"low\", \"reason\": null}, \"confidence\": {\"category\": 0.30, \"flow\": 0.20, \"entities\": 0.20}, \"missing_fields\": [\"requested_action\", \"item\"], \"clarification_question\": \"What should our helper do at the bank: wait in a queue, submit paperwork, or collect an item?\"}\n\n"
        "Example 4: 'Cake already paid at bakery, collect and bring home'\n"
        "=> {\"category\": \"prepaid_pickup\", \"subcategory\": \"store_collection\", \"flow\": \"pickup_to_drop\", \"task_summary\": \"Collect prepaid cake from bakery and deliver home\", \"customer_language\": \"en\", \"urgency\": \"medium\", \"entities\": {\"item\": \"bakery cake\", \"problem\": null, \"quantity\": \"1\", \"vehicle_required\": false, \"pickup_location\": \"Bakery Shop\", \"drop_location\": \"Customer Home\", \"work_location\": null, \"stops\": []}, \"customer_intent\": {\"needs_purchase\": false, \"needs_pickup\": true, \"needs_delivery\": true, \"needs_repair\": false, \"needs_queueing\": false, \"needs_transport\": false}, \"safety\": {\"status\": \"allowed\", \"risk_level\": \"low\", \"reason\": null}, \"confidence\": {\"category\": 0.96, \"flow\": 0.95, \"entities\": 0.88}, \"missing_fields\": [\"pickup_location\", \"drop_location\"], \"clarification_question\": null}\n\n"
        "Return ONLY raw valid JSON adhering strictly to this schema, no markdown blocks."
    )

    api_key = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY", ""))
    if api_key:
        for model in GEMINI_MODELS:
            try:
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                payload = {
                    "contents": [{
                        "parts": [{"text": f"{system_prompt}\n\nCustomer Request: {raw_text}"}]
                    }],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 450}
                }
                res = requests.post(gemini_url, json=payload, timeout=8)
                if res.status_code == 200:
                    res_json = res.json()
                    parts = res_json['candidates'][0]['content']['parts']
                    text_response = "".join([p.get('text', '') for p in parts if 'text' in p])
                    match = re.search(r"\{.*\}", text_response, re.DOTALL)
                    if match:
                        clean_json = match.group(0)
                        parsed = json.loads(clean_json)

                        # Backward compatibility mapping
                        parsed["task_type"] = parsed.get("category") or "unique_custom_task"
                        parsed["is_single_location_task"] = (parsed.get("flow") in ["single_location", "queueing"])
                        parsed["safety_flag"] = "BLOCKED_RESTRICTED" if parsed.get("safety", {}).get("status") == "blocked" else "SAFE"
                        parsed["has_shopping"] = (parsed.get("category") == "buy_and_bring")
                        parsed["has_access_coordination"] = (parsed.get("category") == "retrieve")
                        parsed["item_description"] = parsed.get("task_summary") or raw_text

                        entities = parsed.get("entities", {})
                        parsed["pickup_location"] = entities.get("pickup_location")
                        parsed["drop_location"] = entities.get("drop_location")

                        print(f"[GEMINI_PARSER_v3.5] Classified via {model}: category={parsed.get('category')}, flow={parsed.get('flow')}, cat_conf={parsed.get('confidence',{}).get('category')}")
                        return parsed
            except Exception as e:
                print(f"[GEMINI_PARSER_ERROR] Gemini Flash ({model}) notice: {e}")

    # Fallback Layer if API unavailable
    if any(k in lower_req for k in ['repair', 'mechanic', 'puncture', 'flat', 'tyre', 'not starting', 'plumber', 'electrician', 'breakdown', 'stranded', 'died']):
        default_payload["category"] = "unique_custom_task"
        default_payload["flow"] = "single_location"
        default_payload["is_single_location_task"] = True
    elif any(k in lower_req for k in ['buy', 'grocery', 'vegetable', 'shop', 'kirana']):
        default_payload["category"] = "buy_and_bring"
        default_payload["flow"] = "store_to_drop"
        default_payload["is_single_location_task"] = False
        default_payload["has_shopping"] = True
    elif any(k in lower_req for k in ['retrieve', 'bring from home', 'collect key', 'forgot', 'charger', 'keys']):
        default_payload["category"] = "retrieve"
        default_payload["flow"] = "pickup_to_drop"
        default_payload["is_single_location_task"] = False
        default_payload["has_access_coordination"] = True

    return default_payload
