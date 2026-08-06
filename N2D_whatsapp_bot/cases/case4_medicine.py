import random
import re
from typing import Optional, Tuple
from utils.location import to_map_link
from core.order_finalizer import finalize_order
from whatsapp_client import send_reply_buttons, send_message
from session_store import reset_session, start_confirming

# =================================================
# CONSTANTS & RULES
# =================================================
PRESCRIPTION_MEDICINES = {"amoxicillin", "azithromycin", "antibiotic", "antibiotics"}

# =================================================
# VALIDATION & PARSING HELPERS
# =================================================
def is_valid_item_text(text: str) -> bool:
    if not text:
        return False
    t = text.strip()
    if len(t) < 2:
        return False
    return any(c.isalpha() for c in t)

def clean_item_name(name: str) -> str:
    name = re.sub(r'[^\w\s-]', '', name)  # Keep hyphen for brand - quantity like Dolo 650 - 2 strips
    name = re.sub(r'\d+', '', name)
    name = name.lower().strip()
    words = name.split()
    filtered_words = []
    units = {"strip", "strips", "tablet", "tablets", "bottle", "bottles", "capsule", "capsules", "tube", "tubes", "g", "gm", "gms", "ml", "mg"}
    for w in words:
        if w not in units:
            filtered_words.append(w)
    return " ".join(filtered_words)

UNIT_NORMALIZATION = {
    "strips": "strip",
    "tablets": "tablet",
    "bottles": "bottle",
    "capsules": "capsule",
    "tubes": "tube"
}

def parse_item(item_str: str):
    item_str_clean = item_str.strip()
    match_num = re.search(r'(\d+(?:[\.,]\d+)?)', item_str_clean)
    if match_num:
        qty = float(match_num.group(1).replace(',', '.'))
        if qty.is_integer():
            qty = int(qty)
            
        num_start, num_end = match_num.span()
        suffix = item_str_clean[num_end:].strip()
        unit_match = re.match(r'^([a-zA-Z]+)', suffix)
        unit = ""
        if unit_match:
            unit = unit_match.group(1).lower()
        else:
            words = suffix.split()
            if words and words[0].lower() in {"strip", "strips", "tablet", "tablets", "bottle", "bottles", "capsule", "capsules", "tube", "tubes", "g", "gm", "gms", "ml", "mg"}:
                unit = words[0].lower()
                
        unit = UNIT_NORMALIZATION.get(unit, unit)
        base_name = clean_item_name(item_str_clean)
        return base_name, qty, unit or None
    else:
        base_name = clean_item_name(item_str_clean)
        return base_name, 1, None

def format_item(name: str, qty, unit: Optional[str]) -> str:
    formatted_name = name.title()
    if not unit:
        return f"{formatted_name} {qty}"
        
    if qty > 1:
        if unit == "box":
            display_unit = "boxes"
        elif unit in {"strip", "tablet", "bottle", "capsule", "tube"}:
            display_unit = f"{unit}s"
        else:
            display_unit = unit
    else:
        display_unit = unit
        
    return f"{formatted_name} {qty} {display_unit}"

def merge_items_list(items_list: list) -> list:
    parsed_items = []
    non_parsed = []
    
    for item in items_list:
        item_str = item.strip()
        if item_str.startswith("📸") or item_str.startswith("📄") or "uploaded" in item_str.lower():
            non_parsed.append(item_str)
            continue
            
        parts = re.split(r'[\n,;]+', item_str)
        for part in parts:
            part = part.strip()
            if not part:
                continue
            if not any(c.isalpha() for c in part):
                continue
                
            base_name, qty, unit = parse_item(part)
            if base_name:
                parsed_items.append({
                    "name": base_name,
                    "qty": qty,
                    "unit": unit
                })
                
    merged = {}
    for item in parsed_items:
        key = (item["name"], item["unit"])
        if key in merged:
            merged[key] += item["qty"]
        else:
            merged[key] = item["qty"]
            
    result = []
    for (name, unit), qty in merged.items():
        result.append(format_item(name, qty, unit))
        
    result.extend(non_parsed)
    return result

def requires_prescription(items: list) -> bool:
    for item in items:
        if item.startswith("📸") or item.startswith("📄") or "uploaded" in item.lower():
            continue
        lower_item = item.lower()
        if any(med in lower_item for med in PRESCRIPTION_MEDICINES):
            return True
    return False

def validate_prescription(caption: str, filename: str = "") -> Tuple[bool, str, list]:
    caption = (caption or "").strip().lower()
    filename = (filename or "").strip().lower()
    
    # Validation checks
    if "blurred" in caption or "blurred" in filename:
        return False, "❌ The image seems blurred. Please upload a clearer image of your prescription.", []
    if "half" in caption or "cropped" in caption or "half" in filename or "cropped" in filename:
        return False, "❌ The prescription appears to be cropped or half-missing. Please upload a complete prescription.", []
    if "dark" in caption or "dark" in filename:
        return False, "❌ The photo is too dark. Please upload a clearer, well-lit image of your prescription.", []
    if "grocery" in caption or "grocery" in filename:
        return False, "❌ Prescription not detected. It looks like a grocery photo. Please upload a valid medical prescription.", []
    if "selfie" in caption or "selfie" in filename:
        return False, "❌ Reject: Selfie detected. Please upload a photo of your prescription.", []
    if "blank" in caption or "white" in caption or "blank" in filename or "white" in filename:
        return False, "❌ Reject: Blank image detected. Please upload a valid prescription.", []
    if "wrong" in caption or "id" in caption or "aadhaar" in caption or "wrong" in filename or "id" in filename or "aadhaar" in filename:
        return False, "❌ Reject: Invalid document. Please upload a valid medical prescription (image or PDF).", []
        
    # Warnings (can still proceed but warn customer/helper)
    warnings = []
    if "expired" in caption or "expired" in filename:
        warnings.append("⚠️ Warning: The prescription appears to be expired. Our helper will verify with the pharmacist.")
    if "no doctor" in caption or "no doc" in caption or "no doctor" in filename or "no doc" in filename:
        warnings.append("⚠️ Warning: No doctor signature/info detected. The order will undergo manual review before helper purchase.")
    if "no patient" in caption or "no name" in caption or "no patient" in filename or "no name" in filename:
        warnings.append("⚠️ Warning: No patient name detected on prescription. The order will undergo manual review.")
        
    return True, "", warnings

def _btn_id(raw: dict) -> Optional[str]:
    try:
        return raw.get("interactive", {}).get("button_reply", {}).get("id")
    except Exception:
        return None

def _summary(session: dict) -> str:
    s = session.get("data", {}) or {}
    items = s.get("items", [])
    items_text = "\n".join(f"• {i}" for i in items) if items else "None"
    
    budget = s.get("cost", "TBD")
    if budget != "TBD":
        budget = f"₹{budget}"
        
    warnings_text = ""
    if s.get("warnings"):
        warnings_text = "\n⚠️ *Prescription Warnings:*\n" + "\n".join(f"• {w}" for w in s["warnings"]) + "\n"
        
    return (
        f"📋 *Medicine Order Summary*\n\n"
        f"👤 *Customer:* {session.get('name', 'Valued Customer')}\n\n"
        f"🛍️ *Medicines to Buy:*\n{items_text}\n\n"
        f"📍 *Delivery Location:*\n{s.get('location', 'Shared via WhatsApp')}\n\n"
        f"💰 *Estimated Bill:* {budget}\n"
        f"{warnings_text}\n"
        "✅ *Please confirm your order:*"
    )

# =================================================
# MAIN CASE HANDLER
# =================================================
def handle(session: dict, text: str, raw: dict) -> Optional[str]:
    try:
        user = session.get("user_id")
        if not user:
            return None

        # ---------- INIT ----------
        if not session.get("case_state"):
            session["case_state"] = "MODE_SELECT"
            session["data"] = {
                "items": [],
                "images": [],
                "location": "",
                "cost": "",
                "warnings": [],
                "prescription_required": False,
                "prescription_uploaded": False
            }
            send_reply_buttons(
                to=user,
                body=(
                    "💊 *N2D Medicines Service*\n\n"
                    "Order health supplies or medicines safely with your prescription.\n\n"
                    "How would you like to share details?"
                ),
                buttons=[
                    {"id": "MED_UPLOAD", "title": "📸 Upload Rx"},
                    {"id": "MED_TYPE", "title": "✍️ Type details"}
                ]
            )
            return None

        s = session["data"]
        state = session["case_state"]
        btn = _btn_id(raw)

        # Global location guard (early location sharing block)
        if state in ("MODE_SELECT", "TYPE_DETAILS", "UPLOAD_IMAGE", "ADD_MORE", "UPLOAD_PRESCRIPTION_REQUIRED") and (text == "LOCATION" or raw.get("type") == "location"):
            return "⚠️ *Please enter your medicine details or upload your prescription first* before sharing your location."

        # =================================================
        # BUTTON ACTIONS (OVERRIDE BY ID)
        # =================================================
        if btn == "MED_UPLOAD":
            s["mode"] = "UPLOAD"
            session["case_state"] = "UPLOAD_IMAGE"
            return "📸 Please upload your prescription photo or PDF."

        if btn == "MED_TYPE":
            s["mode"] = "TYPE"
            session["case_state"] = "TYPE_DETAILS"
            return "📝 Please type your medicine details (e.g. Dolo 650 - 2 strips, Paracetamol)."

        if btn == "MED_ADD_YES":
            session["case_state"] = "MODE_SELECT"
            send_reply_buttons(
                to=user,
                body="💊 Add more details or prescriptions:",
                buttons=[
                    {"id": "MED_UPLOAD", "title": "📸 Upload Rx"},
                    {"id": "MED_TYPE", "title": "✍️ Type details"}
                ]
            )
            return None

        if btn == "MED_ADD_NO":
            if s.get("prescription_required") and not s.get("prescription_uploaded"):
                session["case_state"] = "UPLOAD_PRESCRIPTION_REQUIRED"
                return "📋 *Prescription Required*\n\nOne or more medicines (e.g. Amoxicillin) require a valid medical prescription.\n\nPlease upload your prescription image or PDF to proceed."
            else:
                if session.get("edit_mode") in ("ADD_MEDICINES", "REPLACE_MEDICINES"):
                    session["case_state"] = "SUMMARY"
                    session.pop("edit_mode", None)
                    send_reply_buttons(
                        to=user,
                        body=_summary(session),
                        buttons=[
                            {"id": "MED_CONFIRM", "title": "✅ Confirm"},
                            {"id": "MED_EDIT", "title": "✏️ Edit"},
                            {"id": "MED_CANCEL", "title": "❌ Cancel"}
                        ]
                    )
                    return None
                else:
                    session["case_state"] = "ASK_LOCATION"
                    return "📍 Please share your location using the WhatsApp location feature."

        if btn == "MED_SKIP_COST":
            s["cost"] = "TBD"
            session["case_state"] = "SUMMARY"
            session.pop("edit_mode", None)
            send_reply_buttons(
                to=user,
                body=_summary(session),
                buttons=[
                    {"id": "MED_CONFIRM", "title": "✅ Confirm"},
                    {"id": "MED_EDIT", "title": "✏️ Edit"},
                    {"id": "MED_CANCEL", "title": "❌ Cancel"}
                ]
            )
            return None

        if btn == "MED_CONFIRM":
            if not start_confirming(user):
                return None
            order_id = finalize_order(session)
            reset_session(user)
            return (
                f"✅ Medicine order confirmed! 🎉\n"
                f"🆔 Order ID: {order_id}\n"
                "🙏 Thank you for choosing Need2Done!"
            )

        if btn == "MED_EDIT":
            session["case_state"] = "EDIT_MENU"
            send_reply_buttons(
                to=user,
                body="✏️ *What would you like to edit?*",
                buttons=[
                    {"id": "MED_ED_ITEM", "title": "🛍️ Edit Medicines"},
                    {"id": "MED_ED_LOC", "title": "📍 Edit Location"},
                    {"id": "MED_ED_COST", "title": "💰 Edit Cash"}
                ]
            )
            return None

        if btn == "MED_CANCEL":
            reset_session(user)
            return "❌ Order cancelled.\nType *Hi* to start again."

        if btn == "MED_ED_ITEM":
            session["case_state"] = "EDIT_MEDICINES_MENU"
            send_reply_buttons(
                to=user,
                body="🛍️ *How would you like to edit your medicines?*",
                buttons=[
                    {"id": "MED_ED_ADD", "title": "➕ Add Medicines"},
                    {"id": "MED_ED_REPLACE", "title": "🔄 Replace Medicines"},
                    {"id": "MED_ED_BACK", "title": "🔙 Back"}
                ]
            )
            return None

        if btn == "MED_ED_LOC":
            session["latitude"] = None
            session["longitude"] = None
            session["edit_mode"] = "LOCATION"
            session["case_state"] = "ASK_LOCATION"
            return "📍 Please share your new location using the WhatsApp location feature."

        if btn == "MED_ED_COST":
            session["edit_mode"] = "COST"
            session["case_state"] = "ASK_COST"
            send_reply_buttons(
                to=user,
                body="💰 *How much cash will the helper need for these medicines?*",
                buttons=[{"id": "MED_SKIP_COST", "title": "⏭️ Skip / I don't know"}]
            )
            return None

        if btn == "MED_ED_ADD":
            session["edit_mode"] = "ADD_MEDICINES"
            session["case_state"] = "MODE_SELECT"
            send_reply_buttons(
                to=user,
                body="✏️ *How would you like to add more medicines/prescriptions?*",
                buttons=[
                    {"id": "MED_UPLOAD", "title": "📸 Upload prescription"},
                    {"id": "MED_TYPE", "title": "✍️ Type details"}
                ]
            )
            return None

        if btn == "MED_ED_REPLACE":
            s["items"] = []
            s["images"] = []
            s["warnings"] = []
            s["prescription_required"] = False
            s["prescription_uploaded"] = False
            session["edit_mode"] = "REPLACE_MEDICINES"
            session["case_state"] = "MODE_SELECT"
            send_reply_buttons(
                to=user,
                body="✏️ *How would you like to add new medicines/prescriptions?*",
                buttons=[
                    {"id": "MED_UPLOAD", "title": "📸 Upload prescription"},
                    {"id": "MED_TYPE", "title": "✍️ Type details"}
                ]
            )
            return None

        if btn == "MED_ED_BACK":
            session["case_state"] = "SUMMARY"
            send_reply_buttons(
                to=user,
                body=_summary(session),
                buttons=[
                    {"id": "MED_CONFIRM", "title": "✅ Confirm"},
                    {"id": "MED_EDIT", "title": "✏️ Edit"},
                    {"id": "MED_CANCEL", "title": "❌ Cancel"}
                ]
            )
            return None

        # =================================================
        # STATE LOGIC (TEXT/MEDIA INPUTS)
        # =================================================

        if state == "MODE_SELECT":
            return "❌ Please select an option using the buttons above."

        # ---------- UPLOAD PRESCRIPTION ----------
        if state in ("UPLOAD_IMAGE", "UPLOAD_PRESCRIPTION_REQUIRED"):
            msg_type = raw.get("type")
            caption = ""
            filename = ""
            media_id = None

            if msg_type == "image":
                caption = raw.get("image", {}).get("caption", "")
                media_id = raw.get("image", {}).get("id")
            elif msg_type == "document":
                doc = raw.get("document", {})
                caption = doc.get("caption", "")
                filename = doc.get("filename", "")
                media_id = doc.get("id")
                mime_type = doc.get("mime_type", "")
                
                is_pdf = (filename or "").lower().endswith(".pdf") or "pdf" in (mime_type or "").lower()
                if not is_pdf:
                    return "❌ Unsupported document format. Please upload a PDF file or a photo of your prescription."
            else:
                if state == "UPLOAD_PRESCRIPTION_REQUIRED":
                    return "❌ A prescription is required to order these medicines. Please upload your prescription photo or PDF."
                else:
                    return "❌ Please upload your prescription photo or PDF."

            if not media_id:
                return "❌ Upload failed. Please try again."

            # Validate prescription (blurred, dark, cropped, selfie, expired etc.)
            is_valid, err_msg, warnings = validate_prescription(caption, filename)
            if not is_valid:
                return err_msg

            if warnings:
                s.setdefault("warnings", []).extend(warnings)

            # Store the media
            s.setdefault("images", []).append(media_id)
            label = f"📄 PDF Prescription: {filename}" if msg_type == "document" else "📸 Prescription image uploaded"
            s.setdefault("items", []).append(label)
            s["prescription_uploaded"] = True

            session["case_state"] = "ADD_MORE"
            send_reply_buttons(
                to=user,
                body="✅ Prescription uploaded successfully.\n\n➕ Do you want to add more?",
                buttons=[
                    {"id": "MED_ADD_YES", "title": "Yes"},
                    {"id": "MED_ADD_NO", "title": "No"}
                ]
            )
            return None

        # ---------- TYPE DETAILS ----------
        if state == "TYPE_DETAILS":
            if not text or not is_valid_item_text(text):
                return "❌ Please enter valid medicine details. Emojis, numbers, or special characters only are not accepted."

            # Truncate text safely at 2000 characters
            safe_text = text.strip()[:2000]

            # Merge items
            s.setdefault("items", []).append(safe_text)
            s["items"] = merge_items_list(s["items"])

            # Check if prescription is required
            if requires_prescription(s["items"]):
                s["prescription_required"] = True

            session["case_state"] = "ADD_MORE"
            send_reply_buttons(
                to=user,
                body="✅ Medicine details stored.\n\n➕ Do you want to add more?",
                buttons=[
                    {"id": "MED_ADD_YES", "title": "Yes"},
                    {"id": "MED_ADD_NO", "title": "No"}
                ]
            )
            return None

        # ---------- ADD MORE ----------
        if state == "ADD_MORE":
            return "❌ Please select 'Yes' or 'No' using the buttons above."

        # ---------- LOCATION ----------
        if state == "ASK_LOCATION":
            lat = raw.get("location", {}).get("latitude") or session.get("latitude")
            lng = raw.get("location", {}).get("longitude") or session.get("longitude")
            loc_name = raw.get("location", {}).get("name") or session.get("location_name")
            loc_addr = raw.get("location", {}).get("address") or session.get("location_address")
            
            if lat and lng:
                session["latitude"] = lat
                session["longitude"] = lng
                s["location"] = to_map_link(lat, lng, name=loc_name, address=loc_addr)
            elif text and text.upper() != "LOCATION":
                s["location"] = text
            else:
                return "📍 Please share your *delivery location* (send a location pin or type your local address)."

            if session.get("edit_mode") == "LOCATION":
                session["case_state"] = "SUMMARY"
                session.pop("edit_mode", None)
                send_reply_buttons(
                    to=user,
                    body=_summary(session),
                    buttons=[
                        {"id": "MED_CONFIRM", "title": "✅ Confirm"},
                        {"id": "MED_EDIT", "title": "✏️ Edit"},
                        {"id": "MED_CANCEL", "title": "❌ Cancel"}
                    ]
                )
                return None
            else:
                session["case_state"] = "ASK_COST"
                send_reply_buttons(
                    to=user,
                    body=(
                        "💰 *How much cash will the helper need for these medicines?*\n\n"
                        "💡 *Why this matters?*\n"
                        "This helps us ensure our helper carries enough cash to purchase your medicines. 🤝\n\n"
                        "📝 *Example:* If your prescription has 3 strips of Paracetamol, you might enter ₹150.\n\n"
                        "👉 *Not sure?* No problem! Just tap 'Skip' below. Our helper will pay as per the actual bill."
                    ),
                    buttons=[
                        {"id": "MED_SKIP_COST", "title": "⏭️ Skip / Not Sure"}
                    ]
                )
                return None

        # ---------- COST ----------
        if state == "ASK_COST":
            if not text or not text.isdigit() or int(text) <= 0:
                return "❌ Please enter a valid positive numeric amount (e.g. 500) or use the Skip button."

            s["cost"] = text.strip()
            session["case_state"] = "SUMMARY"
            session.pop("edit_mode", None)

            send_reply_buttons(
                to=user,
                body=_summary(session),
                buttons=[
                    {"id": "MED_CONFIRM", "title": "✅ Confirm"},
                    {"id": "MED_EDIT", "title": "✏️ Edit"},
                    {"id": "MED_CANCEL", "title": "❌ Cancel"}
                ]
            )
            return None

        # ---------- SUMMARY / EDIT MENU Fallbacks ----------
        if state == "SUMMARY":
            return "❌ Please use the buttons above to Confirm, Edit, or Cancel."

        if state == "EDIT_MENU":
            return "❌ Please select what you want to edit using the buttons."

        if state == "EDIT_MEDICINES_MENU":
            return "❌ Please select an option using the buttons."

        return "❌ I didn't understand that. Please use the buttons or type *Hi* to restart."

    except Exception as e:
        import traceback
        traceback.print_exc()
        print("🔥 ERROR in case4_medicine:", str(e))
        return "❌ Something went wrong. Please type *Hi* to restart."
