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
