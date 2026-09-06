"""
=================================================
Need2Done – WhatsApp Cloud API Client (FastAPI Safe)
=================================================

✔ Rebranded for Need2Done
✔ Prevent duplicate order offer send
✔ Optional DB validation before send
"""

import requests
import re
import json
import traceback
import os
from typing import Optional, Dict, Any

from config import PHONE_NUMBER_ID, GRAPH_API_VERSION

# Import (SAFE)
try:
    from db.order_repo import get_order
except:
    get_order = None

try:
    from db.service_repo import get_active_service_rows
except:
    get_active_service_rows = None


# =================================================
# GLOBAL SESSION
# =================================================

_http = requests.Session()


# =================================================
# ACCESS TOKEN
# =================================================

def get_access_token() -> str:
    from dotenv import load_dotenv
    from pathlib import Path
    base_dir = Path(__file__).resolve().parent
    load_dotenv(base_dir.parent / ".env", override=True)
    token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("ERROR: WHATSAPP_ACCESS_TOKEN not found in environment.")
    return token


# =================================================
# UTILS
# =================================================

def normalize_number(num: str) -> str:
    if not num:
        return ""
    cleaned = re.sub(r"\D", "", str(num))
    if len(cleaned) == 10:
        return f"91{cleaned}"
    return cleaned


def message_url() -> str:
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", PHONE_NUMBER_ID)
    version = os.getenv("GRAPH_API_VERSION", GRAPH_API_VERSION or "v19.0")
    return f"https://graph.facebook.com/{version}/{phone_id}/messages"


def build_headers() -> Dict[str, str]:
    token = get_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


# =================================================
# CORE POST
# =================================================

def _post(payload: Dict[str, Any]) -> Optional[requests.Response]:
    try:
        url = message_url()
        headers = build_headers()
        token = headers.get("Authorization", "")
        masked_token = (token[:20] + "..." + token[-6:]) if len(token) > 26 else token
        print(f"\nOUT: WHATSAPP REQUEST -> {url}")
        print(f"OUT: USING TOKEN -> {masked_token}")
        res = _http.post(
            url,
            headers=headers,
            json=payload,
            timeout=20
        )
        print("IN: STATUS:", res.status_code)
        if res.text:
            print("IN: BODY:", res.text)
        return res
    except Exception:
        print("ERROR: WHATSAPP API ERROR")
        traceback.print_exc()
        return None


# =================================================
# BASIC TEXT MESSAGE
# =================================================

def send_message(to: str, text: str):
    if not to or not text:
        return None
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "text",
        "text": {"body": str(text)[:4096]}
    }
    return _post(payload)


# =================================================
# REPLY BUTTONS
# =================================================

def send_reply_buttons(to: str, body: str, buttons: list):
    if not to or not body or not buttons:
        return None
    safe_buttons = []
    for b in buttons[:3]:
        if not b.get("id") or not b.get("title"):
            continue
        safe_buttons.append({
            "type": "reply",
            "reply": {
                "id": str(b["id"])[:256],
                "title": str(b["title"])[:20]
            }
        })
    if not safe_buttons:
        return send_message(to, body)
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body[:1024]},
            "action": {"buttons": safe_buttons}
        }
    }
    return _post(payload)


# =================================================
# CTA URL BUTTON
# =================================================

def send_url_button(to: str, text: str, button_text: str, url: str):
    if not to or not text or not button_text or not url:
        return None
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "interactive",
        "interactive": {
            "type": "cta_url",
            "body": {"text": text[:1024]},
            "action": {
                "name": "cta_url",
                "parameters": {
                    "display_text": button_text[:20],
                    "url": url
                }
            }
        }
    }
    return _post(payload)

# =================================================
# INTERACTIVE LIST
# =================================================

def send_interactive_list(to: str, body: str, button_text: str, rows: list, header: str = None):
    """
    Sends a WhatsApp List Message (up to 10 rows).
    """
    if not to or not body or not rows:
        return None
        
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "interactive",
        "interactive": {
            "type": "list",
            "body": {"text": body[:1024]},
            "action": {
                "button": button_text[:20],
                "sections": [
                    {
                        "title": "Options",
                        "rows": rows[:10]
                    }
                ]
            }
        }
    }
    
    if header:
        payload["interactive"]["header"] = {"type": "text", "text": header[:60]}
        
    return _post(payload)


# =================================================
# HELPER AUTO ASSIGN
# =================================================

def send_helper_auto_assign(
    to: str,
    order_id: str,
    message_text: str,
    safe_check: bool = True
):
    if not to or not order_id:
        return None
    if safe_check and get_order:
        try:
            order = get_order(order_id)
            if not order or order.get("helper_id"):
                return None
        except Exception:
            pass
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": message_text[:1024]},
            "action": {
                "buttons": [
                    {
                        "type": "reply",
                        "reply": {
                            "id": f"ACCEPT_ORDER|{order_id}",
                            "title": "Accept Order"
                        }
                    },
                    {
                        "type": "reply",
                        "reply": {
                            "id": f"REJECT_ORDER|{order_id}",
                            "title": "Reject Order"
                        }
                    }
                ]
            }
        }
    }
    return _post(payload)


# =================================================
# SERVICE LIST
# =================================================

def send_service_list(to: str):
    if not to:
        return None
    rows = get_active_service_rows() if get_active_service_rows else []
    if not rows:
        rows = [
            {"id": "SERVICE_10", "title": "🏠 Home Services", "description": "Book trusted home cleaning and repairs."},
            {"id": "SERVICE_2", "title": "💊 Medicines", "description": "Buy health supplies or medicines."},
            {"id": "SERVICE_5", "title": "👨‍🔧 Any Work", "description": "Pick/Drop parcels, run errands."},
            {"id": "SERVICE_6", "title": "📞 Support", "description": "Talk to our team for assistance."},
            {"id": "SERVICE_8", "title": "📦 My Orders", "description": "View recent order history."}
        ]
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "interactive",
        "interactive": {
            "type": "list",
            "body": {"text": "🛠 Please choose a service:"},
            "action": {
                "button": "Select Service",
                "sections": [
                    {
                        "title": "Need2Done Services ⚙️",
                        "rows": rows
                    }
                ]
            }
        }
    }
    return _post(payload)


# =================================================
# HELPER ASSIGNMENT LIST (MANUAL)
# =================================================

def send_helper_assignment_list(to: str, order_id: str, helpers: list):
    
    if not to or not order_id or not helpers:
        return None
        
    rows = []
    # WhatsApp list supports max 10 rows per section
    for h in helpers[:10]:
        rows.append({
            "id": f"SET_HELPER|{order_id}|{h['id']}",
            "title": str(h["name"])[:24],
            "description": str(h["phone"])[:72]
        })
        
    if not rows:
        return None
        
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "interactive",
        "interactive": {
            "type": "list",
            "body": {
                "text": f"Select a helper for Order {order_id}:"
            },
            "action": {
                "button": "Choose Helper",
                "sections": [
                    {
                        "title": "Available Helpers",
                        "rows": rows
                    }
                ]
            }
        }
    }
    
    return _post(payload)

# =================================================
# ADMIN NEW ORDER NOTIFICATION (WITH ASSIGN BUTTONS)
# =================================================

def send_admin_new_order_with_assign_refresh(
    to: str,
    order_id: str,
    customer_name: str,
    customer_phone: str,
    service: str,
    items_text: str,
    maps_link: str,
    estimated_cost: str
):
    if not to or not order_id:
        return None
        
    db_id_for_buttons = None
    try:
        if get_order:
            order = get_order(order_id)
            if order:
                db_id_for_buttons = order["id"]
    except Exception:
        pass
        
    # fallback if db lookup fails
    if not db_id_for_buttons:
        db_id_for_buttons = order_id
        
    text = f"""🚨 *NEW ORDER* 🚨

🆔 Order: {order_id}
👤 Customer: {customer_name} ({customer_phone})
🛠 Service: {service}

📦 *Items:*
{items_text}

💰 *Est. Cost:* ₹{estimated_cost}
📍 *Location:* {maps_link}"""

    buttons = [
        {"id": f"AUTO_ASSIGN|{db_id_for_buttons}", "title": "⚡ Auto Assign"},
        {"id": f"ASSIGN_HELPER|{db_id_for_buttons}", "title": "👤 Manual Assign"}
    ]
    
    return send_reply_buttons(to, text, buttons)
    
    
# =================================================
# SEND IMAGE (MEDIA ID SUPPORT)
# =================================================

def send_image(to: str, media_id: str, caption: str = ""):
    """
    Sends an image using Meta's media_id.
    """
    if not to or not media_id:
        return None
        
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "image",
        "image": {
            "id": media_id,
            "caption": caption[:1024]
        }
    }
    return _post(payload)


# =================================================
# RICH WELCOME MESSAGE (STEP 1)
# =================================================

def send_rich_welcome(to: str, name: str = None):
    """
    Sends the rich welcome template with emojis and a button.
    Matches the mockup provided by the user.
    """
    if not to:
        return None
        
    if name:
        greeting = f"Welcome back, *{name}*!"
        call_action = "Click below to select a service:"
        btn_id = "WELCOME_SERVICE"
        btn_title = "🛠 Select Service"
    else:
        greeting = "Welcome to *Need2Done*!"
        call_action = "What should I call you?"
        btn_id = "WELCOME_START"
        btn_title = "🚀 Get Started"
    
    body = (
        f"👋 {greeting}\n\n"
        "We help you get anything done locally:\n\n"
        "🛒 *Groceries*\n"
        "🥦 *Vegetables & Fruits*\n"
        "🍔 *Food*\n"
        "🏠 *Home Services*\n"
        "💊 *Medicines*\n"
        "🚗 *Ride Booking*\n"
        "👨‍🔧 *Any Work / Parcel*\n\n"
        "⚡ Fast delivery (30-60 mins)\n"
        "💳 Pay after delivery\n"
        "🤝 Trusted local helpers\n\n"
        f"{call_action}"
    )
    
    buttons = [
        {"id": btn_id, "title": btn_title}
    ]
    
    return send_reply_buttons(to, body, buttons)


# =================================================
# RICH SERVICE SELECTION (STEP 3)
# =================================================

def send_rich_service_list(to: str, name: str = None):
    """
    Sends the rich service selection list with emojis.
    Now supports an optional name to merge with the 'Nice to meet you' greeting.
    """
    if not to:
        return None
        
    greeting = f"Nice to meet you, *{name}*! 😊\n" if name else ""
    
    body = (
        f"{greeting}What do you need today? 👇"
    )

    rows = get_active_service_rows() if get_active_service_rows else []
    if not rows:
        rows = [
            {"id": "SERVICE_10", "title": "🏠 Home Services", "description": "Book trusted home cleaning and repair services."},
            {"id": "SERVICE_2", "title": "💊 Medicines Service", "description": "Buy health supplies or medicines with prescription."},
            {"id": "SERVICE_5", "title": "👨‍🔧 Any Work Service", "description": "Pick/Drop parcels, run errands, or custom tasks."},
            {"id": "SERVICE_6", "title": "📞 Support", "description": "Talk to our team for any assistance or help."},
            {"id": "SERVICE_8", "title": "📦 My Orders", "description": "View your recent order history and tracking."}
        ]
    
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "interactive",
        "interactive": {
            "type": "list",
            "body": {"text": body[:1024]},
            "action": {
                "button": "Select Service",
                "sections": [
                    {
                        "title": "Need2Done Services",
                        "rows": rows
                    }
                ]
            }
        }
    }
    
    return _post(payload)


# =================================================
# SECURE PAYMENT BUTTON (CTA URL)
# =================================================

def send_payment_button(to: str, body: str, button_text: str, url: str):
    """
    Sends a WhatsApp interactive message with a single CTA URL button.
    This beautifully hides the raw deep link behind a branded label.
    """
    if not to or not body or not url:
        return None
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_number(to),
        "type": "interactive",
        "interactive": {
            "type": "cta_url",
            "body": {"text": body[:1024]},
            "action": {
                "name": "cta_url",
                "parameters": {
                    "display_text": button_text[:20],
                    "url": url
                }
            }
        }
    }
    return _post(payload)


