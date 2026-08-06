import os
import requests

def geocode_address(address_text: str, ref_lat: float = None, ref_lng: float = None):
    """
    Geocodes a text address string to (latitude, longitude, formatted_address).
    Supports optional reference coordinates (ref_lat, ref_lng) for biased local search.
    Prefers Google Maps Geocoding API if GOOGLE_MAPS_API_KEY is present,
    else falls back to OpenStreetMap Nominatim API.
    """
    if not address_text or not str(address_text).strip():
        return None, None, None

    cleaned = str(address_text).strip()
    
    # 1. Try Google Maps Geocoding API
    google_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if google_key:
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": cleaned,
                "key": google_key
            }
            if ref_lat and ref_lng:
                params["locationbias"] = f"circle:15000@{ref_lat},{ref_lng}"
            res = requests.get(url, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "OK" and data.get("results"):
                    first = data["results"][0]
                    lat = first["geometry"]["location"]["lat"]
                    lng = first["geometry"]["location"]["lng"]
                    fmt_name = first.get("formatted_address", cleaned)
                    return float(lat), float(lng), fmt_name
        except Exception as e:
            print(f"Google Geocoding error: {e}")

    # 2. Fallback: OpenStreetMap Nominatim API (Free, no key needed)
    queries_to_try = [cleaned]
    # If text doesn't contain commas, try adding reference area hint if available
    if "," not in cleaned and "bhongir" not in cleaned.lower():
        queries_to_try.append(f"{cleaned}, Bhongir")

    for q in queries_to_try:
        try:
            url = "https://nominatim.openstreetmap.org/search"
            headers = {"User-Agent": "Need2DoneBot/1.0"}
            params = {
                "q": q,
                "format": "json",
                "limit": 1
            }
            if ref_lat and ref_lng:
                ref_lat, ref_lng = float(ref_lat), float(ref_lng)
                params["viewbox"] = f"{ref_lng-0.1},{ref_lat-0.1},{ref_lng+0.1},{ref_lat+0.1}"
                params["bounded"] = 0  # Prefer within viewbox but don't strictly reject
                
            res = requests.get(url, params=params, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data and len(data) > 0:
                    first = data[0]
                    lat = float(first["lat"])
                    lng = float(first["lon"])
                    display_name = first.get("display_name", cleaned)
                    return lat, lng, display_name
        except Exception as e:
            print(f"OSM Geocoding error: {e}")

    return None, None, cleaned
