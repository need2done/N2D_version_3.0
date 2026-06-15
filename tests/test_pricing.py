import os
import sys

# Add bot to path
sys.path.append(os.path.abspath('N2D_whatsapp_bot'))

from config import (
    PLATFORM_FEE, 
    RIDE_BASE_BIKE, RIDE_PER_KM_BIKE,
    RIDE_BASE_AUTO, RIDE_PER_KM_AUTO,
    RIDE_BASE_CAR, RIDE_PER_KM_CAR,
    SURGE_MULTIPLIER, DISCOUNT_AMOUNT
)

def test_price(vehicle, distance):
    actual_dist = distance
    calc_dist = actual_dist
    
    if vehicle == "BIKE":
        base = RIDE_BASE_BIKE
        per_km = RIDE_PER_KM_BIKE
    elif vehicle == "AUTO":
        base = RIDE_BASE_AUTO
        per_km = RIDE_PER_KM_AUTO
    elif vehicle == "CAR":
        base = RIDE_BASE_CAR
        per_km = RIDE_PER_KM_CAR
        if actual_dist < 2.0:
            calc_dist = 2.0
    
    subtotal = base + (calc_dist * per_km)
    subtotal = subtotal * SURGE_MULTIPLIER
    subtotal = max(0, subtotal - DISCOUNT_AMOUNT)
    
    return round(subtotal + PLATFORM_FEE, 2)

print("Pricing Test Results:")
print(f"Bike (1km): {test_price('BIKE', 1.0)}  (Expected: 20 + 10 + 5 = 35)")
print(f"Bike (2km): {test_price('BIKE', 2.0)}  (Expected: 20 + 20 + 5 = 45)")
print(f"Auto (1km): {test_price('AUTO', 1.0)}  (Expected: 25 + 10 + 5 = 40)")
print(f"Car (1km): {test_price('CAR', 1.0)}   (Expected: 40 + (2*18) + 5 = 81)")
print(f"Car (3km): {test_price('CAR', 3.0)}   (Expected: 40 + (3*18) + 5 = 99)")
