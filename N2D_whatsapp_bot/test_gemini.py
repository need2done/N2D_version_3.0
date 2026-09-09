import os
import requests
from dotenv import load_dotenv

load_dotenv()

key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

models = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-3.6-flash"]

telugu_sample = "నేను ఇప్పుడు భువనగిరి రైల్వే స్టేషన్లో ఉన్నాను. నా బ్యాగ్ అనేది ఇంట్లో మరిచిపోయాను. ముజే వో బ్యాగ్ లేకే ఆనా, క్యూకి ట్రైన్ వెళ్ళిపోతుంది లేదంటే ఇట్స్ అర్జెంట్."

for model in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": f"Translate this spoken request to simple clear English for a delivery worker: {telugu_sample}"}]}]
    }
    try:
        res = requests.post(url, json=payload, timeout=6)
        print(f"MODEL {model} STATUS:", res.status_code)
        if res.status_code == 200:
            data = res.json()
            parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
            text = "".join([p.get('text', '') for p in parts if 'text' in p])
            print(f"SUCCESS {model}: {text.strip()}")
            break
        else:
            print(f"FAIL {model}: {res.text[:150]}")
    except Exception as e:
        print(f"ERROR {model}: {e}")
