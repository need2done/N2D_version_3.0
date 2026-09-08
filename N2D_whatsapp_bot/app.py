# ============================================================
# Need2Done – FastAPI Backend (Rebranded)
# ============================================================

from pathlib import Path
from dotenv import load_dotenv
import os
import time
import traceback
import requests
import re
import json

# ============================================================
# LOAD ENV (MUST BE BEFORE CONFIG IMPORT)
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

import logging
from logging.handlers import RotatingFileHandler

# ============================================================
# LOGGING SETUP
# ============================================================
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

logger = logging.getLogger("N2D_Bot")
logger.setLevel(logging.INFO)

handler = RotatingFileHandler(
    LOG_DIR / "bot.log", 
    maxBytes=10*1024*1024, # 10MB
    backupCount=5,
    encoding='utf-8'
)
formatter = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Also log to console
console = logging.StreamHandler()
console.setFormatter(formatter)
logger.addHandler(console)

WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "n2d_internal_2026_secure")

if not WHATSAPP_ACCESS_TOKEN:
    logger.warning("WHATSAPP_ACCESS_TOKEN NOT FOUND")
else:
    logger.info("Bot configuration loaded successfully.")


from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse, PlainTextResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from config import VERIFY_TOKEN
from core.role_router import route_message
from db.mysql_conn import get_db
import db.order_repo as order_repo

# ============================================================
# FASTAPI INIT
# ============================================================

app = FastAPI(
    title="Need2Done Backend",
    version="2.0"
)

# Create required directories if they don't exist
os.makedirs(BASE_DIR / "templates", exist_ok=True)
os.makedirs(BASE_DIR / "static", exist_ok=True)
UPLOAD_FOLDER = str(BASE_DIR / "uploads" / "bills")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# static files
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


# ============================================================
# SECURITY HEADERS
# ============================================================

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers["ngrok-skip-browser-warning"] = "true"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response


# ============================================================
# INTERNAL REQUEST VALIDATION
# ============================================================

def verify_internal_request(request: Request):
    return request.headers.get("X-INTERNAL-SECRET") == INTERNAL_SECRET


# ============================================================
# MESSAGE DEDUPLICATION
# ============================================================

_PROCESSED_MSG_IDS = {}
DEDUP_TTL = 60


def is_duplicate_message(msg_id: str) -> bool:

    if not msg_id:
        return False

    now = time.time()

    for k, v in list(_PROCESSED_MSG_IDS.items()):
        if now - v > DEDUP_TTL:
            del _PROCESSED_MSG_IDS[k]

    if msg_id in _PROCESSED_MSG_IDS:
        return True

    _PROCESSED_MSG_IDS[msg_id] = now
    return False


# ============================================================
# WHATSAPP WEBHOOK
# ============================================================
import asyncio
from background_jobs import check_home_service_timers

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_home_service_timers())

@app.api_route("/webhook", methods=["GET", "POST"])
async def webhook(request: Request):

    if request.method == "GET":
        params = dict(request.query_params)
        if params.get("hub.verify_token") == VERIFY_TOKEN:
            return PlainTextResponse(params.get("hub.challenge"))
        raise HTTPException(status_code=403)

    try:

        data = await request.json()
        logger.info(f"INCOMING WEBHOOK: {json.dumps(data)}")

        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})

                if "statuses" in value:
                    logger.info("Ignoring status update.")
                    return JSONResponse({"status": "ack"})

                for msg in value.get("messages", []):

                    msg_id = msg.get("id")
                    from_number = msg.get("from")
                    msg_type = msg.get("type")

                    if not from_number or not msg_type:
                        logger.warning("Missing from_number or msg_type.")
                        continue

                    if is_duplicate_message(msg_id):
                        logger.info(f"Duplicate message ignored: {msg_id}")
                        continue

                    if msg_type in ["reaction", "system", "unknown", "sticker", "unsupported"]:
                        logger.info(f"Ignoring passive or unsupported message type: {msg_type}")
                        continue

                    text = ""

                    if msg_type == "text":
                        text = msg.get("text", {}).get("body", "").strip()
                    elif msg_type == "interactive":
                        # Extract ID from button reply or list reply
                        interactive = msg.get("interactive", {})
                        if "button_reply" in interactive:
                            text = interactive["button_reply"].get("id", "")
                        elif "list_reply" in interactive:
                            text = interactive["list_reply"].get("id", "")
                    elif msg_type == "image":
                        text = "IMAGE"
                    elif msg_type == "location":
                        text = "LOCATION"
                    elif msg_type == "document":
                        text = "DOCUMENT"
                    elif msg_type in ("audio", "voice"):
                        audio_obj = msg.get("audio", {}) or msg.get("voice", {})
                        media_id = audio_obj.get("id", "")
                        text = f"AUDIO:{media_id}" if media_id else "AUDIO"


                    profile_name = ""
                    contacts = value.get("contacts", [])
                    if contacts:
                        profile_name = contacts[0].get("profile", {}).get("name", "")
                    
                    logger.info(f"Routing message from {from_number} (type: {msg_type}, text: {text})")
                    route_message(from_number, text, msg, profile_name)

    except Exception:
        logger.error("FATAL ERROR IN WEBHOOK HANDLER")
        logger.error(traceback.format_exc())

    return JSONResponse({"status": "ok"})

# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health_check():
    return {"status": "Need2Done Bot Active"}

# ============================================================
# LIVE TRACKING
# ============================================================

from pydantic import BaseModel
from typing import Optional

class TrackingPayload(BaseModel):
    helper_id: int
    order_id: Optional[str] = None
    lat: float
    lng: float

@app.post("/api/tracking/update")
async def tracking_update(payload: TrackingPayload):
    try:
        db_id = None
        if payload.order_id:
            # Need to convert public order_id (N2D-XXX) or DB ID string to integer
            # If it starts with N2D-, query it using get_order
            if str(payload.order_id).startswith("N2D"):
                order = order_repo.get_order(payload.order_id)
                if order:
                    db_id = order["id"]
            elif str(payload.order_id).isdigit():
                db_id = int(payload.order_id)
        
        success = order_repo.update_helper_gps(payload.helper_id, db_id, payload.lat, payload.lng)
        if success:
            # 🔥 Push unassigned orders to helper if they are available
            from db.helper_repo import get_helper_by_id
            from core.order_finalizer import push_unassigned_orders_to_helper
            
            helper = get_helper_by_id(payload.helper_id)
            if helper and helper.get("phone"):
                push_unassigned_orders_to_helper(helper["phone"], payload.lat, payload.lng)

            return {"success": True, "message": "Location updated"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update GPS")
    except Exception as e:
        logger.error(f"Error in tracking update: {str(e)}")
        raise HTTPException(status_code=500, detail="Server error")

# ============================================================
# SURGE NOTIFICATIONS
# ============================================================

class SurgePayload(BaseModel):
    amount: float
    service: Optional[str] = None

@app.post("/api/bot/notify-surge")
async def notify_surge(payload: SurgePayload):
    try:
        from db.helper_repo import get_all_helpers
        from whatsapp_client import send_message
        
        helpers = get_all_helpers()
        if not helpers:
            return {"success": False, "error": "No helpers found"}
            
        success_count = 0
        for h in helpers:
            if h.get("phone"):
                svc = payload.service if payload.service else "all"
                msg = f"🚀 *Surge Pricing Active!*\n\nAn extra ₹{payload.amount} is currently being added to {svc} orders. Come online to earn more!"
                send_message(h["phone"], msg)
                success_count += 1
                
        return {"success": True, "notified": success_count}
    except Exception as e:
        logger.error(f"Error sending surge notifications: {str(e)}")
        raise HTTPException(status_code=500, detail="Server error")

class InternalWebhookPayload(BaseModel):
    event: str
    orderId: str
    customerId: str
    serviceName: str
    bookingDate: str
    bookingSlot: str
    amount: float

@app.post('/webhook/internal')
async def internal_webhook(payload: InternalWebhookPayload):
    if payload.event == 'HOME_SERVICE_BOOKED':
        from whatsapp_client import send_reply_buttons
        from config import TRACKING_BASE_URL
        msg = f'''🎉 *Booking Confirmed!*

📦 *Booking ID*: {payload.orderId}
🏠 *Service*: {payload.serviceName}
📅 *Date*: {payload.bookingDate}
⏰ *Time*: {payload.bookingSlot}
💰 *Amount*: ₹{payload.amount}

Status: 🔍 Searching for Helper'''
        btn = [{'id': f'TRACK_ORDER_{payload.orderId}', 'title': '📍 Track Booking'}, {'id': f'MANAGE_BOOKING_{payload.orderId}', 'title': '✏️ Manage Booking'}]
        send_reply_buttons(payload.customerId, msg, btn)
        return {'success': True}
    return {'success': False, 'error': 'Unknown event'}
