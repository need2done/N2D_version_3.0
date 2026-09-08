"""
Python Unit Test Suite for Need2Done Custom Work Pricing Engine (Bhongir Pilot v1.0)
"""

import sys

CONFIG = {
    "SERVICE_BASE": 49,
    "PER_KM_BIKE": 8,
    "PER_KM_BIKE_HELPER": 5,
    "EXTRA_STOP": 20,
    "EXTRA_STOP_HELPER": 12,
    "ACCESS_COORDINATION": 20,
    "ACCESS_COORDINATION_HELPER": 10,
    "SHOPPING_EFFORT": 45,
    "SHOPPING_EFFORT_HELPER": 15,
    "SHOPPING_11_20_LINES": 25,
    "SHOPPING_11_20_LINES_HELPER": 10,
    "EXTRA_TIME_BLOCK": 30,
    "EXTRA_TIME_BLOCK_HELPER": 20,
    "CARGO_AUTO_BASE": 120,
    "CARGO_AUTO_MIN": 199,
    "CARGO_AUTO_PER_KM": 14,
    "CARGO_AUTO_HELPER_BASE": 90,
    "CARGO_AUTO_HELPER_MIN": 140,
    "CARGO_AUTO_HELPER_PER_KM": 10,
    "MINI_TRUCK_BASE": 250,
    "MINI_TRUCK_MIN": 399,
    "MINI_TRUCK_PER_KM": 18,
    "MINI_TRUCK_HELPER_BASE": 190,
    "MINI_TRUCK_HELPER_MIN": 280,
    "MINI_TRUCK_HELPER_PER_KM": 13,
    "RESTRICTED_KEYWORDS": [
        "cash transfer", "bank deposit", "withdrawal", "weapon", "gun",
        "explosive", "illegal", "drug", "prescription missing", "childcare",
        "baby sitting", "nursing", "medical care", "unattended key access"
    ]
}

def calculate_custom_work_price(params):
    task_type = params.get("taskType", "direct_pickup")
    dist = max(0.0, float(params.get("distanceKm", 0)))
    stops = max(0, int(params.get("extraStops", 0)))
    has_access = params.get("hasAccessCoordination", False)
    has_shopping = params.get("hasShopping", False)
    lines = max(0, int(params.get("itemLines", 0)))
    stores = max(0, int(params.get("extraStores", 0)))
    time_blocks = max(0, int(params.get("extraTimeBlocks", 0)))
    active_work_mins = max(0, int(params.get("activeWorkMins", 0)))
    goods = max(0.0, float(params.get("goodsInvoiceAmount", 0)))
    tip = max(0.0, float(params.get("tipAmount", 0)))
    desc = params.get("description", "").lower()

    if any(k in desc for k in CONFIG["RESTRICTED_KEYWORDS"]):
        return {"success": False, "requiresAdminReview": True, "error": "Safety exclusion"}

    customer_fare = 0
    helper_payout = 0
    min_fare = 99
    min_payout = 65

    if task_type == "micro_errand":
        min_fare, min_payout = 69, 45
        customer_fare = max(min_fare, CONFIG["SERVICE_BASE"] + (dist * CONFIG["PER_KM_BIKE"]))
        helper_payout = max(min_payout, 35 + (dist * CONFIG["PER_KM_BIKE_HELPER"]))

    elif task_type == "direct_pickup":
        min_fare, min_payout = 99, 65
        base_fare = max(min_fare, CONFIG["SERVICE_BASE"] + (dist * CONFIG["PER_KM_BIKE"]))
        customer_fare = base_fare + (time_blocks * CONFIG["EXTRA_TIME_BLOCK"])
        helper_payout = max(min_payout, 45 + (dist * CONFIG["PER_KM_BIKE_HELPER"])) + (time_blocks * CONFIG["EXTRA_TIME_BLOCK_HELPER"])

    elif task_type == "retrieve":
        min_fare, min_payout = 119, 75
        base_fare = max(min_fare, CONFIG["SERVICE_BASE"] + CONFIG["ACCESS_COORDINATION"] + (dist * CONFIG["PER_KM_BIKE"]))
        customer_fare = base_fare + (time_blocks * CONFIG["EXTRA_TIME_BLOCK"])
        helper_payout = max(min_payout, 45 + CONFIG["ACCESS_COORDINATION_HELPER"] + (dist * CONFIG["PER_KM_BIKE_HELPER"])) + (time_blocks * CONFIG["EXTRA_TIME_BLOCK_HELPER"])

    elif task_type == "buy_and_bring":
        min_fare, min_payout = 119, 80
        shop_fee = CONFIG["SHOPPING_EFFORT"] + (CONFIG["SHOPPING_11_20_LINES"] if lines > 10 else 0)
        shop_helper = CONFIG["SHOPPING_EFFORT_HELPER"] + (CONFIG["SHOPPING_11_20_LINES_HELPER"] if lines > 10 else 0)
        extra_store_fee = stores * CONFIG["EXTRA_STOP"]
        extra_store_helper = stores * CONFIG["EXTRA_STOP_HELPER"]

        base_fare = max(min_fare, CONFIG["SERVICE_BASE"] + shop_fee + extra_store_fee + (dist * CONFIG["PER_KM_BIKE"]))
        customer_fare = base_fare + (time_blocks * CONFIG["EXTRA_TIME_BLOCK"])
        helper_payout = max(min_payout, 45 + shop_helper + extra_store_helper + (dist * CONFIG["PER_KM_BIKE_HELPER"])) + (time_blocks * CONFIG["EXTRA_TIME_BLOCK_HELPER"])

    elif task_type == "multi_stop":
        min_fare, min_payout = 119, 75
        stops_fee = stops * CONFIG["EXTRA_STOP"]
        stops_helper = stops * CONFIG["EXTRA_STOP_HELPER"]
        access_fee = CONFIG["ACCESS_COORDINATION"] if has_access else 0
        access_helper = CONFIG["ACCESS_COORDINATION_HELPER"] if has_access else 0
        shop_fee = CONFIG["SHOPPING_EFFORT"] if (has_shopping or lines > 0) else 0
        shop_helper = CONFIG["SHOPPING_EFFORT_HELPER"] if (has_shopping or lines > 0) else 0

        base_fare = max(min_fare, CONFIG["SERVICE_BASE"] + stops_fee + access_fee + shop_fee + (dist * CONFIG["PER_KM_BIKE"]))
        customer_fare = base_fare + (time_blocks * CONFIG["EXTRA_TIME_BLOCK"])
        helper_payout = max(min_payout, 45 + stops_helper + access_helper + shop_helper + (dist * CONFIG["PER_KM_BIKE_HELPER"])) + (time_blocks * CONFIG["EXTRA_TIME_BLOCK_HELPER"])

    elif task_type == "heavy_cargo_auto":
        min_fare, min_payout = CONFIG["CARGO_AUTO_MIN"], CONFIG["CARGO_AUTO_HELPER_MIN"]
        customer_fare = max(min_fare, CONFIG["CARGO_AUTO_BASE"] + (dist * CONFIG["CARGO_AUTO_PER_KM"])) + (time_blocks * 60)
        helper_payout = max(min_payout, CONFIG["CARGO_AUTO_HELPER_BASE"] + (dist * CONFIG["CARGO_AUTO_HELPER_PER_KM"])) + (time_blocks * 40)

    elif task_type in ["unique_custom_task", "general_errand"]:
        min_fare, min_payout = 129, 85
        extra_km = max(0.0, dist - 3.0)
        extra_mins = max(0, active_work_mins - 15)
        extra_blocks = (extra_mins + 14) // 15
        
        base_fare = max(min_fare, 129 + (extra_km * CONFIG["PER_KM_BIKE"]))
        customer_fare = base_fare + (extra_blocks * CONFIG["EXTRA_TIME_BLOCK"])
        helper_payout = max(min_payout, 85 + (extra_km * CONFIG["PER_KM_BIKE_HELPER"])) + (extra_blocks * CONFIG["EXTRA_TIME_BLOCK_HELPER"])

    final_service_fee = round(customer_fare)
    final_helper_payout = round(helper_payout) + tip

    return {
        "success": True,
        "serviceFee": final_service_fee,
        "totalCustomerPayment": final_service_fee + goods,
        "guaranteedHelperPayout": final_helper_payout
    }

def run_tests():
    pass_cnt = 0
    fail_cnt = 0

    def assert_eq(cond, msg):
        nonlocal pass_cnt, fail_cnt
        if cond:
            print(f"[PASS] {msg}")
            pass_cnt += 1
        else:
            print(f"[FAIL] {msg}")
            fail_cnt += 1

    print("==================================================")
    print("  PYTHON PRICING ENGINE UNIT TESTS                ")
    print("==================================================\n")

    t1 = calculate_custom_work_price({"taskType": "direct_pickup", "distanceKm": 6.0})
    assert_eq(t1["serviceFee"] == 99, f"Direct Pickup 6km Fee is 99 (Got {t1['serviceFee']})")
    assert_eq(t1["guaranteedHelperPayout"] == 75, f"Direct Pickup 6km Helper Payout is 75 (Got {t1['guaranteedHelperPayout']})")

    t2 = calculate_custom_work_price({"taskType": "retrieve", "distanceKm": 6.0, "hasAccessCoordination": True})
    assert_eq(t2["serviceFee"] == 119, f"Retrieve 6km Fee is 119 (Got {t2['serviceFee']})")

    t3 = calculate_custom_work_price({"taskType": "buy_and_bring", "distanceKm": 3.0, "itemLines": 9, "goodsInvoiceAmount": 1432})
    assert_eq(t3["serviceFee"] == 119, f"Buy & Bring Fee is 119 (Got {t3['serviceFee']})")
    assert_eq(t3["totalCustomerPayment"] == 1551, f"Total Customer Payment is 1551 (Got {t3['totalCustomerPayment']})")

    t4 = calculate_custom_work_price({"taskType": "buy_and_bring", "distanceKm": 3.0, "itemLines": 9, "extraTimeBlocks": 1, "goodsInvoiceAmount": 1432})
    assert_eq(t4["serviceFee"] == 149, f"Busy Market Fee is 149 (Got {t4['serviceFee']})")

    t5 = calculate_custom_work_price({"taskType": "multi_stop", "distanceKm": 6.0, "extraStops": 1, "hasAccessCoordination": True, "hasShopping": True})
    assert_eq(t5["serviceFee"] == 182, f"Multi-stop Fee is 182 (Got {t5['serviceFee']})")

    t6 = calculate_custom_work_price({"taskType": "unique_custom_task", "distanceKm": 5.0, "activeWorkMins": 30})
    assert_eq(t6["serviceFee"] == 175, f"Unique Custom Task Fee is 175 (Got {t6['serviceFee']})")

    t7 = calculate_custom_work_price({"taskType": "direct_pickup", "description": "cash transfer"})
    assert_eq(t7["success"] is False, "Cash transfer blocked by safety rules")

    print("\n--------------------------------------------------")
    print(f" RESULTS: {pass_cnt} Passed, {fail_cnt} Failed.")
    print("--------------------------------------------------\n")

if __name__ == "__main__":
    run_tests()
