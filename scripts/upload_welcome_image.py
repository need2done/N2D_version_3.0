"""
Upload Banner Images to Meta WhatsApp Cloud API
===============================================
Usage:
    python upload_welcome_image.py [image_relative_path] [env_var_name]

Examples:
    python upload_welcome_image.py website/images/welcome-banner.jpg WELCOME_IMAGE_MEDIA_ID
    python upload_welcome_image.py website/images/home-services-banner.jpg HOME_SERVICES_IMAGE_MEDIA_ID
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

def upload_image(rel_path="website/images/welcome-banner.jpg", env_key="WELCOME_IMAGE_MEDIA_ID"):
    img_path = BASE_DIR / rel_path
    if not img_path.exists():
        print(f"❌ Error: Image not found at {img_path}")
        sys.exit(1)

    if not ACCESS_TOKEN or not PHONE_NUMBER_ID:
        print("❌ Error: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing in .env")
        sys.exit(1)

    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{PHONE_NUMBER_ID}/media"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }

    print(f"📤 Uploading {img_path.name} to Meta WhatsApp Cloud API...")
    with open(img_path, "rb") as f:
        files = {
            "file": (img_path.name, f, "image/jpeg")
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
            set_key(str(env_file), env_key, media_id)
            print(f"✅ Updated {env_key}={media_id} in {env_file}")
            return media_id
        else:
            print(f"\n❌ Upload failed: {body.get('error', {}).get('message', res.text)}")
    except Exception as e:
        print(f"❌ Parse error: {e}, Response: {res.text}")

if __name__ == "__main__":
    target_path = sys.argv[1] if len(sys.argv) > 1 else "website/images/welcome-banner.jpg"
    target_key = sys.argv[2] if len(sys.argv) > 2 else "WELCOME_IMAGE_MEDIA_ID"
    upload_image(target_path, target_key)
