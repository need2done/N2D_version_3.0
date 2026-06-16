import sys
import os

# Add N2D_whatsapp_bot directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'N2D_whatsapp_bot')))

# Mock whatsapp_client module to prevent external API calls
import types
sent_buttons = []
sent_messages = []

def mock_send_reply_buttons(to, body, buttons):
    sent_buttons.append({"to": to, "body": body, "buttons": buttons})

def mock_send_message(to, body):
    sent_messages.append({"to": to, "body": body})

class MockWhatsappClient(types.ModuleType):
    def __getattr__(self, name):
        if name == "send_reply_buttons":
            return mock_send_reply_buttons
        if name == "send_message":
            return mock_send_message
        return lambda *args, **kwargs: None

mock_whatsapp = MockWhatsappClient("whatsapp_client")
sys.modules["whatsapp_client"] = mock_whatsapp

from cases.case_ride import check_same_location, handle
from session_store import get_session, reset_session, start_confirming
from core.role_router import route_message

def test_check_same_location():
    print("Testing same location validation...")
    
    # Matching coordinates (< 50 meters)
    assert check_same_location(17.52655, 78.89768, "A", 17.52654, 78.89767, "B") is True
    
    # Different coordinates (> 50 meters)
    assert check_same_location(17.52655, 78.89768, "A", 17.51608, 78.88663, "B") is False
    
    # Matching text addresses
    assert check_same_location(None, None, "  Airport  ", None, None, "airport") is True
    
    # Different text addresses
    assert check_same_location(None, None, "Airport", None, None, "Railway Station") is False
    
    # Mixed: matching link address
    link = "https://maps.google.com/?q=17.52655,78.89768"
    assert check_same_location(None, None, link, None, None, "https://maps.google.com/?q=17.52655,78.89768") is True
    
    print("SUCCESS: Same location validation tests passed!")

def test_edit_pickup_direct_reentry():
    print("Testing direct re-entry when editing Pickup...")
    user = "919000000001"
    reset_session(user)
    session = get_session(user)
    
    # Setup state as editing pickup
    session["stage"] = "IN_CASE"
    session["case_state"] = "ASK_PICKUP"
    session["edit_mode"] = "PICKUP"
    session["data"] = {
        "pickup": "Old Pickup",
        "drop": "Drop Location Address",
        "vehicle": "AUTO",
        "pickup_lat": 17.52655,
        "pickup_lng": 78.89768,
        "drop_lat": 17.51608,
        "drop_lng": 78.88663,
    }
    
    global sent_buttons
    sent_buttons = []
    
    # Update pickup location (simulate user sending new pickup)
    res = handle(session, "New Pickup Location Address", {})
    
    assert res is None, "Should handle message internally and return None"
    assert session.get("edit_mode") is None, "edit_mode should be cleared"
    assert session.get("case_state") == "CONFIRM_RIDE", "Should transition directly to CONFIRM_RIDE summary page"
    assert session["data"]["pickup"] == "New Pickup Location Address"
    assert session["data"]["vehicle"] == "AUTO", "Vehicle should be preserved"
    assert len(sent_buttons) == 1, "Should send Ride Summary buttons"
    assert "Ride Summary" in sent_buttons[0]["body"]
    assert any(btn["id"] == "RIDE_OK" for btn in sent_buttons[0]["buttons"])
    
    print("SUCCESS: Direct re-entry when editing Pickup tests passed!")

def test_edit_drop_direct_reentry():
    print("Testing direct re-entry when editing Drop...")
    user = "919000000002"
    reset_session(user)
    session = get_session(user)
    
    # Setup state as editing drop
    session["stage"] = "IN_CASE"
    session["case_state"] = "ASK_DROP"
    session["edit_mode"] = "DROP"
    session["data"] = {
        "pickup": "Pickup Location Address",
        "drop": "Old Drop",
        "vehicle": "CAR",
        "pickup_lat": 17.52655,
        "pickup_lng": 78.89768,
        "drop_lat": 17.51608,
        "drop_lng": 78.88663,
    }
    
    global sent_buttons
    sent_buttons = []
    
    # Update drop location (simulate user sending new drop)
    res = handle(session, "New Drop Location Address", {})
    
    assert res is None, "Should handle message internally and return None"
    assert session.get("edit_mode") is None, "edit_mode should be cleared"
    assert session.get("case_state") == "CONFIRM_RIDE", "Should transition directly to CONFIRM_RIDE summary page"
    assert session["data"]["drop"] == "New Drop Location Address"
    assert session["data"]["vehicle"] == "CAR", "Vehicle should be preserved"
    assert len(sent_buttons) == 1, "Should send Ride Summary buttons"
    assert "Ride Summary" in sent_buttons[0]["body"]
    
    print("SUCCESS: Direct re-entry when editing Drop tests passed!")

def test_double_confirm():
    print("Testing double confirm lock for Ride flow...")
    user = "919000000003"
    reset_session(user)
    session = get_session(user)
    
    session["stage"] = "IN_CASE"
    session["case_state"] = "CONFIRM_RIDE"
    
    # First confirm succeeds
    assert start_confirming(user) is True, "First confirm should succeed"
    assert session.get("case_state") == "CONFIRMING", "State should transition to CONFIRMING"
    
    # Second confirm fails
    assert start_confirming(user) is False, "Second confirm should fail (lock active)"
    
    reset_session(user)
    print("SUCCESS: Double confirm lock tests passed!")

def test_expired_button_protection():
    print("Testing expired Ride button protection...")
    user = "919000000004"
    reset_session(user)
    session = get_session(user)
    
    # Session is NOT in active ride case (stage is ASK_NAME or service is not 4)
    session["stage"] = "ASK_NAME"
    session["service"] = None
    
    global sent_messages
    sent_messages = []
    
    # Simulate receiving an interactive button click RIDE_OK
    msg = {
        "type": "interactive",
        "interactive": {
            "button_reply": {
                "id": "RIDE_OK",
                "title": "Confirm"
            }
        }
    }
    
    route_message(user, "RIDE_OK", msg)
    
    # Verification: should send session expired message
    assert len(sent_messages) > 0, "Should send a response"
    assert any("expired" in m["body"].lower() for m in sent_messages), "Should contain expired session warning"
    
    print("SUCCESS: Expired Ride button protection tests passed!")

if __name__ == "__main__":
    print("=== STARTING RIDE FLOW VALIDATION TESTS ===")
    test_check_same_location()
    test_edit_pickup_direct_reentry()
    test_edit_drop_direct_reentry()
    test_double_confirm()
    test_expired_button_protection()
    print("=== ALL RIDE TESTS PASSED ===")
