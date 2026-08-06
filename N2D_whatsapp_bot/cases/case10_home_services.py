import traceback
from typing import Optional, Dict, Any

from whatsapp_client import send_payment_button
from config import TRACKING_BASE_URL

def handle(
    session: Dict[str, Any],
    text: Optional[str],
    raw: Optional[Dict[str, Any]]
) -> Optional[str]:
    """
    Home Services ordering flow (Service ID: 10).
    Unlike other services, the checkout and payment happens entirely on the website.
    The bot just sends the secure link.
    """
    user_phone = session.get("user_id")

    try:
        import base64
        encoded_phone = base64.b64encode(user_phone.encode('utf-8')).decode('utf-8')
        
        # Just send the link and exit the flow (or we can keep it in state if needed, but website webhook finishes it)
        url = f"{TRACKING_BASE_URL}/home-services?customerId={encoded_phone}"
        welcome_msg = "Welcome to *Need2Done Home Services*! 🏠\n\nPlease click the button below to explore our services, configure your booking, and complete your payment online:"
        
        send_payment_button(
            to=user_phone,
            body=welcome_msg,
            button_text="Open Home Services",
            url=url
        )
        
        # Clear the service case state since the rest is handled via web/webhook
        session["stage"] = "IDLE"
        session["service"] = None
        session["case_state"] = ""
        
        return None

    except Exception as e:
        print("Exception in Home Services flow:")
        traceback.print_exc()
        return "❌ An error occurred while generating your secure link. Please try again later."
