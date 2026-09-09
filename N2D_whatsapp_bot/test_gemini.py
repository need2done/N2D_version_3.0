import os
import requests
from dotenv import load_dotenv

load_dotenv()

key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"

res = requests.get(url)
print("MODELS LIST STATUS:", res.status_code)
if res.status_code == 200:
    models = res.json().get("models", [])
    print("AVAILABLE MODELS:")
    for m in models:
        name = m.get("name", "").replace("models/", "")
        methods = m.get("supportedGenerationMethods", [])
        if "generateContent" in methods:
            print(" -", name)
else:
    print(res.text)
