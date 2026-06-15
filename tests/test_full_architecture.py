import requests
import time
import uuid

# Configuration
WEBHOOK_URL = "http://127.0.0.1:5000/api/webhook/whatsapp"
CUSTOMER_PHONE = "919876543210"
HELPER_PHONE = "919999999999"  # Ensure this is an active helper in your DB
TEST_MSG_ID_PREFIX = f"test_{uuid.uuid4().hex[:6]}_"
msg_counter = 0

def send_webhook(phone, text=None, interactive_btn_id=None, list_reply_id=None, location=None):
    global msg_counter
    msg_counter += 1
    msg_id = f"{TEST_MSG_ID_PREFIX}{msg_counter}"
    
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "1234567890",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "1234", "phone_number_id": "1234"},
                    "contacts": [{"profile": {"name": "Test User"}, "wa_id": phone}],
                    "messages": [{
                        "from": phone,
                        "id": msg_id,
                        "timestamp": str(int(time.time()))
                    }]
                },
                "field": "messages"
            }]
        }]
    }
    
    msg_obj = payload["entry"][0]["changes"][0]["value"]["messages"][0]
    
    if interactive_btn_id:
        msg_obj["type"] = "interactive"
        msg_obj["interactive"] = {
            "type": "button_reply",
            "button_reply": {"id": interactive_btn_id, "title": "Button"}
        }
    elif list_reply_id:
        msg_obj["type"] = "interactive"
        msg_obj["interactive"] = {
            "type": "list_reply",
            "list_reply": {"id": list_reply_id, "title": "List Item"} # E.g. SERVICE_1
        }
    elif location:
        msg_obj["type"] = "location"
        msg_obj["location"] = location # {"latitude": xxx, "longitude": yyy}
    else:
        msg_obj["type"] = "text"
        msg_obj["text"] = {"body": text}
        
    try:
        res = requests.post(WEBHOOK_URL, json=payload, timeout=5)
        print(f"[{phone}] Sent payload. Status: {res.status_code}")
    except Exception as e:
        print(f"❌ Failed to reach {WEBHOOK_URL}: {e}")

def run_test():
    print("[INFO] STARTING END-TO-END FLOW: WhatsApp -> Node Proxy -> Python Bot -> DB")
    
    print("\n1. Customer sends 'hi'")
    send_webhook(CUSTOMER_PHONE, text="hi")
    time.sleep(1)
    
    print("\n2. Customer replies with their name")
    send_webhook(CUSTOMER_PHONE, text="Test Customer")
    time.sleep(1)
    
    print("\n3. Customer selects Service (Groceries = SERVICE_1)")
    send_webhook(CUSTOMER_PHONE, list_reply_id="SERVICE_1")
    time.sleep(1)

    print("\n3.1. Customer selects 'Type items' (C1_ITEM_TEXT)")
    send_webhook(CUSTOMER_PHONE, interactive_btn_id="C1_ITEM_TEXT")
    time.sleep(1)
    
    print("\n4. Customer sends Grocery list")
    send_webhook(CUSTOMER_PHONE, text="Milk, Bread, Eggs")
    time.sleep(1)

    print("\n4.1. Customer selects 'No more items' (C1_ADD_NO)")
    send_webhook(CUSTOMER_PHONE, interactive_btn_id="C1_ADD_NO")
    time.sleep(1)
    
    print("\n5. Customer sends Location")
    send_webhook(CUSTOMER_PHONE, location={"latitude": 17.3850, "longitude": 78.4867})
    time.sleep(1)

    print("\n5.1. Customer sends Cost (500)")
    send_webhook(CUSTOMER_PHONE, text="500")
    time.sleep(1)
    
    print("\n6. Customer confirms order ('C1_CONFIRM')")
    send_webhook(CUSTOMER_PHONE, interactive_btn_id="C1_CONFIRM")
    time.sleep(1)
    
    print("\n[SUCCESS] Simulation messages sent. Check the backend logs and database for completion!")
    
    print("\n[SUCCESS] Simulation messages sent. Check the backend logs and database for completion!")

if __name__ == "__main__":
    run_test()
