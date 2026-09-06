"""
=================================================
Need2Done – Dynamic Service Config Repository
=================================================

✔ Fetches active service configuration from DB
✔ Safe fallbacks to default active set (10, 2, 5)
✔ UTF-8 & MySQL pool safe
"""

from typing import List, Set, Dict, Any
from db.mysql_conn import get_db

# Default fallback active services if DB is temporarily unreachable
DEFAULT_ACTIVE_SERVICES = {2, 5, 10}

ALL_SERVICES_MAP = {
    1: {"id": "SERVICE_1", "title": "🛒 Groceries Service", "description": "Order daily essentials, milk, or fresh food items."},
    7: {"id": "SERVICE_7", "title": "🥦 Veggies & Fruits", "description": "Browse catalog, check live prices, and order fresh produce."},
    9: {"id": "SERVICE_9", "title": "🍔 Food Service", "description": "Order meals and food from your favorite restaurants."},
    10: {"id": "SERVICE_10", "title": "🏠 Home Services", "description": "Book trusted home cleaning and repair services."},
    2: {"id": "SERVICE_2", "title": "💊 Medicines Service", "description": "Buy health supplies or medicines with prescription."},
    4: {"id": "SERVICE_4", "title": "🚗 Ride Service", "description": "Book a quick bike, auto, or car for your travel."},
    5: {"id": "SERVICE_5", "title": "👨‍🔧 Any Work Service", "description": "Pick/Drop parcels, run errands, or custom tasks."},
    6: {"id": "SERVICE_6", "title": "📞 Support", "description": "Talk to our team for any assistance or help."},
    8: {"id": "SERVICE_8", "title": "📦 My Orders", "description": "View your recent order history and tracking."}
}

SERVICE_NAMES = {
    1: "Groceries Service",
    7: "Veggies & Fruits Service",
    9: "Food Service",
    10: "Home Services",
    2: "Medicines Service",
    4: "Ride Service",
    5: "Any Work / Custom Work",
    6: "Support",
    8: "My Orders"
}

def get_active_service_ids() -> Set[int]:
    """
    Returns a set of active service_ids from DB.
    Always includes 6 (Support) and 8 (My Orders).
    """
    db = None
    cur = None
    active_ids = set()
    try:
        db = get_db()
        if db:
            cur = db.cursor(dictionary=True)
            cur.execute("SELECT service_id FROM service_config WHERE is_active = 1")
            rows = cur.fetchall()
            for r in rows:
                active_ids.add(int(r["service_id"]))
    except Exception as e:
        print(f"WARN: Could not fetch active services from DB, using fallback defaults. Error: {e}")
        active_ids = set(DEFAULT_ACTIVE_SERVICES)
    finally:
        if cur:
            try: cur.close()
            except: pass
        if db:
            try: db.close()
            except: pass

    # Always ensure default fallback if DB query returned empty
    if not active_ids:
        active_ids = set(DEFAULT_ACTIVE_SERVICES)

    # Always enable Support (6) and My Orders (8)
    active_ids.add(6)
    active_ids.add(8)

    return active_ids

def is_service_active(service_id: int) -> bool:
    """
    Checks if a specific service_id is currently active.
    """
    if service_id in (6, 8):
        return True
    active_set = get_active_service_ids()
    return service_id in active_set

def get_active_service_rows() -> List[Dict[str, str]]:
    """
    Returns WhatsApp list row objects for active services ONLY.
    """
    active_ids = get_active_service_ids()
    rows = []
    # Preserve order of menu items
    menu_order = [1, 7, 9, 10, 2, 4, 5, 6, 8]
    for s_id in menu_order:
        if s_id in active_ids and s_id in ALL_SERVICES_MAP:
            rows.append(ALL_SERVICES_MAP[s_id])
    return rows
