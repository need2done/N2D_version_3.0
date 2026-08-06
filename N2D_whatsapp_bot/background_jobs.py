import asyncio
from datetime import datetime, timedelta
import logging
import traceback
from db.mysql_conn import get_db
from whatsapp_client import send_message, send_reply_buttons

logger = logging.getLogger("N2D_Bot")

async def check_home_service_timers():
    while True:
        try:
            db = get_db()
            if not db:
                await asyncio.sleep(60)
                continue
                
            cur = db.cursor(dictionary=True)
            cur.execute("""
                SELECT id, order_id, customer_number, helper_phone, service_end_time, payload, bill_amount 
                FROM orders 
                WHERE status='SERVICE_STARTED' 
                AND service_end_time IS NOT NULL 
                AND extension_status = 'NONE'
                AND TIMESTAMPDIFF(MINUTE, NOW(), service_end_time) = 15
            """)
            orders = cur.fetchall()
            
            for o in orders:
                try:
                    import json
                    payload = json.loads(o.get("payload", "{}"))
                    if payload.get("reminder_sent_15"):
                        continue
                    payload["reminder_sent_15"] = True
                    
                    cur.execute("UPDATE orders SET payload=%s WHERE id=%s", (json.dumps(payload), o["id"]))
                    db.commit()
                    
                    send_message(
                        o["customer_number"],
                        f"⏳ *Reminder: 15 Minutes Left*\n\nYour Home Service ({o['order_id']}) is scheduled to end in 15 minutes.\nIf the work needs more time, your professional can request an extension."
                    )
                    
                    p60, p30, p15 = 200, 100, 50
                    try:
                        base_price = float(o.get("bill_amount") or 200)
                        duration_str = payload.get("duration", "1 Hour")
                        base_mins = 60
                        if "1.5" in duration_str: base_mins = 90
                        elif "2" in duration_str: base_mins = 120
                        elif "3" in duration_str: base_mins = 180
                        price_per_min = base_price / base_mins
                        p60 = round(price_per_min * 60)
                        p30 = round(price_per_min * 30)
                        p15 = round(price_per_min * 15)
                    except:
                        pass
                    
                    send_reply_buttons(
                        o["helper_phone"],
                        f"⏳ *15 Minutes Remaining!*\n\nThe service for Order {o['order_id']} ends soon. If you need more time to finish the work, request an extension now:",
                        [
                            {"id": f"EXT_60|{o['id']}|{p60}", "title": f"1 Hr (+₹{p60})"},
                            {"id": f"EXT_30|{o['id']}|{p30}", "title": f"30 Mins (+₹{p30})"},
                            {"id": f"EXT_15|{o['id']}|{p15}", "title": f"15 Mins (+₹{p15})"}
                        ]
                    )
                except Exception as e:
                    logger.error(f"Error processing reminder for order {o['id']}: {e}")
                    
            cur.close()
            db.close()
        except Exception as e:
            logger.error(f"Error in timer background task: {e}")
            traceback.print_exc()
            
        await asyncio.sleep(60)
