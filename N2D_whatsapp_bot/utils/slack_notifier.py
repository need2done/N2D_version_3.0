"""
================================================================================
Need2Done – Multi-Channel Slack Order Status Dispatcher
================================================================================
Broadcasts real-time order status updates and rich details to dedicated Slack
channels ("sub-groups"):
  1. #orders-medicine       (SLACK_WEBHOOK_MEDICINE)
  2. #orders-home-services   (SLACK_WEBHOOK_HOME_SERVICES)
  3. #orders-custom-work     (SLACK_WEBHOOK_CUSTOM_WORK)
  4. Optional Master Channel (SLACK_WEBHOOK_ALL)

Features:
  ✔ Masked customer phone number (+91 98*** **321) for privacy
  ✔ Full task details (Medicine items, Home Services package/slots, Custom Work chores)
  ✔ Location tracking (Store/Pickup & Customer/Drop address with Google Maps links)
  ✔ Live tracking URL (https://need2done.in/track/<order_id>)
  ✔ Color/Emoji milestone indicators
  ✔ Fully non-blocking & crash-safe (threaded execution with fast timeout)
"""

import os
import json
import logging
import threading
import urllib.parse
import requests

logger = logging.getLogger("slack_notifier")

# Load environment variables
SLACK_WEBHOOK_MEDICINE = os.getenv("SLACK_WEBHOOK_MEDICINE", "").strip()
SLACK_WEBHOOK_HOME_SERVICES = os.getenv("SLACK_WEBHOOK_HOME_SERVICES", "").strip()
SLACK_WEBHOOK_CUSTOM_WORK = os.getenv("SLACK_WEBHOOK_CUSTOM_WORK", "").strip()
SLACK_WEBHOOK_ALL = os.getenv("SLACK_WEBHOOK_ALL", "").strip()

TRACKING_BASE_URL = os.getenv("TRACKING_BASE_URL", "https://need2done.in").rstrip("/")

def mask_phone(phone_str: str) -> str:
    """Masks phone number: +91 98*** **321"""
    if not phone_str:
        return "N/A"
    digits = ''.join(filter(str.isdigit, str(phone_str)))
    if len(digits) >= 10:
        c10 = digits[-10:]
        return f"+91 {c10[:2]}*** **{c10[-3:]}"
    return str(phone_str)

def get_maps_link(lat, lng, address_text=None) -> str:
    """Returns a clickable Google Maps URL"""
    try:
        if lat and lng and float(lat) != 0 and float(lng) != 0:
            return f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
    except Exception:
        pass
    if address_text and str(address_text).strip():
        encoded = urllib.parse.quote(str(address_text).strip())
        return f"https://www.google.com/maps/search/?api=1&query={encoded}"
    return ""

def determine_channel_webhook(service_name: str, order_code: str = ""):
    """
    Routes an order to the correct Slack webhook URL based on service type.
    Returns (webhook_url, category_name)
    """
    svc = (service_name or "").upper().strip()
    code = (order_code or "").upper().strip()

    # 1. Medicine
    if any(k in svc for k in ["MEDICINE", "MEDICINES", "PHARMACY", "DRUG", "CHEMIST"]) or code.startswith("MED"):
        webhook = os.getenv("SLACK_WEBHOOK_MEDICINE") or SLACK_WEBHOOK_MEDICINE
        return webhook, "Medicine"

    # 2. Home Services
    if any(k in svc for k in [
        "HOME SERVICE", "HOME_SERVICE", "HOMESERVICE", "CLEANING", 
        "KITCHEN", "LAUNDRY", "CLOTH", "FLOOR", "CUSTOM PACKAGE", "DEEP CLEAN"
    ]) or code.startswith("N2D_HS") or code.startswith("HS"):
        webhook = os.getenv("SLACK_WEBHOOK_HOME_SERVICES") or SLACK_WEBHOOK_HOME_SERVICES
        return webhook, "Home Services"

    # 3. Custom Work / AnyWork / Delivery / Ride
    webhook = os.getenv("SLACK_WEBHOOK_CUSTOM_WORK") or SLACK_WEBHOOK_CUSTOM_WORK
    return webhook, "Custom Work"

def get_status_badge(status_code: str, event_type: str = None) -> tuple:
    """Returns (Emoji, Human-readable status title)"""
    s = (status_code or "").upper()
    evt = (event_type or "").upper()

    if "CANCEL" in s or "CANCEL" in evt:
        return "🔴", "Order Cancelled"
    if s in ("COMPLETED", "PAID") or evt in ("COMPLETED", "PAID"):
        return "🟢", "Order Completed & Paid"
    if "ARRIVED_AT_CUSTOMER" in s or "HELPER_ARRIVED" in s or "ARRIVED_AT_CUSTOMER" in evt:
        return "🏠", "Arrived at Customer Doorstep"
    if "BILL_IMAGE_UPLOADED" in s or "BILL" in evt:
        return "🧾", "Bill Uploaded"
    if "ITEMS_PICKED_UP" in s or "PICKED_UP" in evt:
        return "🛍️", "Items Picked Up"
    if "ARRIVED_AT_STORE" in s or "ARRIVED_AT_STORE" in evt:
        return "🏬", "Arrived at Store / Pickup"
    if "HELPER_ACCEPTED" in s or "ASSIGNED" in s or "ACCEPTED" in evt:
        return "🛵", "Helper Assigned & En Route"
    if s in ("SERVICE_STARTED", "RIDE_STARTED") or "STARTED" in evt:
        return "⏳", "Service / Ride in Progress"
    if s in ("CONFIRMED", "PLACED", "DRAFT") or evt in ("ORDER_CREATED", "NEW_ORDER"):
        return "🆕", "New Order Placed"

    return "🔔", s.replace("_", " ").title()

def format_slack_message(order_data: dict, event_type: str = None, event_note: str = None) -> str:
    """Constructs the rich formatted Slack message card."""
    order_id = order_data.get("order_id") or f"ORD-{order_data.get('id')}"
    service = order_data.get("service") or "Custom Work"
    status = order_data.get("status") or "CONFIRMED"
    
    emoji, status_title = get_status_badge(status, event_type)
    
    # Customer
    c_name = order_data.get("customer_name") or "Customer"
    c_phone_masked = mask_phone(order_data.get("customer_number"))
    
    # Helper
    h_name = order_data.get("helper_name")
    if h_name:
        helper_str = f"{h_name} (Assigned 🛵)"
    else:
        helper_str = "Auto-Broadcast / Searching for Helper 🔍"

    # Fare
    total = order_data.get("total_amount") or order_data.get("estimated_cost") or 0
    h_charge = order_data.get("helper_charge") or 0
    p_fee = order_data.get("platform_fee") or 0

    # Payload inspection
    raw_payload = order_data.get("payload")
    payload = {}
    if isinstance(raw_payload, str):
        try:
            payload = json.loads(raw_payload)
        except Exception:
            payload = {}
    elif isinstance(raw_payload, dict):
        payload = raw_payload

    # Extract Task Details based on service category
    task_details = []
    
    # Check for items list
    items = payload.get("items") or order_data.get("items_text")
    if items:
        if isinstance(items, list):
            task_details.append(", ".join(str(it) for it in items[:6]))
        elif isinstance(items, str):
            clean_items = [line.strip() for line in items.split("\n") if line.strip()]
            task_details.append(", ".join(clean_items[:6]))
            
    # Check for home services specifics
    if payload.get("serviceName"):
        svc_detail = f"{payload['serviceName']}"
        if payload.get("duration"):
            svc_detail += f" ({payload['duration']})"
        if payload.get("bookingDate") and payload.get("bookingSlot"):
            svc_detail += f" • {payload['bookingDate']} [{payload['bookingSlot']}]"
        task_details.insert(0, svc_detail)

    # Check for description or notes
    if payload.get("description"):
        task_details.append(f"Notes: {payload['description']}")

    task_str = " | ".join(task_details) if task_details else service

    # Locations
    pickup_str = payload.get("pickup_location") or payload.get("pickup") or payload.get("restaurant") or payload.get("shop_name")
    drop_str = payload.get("drop_location") or payload.get("drop") or payload.get("address")
    
    c_lat = order_data.get("customer_lat") or payload.get("customer_lat") or payload.get("drop_lat")
    c_lng = order_data.get("customer_lng") or payload.get("customer_lng") or payload.get("drop_lng")
    p_lat = payload.get("pickup_lat")
    p_lng = payload.get("pickup_lng")

    location_lines = []
    if pickup_str:
        p_map = get_maps_link(p_lat, p_lng, pickup_str)
        if p_map:
            location_lines.append(f"   📍 *Store/Pickup:* <{p_map}|{pickup_str}>")
        else:
            location_lines.append(f"   📍 *Store/Pickup:* {pickup_str}")
            
    if drop_str:
        d_map = get_maps_link(c_lat, c_lng, drop_str)
        if d_map:
            location_lines.append(f"   📍 *Customer/Drop:* <{d_map}|{drop_str}>")
        else:
            location_lines.append(f"   📍 *Customer/Drop:* {drop_str}")
    elif c_lat and c_lng:
        d_map = get_maps_link(c_lat, c_lng)
        location_lines.append(f"   📍 *Customer Location:* <{d_map}|Open in Google Maps>")

    location_section = "\n".join(location_lines) if location_lines else "   📍 Location: Provided via GPS / In-chat"

    # Track URL
    track_url = f"{TRACKING_BASE_URL}/track/{order_id}"

    # Build Final Message
    header_title = f"{emoji} *[{status_title.upper()}]* `#{order_id}`"
    if event_note and event_note != status_title:
        header_title += f" — _{event_note}_"

    lines = [
        header_title,
        f"• *Service:* {service}",
        f"• *Task Details:* {task_str}",
        f"• *Customer:* {c_name} (Masked: {c_phone_masked})",
        f"• *Helper:* {helper_str}",
        f"• *Status:* {emoji} {status_title}",
        f"• *Location:*\n{location_section}",
        f"• *Fare:* ₹{total} (Helper: ₹{h_charge} | Platform: ₹{p_fee})",
        f"🔗 *Live Track:* <{track_url}|{track_url}>"
    ]

    return "\n".join(lines)

def _send_http_post(url: str, text: str):
    """Sends webhook payload with timeout and error handling."""
    if not url or not url.startswith("http"):
        return
    try:
        resp = requests.post(
            url,
            json={"text": text},
            headers={"Content-Type": "application/json"},
            timeout=4
        )
        if resp.status_code != 200:
            logger.warning(f"Slack webhook returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Failed to post to Slack webhook: {e}")

def notify_slack_order(order_id_or_int, event_type: str = None, event_note: str = None):
    """
    Central function to dispatch Slack order status notifications.
    Asynchronous and safe to call from any flow.
    """
    def _worker():
        from db.mysql_conn import get_db
        db = get_db()
        if not db:
            return
        cur = db.cursor(dictionary=True)
        try:
            # Query order by INT id or string order_id
            if isinstance(order_id_or_int, int) or (isinstance(order_id_or_int, str) and order_id_or_int.isdigit()):
                cur.execute("""
                    SELECT o.*, h.name as helper_name, h.phone as helper_phone_db,
                           ot.items_text
                    FROM orders o
                    LEFT JOIN helpers h ON o.helper_id = h.id
                    LEFT JOIN order_tasks ot ON o.id = ot.order_id
                    WHERE o.id = %s
                """, (int(order_id_or_int),))
            else:
                cur.execute("""
                    SELECT o.*, h.name as helper_name, h.phone as helper_phone_db,
                           ot.items_text
                    FROM orders o
                    LEFT JOIN helpers h ON o.helper_id = h.id
                    LEFT JOIN order_tasks ot ON o.id = ot.order_id
                    WHERE o.order_id = %s
                """, (str(order_id_or_int),))

            order = cur.fetchone()
            if not order:
                return

            # Determine routing
            service = order.get("service") or ""
            order_code = order.get("order_id") or ""
            target_webhook, category = determine_channel_webhook(service, order_code)

            # Format message
            msg_text = format_slack_message(order, event_type, event_note)

            # Send to dedicated category webhook
            if target_webhook:
                _send_http_post(target_webhook, msg_text)

            # Optionally also send to master channel if configured
            master_webhook = os.getenv("SLACK_WEBHOOK_ALL") or SLACK_WEBHOOK_ALL
            if master_webhook and master_webhook != target_webhook:
                _send_http_post(master_webhook, msg_text)

        except Exception as e:
            logger.error(f"Error in notify_slack_order: {e}")
        finally:
            cur.close()
            db.close()

    # Fire in background thread so caller never waits
    t = threading.Thread(target=_worker, daemon=True)
    t.start()
