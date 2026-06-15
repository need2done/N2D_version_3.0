"""
=================================================
Need2Done – Global Configuration (FINAL FIXED)
=================================================

✔ ENV-driven (safe for Git)
✔ FIXED DB connection (no @ bug)
✔ Supports OLD + NEW DB
✔ Production ready
"""

import os
from urllib.parse import quote_plus


# =================================================
# WHATSAPP CLOUD API CONFIG
# =================================================

ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
GRAPH_API_VERSION = os.getenv("GRAPH_API_VERSION", "v19.0")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "n2d_verify_local")


# =================================================
# SYSTEM ROLES / NUMBERS
# =================================================

ADMIN_PHONE_NUMBER = os.getenv("ADMIN_PHONE_NUMBER")
ADMIN_NUMBER = ADMIN_PHONE_NUMBER


# =================================================
# HELPER NUMBERS (FALLBACK)
# =================================================

_raw_helpers = os.getenv("HELPER_NUMBERS", "")
HELPER_NUMBERS = [h.strip() for h in _raw_helpers.split(",") if h.strip()]


# =================================================
# DATABASE CONFIG (RAW VALUES)
# =================================================

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "admin")  # Updated to match our ENV
DB_PORT = os.getenv("DB_PORT", "3306")

DB_NAME = os.getenv("DB_NAME", "N2D")


# =================================================
# 🔥 IMPORTANT FIX: ENCODE PASSWORD
# =================================================

ENCODED_PASSWORD = quote_plus(DB_PASSWORD)

# =================================================
# FINAL DATABASE URLS (USED BY SQLALCHEMY)
# =================================================

DB_URL = (
    f"mysql+pymysql://{DB_USER}:{ENCODED_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# =================================================
# BACKWARD COMPATIBILITY
# =================================================

DB_CONFIG = {
    "host": DB_HOST,
    "user": DB_USER,
    "password": DB_PASSWORD,
    "database": DB_NAME,
    "port": int(DB_PORT),
}
# =================================================
# TRACKING CONFIG
# =================================================

TRACKING_BASE_URL = os.getenv("TRACKING_BASE_URL", "http://localhost:5000")


# =================================================
# PRICING CONFIG
# =================================================

HELPER_CHARGE = float(os.getenv("HELPER_CHARGE", "20"))
PLATFORM_FEE = float(os.getenv("PLATFORM_FEE", "5"))
ANYWORK_BASE_FEE = float(os.getenv("ANYWORK_BASE_FEE", "50"))  # Flat service fee for AnyWork orders (no shopping bill)

# Ride Dynamic Pricing (REAL-TIME)
from dotenv import dotenv_values

def get_live_pricing():
    """Fetches pricing dynamically from .env to reflect Admin Dashboard changes instantly without restarting the bot."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    env_vars = dotenv_values(env_path)
    
    def safe_float(val, default):
        try:
            if not val: return float(default)
            return float(val)
        except (ValueError, TypeError):
            return float(default)

    # ----------------------------------------------------
    # NEW: Advanced Pricing JSON Structure
    # ----------------------------------------------------
    advanced_pricing_str = env_vars.get("ADVANCED_PRICING", os.getenv("ADVANCED_PRICING", ""))
    
    try:
        import json
        advanced_pricing = json.loads(advanced_pricing_str)
    except:
        advanced_pricing = {
            "COMMISSION_PERCENT": 15,
            "LONG_PICKUP": {
                "threshold_km": 3,
                "rate_per_km": 5,
                "max_fee": 20
            },
            "NIGHT_FARE": {
                "start_hour": 23,
                "end_hour": 6,
                "multiplier": 1.25
            },
            "VEHICLES": {
                "BIKE": {
                    "base_fare": 11,
                    "time_rate_per_min": 0.50,
                    "distance_tiers": [
                        {"up_to_km": 8, "rate_per_km": 8.2},
                        {"up_to_km": 100, "rate_per_km": 11.3}
                    ]
                },
                "AUTO": {
                    "base_fare": 30,
                    "time_rate_per_min": 0.80,
                    "distance_tiers": [
                        {"up_to_km": 5, "rate_per_km": 15},
                        {"up_to_km": 100, "rate_per_km": 18}
                    ]
                },
                "CAR": {
                    "base_fare": 50,
                    "time_rate_per_min": 1.50,
                    "distance_tiers": [
                        {"up_to_km": 5, "rate_per_km": 20},
                        {"up_to_km": 100, "rate_per_km": 25}
                    ]
                }
            }
        }

    return {
        "ACTIVE_OFFERS": env_vars.get("ACTIVE_OFFERS", os.getenv("ACTIVE_OFFERS", "[]")),
        "ACTIVE_SURGES": env_vars.get("ACTIVE_SURGES", os.getenv("ACTIVE_SURGES", "[]")),
        "ADVANCED_PRICING": advanced_pricing,
        "PLATFORM_FEE": safe_float(env_vars.get("PLATFORM_FEE", os.getenv("PLATFORM_FEE", "5")), 5)
    }


# =================================================
# PAYMENT CONFIG
# =================================================

CURRENCY_SYMBOL = os.getenv("CURRENCY_SYMBOL", "₹")
UPI_NOTE_PREFIX = os.getenv("UPI_NOTE_PREFIX", "Need2Done Order")
UPI_ID = os.getenv("UPI_ID")


# =================================================
# OTP CONFIG
# =================================================

OTP_LENGTH = int(os.getenv("OTP_LENGTH", "6"))
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))


# =================================================
# AUTO ASSIGN CONFIG
# =================================================

AUTO_ASSIGN_TIMEOUT = int(os.getenv("AUTO_ASSIGN_TIMEOUT", "30"))
AUTO_ASSIGN_MAX_RETRY = int(os.getenv("AUTO_ASSIGN_MAX_RETRY", "3"))


# =================================================
# LOGGING / SAFETY
# =================================================

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


# =================================================
# SECURITY
# =================================================

JWT_SECRET = os.getenv("JWT_SECRET", "N2D_LOCAL_SECRET")