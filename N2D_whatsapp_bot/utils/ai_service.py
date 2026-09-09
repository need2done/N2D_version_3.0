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
GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"]


import base64
import re

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

    # 1. Primary Native STT: Sarvam AI STT (Returns exact Telugu script / Devanagari Hindi / English)
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

    # Fallback to Gemini Multimodal Audio STT for native transcript
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

    # 2. Get Simple, Clear English Translation via Gemini Flash
    if api_key:
        for model in GEMINI_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                prompt = (
                    "You are the Need2Done Delivery Assistant.\n"
                    "Translate the following spoken customer request into simple, clear English that normal people and delivery drivers can easily understand.\n\n"
                    "Example 1 Input: 'मेरे घर में पानी खत्म हो गया। मुझे एक बिसलेरी वाटर कैन चाहिए। एक कैन लेके आ जाना मेरे घर में।'\n"
                    "Example 1 Output: 'We have run out of water at my house, I need a Bisleri water can; please bring one can to my house.'\n\n"
                    "Example 2 Input: 'నేను ఇప్పుడు భోనగిరి పోస్ట్ ఆఫీస్ దగ్గర ఉన్నాను. నాకు ఆధార్ కార్డ్ జిరాక్స్ కావాలి.'\n"
                    "Example 2 Output: 'I am currently near Bhongir Post Office. I need an Aadhaar card Xerox.'\n\n"
                    f"Spoken Request: {raw_original}\n\n"
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
                        print(f"[GEMINI_ENGLISH_TRANSLATION] '{raw_original}' -> '{translated}'")
                        break
            except Exception as e:
                print(f"[GEMINI_TRANSLATE_ERROR] {e}")

    if not result["english_text"]:
        result["english_text"] = clean_and_translate_transcript(raw_original)

    return result

def transcribe_audio_sarvam_or_whisper(audio_bytes: bytes, filename: str = "audio.ogg") -> str:
    """
    Transcribes voice notes (Ogg/mp3/wav).
    """
    res = process_voice_note_with_translation(audio_bytes, filename)
    return res.get("english_text") or res.get("original_text") or ""

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
