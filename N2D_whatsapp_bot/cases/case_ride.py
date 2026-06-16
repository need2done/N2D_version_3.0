"""
=================================================
Need2Done – Ride Engine (Double OTP)
=================================================
"""
from utils.location import to_map_link, haversine
from whatsapp_client import send_reply_buttons, send_message
import random

DEFAULT_FALLBACK_KM = 5.0  # Used when GPS coords not available

def check_same_location(p_lat, p_lng, p_addr, d_lat, d_lng, d_addr):
    if p_lat is not None and p_lng is not None and d_lat is not None and d_lng is not None:
        try:
            dist = haversine(float(p_lat), float(p_lng), float(d_lat), float(d_lng))
            if dist < 0.05:  # less than 50 meters
                return True
        except:
            pass
    p_text = (p_addr or "").strip().lower()
    d_text = (d_addr or "").strip().lower()
    if p_text and d_text and p_text == d_text:
        return True
    return False

def recalculate_and_send_summary(session, data, user):
    p_lat = data.get("pickup_lat")
    p_lng = data.get("pickup_lng")
    d_lat = data.get("drop_lat")
    d_lng = data.get("drop_lng")

    if p_lat and p_lng and d_lat and d_lng:
        actual_dist = haversine(float(p_lat), float(p_lng), float(d_lat), float(d_lng))
        actual_dist = max(actual_dist, 1.0)  # Minimum 1 km
    else:
        actual_dist = DEFAULT_FALLBACK_KM  # fallback when text addresses used

    from config import get_live_pricing
    pricing = get_live_pricing()
    
    data["min_applied"] = False
    calc_dist = actual_dist
    
    from datetime import datetime
    
    advanced = pricing.get("ADVANCED_PRICING", {})
    vehicles = advanced.get("VEHICLES", {})
    
    if not data.get("vehicle"):
        data["vehicle"] = "BIKE"

    v_config = vehicles.get(data["vehicle"]) or vehicles.get("BIKE", {
        "base_fare": pricing.get("RIDE_BASE_BIKE", 20),
        "time_rate_per_min": 0,
        "distance_tiers": [{"up_to_km": 999, "rate_per_km": pricing.get("RIDE_PER_KM_BIKE", 10)}]
    })
    
    # 1. Base Fare
    base = float(v_config.get("base_fare", 20))
    
    # Car has a minimum 2km charge requirement
    if data["vehicle"] == "CAR" and actual_dist < 2.0:
        calc_dist = 2.0
        data["min_applied"] = True
        
    # 2. Distance Fare
    dist_fare = 0
    rem_dist = calc_dist
    tiers = sorted(v_config.get("distance_tiers", []), key=lambda x: x.get("up_to_km", 999))
    
    last_tier_limit = 0
    for tier in tiers:
        limit = float(tier.get("up_to_km", 999))
        rate = float(tier.get("rate_per_km", 10))
        tier_dist = min(rem_dist, limit - last_tier_limit)
        if tier_dist > 0:
            dist_fare += tier_dist * rate
            rem_dist -= tier_dist
        last_tier_limit = limit
        
    # 3. Time Fare (Assume 25 km/h -> 2.4 min per km)
    time_rate = float(v_config.get("time_rate_per_min", 0))
    est_mins = calc_dist * 2.4
    time_fare = est_mins * time_rate
    
    # 4. Long Pickup Fare
    long_pickup_fare = 0
    pickup_config = advanced.get("LONG_PICKUP", {})
    try:
        p_lat, p_lng = data.get("pickup_lat"), data.get("pickup_lng")
        if p_lat and p_lng:
            from core.order_finalizer import find_nearest_helpers
            nearest = find_nearest_helpers(float(p_lat), float(p_lng), radius_km=15, engine_type='RIDE')
            if nearest:
                h_dist = nearest[0].get("distance", 0)
                threshold = float(pickup_config.get("threshold_km", 3))
                if h_dist > threshold:
                    rate = float(pickup_config.get("rate_per_km", 5))
                    max_fee = float(pickup_config.get("max_fee", 20))
                    long_pickup_fare = min((h_dist - threshold) * rate, max_fee)
    except Exception as e:
        pass
        
    # Subtotal before Night/Discounts
    base_and_dist = base + dist_fare + time_fare + long_pickup_fare
    
    # 4. Night Fare
    night_config = advanced.get("NIGHT_FARE", {})
    current_hour = datetime.now().hour
    try:
        start_hour = int(night_config.get("start_hour", 23))
        end_hour = int(night_config.get("end_hour", 6))
        is_night = False
        if start_hour > end_hour:
            is_night = current_hour >= start_hour or current_hour < end_hour
        else:
            is_night = start_hour <= current_hour < end_hour
            
        if is_night:
            multiplier = float(night_config.get("multiplier", 1.0))
            night_extra = base_and_dist * (multiplier - 1.0)
            base_and_dist += night_extra
    except:
        pass
        
    subtotal = base_and_dist
    
    # 3. Apply Offers & Surge
    import json
    active_offers_str = pricing.get("ACTIVE_OFFERS", "[]")
    try:
        offers = json.loads(active_offers_str)
    except:
        offers = []
        
    applied_offer_msg = None
    discount_amount = 0
    
    for offer in offers:
        if offer.get("service") == "RIDE":
            applied_offer_msg = offer.get("msg")
            val = float(offer.get("value", 0))
            if offer.get("type") == "PERCENT":
                discount_amount += subtotal * (val / 100)
            elif offer.get("type") == "AMOUNT":
                discount_amount += val
                
    subtotal = max(0, subtotal - discount_amount)
    
    # Fetch Flat Surge Amount from ACTIVE_SURGES
    active_surges_str = pricing.get("ACTIVE_SURGES", "[]")
    try:
        surges = json.loads(active_surges_str)
    except:
        surges = []
        
    surge_amount = 0
    for surge in surges:
        if surge.get("service") == "RIDE":
            surge_amount += float(surge.get("amount", 0))
    
    # 4. Add Platform Fee
    platform_fee = pricing["PLATFORM_FEE"]
    final_price = round(subtotal + platform_fee, 2)
    
    # Save exact breakdown into session for payment template
    data["price"] = final_price
    data["applied_offer"] = applied_offer_msg
    data["breakdown_base"] = round(base_and_dist, 2)
    data["breakdown_discount"] = round(discount_amount, 2)
    data["breakdown_surge"] = round(surge_amount, 2)
    data["breakdown_platform"] = round(platform_fee, 2)
    data["distance_km"] = round(actual_dist, 2)

    session["case_state"] = "CONFIRM_RIDE"
    session["data"] = data

    pickup_disp = data['pickup'] if data['pickup'] else "Unknown"
    drop_disp = data['drop'] if data['drop'] else "Unknown"

    dist_label = f"{data['distance_km']} km" if data.get('distance_km') else "~5 km"
    if data.get("min_applied"):
        dist_label += " (Min 2km fare applied)"

    summary = (
        f"🚕 *Ride Summary*\n\n"
        f"📍 From: {pickup_disp}\n"
        f"🏁 To: {drop_disp}\n"
        f"📏 Distance: {dist_label}\n"
        f"🚗 Vehicle: {data['vehicle']}\n\n"
        f"💰 *Fare Breakdown:*\n"
        f"Base Fare: ₹{data['breakdown_base']}\n"
    )
    
    if data["breakdown_discount"] > 0:
        summary += f"Discount: -₹{data['breakdown_discount']} ({data['applied_offer']})\n"
        
    summary += (
        f"Platform Fee: +₹{data['breakdown_platform']}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"🧾 *Total Est. Fare: ₹{final_price}*\n\n"
        "Confirm booking?"
    )
    
    send_reply_buttons(
        to=user,
        body=summary,
        buttons=[
            {"id": "RIDE_OK", "title": "✅ Confirm"},
            {"id": "RIDE_EDIT", "title": "✏️ Edit"},
            {"id": "RIDE_CANCEL", "title": "❌ Cancel"}
        ]
    )

def handle(session, text, raw):
    try:
        user = session.get("user_id")
        state = session.get("case_state")
        data = session.get("data", {})
        btn = raw.get("interactive", {}).get("button_reply", {}).get("id") if isinstance(raw, dict) else None

        # INIT
        if not state:
            session["case_state"] = "ASK_PICKUP"
            session["data"] = {
                "pickup": "",
                "drop": "",
                "vehicle": "",
                "price": 0,
                "start_otp": "",
                "end_otp": "",
                "pickup_lat": None,
                "pickup_lng": None,
                "drop_lat": None,
                "drop_lng": None
            }
            return (
                "🚖 *N2D Ride Service*\n\n"
                "Quickly book a bike, auto, or car for your travel. Safe and reliable rides at your doorstep.\n\n"
                "📍 Please share your *Pickup* location."
            )

        # PICKUP
        if state == "ASK_PICKUP":
            lat = raw.get("location", {}).get("latitude") or session.get("latitude")
            lng = raw.get("location", {}).get("longitude") or session.get("longitude")

            new_pickup_lat = None
            new_pickup_lng = None
            new_pickup_addr = None

            if lat and lng:
                new_pickup_lat = lat
                new_pickup_lng = lng
                new_pickup_addr = to_map_link(lat, lng)
            else:
                if not text: return "📍 Please share your *Pickup* location."
                new_pickup_addr = text

            # Validation: Pickup and Drop cannot be the same
            if data.get("drop") or data.get("drop_lat"):
                if check_same_location(new_pickup_lat, new_pickup_lng, new_pickup_addr,
                                       data.get("drop_lat"), data.get("drop_lng"), data.get("drop")):
                    return "❌ Pickup and Drop location cannot be the same. Please share a different Pickup location."

            # Update data
            data["pickup_lat"] = new_pickup_lat
            data["pickup_lng"] = new_pickup_lng
            data["pickup"] = new_pickup_addr
            session.pop("latitude", None)
            session.pop("longitude", None)
            
            if session.get("edit_mode") == "PICKUP":
                session.pop("edit_mode", None)
                session["data"] = data
                recalculate_and_send_summary(session, data, user)
                return None
            else:
                session["case_state"] = "ASK_DROP"
                session["data"] = data
                return "🏁 Great! Now please share your *Drop* location."

        # DROP
        if state == "ASK_DROP":
            lat = raw.get("location", {}).get("latitude") or session.get("latitude")
            lng = raw.get("location", {}).get("longitude") or session.get("longitude")

            new_drop_lat = None
            new_drop_lng = None
            new_drop_addr = None

            if lat and lng:
                new_drop_lat = lat
                new_drop_lng = lng
                new_drop_addr = to_map_link(lat, lng)
            else:
                if not text: return "🏁 Please share your *Drop* location."
                new_drop_addr = text

            # Validation: Pickup and Drop cannot be the same
            if check_same_location(data.get("pickup_lat"), data.get("pickup_lng"), data.get("pickup"),
                                   new_drop_lat, new_drop_lng, new_drop_addr):
                return "❌ Pickup and Drop location cannot be the same. Please share a different Drop location."

            # Update data
            data["drop_lat"] = new_drop_lat
            data["drop_lng"] = new_drop_lng
            data["drop"] = new_drop_addr
            session.pop("latitude", None)
            session.pop("longitude", None)

            if session.get("edit_mode") == "DROP":
                session.pop("edit_mode", None)
                session["data"] = data
                recalculate_and_send_summary(session, data, user)
                return None
            else:
                session["case_state"] = "SELECT_VEHICLE"
                session["data"] = data
                send_reply_buttons(
                    to=user,
                    body="🚗 Choose your vehicle:",
                    buttons=[
                        {"id": "RIDE_BIKE", "title": "🏍️ Bike"},
                        {"id": "RIDE_AUTO", "title": "🛺 Auto"},
                        {"id": "RIDE_CAR", "title": "🚗 Car"}
                    ]
                )
                return None

        # VEHICLE
        if state == "SELECT_VEHICLE":
            if not btn: return "❌ Please select a vehicle."
            
            v_map = {"RIDE_BIKE": "BIKE", "RIDE_AUTO": "AUTO", "RIDE_CAR": "CAR"}
            data["vehicle"] = v_map.get(btn, "BIKE")
            
            recalculate_and_send_summary(session, data, user)
            return None

        # CONFIRM / EDIT / CANCEL
        if state == "CONFIRM_RIDE":
            if btn == "RIDE_OK":
                from session_store import start_confirming
                if not start_confirming(user):
                    return None
                    
                data["start_otp"] = str(random.randint(1000, 9999))
                data["end_otp"] = str(random.randint(1000, 9999))
                data["cost"] = data.get("price", 0) # Map to finalizer field
                
                from core.order_finalizer import finalize_order
                from session_store import reset_session

                order_code = finalize_order(session)
                if not order_code:
                    return "❌ Sorry, failed to book ride. Please try again."

                reset_session(user)
                return (
                    f"✅ *Ride Booked!* 🎉\n\n"
                    f"Order ID: {order_code}\n"
                    "We are searching for a driver...\n\n"
                    f"🔐 *START OTP:* {data['start_otp']}\n"
                    f"🔐 *END OTP:* {data['end_otp']}\n\n"
                    "Driver will ask for START OTP to begin ride."
                )

            if btn == "RIDE_EDIT":
                session["case_state"] = "EDIT_MENU"
                send_reply_buttons(
                    to=user,
                    body="✏️ *What would you like to edit?*",
                    buttons=[
                        {"id": "RIDE_ED_PICKUP", "title": "📍 Edit Pickup"},
                        {"id": "RIDE_ED_DROP", "title": "🏁 Edit Drop"},
                        {"id": "RIDE_ED_BACK", "title": "🔙 Back"}
                    ]
                )
                return None

            if btn == "RIDE_CANCEL":
                from session_store import reset_session
                reset_session(user)
                return "❌ Ride booking cancelled."

            return "❌ Please use the buttons above to Confirm, Edit, or Cancel."

        # EDIT MENU
        if state == "EDIT_MENU":
            if btn == "RIDE_ED_PICKUP":
                session["edit_mode"] = "PICKUP"
                session["latitude"] = None
                session["longitude"] = None
                data["pickup_lat"] = None
                data["pickup_lng"] = None
                session["case_state"] = "ASK_PICKUP"
                return "📍 Please share updated *Pickup* location."

            if btn == "RIDE_ED_DROP":
                session["edit_mode"] = "DROP"
                session["latitude"] = None
                session["longitude"] = None
                data["drop_lat"] = None
                data["drop_lng"] = None
                session["case_state"] = "ASK_DROP"
                return "🏁 Please share updated *Drop* location."

            if btn == "RIDE_ED_BACK":
                session["case_state"] = "SELECT_VEHICLE"
                send_reply_buttons(
                    to=user,
                    body="🚗 Choose your vehicle:",
                    buttons=[
                        {"id": "RIDE_BIKE", "title": "🏍️ Bike"},
                        {"id": "RIDE_AUTO", "title": "🛺 Auto"},
                        {"id": "RIDE_CAR", "title": "🚗 Car"}
                    ]
                )
                return None

            return "❌ Please select an option using the buttons."

        return None

    except Exception as e:
        import traceback
        traceback.print_exc()
        print("🔥 ERROR in case_ride:", str(e))
        return "❌ Error in ride booking. Type *Hi* to restart."
