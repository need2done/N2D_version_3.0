import sys
import os

# Add N2D_whatsapp_bot directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'N2D_whatsapp_bot')))

from cases.case4_medicine import (
    is_valid_item_text,
    merge_items_list,
    requires_prescription,
    validate_prescription
)
from session_store import get_session, reset_session, start_confirming

def test_is_valid_item_text():
    print("Testing medicine item alphanumeric validation...")
    assert is_valid_item_text("Paracetamol") is True
    assert is_valid_item_text("Dolo 650 - 2 strips") is True
    assert is_valid_item_text("💊💊💊") is False
    assert is_valid_item_text("123456") is False
    assert is_valid_item_text("@@@@") is False
    print("SUCCESS: Alphanumeric validation tests passed!")

def test_merge_items_list():
    print("Testing medicine duplicate merging...")
    items = ["Paracetamol 2 strips", "Vitamin C", "Paracetamol 1 strip"]
    merged = merge_items_list(items)
    print("Merged medicines list:", merged)
    assert any("Paracetamol 3 strips" in item for item in merged), "Paracetamol duplicate merging failed"
    assert any("Vitamin C 1" in item for item in merged), "Vitamin C not captured"
    print("SUCCESS: Medicine duplicate merging tests passed!")

def test_requires_prescription():
    print("Testing restricted prescription medicines detection...")
    assert requires_prescription(["Paracetamol", "Dolo 650"]) is False
    assert requires_prescription(["Amoxicillin", "Paracetamol"]) is True
    assert requires_prescription(["Azithromycin"]) is True
    assert requires_prescription(["Antibiotic tablet"]) is True
    print("SUCCESS: Restricted medicines detection passed!")

def test_validate_prescription():
    print("Testing prescription vision and rule simulation...")
    # Happy clear path
    valid, err, warnings = validate_prescription("Clear doctor signature")
    assert valid is True and not err and not warnings, "Clear prescription failed"
    
    # Blurred photo
    valid, err, warnings = validate_prescription("blurred prescription")
    assert valid is False and "blurred" in err.lower()
    
    # Dark photo
    valid, err, warnings = validate_prescription("dark prescription image")
    assert valid is False and "dark" in err.lower()
    
    # Expired warning
    valid, err, warnings = validate_prescription("expired prescription doc")
    assert valid is True and any("expired" in w.lower() for w in warnings)
    
    # No Doctor name / info warning
    valid, err, warnings = validate_prescription("no doctor info on sheet")
    assert valid is True and any("doctor" in w.lower() for w in warnings)
    
    # PDF check simulation
    valid, err, warnings = validate_prescription("prescription info", "presc_wrong_aadhaar.pdf")
    assert valid is False and "invalid" in err.lower()
    
    print("SUCCESS: Prescription validation tests passed!")

def test_double_confirm():
    print("Testing double click confirm protection for medicines...")
    user = "918888888888"
    reset_session(user)
    session = get_session(user)
    
    session["stage"] = "IN_CASE"
    session["case_state"] = "SUMMARY"
    
    # First click
    res1 = start_confirming(user)
    assert res1 is True
    assert session["case_state"] == "CONFIRMING"
    
    # Second click
    res2 = start_confirming(user)
    assert res2 is False
    
    reset_session(user)
    print("SUCCESS: Double click confirm protection tests passed!")

if __name__ == "__main__":
    print("=== STARTING MEDICINE FLOW VALIDATION TESTS ===")
    test_is_valid_item_text()
    test_merge_items_list()
    test_requires_prescription()
    test_validate_prescription()
    test_double_confirm()
    print("=== ALL MEDICINES TESTS PASSED ===")
