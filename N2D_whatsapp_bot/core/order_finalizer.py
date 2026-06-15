"""
=================================================
GramioGO – Order Finalizer (GPS + TRACKING SAFE)
=================================================
"""

import logging
import uuid
import json
import traceback

from db.mysql_conn import get_db
from whatsapp_client import send_admin_new_order_with_assign_refresh, send_helper_auto_assign
from config import ADMIN_NUMBER
from utils.tracking_link import generate_helper_tracking_link
from admin_v2.sync_service import sync_new_order
from utils.location import haversine
from db.helper_repo import get_available_helpers

logger = logging.getLogger("N2D_Bot")

# =================================================
# 🛰️ FIND NEAREST HELPERS
# =================================================
def find_nearest_helpers(lat, lng, radius_km=5, engine_type='TASK'):
    """
    Returns list of helpers within radius_km and correct category.
    Fallback to 50km if no one found in initial radius.
    """
    try:
        if lat is None or lng is None:
            return []
            
        available = get_available_helpers(engine_type)
        logger.info(f"🛰️ FIND_NEAR: Found {len(available)} online helpers for engine {engine_type}")
        
        def _get_near(target_radius):
            near = []
            for h in available:
                h_lat = h.get('latitude')
                h_lng = h.get('longitude')
                if h_lat and h_lng:
                    dist = haversine(float(lat), float(lng), float(h_lat), float(h_lng))
                    logger.info(f"🛰️ CHECKING Helper {h['phone']}: dist={round(dist, 2)}km (target: {target_radius}km)")
                    if dist <= target_radius:
                        h['distance'] = dist
                        near.append(h)
                else:
                    logger.warning(f"🛰️ Helper {h['phone']} has NO GPS data.")
            near.sort(key=lambda x: x['distance'])
            return near


        results = _get_near(radius_km)
        if not results and radius_km < 50:
            logger.info(f"🛰️ NO HELPERS within {radius_km}km. Expanding search to 50km.")
            results = _get_near(50)
            
        return results
    except Exception:
        logger.error("Error in find_nearest_helpers")
        traceback.print_exc()
        return []


# =================================================
# 🧾 FINALIZE ORDER
# =================================================
def finalize_order(session: dict) -> str | None:

    if not isinstance(session, dict):
        logger.error("ERROR: INVALID SESSION")
        return None

    db = None
    cur = None
    order_code = None
    order_db_id = None

    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        db.start_transaction()

        # -------------------------------
        # SESSION DATA
        # -------------------------------
        user_phone = session.get("user_id")
        name = session.get("name", "Unknown")
        service_id = session.get("service")
        data = session.get("data", {}) or {}
        
        # Sync pickup locations into data payload so it is written to the orders table payload JSON
        if session.get("pickup_latitude") and session.get("pickup_longitude"):
            data["pickup_lat"] = session.get("pickup_latitude")
            data["pickup_lng"] = session.get("pickup_longitude")
            data["anywork_type"] = data.get("anywork_type") or "PICK_DROP"

        customer_lat = session.get("latitude") or data.get("pickup_lat")
        customer_lng = session.get("longitude") or data.get("pickup_lng")
        estimated_cost = data.get("cost")


        # -------------------------------
        # CUSTOMER UPSERT
        # -------------------------------
        cur.execute(
            "SELECT id FROM customers WHERE phone=%s FOR UPDATE",
            (user_phone,)
        )
        row = cur.fetchone()

        if row:
            customer_id = row["id"]
            cur.execute(
                "UPDATE customers SET name=%s WHERE id=%s",
                (name, customer_id)
            )
        else:
            cur.execute(
                "INSERT INTO customers(phone, name) VALUES(%s,%s)",
                (user_phone, name)
            )
            customer_id = cur.lastrowid

        # -------------------------------
        # CREATE ORDER
        # -------------------------------
        order_code = "N2D" + uuid.uuid4().hex[:5].upper()

        # Determine Engine Type
        engine = 'RIDE' if service_id == 4 else 'TASK'

        # 🚨 FIX: Handle 'TBD' for database DECIMAL column
        db_estimated_cost = estimated_cost
        if str(db_estimated_cost).upper() == 'TBD':
            db_estimated_cost = 0.0

        cur.execute(
            """
            INSERT INTO orders (
                order_id,
                engine_type,
                customer_id,
                customer_number,
                customer_name,
                service,
                payload,
                total_amount,
                status,
                payment_status,
                customer_lat,
                customer_lng,
                created_at
            )
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,
                'CONFIRMED',
                'PENDING',
                %s,%s,
                NOW()
            )
            """,
            (
                order_code,
                engine,
                customer_id,
                user_phone,
                name,
                service_name(service_id),
                json.dumps(data, ensure_ascii=False),
                db_estimated_cost,
                customer_lat,
                customer_lng
            )
        )

        order_db_id = cur.lastrowid

        # -------------------------------
        # ENGINE SPECIFIC DATA
        # -------------------------------
        if engine == 'TASK':
            # Save to order_tasks
            cur.execute(
                """
                INSERT INTO order_tasks (order_id, items_text, bill_amount)
                VALUES (%s, %s, %s)
                """,
                (order_db_id, "\n".join(data.get("items", [])), db_estimated_cost)
            )
            
            # Legacy item loop for compatibility
            for item in data.get("items", []):
                cur.execute(
                    "INSERT INTO order_items (order_id, item_text) VALUES (%s,%s)",
                    (order_db_id, item)
                )
        else:
            # Save to order_rides
            cur.execute(
                """
                INSERT INTO order_rides (
                    order_id, pickup_lat, pickup_lng, drop_lat, drop_lng, 
                    vehicle_type, start_otp, end_otp
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    order_db_id, 
                    data.get('pickup_lat'), data.get('pickup_lng'),
                    data.get('drop_lat'), data.get('drop_lng'),
                    data.get('vehicle', 'BIKE'),
                    data.get('start_otp'), data.get('end_otp')
                )
            )

        # -------------------------------
        # ORDER IMAGES
        # -------------------------------
        for media_id in data.get("images", []):
            cur.execute(
                """
                INSERT INTO order_images (
                    order_id,
                    media_id,
                    image_type,
                    uploaded_by
                )
                VALUES (%s,%s,'ITEM','CUSTOMER')
                """,
                (order_db_id, media_id)
            )

        # -------------------------------
        # ✅ COMMIT ORDER
        # -------------------------------
        db.commit()
        logger.info(f"SUCCESS: ORDER FINALIZED: {order_code}")

        # =================================================
        # 🔥 SYNC TO ADMIN DB (CORRECT PLACE)
        # =================================================
        try:
            logger.info(f"LOG: SYNCING TO ADMIN DB: {order_db_id}")

            # Calculate fees for the dashboard
            p_fee = 0
            h_charge = 0
            surge_bonus = data.get("breakdown_surge", 0)
            
            if engine == "RIDE":
                # Get Commission Percent
                from config import get_live_pricing
                advanced = get_live_pricing().get("ADVANCED_PRICING", {})
                comm_pct = float(advanced.get("COMMISSION_PERCENT", 15))
                
                # Total Bill (Estimated Cost)
                total_bill = float(db_estimated_cost or 0)
                
                # Platform gets commission % of the total bill
                p_fee = round(total_bill * (comm_pct / 100.0), 2)
                
                # Helper gets the rest + any admin-paid surge
                h_charge = round(total_bill - p_fee, 2) + surge_bonus
            else:
                # For tasks, calculate distance-based pricing using the nearest helper
                from config import PLATFORM_FEE as PF, HELPER_CHARGE as HC
                
                # Default to base charges
                p_fee = PF
                h_charge = HC
                
                # Check if it is AnyWork (service_id = 3 or 5)
                is_anywork = service_id in (3, 5)
                anywork_type = data.get("anywork_type")

                if is_anywork and anywork_type == "PICK_DROP" and session.get("pickup_latitude") and session.get("latitude"):
                    # Calculate route distance between Pickup and Drop coordinates
                    try:
                        p_lat = float(session.get("pickup_latitude"))
                        p_lng = float(session.get("pickup_longitude"))
                        d_lat = float(session.get("latitude"))
                        d_lng = float(session.get("longitude"))
                        
                        route_dist = haversine(p_lat, p_lng, d_lat, d_lng)
                        
                        # Dynamic pricing: Base Helper Fee (HC = 20) + (Route Distance * ₹12/km)
                        h_charge = round(HC + (route_dist * 12.0), 2)
                        
                        # Cap the helper charge for a standard errand at ₹250
                        h_charge = min(h_charge, 250.0)
                        
                        logger.info(f"💰 Dynamic AnyWork Pick & Drop Pricing: Route Dist = {route_dist:.2f} km -> Helper Charge = ₹{h_charge}")
                    except Exception as e:
                        logger.error(f"Error calculating dynamic AnyWork Pick & Drop pricing: {e}")
                else:
                    # Single location AnyWork or Standard Groceries/Medicines task
                    # If we found nearby helpers, use the distance of the closest one to adjust the charge
                    # This ensures Task pricing is also dynamic and not 'the same for all orders'
                    try:
                        # Look up nearest helpers again specifically for pricing if not already available
                        # Or reuse results from auto-assign logic (which runs later, so we calculate here)
                        temp_helpers = find_nearest_helpers(customer_lat, customer_lng, radius_km=5, engine_type='TASK')
                        if temp_helpers:
                            nearest_dist = temp_helpers[0].get('distance', 0)
                            # Add ₹10 per km after the first 2km, or just a small per-km increment
                            # h_charge = round(HC + (max(0, nearest_dist - 2) * 10), 2)
                            # To keep it simple but dynamic:
                            h_charge = round(HC + (nearest_dist * 5), 2)
                            # Ensure h_charge doesn't get too crazy
                            h_charge = min(h_charge, 200) 
                            
                    except Exception:
                        logger.error("Error calculating dynamic task pricing")

                # Apply Surge for TASK / ANYWORK
                active_surges_str = get_live_pricing().get("ACTIVE_SURGES", "[]") if 'get_live_pricing' in globals() else "[]"
                # Actually, config is imported above
                from config import get_live_pricing
                pricing = get_live_pricing()
                active_surges_str = pricing.get("ACTIVE_SURGES", "[]")
                try:
                    surges = json.loads(active_surges_str)
                except:
                    surges = []
                    
                surge_amount = 0
                for surge in surges:
                    # RIDE is handled above, so here we apply TASK or ANYWORK surge based on the actual service
                    # We can assume 'TASK' for all non-ride engines initially or match exactly
                    if surge.get("service") in ("TASK", "ANYWORK"):
                        # If we have a specific service name match (e.g. engine == "TASK")
                        surge_amount += float(surge.get("amount", 0))

                h_charge += surge_amount


            sync_new_order({
                "order_id": order_code,
                "customer_name": name,
                "customer_number": user_phone,
                "engine_type": engine,
                "customer_lat": customer_lat,
                "customer_lng": customer_lng,
                "service": service_name(service_id),
                "total_amount": db_estimated_cost,
                "platform_fee": p_fee,
                "helper_charge": h_charge,
                "status": "CONFIRMED"
            })

            logger.info("SUCCESS: ADMIN SYNC SUCCESS")

        except Exception:
            logger.error("ERROR: ADMIN SYNC FAILED")
            traceback.print_exc()

    except Exception:
        if db:
            db.rollback()
        logger.error("ERROR: ORDER FINALIZATION FAILED")
        traceback.print_exc()
        return None

    finally:
        if cur:
            cur.close()
        if db:
            db.close()

    # =================================================
    # 📢 NOTIFY ADMIN VIA WHATSAPP
    # =================================================
    try:
        items_text = "\n".join(data.get("items", [])) if data.get("items") else "N/A"
        maps_link = f"https://maps.google.com/?q={customer_lat},{customer_lng}" if customer_lat and customer_lng else "Not shared"

        send_admin_new_order_with_assign_refresh(
            to=ADMIN_NUMBER,
            order_id=order_code,
            customer_name=name,
            customer_phone=user_phone,
            service=service_name(service_id),
            items_text=items_text,
            maps_link=maps_link,
            estimated_cost=str(estimated_cost or "TBD")
        )
        logger.info("SUCCESS: ADMIN NOTIFIED VIA WHATSAPP")
    except Exception:
        logger.error("ERROR: ADMIN WHATSAPP NOTIFICATION FAILED")
        traceback.print_exc()

    # =================================================
    # 🛰️ AUTO ASSIGN TO NEARBY HELPERS (5KM -> 50KM)
    # =================================================

    try:
        engine = 'RIDE' if service_id == 4 else 'TASK'
        near_helpers = find_nearest_helpers(customer_lat, customer_lng, radius_km=5, engine_type=engine)
        
        if near_helpers:
            logger.info(f"🛰️ AUTO-ASSIGN: Found {len(near_helpers)} helpers nearby.")
            for idx, h in enumerate(near_helpers):
                items_preview = ""
                if engine == 'TASK':
                    items_list = "\n".join([f"• {item}" for item in data.get("items", [])])
                    items_preview = f"🛍️ Items:\n{items_list}\n\n"
                
                bill_preview = ""
                if estimated_cost:
                    val = f"₹{estimated_cost}" if str(estimated_cost).upper() != "TBD" else "TBD"
                    bill_preview = f"💰 Est. Bill: {val}\n"
                
                ride_length = ""
                if engine == 'RIDE' and data.get("distance_km"):
                    ride_length = f"🚕 Ride Length : {data['distance_km']} km\n"

                invite_text = (
                    f"📦 *New Order Offer*\n\n"
                    f"🛠 Service  : {service_name(service_id)}\n"
                    f"{items_preview}{bill_preview}{ride_length}"
                    f"📍 Pickup is : {round(h['distance'], 2)} km away\n\n"
                    "Tap below to accept (First Come, First Served)."
                )
                send_helper_auto_assign(h['phone'], order_code, invite_text)

                # Invite nearest 3 helpers max
                if idx >= 2:
                    break
        else:
            logger.info(f"🛰️ AUTO-ASSIGN: No AVAILABLE helpers found for {order_code} (Checked up to 50km). Admin must manual assign or wait for someone to go ONLINE.")

            
    except Exception:
        logger.error("⚠️ AUTO-ASSIGN FAILED")
        traceback.print_exc()

    return order_code


# =================================================
# 🛠 SERVICE NAME HELPER
# =================================================
def service_name(service_id: int) -> str:
    return {
        1: "Groceries",
        2: "Medicines",
        3: "AnyWork",
        4: "Ride",
        5: "AnyWork",   # was incorrectly "Support"
        6: "Other"
    }.get(service_id, "Service")


# =================================================
# 🚀 PUSH UNASSIGNED ORDERS TO NEWLY ONLINE HELPER
# =================================================

def push_unassigned_orders_to_helper(phone: str, lat: float, lng: float):
    """
    Checks for any unassigned orders within 50km and sends them to the helper.
    Called when a helper goes ONLINE or updates location.
    """
    try:
        from db.helper_repo import get_helper_by_phone
        from db.order_repo import get_unassigned_orders, get_active_order_for_helper
        
        helper = get_helper_by_phone(phone)
        if not helper:
            return
            
        # 🛑 SKIP if helper has active order
        active = get_active_order_for_helper(helper["id"])
        if active:
            return

        unassigned = get_unassigned_orders()
        if not unassigned:
            return
            
        logger.info(f"🚀 PUSH: Checking {len(unassigned)} unassigned orders for helper {phone}")
        
        count = 0
        for order in unassigned:
            # Distance check
            o_lat = order.get("customer_lat")
            o_lng = order.get("customer_lng")
            
            if o_lat and o_lng:
                dist = haversine(float(lat), float(lng), float(o_lat), float(o_lng))
                if dist <= 50:
                    items_preview = ""
                    if order.get("engine_type") == "TASK":
                        try:
                            payload_data = json.loads(order.get("payload", "{}"))
                            items = payload_data.get("items", [])
                            if items:
                                items_preview = "🛍️ Items:\n" + "\n".join(f"• {item}" for item in items) + "\n\n"
                        except:
                            pass

                    invite_text = (
                        f"📦 *Pending Order Offer*\n\n"
                        f"🛠 Service  : {order['service']}\n"
                        f"{items_preview}"
                        f"💰 Est. Bill: ₹{order['total_amount'] or 'TBD'}\n"
                        f"📏 Distance : {round(dist, 2)} km away\n\n"
                        "Tap below to accept."
                    )
                    send_helper_auto_assign(phone, order['order_id'], invite_text)
                    count += 1
                    
            if count >= 3: # Don't overwhelm with too many old orders
                break
                
        if count > 0:
            logger.info(f"🚀 PUSH: Sent {count} pending offers to {phone}")
            
    except Exception:
        logger.error("⚠️ PUSH UNASSIGNED FAILED")
        traceback.print_exc()