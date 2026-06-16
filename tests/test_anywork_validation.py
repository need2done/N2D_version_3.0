import sys
import os

# Add N2D_whatsapp_bot directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'N2D_whatsapp_bot')))

from cases.case1_type import (
    is_valid_item_text,
    check_anywork_policy
)
from session_store import get_session, reset_session

def test_is_valid_item_text():
    print("Testing AnyWork description validation...")
    assert is_valid_item_text("Pick up parcel from Shop A") is True
    assert is_valid_item_text("Bring charger") is True
    assert is_valid_item_text("🧐🧐🧐") is False
    assert is_valid_item_text("123456") is False
    assert is_valid_item_text("@@@@") is False
    print("SUCCESS: AnyWork description validation passed!")

def test_check_anywork_policy():
    print("Testing AnyWork restricted task policies...")
    # Alcohol
    allowed, msg, warn = check_anywork_policy("Bring alcohol and beer")
    assert allowed is False and "alcohol" in msg.lower(), "Alcohol check failed"
    
    # Cigarettes
    allowed, msg, warn = check_anywork_policy("Buy cigarettes from shop")
    assert allowed is False and "tobacco" in msg.lower(), "Cigarette check failed"
    
    # Medicines
    allowed, msg, warn = check_anywork_policy("Bring my prescription medicine")
    assert allowed is False and "medicines service" in msg.lower(), "Medicines redirect failed"
    
    # Money transfer
    allowed, msg, warn = check_anywork_policy("Please transfer money to my friend")
    assert allowed is False and "money transfer" in msg.lower(), "Money transfer check failed"
    
    # Passport
    allowed, msg, warn = check_anywork_policy("Collect my passport from visa center")
    assert allowed is True and "passport" in warn.lower(), "Passport warning check failed"
    
    # Safe task
    allowed, msg, warn = check_anywork_policy("Deliver a gift to my friend")
    assert allowed is True and not msg and not warn, "Safe task failed policy check"
    
    print("SUCCESS: AnyWork policy checks passed!")

if __name__ == "__main__":
    print("=== STARTING ANYWORK FLOW VALIDATION TESTS ===")
    test_is_valid_item_text()
    test_check_anywork_policy()
    print("=== ALL ANYWORK TESTS PASSED ===")
