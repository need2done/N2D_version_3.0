"""
=================================================
Need2Done – AI Voice STT & Gemini Flash Classifier
=================================================
✔ Sarvam AI / OpenAI Whisper Speech-to-Text (Telugu, Hindi, Teluglish)
✔ Gemini Flash 2.5 / GPT-4o-mini NLP Intent & Entity Extraction
"""

import os
import json
import requests
import traceback
from typing import Dict, Any, Optional

from dotenv import load_dotenv
load_dotenv()

# API Keys from Environment
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY", ""))

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"]



def transcribe_audio_sarvam_or_whisper(audio_bytes: bytes, filename: str = "audio.ogg") -> str:
    """
    Transcribes voice notes (Ogg/mp3/wav) using Sarvam AI STT (Telugu/Hindi) or OpenAI Whisper fallback.
    """
    if not audio_bytes:
        return ""

    # Try Sarvam AI STT (Optimized for Indian Languages like Telugu/Hindi/English)
    if SARVAM_API_KEY:
        headers = {"api-subscription-key": SARVAM_API_KEY}
        files = {"file": (filename, audio_bytes, "audio/ogg")}
        # Try active models: saaras:v4 then saaras:v3
        for model in ["saaras:v4", "saaras:v3", "saarika:v2.5"]:
            try:
                data = {"language_code": "unknown", "model": model}
                res = requests.post(SARVAM_STT_URL, headers=headers, files=files, data=data, timeout=12)
                if res.status_code == 200:
                    result = res.json()
                    transcript = result.get("transcript", "").strip()
                    if transcript:
                        print(f"[AI_STT_SARVAM] Transcribed audio via {model}: {transcript}")
                        return transcript
            except Exception as e:
                print(f"[AI_STT_ERROR] Sarvam AI STT ({model}) notice: {e}")


    # Fallback to OpenAI Whisper API if OpenAI Key is present
    if OPENAI_API_KEY:
        try:
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
            files = {"file": (filename, audio_bytes, "audio/ogg")}
            data = {"model": "whisper-1", "prompt": "Telugu, Hyderabadi Hindi, English custom work order for Need2Done Bhongir"}
            res = requests.post("https://api.openai.com/v1/audio/transcriptions", headers=headers, files=files, data=data, timeout=10)
            if res.status_code == 200:
                transcript = res.json().get("text", "").strip()
                print(f"[AI_STT_WHISPER] Transcribed audio: {transcript}")
                return transcript
        except Exception as e:
            print(f"[AI_STT_ERROR] OpenAI Whisper notice: {e}")

    return ""

def classify_custom_work_intent_gemini(raw_text: str) -> Dict[str, Any]:
    """
    Uses Gemini 2.5 Flash / GPT-4o-mini NLP classifier to extract task entities & parameters.
    """
    default_payload = {
        "task_type": "unique_custom_task",
        "pickup_location": "Bhongir Town",
        "drop_location": "Customer Location",
        "item_description": raw_text,
        "has_access_coordination": False,
        "has_shopping": False,
        "item_lines_count": 0,
        "extra_stops": 0,
        "safety_flag": "SAFE"
    }

    if not raw_text or len(raw_text.strip()) < 3:
        return default_payload

    system_prompt = (
        "You are the Need2Done Custom Work AI Intent Parser for Bhongir, Telangana.\n"
        "Analyze the customer's text or transcript and extract JSON with fields:\n"
        "- task_type: 'direct_pickup', 'retrieve', 'buy_and_bring', 'prepaid_pickup', 'queue_paperwork', 'multi_stop', 'heavy_cargo_auto', 'unique_custom_task'\n"
        "- pickup_location: string\n"
        "- drop_location: string\n"
        "- item_description: string\n"
        "- has_access_coordination: boolean\n"
        "- has_shopping: boolean\n"
        "- item_lines_count: integer\n"
        "- extra_stops: integer\n"
        "- safety_flag: 'SAFE' or 'BLOCKED_RESTRICTED'\n\n"
        "Return ONLY raw JSON, no markdown codeblocks."
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
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 300}
                }
                res = requests.post(gemini_url, json=payload, timeout=8)
                if res.status_code == 200:
                    res_json = res.json()
                    parts = res_json['candidates'][0]['content']['parts']
                    # Find part containing JSON text
                    text_response = "".join([p.get('text', '') for p in parts if 'text' in p])
                    import re
                    match = re.search(r"\{.*\}", text_response, re.DOTALL)
                    if match:
                        clean_json = match.group(0)
                        parsed = json.loads(clean_json)
                        print(f"[GEMINI_FLASH_NLP] Successfully classified intent via {model}: {parsed.get('task_type')}")
                        return parsed

            except Exception as e:
                print(f"[GEMINI_NLP_ERROR] Gemini Flash ({model}) classification notice: {e}")


    # Heuristic Fallback Classifier
    lower = raw_text.lower()
    if any(k in lower for k in ['buy', 'grocery', 'vegetable', 'shop', 'store bill', 'kirana']):
        default_payload['task_type'] = 'buy_and_bring'
        default_payload['has_shopping'] = True
    elif any(k in lower for k in ['retrieve', 'bring from home', 'collect key', 'forgot', 'brother', 'family']):
        default_payload['task_type'] = 'retrieve'
        default_payload['has_access_coordination'] = True
    elif any(k in lower for k in ['queue', 'wait', 'paperwork', 'form', 'token']):
        default_payload['task_type'] = 'queue_paperwork'

    return default_payload
