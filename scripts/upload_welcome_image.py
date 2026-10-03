"""
Upload Welcome Banner Image to Meta WhatsApp Cloud API
======================================================
This script uploads the welcome banner image (`website/images/welcome-banner.jpg`)
to Meta Cloud API Media endpoint and outputs the generated Media ID.
It can also optionally write WELCOME_IMAGE_MEDIA_ID to your .env file.
"""

import os
import sys
from pathlib import Path
import requests
from dotenv import load_dotenv, set_key

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
GRAPH_API_VERSION = os.getenv("GRAPH_API_VERSION", "v19.0")

IMAGE_PATH = BASE_DIR / "website" / "images" / "welcome-banner.jpg"

def upload_image():
    if not IMAGE_PATH.exists():
        print(f"❌ Error: Image not found at {IMAGE_PATH}")
        sys.exit(1)

    if not ACCESS_TOKEN or not PHONE_NUMBER_ID:
        print("❌ Error: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing in .env")
        sys.exit(1)

    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{PHONE_NUMBER_ID}/media"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }

    print(f"📤 Uploading {IMAGE_PATH.name} to Meta WhatsApp Cloud API...")
    with open(IMAGE_PATH, "rb") as f:
        files = {
            "file": (IMAGE_PATH.name, f, "image/jpeg")
        }
        data = {
            "messaging_product": "whatsapp",
            "type": "image/jpeg"
        }
        res = requests.post(url, headers=headers, files=files, data=data, timeout=30)

    print("Status code:", res.status_code)
    try:
        body = res.json()
        print("Response:", body)
        if res.status_code in (200, 201) and "id" in body:
            media_id = body["id"]
            print(f"\n✅ Upload Successful! Media ID: {media_id}")
            env_file = BASE_DIR / ".env"
            set_key(str(env_file), "WELCOME_IMAGE_MEDIA_ID", media_id)
            print(f"✅ Updated WELCOME_IMAGE_MEDIA_ID={media_id} in {env_file}")
            return media_id
        else:
            print(f"\n❌ Upload failed: {body.get('error', {}).get('message', res.text)}")
    except Exception as e:
        print(f"❌ Parse error: {e}, Response: {res.text}")

if __name__ == "__main__":
    upload_image()
