import math

def to_map_link(lat, lng, name=None, address=None):
    """
    Converts latitude & longitude to a Google Maps link with optional place name and address.
    """
    try:
        if lat is None or lng is None:
            return "Location not shared"
        lat = float(lat)
        lng = float(lng)
        link = f"https://maps.google.com/?q={lat},{lng}"
        
        parts = []
        if name:
            parts.append(str(name).strip())
        if address and str(address).strip() != str(name).strip():
            parts.append(str(address).strip())
            
        if parts:
            return f"{', '.join(parts)} ({link})"
        return link
    except Exception:
        return "Location not shared"

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculates straight-line distance between two GPS points in KM.
    """
    try:
        R = 6371  # Earth radius in KM
        
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(d_lat / 2) * math.sin(d_lat / 2) +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(d_lon / 2) * math.sin(d_lon / 2))
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except Exception:
        return 999999 # Far away fallback

def get_road_distance(lat1, lon1, lat2, lon2):
    """
    Calculates actual driving road distance in KM using OSRM routing API,
    with Haversine straight-line distance fallback.
    """
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
        import requests
        url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if data.get("routes") and len(data["routes"]) > 0:
                meters = data["routes"][0].get("distance", 0)
                if meters > 0:
                    return round(meters / 1000.0, 2)
    except Exception as e:
        print(f"OSRM road distance error: {e}")
        
    return round(haversine(lat1, lon1, lat2, lon2), 2)


# =========================================================================
# OPERATIONAL SERVICE BOUNDARY (Multi-Zone & Expansion Engine)
# =========================================================================

import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ZONES_JSON_PATH = BASE_DIR / "backend" / "data" / "service_zones.json"

BHONGIR_CENTER_LAT = float(os.getenv("SERVICE_CENTER_LAT", "17.5113"))
BHONGIR_CENTER_LNG = float(os.getenv("SERVICE_CENTER_LNG", "78.8899"))
SERVICE_RADIUS_KM = float(os.getenv("SERVICE_RADIUS_KM", "30.0"))
SERVICE_AREA_NAME = os.getenv("SERVICE_AREA_NAME", "Bhongir and surrounding villages")

OUT_OF_REGION_KEYWORDS = [
    "chennai", "tamil nadu", "tamilnadu", "bangalore", "bengaluru", "karnataka",
    "mumbai", "pune", "maharashtra", "delhi", "new delhi", "kolkata", "calcutta",
    "west bengal", "kerala", "kochi", "cochin", "trivandrum", "gujarat", "ahmedabad",
    "surat", "jaipur", "rajasthan", "lucknow", "uttar pradesh", "bihar", "patna",
    "odisha", "orissa", "bhubaneswar", "punjab", "haryana", "chandigarh", "goa",
    "madhya pradesh", "bhopal", "indore", "hyderabad", "secunderabad", "cyberabad",
    "warangal", "khammam", "karimnagar", "nizamabad", "nalgonda town", "suryapet",
    "vijayawada", "visakhapatnam", "vizag", "guntur", "andhra pradesh"
]


def get_active_service_zones():
    """
    Reads active service expansion zones configured via Admin Dashboard.
    """
    try:
        if ZONES_JSON_PATH.exists():
            with open(ZONES_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                zones = data.get("zones", [])
                active = [z for z in zones if z.get("status") == "ACTIVE"]
                if active:
                    return active
    except Exception as e:
        print(f"Notice: Reading service_zones.json: {e}")

    # Fallback to single primary zone from env
    return [
        {
            "id": "zone-bhongir-main",
            "name": SERVICE_AREA_NAME,
            "centerLat": BHONGIR_CENTER_LAT,
            "centerLng": BHONGIR_CENTER_LNG,
            "radiusKm": SERVICE_RADIUS_KM,
            "status": "ACTIVE"
        }
    ]


def is_location_serviceable(lat, lng, max_radius_km=None):
    """
    Validates if given GPS coordinates (lat, lng) are within ANY active service expansion zone.
    Returns: (is_serviceable: bool, distance_km: float)
    """
    try:
        if lat is None or lng is None:
            return False, 999999.0
        lat = float(lat)
        lng = float(lng)

        active_zones = get_active_service_zones()
        min_dist = 999999.0

        for zone in active_zones:
            c_lat = float(zone.get("centerLat", BHONGIR_CENTER_LAT))
            c_lng = float(zone.get("centerLng", BHONGIR_CENTER_LNG))
            allowed_radius = float(max_radius_km) if max_radius_km is not None else float(zone.get("radiusKm", SERVICE_RADIUS_KM))

            dist = haversine(c_lat, c_lng, lat, lng)
            if dist < min_dist:
                min_dist = dist

            if dist <= allowed_radius:
                return True, round(dist, 2)

        return False, round(min_dist, 2)
    except Exception as e:
        print(f"Error checking location serviceability: {e}")
        return False, 999999.0


def is_address_text_out_of_region(text: str) -> bool:
    """
    Heuristic check to detect out-of-region state/city names in typed addresses or pin names.
    """
    if not text:
        return False
    lower = text.lower()
    for kw in OUT_OF_REGION_KEYWORDS:
        # Check whole word match or keyword surrounded by punctuation/spaces
        if kw in lower:
            # Don't false-positive if the keyword is part of a local village name
            return True
    return False


def get_out_of_service_message(location_name=None) -> str:
    """
    Returns polite bilingual notification when customer chooses an out-of-region location.
    Dynamically loads custom messages and area name from service_zones.json.
    """
    area_name = SERVICE_AREA_NAME
    msg_te = "మీరు ఎంచుకున్న లొకేషన్ మా సర్వీస్ పరిధి వెలుపల ఉంది. ప్రస్తుతానికి నీడ్2డన్ సేవలు **భువనగిరి మరియు పరిసర గ్రామాలలో** మాత్రమే అందుబాటులో ఉన్నాయి.\nత్వరలోనే మీ ప్రాంతానికి కూడా రాబోతున్నాము! 🚀"
    msg_en = "🚀 *Need2Done* is currently live only in **Bhongir and surrounding villages**.\nWe are expanding rapidly and coming soon to your location! ✨"

    try:
        if ZONES_JSON_PATH.exists():
            with open(ZONES_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                g = data.get("global", {})
                if g.get("primaryAreaName"):
                    area_name = g.get("primaryAreaName")
                if g.get("comingSoonMessageTe"):
                    msg_te = g.get("comingSoonMessageTe")
                if g.get("comingSoonMessageEn"):
                    msg_en = g.get("comingSoonMessageEn")
    except Exception:
        pass

    loc_display = ""
    if location_name and location_name not in ["GPS Location Pin", "Location Pin", "Selected Location"]:
        loc_display = f" (*{location_name}*)"

    return (
        f"📍 *Location Out of Service Area / సర్వీస్ పరిధి వెలుపల*\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"⚠️ The selected location{loc_display} is outside our current operational zone.\n\n"
        f"{msg_en}\n\n"
        f"{msg_te}\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"Please share a location within {area_name} to continue.\n"
        f"దయచేసి సర్వీస్ పరిధిలోని లోకేషన్ పిన్ పంపండి."
    )


def get_reselect_location_message() -> str:
    """
    Returns guidance on how to send location pin or local landmark address.
    """
    return (
        "📍 *Share Service Location / లోకేషన్ పంపే విధానం:*\n"
        "━━━━━━━━━━━━━━━━━━━━━\n"
        "1️⃣ Tap the attachment icon (📎) in WhatsApp.\n"
        "2️⃣ Select *Location* 📍 -> *\"Send your current location\"*.\n"
        "3️⃣ Or type your local street / landmark address below (e.g. *'Gunj Road, Bhongir'*, *'Raigir'*, *'Bibinagar'*).\n\n"
        "వాట్సాప్‌లో 📎 గుర్తు నొక్కి *Location* ఎంచుకుని భువనగిరి పరిసరాల పిన్ పంపండి లేదా లోకల్ అడ్రస్ టైప్ చేయండి."
    )

