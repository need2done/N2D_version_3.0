import time
import json
import logging
from datetime import datetime, timedelta

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
            s_lower = service.lower()
            filtered_helpers = []
            for h in helpers:
                cat = (h.get('category') or '').upper()
                if cat in ('BOTH', 'TASK'):
                    filtered_helpers.append(h)
                elif cat == 'FOOD' and 'food' in s_lower:
                    filtered_helpers.append(h)
                elif cat == 'VEG_FRUITS' and ('veg' in s_lower or 'fruit' in s_lower):
                    filtered_helpers.append(h)
                elif cat == 'MEDICINES' and 'medicine' in s_lower:
                    filtered_helpers.append(h)
                elif cat == 'ANYWORK' and 'anywork' in s_lower:
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
        logger.info("Running auto-assigner cycle...")
        now = datetime.now()

        # =======================================================
        # 0. UNASSIGNED VENDOR AUTO-BROADCAST (First Pick)
        # =======================================================
        cur.execute("""
            SELECT id, order_id, service, engine_type, status, vendor_id, vendor_status, payload, updated_at
            FROM orders
            WHERE (vendor_id IS NULL OR vendor_status = 'UNASSIGNED' OR vendor_status IS NULL)
              AND engine_type = 'TASK'
              AND status IN ('CONFIRMED', 'ADMIN_APPROVED_BILL', 'PLACED', 'PACKED', 'BILL_SENT', 'PENDING', 'DRAFT')
              AND status NOT IN ('CANCELLED', 'COMPLETED', 'EXPIRED')
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
        # 2. HELPER RADIUS EXPANSION (Every minute)
        # =======================================================
        cur.execute("""
            SELECT id, order_id, engine_type, status, vendor_status, customer_lat, customer_lng, service, payload, updated_at
            FROM orders
            WHERE (
                vendor_status = 'PACKED' 
                OR (engine_type = 'RIDE' AND status IN ('CONFIRMED', 'PENDING')) 
                OR (vendor_status IS NULL AND status IN ('CONFIRMED', 'ADMIN_APPROVED_BILL', 'PLACED', 'PACKED', 'BILL_SENT', 'PENDING')) 
                OR (vendor_status = 'UNASSIGNED' AND status IN ('CONFIRMED', 'ADMIN_APPROVED_BILL', 'PLACED', 'PACKED', 'BILL_SENT', 'PENDING'))
                OR (vendor_status = 'ACCEPTED' AND status IN ('CONFIRMED', 'ADMIN_APPROVED_BILL', 'PLACED', 'PACKED', 'BILL_SENT', 'PENDING'))
            )
            AND helper_id IS NULL
            AND status NOT IN ('CANCELLED', 'COMPLETED', 'EXPIRED')
        """)
        unassigned_orders = cur.fetchall()

        for order in unassigned_orders:
            updated_at = order['updated_at'] or now
            elapsed = (now - updated_at).total_seconds() / 60.0
            
            radius = 2
            if elapsed >= 7:
                radius = 10
            elif elapsed >= 4:
                radius = 5

            logger.info(f"Order {order['order_id']} unassigned for {elapsed:.1f} mins. Broadcasting to radius {radius}km")
            
            c_lat = order.get('customer_lat')
            c_lng = order.get('customer_lng')
            pdata = {}
            if order.get('payload'):
                try:
                    pdata = json.loads(order['payload']) if isinstance(order['payload'], str) else order['payload']
                except Exception:
                    pdata = {}
            
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
                    f"📍 Distance: {dist_str}\n\n"
                    "Tap below to accept or reject (First Come, First Served)."
                )
                from core.order_finalizer import send_helper_auto_assign
                send_helper_auto_assign(h['phone'], order['order_id'], msg)


    except Exception as e:
        logger.error(f"Error in auto assigner: {e}")
    finally:
        cur.close()
        db.close()

if __name__ == "__main__":
    logger.info("Starting Auto-Assigner daemon...")
    while True:
        run_auto_assigner()
        time.sleep(60)
