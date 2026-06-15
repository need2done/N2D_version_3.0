import sys
import os
import datetime

# Add N2D_whatsapp_bot directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'N2D_whatsapp_bot')))

from cases.case1_type import is_valid_item_text, merge_items_list
from session_store import get_session, reset_session, start_confirming
from db.order_repo import submit_otp

def test_item_validation():
    print("Testing item validation...")
    assert is_valid_item_text("Eggs 6") is True, "Valid alpha-numeric list failed"
    assert is_valid_item_text("🥛 Milk") is True, "Valid emoji + text list failed"
    assert is_valid_item_text("🥚🥚🥚") is False, "Emoji-only list accepted"
    assert is_valid_item_text("12345") is False, "Numbers-only list accepted"
    assert is_valid_item_text("@@@@") is False, "Special characters-only list accepted"
    print("SUCCESS: Item validation tests passed!")

def test_item_merging():
    print("Testing item duplicate merging...")
    items = ["Milk 1", "Milk 2", "Eggs 6", "Rice 5kg", "Milk 2 packets"]
    merged = merge_items_list(items)
    
    # Expected results:
    # Milk 1 + Milk 2 = Milk 3
    # Milk 2 packet = Milk 2 packets (different unit, kept separate or merged? Since units differ, kept separate)
    # Eggs 6
    # Rice 5 kg
    print("Merged items list:", merged)
    assert any("Milk 3" in item for item in merged), "Milk 1 and Milk 2 not merged to Milk 3"
    assert any("Eggs 6" in item for item in merged), "Eggs 6 not in merged"
    assert any("Rice 5" in item for item in merged), "Rice 5kg not in merged"
    print("SUCCESS: Item duplicate merging tests passed!")

def test_double_confirm():
    print("Testing double click order protection...")
    user = "919999999999"
    reset_session(user)
    session = get_session(user)
    
    session["stage"] = "IN_CASE"
    session["case_state"] = "SUMMARY"
    
    # First click should succeed
    res1 = start_confirming(user)
    assert res1 is True, "First confirm attempt failed"
    assert session["case_state"] == "CONFIRMING", "State did not transition to CONFIRMING"
    
    # Second click should fail
    res2 = start_confirming(user)
    assert res2 is False, "Second confirm attempt succeeded (double-click bug!)"
    
    reset_session(user)
    print("SUCCESS: Double click confirm protection tests passed!")

if __name__ == "__main__":
    print("=== STARTING GROCERIES FLOW VALIDATION TESTS ===")
    test_item_validation()
    test_item_merging()
    test_double_confirm()
    print("=== ALL LOCAL TESTS PASSED ===")
