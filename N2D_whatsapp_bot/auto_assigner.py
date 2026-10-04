import os
import time
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import dotenv_values

from db.mysql_conn import get_db
from whatsapp_client import send_reply_buttons, send_message
from db.order_repo import get_auto_assign_vendor, assign_vendor
from utils.distance import calculate_distance

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

def get_message_trigger_interval() -> int:
    """
    Returns message trigger interval in seconds from .env or os.getenv.
    Defaults to 2 minutes (120 seconds).
    """
    try:
        env_file = Path(__file__).resolve().parent.parent / ".env"
        if env_file.exists():
            data = dotenv_values(env_file)
            val = data.get("MESSAGE_TRIGGER_INTERVAL_MINS")
            if val is not None and str(val).strip():
                mins = float(str(val).strip())
                return max(30, int(mins * 60))
    except Exception:
        pass
    try:
        val = os.getenv("MESSAGE_TRIGGER_INTERVAL_MINS", "2")
        mins = float(str(val).strip())
        return max(30, int(mins * 60))
    except Exception:
        return 120

def format_order_broadcast_timing(order, pdata=None):
    """
    Returns (timing_lines, is_old_order)
    - Formats clear date & time: Today, Tomorrow, scheduled date/slot, or placed timestamp.
    - Accurately detects and flags old/stale/expired orders so they are not broadcasted.
    """
    now = datetime.now()
    today = now.date()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    if pdata is None:
        pdata = {}
        if order.get('payload'):
            try:
                pdata = json.loads(order['payload']) if isinstance(order['payload'], str) else (order['payload'] or {})
            except Exception:
                pdata = {}

    timing_lines = ""
    is_old = False

    # Check for Home Services or Scheduled appointments
    booking_date_str = pdata.get('bookingDate') or pdata.get('booking_date') or pdata.get('scheduled_date')
    booking_slot = pdata.get('bookingSlot') or pdata.get('booking_slot') or pdata.get('scheduled_time') or ''

    if booking_date_str:
        try:
            b_date = datetime.strptime(str(booking_date_str).strip()[:10], "%Y-%m-%d").date()
            slot_display = f" at {booking_slot}" if booking_slot else ""
            
            if b_date < today:
                # Scheduled appointment was in the past! Old order.
                is_old = True
                date_label = f"{b_date.strftime('%d %b %Y')}{slot_display} (Past Date ⚠️)"
            elif b_date == today:
                # Check if slot passed earlier today
                if booking_slot:
                    try:
                        slot_dt = datetime.strptime(f"{b_date} {booking_slot.strip()}", "%Y-%m-%d %I:%M %p")
                        if (now - slot_dt).total_seconds() > 2 * 3600:
                            is_old = True
                    except Exception:
                        pass
                date_label = f"Today ({b_date.strftime('%d %b')}){slot_display}"
            elif b_date == tomorrow:
                date_label = f"Tomorrow ({b_date.strftime('%d %b')}){slot_display}"
            else:
                date_label = f"{b_date.strftime('%a, %d %b %Y')}{slot_display}"

            timing_lines += f"📅 Scheduled: *{date_label}*\n"
        except Exception:
            timing_lines += f"📅 Scheduled: *{booking_date_str} {booking_slot}*\n"

    # Order creation date & time
    created_at = order.get('created_at')
    if created_at:
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', ''))
            except Exception:
                created_at = None

    if created_at:
        c_date = created_at.date()
        c_time_str = created_at.strftime('%I:%M %p').lstrip('0')
        age_hours = (now - created_at).total_seconds() / 3600.0

        if not booking_date_str:
            # For non-scheduled instant orders, filter out old orders older than max age
            max_age = float(os.getenv("MAX_ORDER_BROADCAST_AGE_HOURS", 24))
            if age_hours > max_age:
                is_old = True

        if c_date == today:
            if age_hours < 0.25:  # Placed within 15 mins
                created_label = f"Today, {c_time_str} (New 🟢)"
            else:
                created_label = f"Today, {c_time_str}"
        elif c_date == yesterday:
            created_label = f"Yesterday, {c_time_str}"
        else:
            created_label = f"{c_date.strftime('%d %b %Y')}, {c_time_str}"

        if booking_date_str:
            timing_lines += f"🕒 Booked On: {created_label}\n"
        else:
            timing_lines += f"📅 Order Date: *{created_label}*\n"
    elif not booking_date_str:
        timing_lines += f"📅 Order Date: *Today*\n"

    return timing_lines, is_old

def format_order_item_details(order, pdata):
    """Formats details / items summary for helper message."""
    if pdata.get('serviceName'):
        dur = f" ({pdata['duration']})" if pdata.get('duration') else ""
        return f"📝 Task: {pdata['serviceName']}{dur}\n"
    elif pdata.get('items'):
        items_raw = pdata['items']
        if isinstance(items_raw, list):
            items_preview = ", ".join([str(it).replace('•', '').strip() for it in items_raw[:3]])
            if len(items_raw) > 3:
                items_preview += f" (+{len(items_raw)-3} more)"
        else:
            items_preview = str(items_raw)[:60]
        if items_preview:
            return f"🛍️ Items: {items_preview}\n"
    elif pdata.get('task_description'):
        desc = str(pdata['task_description'])[:60]
        return f"📝 Task: {desc}\n"
    return ""

def find_nearest_helpers(customer_lat, customer_lng, radius_km, engine_type='TASK', service=None):
    """Find ONLINE/AVAILABLE helpers within radius."""
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        if engine_type == 'TASK':
            category_filter = "('TASK', 'BOTH', 'FOOD', 'VEG_FRUITS', 'MEDICINES', 'ANYWORK', 'HOME_SERVICES')"
        else:
            category_filter = "('RIDE', 'BOTH')"

        cur.execute(f"""
            SELECT h.id, h.name, h.phone, h.category, hs.latitude as lat, hs.longitude as lng 
            FROM helpers h
            JOIN helper_status hs ON h.id = hs.helper_id
            WHERE (h.status IN ('ONLINE', 'Active') OR hs.status IN ('AVAILABLE', 'ONLINE'))
              AND (h.wallet_balance >= 0 OR h.wallet_balance IS NULL)
              AND h.category IN {category_filter}
        """)
        helpers = cur.fetchall()

        if service and engine_type == 'TASK':
            s_lower = service.lower().replace(" ", "")
            filtered_helpers = []
            for h in helpers:
                cat = (h.get('category') or '').upper()
                if cat in ('BOTH', 'TASK', 'ALL', 'GENERAL', 'DELIVERY'):
                    filtered_helpers.append(h)
                elif cat == 'FOOD' and 'food' in s_lower:
                    filtered_helpers.append(h)
                elif cat == 'VEG_FRUITS' and ('veg' in s_lower or 'fruit' in s_lower):
                    filtered_helpers.append(h)
                elif cat == 'MEDICINES' and 'medicine' in s_lower:
                    filtered_helpers.append(h)
                elif cat == 'ANYWORK' and ('anywork' in s_lower or 'parcel' in s_lower or 'custom' in s_lower):
                    filtered_helpers.append(h)
                elif cat == 'GROCERIES' and 'grocer' in s_lower:
                    filtered_helpers.append(h)
                elif cat == 'HOME_SERVICES' and ('home' in s_lower or 'service' in s_lower) and 'food' not in s_lower:
                    filtered_helpers.append(h)
            helpers = filtered_helpers
        
        near_helpers = []
        for h in helpers:
            if h.get('lat') is not None and h.get('lng') is not None and customer_lat is not None and customer_lng is not None:
                try:
                    c_lat = float(customer_lat)
                    c_lng = float(customer_lng)
                    h_lat = float(h['lat'])
                    h_lng = float(h['lng'])
                    dist = calculate_distance(c_lat, c_lng, h_lat, h_lng)
                    if dist <= radius_km:
                        h['distance'] = dist
                        near_helpers.append(h)
                except Exception:
                    h['distance'] = 0.0
                    near_helpers.append(h)
            else:
                # If order or helper lat/lng is missing, include helper so order offer is not lost
                h['distance'] = 0.0
                near_helpers.append(h)
        return near_helpers
    finally:
        cur.close()
        db.close()

def run_auto_assigner():
    db = get_db()
    cur = db.cursor(dictionary=True)
    
    try:
        logger.debug("Running auto-assigner cycle...")
        now = datetime.now()

        # =======================================================
        # 0. UNASSIGNED VENDOR AUTO-BROADCAST (First Pick)
        # =======================================================
        cur.execute("""
            SELECT id, order_id, service, engine_type, status, vendor_id, vendor_status, payload, updated_at, created_at
            FROM orders
            WHERE (vendor_id IS NULL OR vendor_status = 'UNASSIGNED' OR vendor_status IS NULL)
              AND engine_type = 'TASK'
              AND status IN ('CONFIRMED', 'ADMIN_APPROVED_BILL', 'PLACED', 'PACKED', 'BILL_SENT', 'PENDING')
              AND status NOT IN ('CANCELLED', 'COMPLETED', 'EXPIRED')
              AND service NOT IN ('Medicines', 'Any Work', 'Parcel', 'Support', 'Home Services')
              AND (created_at IS NULL OR created_at >= NOW() - INTERVAL 24 HOUR)
        """)
        unassigned_vendor_orders = cur.fetchall()

        for order in unassigned_vendor_orders:
            from db.order_repo import get_vendors_by_category, update_vendor_status
            service_cat = order.get('service') or 'Groceries'
            
            pdata = {}
            if order.get('payload'):
                try:
                    pdata = json.loads(order['payload']) if isinstance(order['payload'], str) else order['payload']
                except Exception:
                    pdata = {}

            vendors = get_vendors_by_category(service_cat, shop_name=pdata.get("restaurant"))
            if vendors:
                logger.info(f"🏬 AUTO-BROADCAST VENDOR (DAEMON): Broadcasting Order {order['order_id']} to {len(vendors)} vendors in category {service_cat}")
                update_vendor_status(order['order_id'], "PENDING")
                
                items_list = pdata.get("items", [])
                if not items_list:
                    # Fetch from cart_items table if available
                    cur.execute("SELECT product_name, quantity, unit FROM cart_items WHERE order_id = %s", (order['order_id'],))
                    c_items = cur.fetchall()
                    if c_items:
                        items_list = [f"• {ci['product_name']} ({ci['quantity']} {ci['unit'] or ''})" for ci in c_items]

                items_text = "\n".join(items_list) if items_list else "N/A"
                vendor_msg = (
                    f"📦 *New Order Offer! (First Pick)*\n\n"
                    f"🆔 Order ID : {order['order_id']}\n"
                    f"🛠️ Service  : {service_cat}\n\n"
                    f"🛍️ *Items to Pack:*\n{items_text}\n\n"
                    f"Tap Accept below to claim & confirm this order."
                )
                from whatsapp_client import send_reply_buttons
                for v in vendors:
                    if v.get("phone"):
                        send_reply_buttons(v["phone"], vendor_msg, [
                            {"id": f"VENDOR_ACCEPT|{order['order_id']}", "title": "✅ Accept"},
                            {"id": f"VENDOR_REJECT|{order['order_id']}", "title": "❌ Reject"}
                        ])

        # =======================================================
        # 1. VENDOR REMINDER & RE-ASSIGNMENT (Every minute)
        # =======================================================
        cur.execute("""
            SELECT id, order_id, vendor_id, vendor_status, customer_lat, customer_lng, service, payload, updated_at
            FROM orders
            WHERE vendor_status = 'PENDING' AND vendor_id IS NOT NULL
              AND status NOT IN ('CANCELLED', 'COMPLETED', 'EXPIRED', 'DELIVERED', 'REJECTED')
        """)
        pending_vendor_orders = cur.fetchall()

        for order in pending_vendor_orders:
            updated_at = order['updated_at']
            if not updated_at:
                continue

            elapsed = (now - updated_at).total_seconds() / 60.0

            if elapsed >= 5:
                # Re-assign vendor
                logger.info(f"Vendor {order['vendor_id']} for order {order['order_id']} didn't respond in 5 mins. Re-assigning.")
                cur.execute("SELECT * FROM vendors WHERE service_category=%s AND auto_assign=1 AND status='Active' AND id != %s", 
                            (order['service'], order['vendor_id']))
                other_vendors = cur.fetchall()
                if other_vendors:
                    if order.get('customer_lat') and order.get('customer_lng'):
                        for v in other_vendors:
                            v['distance'] = calculate_distance(order['customer_lat'], order['customer_lng'], v.get('lat'), v.get('lng'))
                        other_vendors.sort(key=lambda x: x.get('distance', float('inf')))
                    
                    next_vendor = other_vendors[0]
                    assign_vendor(order['id'], next_vendor['id'])
                    logger.info(f"Assigned new vendor {next_vendor['id']} to {order['order_id']}")
                    
                    items_text = ""
                    try:
                        data = json.loads(order.get("payload", "{}"))
                        items_text = "\n".join(data.get("items", [])) if data.get("items") else "N/A"
                    except Exception:
                        items_text = "N/A"
                        
                    vendor_msg = (
                        f"📦 *New Order Pickup!*\n\n"
                        f"🆔 Order ID : {order['order_id']}\n"
                        f"🛠️ Service  : {order.get('service', 'Groceries')}\n\n"
                        f"🛍️ *Items to Pack:*\n{items_text}\n\n"
                        f"Please accept or reject to confirm item availability."
                    )
                    send_reply_buttons(next_vendor["phone"], vendor_msg, [
                        {"id": f"VENDOR_ACCEPT|{order['order_id']}", "title": "✅ Accept"},
                        {"id": f"VENDOR_REJECT|{order['order_id']}", "title": "❌ Reject"}
                    ])
                else:
                    # No other vendor found, update status to UNASSIGNED so loop doesn't trigger every 30s
                    cur.execute("UPDATE orders SET vendor_status = 'UNASSIGNED', updated_at = NOW() WHERE id = %s", (order['id'],))
                    db.commit()
                    logger.info(f"No alternative vendor found for order {order['order_id']}. Set vendor_status='UNASSIGNED'.")
                    
            elif elapsed >= 2 and elapsed < 3:
                logger.info(f"Sending 2-min reminder to vendor {order['vendor_id']} for order {order['order_id']}")
                cur.execute("SELECT phone FROM vendors WHERE id=%s", (order['vendor_id'],))
                v_row = cur.fetchone()
                if v_row:
                    send_reply_buttons(v_row['phone'], f"⏳ Reminder: Please Accept or Reject Order {order['order_id']} quickly!", [
                        {"id": f"VENDOR_ACCEPT|{order['order_id']}", "title": "✅ Accept"},
                        {"id": f"VENDOR_REJECT|{order['order_id']}", "title": "❌ Reject"}
                    ])

        # =======================================================
        # 2. HELPER AUTO ASSIGNMENT & RADIUS EXPANSION
        # =======================================================
        cur.execute("""
            SELECT id, order_id, engine_type, status, vendor_status, customer_lat, customer_lng, service, payload, updated_at, created_at
            FROM orders
            WHERE (
                vendor_status IN ('PACKED', 'ACCEPTED', 'UNASSIGNED', 'NONE', '')
                OR vendor_status IS NULL 
                OR engine_type = 'RIDE'
                OR service IN ('Any Work', 'Parcel', 'Support', 'Home Services')
            )
            AND helper_id IS NULL
            AND status NOT IN ('CANCELLED', 'COMPLETED', 'EXPIRED', 'DELIVERED', 'DRAFT')
            AND (created_at IS NULL OR created_at >= NOW() - INTERVAL 7 DAY)
        """)
        unassigned_orders = cur.fetchall()

        for order in unassigned_orders:
            updated_at = order['updated_at'] or now
            elapsed = (now - updated_at).total_seconds() / 60.0
            
            radius = 10
            if elapsed >= 7:
                radius = 50
            elif elapsed >= 4:
                radius = 25

            c_lat = order.get('customer_lat')
            c_lng = order.get('customer_lng')
            pdata = {}
            if order.get('payload'):
                try:
                    pdata = json.loads(order['payload']) if isinstance(order['payload'], str) else order['payload']
                except Exception:
                    pdata = {}

            # Filter old/stale orders & format clear date/time
            timing_lines, is_old = format_order_broadcast_timing(order, pdata)
            if is_old:
                logger.info(f"⏭️ Skipping old/past order {order['order_id']} ({order['service']}) from helper broadcast.")
                continue

            details_line = format_order_item_details(order, pdata)
            
            if (c_lat is None or c_lng is None or float(c_lat or 0) == 0) and pdata:
                c_lat = pdata.get('customer_lat') or pdata.get('lat') or pdata.get('pickup_lat')
                c_lng = pdata.get('customer_lng') or pdata.get('lng') or pdata.get('pickup_lng')
                if (not c_lat or not c_lng) and pdata.get('address'):
                    try:
                        from utils.geocoding import geocode_address
                        g_lat, g_lng, _ = geocode_address(pdata['address'], ref_lat=17.5113, ref_lng=78.8899)
                        if g_lat and g_lng:
                            c_lat, c_lng = g_lat, g_lng
                    except Exception:
                        pass

            helpers = find_nearest_helpers(c_lat, c_lng, radius, order['engine_type'], service=order.get('service'))
            if helpers:
                logger.info(f"🚀 HELPER AUTO-ASSIGN: Broadcasting Order {order['order_id']} ({order['service']}) to {len(helpers)} nearby helpers within {radius}km radius.")
            
            for h in helpers:
                dist_val = h.get('distance', 0.0)
                if dist_val and dist_val > 0.05:
                    dist_str = f"{round(dist_val, 1)} km away"
                else:
                    dist_str = "N/A"

                msg = (
                    f"📦 *New Order Available!*\n\n"
                    f"🆔 Order : {order['order_id']}\n"
                    f"🛠 Service: {order['service']}\n"
                    f"{details_line}"
                    f"{timing_lines}"
                    f"📍 Distance: {dist_str}\n\n"
                    "Tap below to accept or reject (First Come, First Served)."
                )
                from whatsapp_client import send_helper_auto_assign
                send_helper_auto_assign(h['phone'], order['order_id'], msg)


    except Exception as e:
        logger.error(f"Error in auto assigner: {e}")
    finally:
        cur.close()
        db.close()

if __name__ == "__main__":
    interval = get_message_trigger_interval()
    logger.info(f"Starting Auto-Assigner daemon ({interval // 60}m interval)...")
    while True:
        run_auto_assigner()
        sleep_sec = get_message_trigger_interval()
        time.sleep(sleep_sec)
