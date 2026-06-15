import math

def to_map_link(lat, lng):
    """
    Converts latitude & longitude to a Google Maps link.
    """
    try:
        if lat is None or lng is None:
            return "Location not shared"
        lat = float(lat)
        lng = float(lng)
        return f"https://maps.google.com/?q={lat},{lng}"
    except Exception:
        return "Location not shared"

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculates distance between two GPS points in KM.
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
