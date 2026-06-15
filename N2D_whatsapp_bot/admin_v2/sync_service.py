from db.mysql_conn import get_db
import uuid
import random
import string
import requests  # 🆕 NEW

# 🆕 SAFE IMPORT
try:
    from db.order_repo import get_order
except:
    get_order = None


# ==========================================
# 🔥 GENERATE GGO ORDER ID
# ==========================================
def generate_order_id():
    return "GGO" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


# ==========================================
# 🚀 SAFE DISPATCH (CRITICAL FIX)
# ==========================================
def safe_dispatch_order(order_id: str, phone: str):

    if not get_order:
        print("⚠️ get_order not available, skipping dispatch")
        return

    try:
        order = get_order(order_id)

        if not order:
            print("❌ Order not found → skip dispatch")
            return

        # 🚨 CRITICAL FIX 1
        if order.get("helper_id") is not None:
            print(f"🚫 Order {order_id} already assigned → BLOCK dispatch")
            return

        # 🚨 CRITICAL FIX 2
        if order.get("status") != "CONFIRMED":
            print(f"🚫 Order {order_id} not CONFIRMED → BLOCK dispatch")
            return

        print(f"📡 Dispatching order {order_id} to {phone}")

        requests.post(
            "http://localhost:5000/internal/send-order-offer",
            json={
                "order_id": order_id,
                "phone": phone
            },
            timeout=5
        )

    except Exception as e:
        print("❌ Dispatch failed:", str(e))


# ==========================================
# MAIN SYNC FUNCTION
# ==========================================
def sync_new_order(order_data: dict):

    db = None
    cursor = None

    try:
        print("📡 Syncing order:", order_data)

        db = get_db()
        cursor = db.cursor(dictionary=True, buffered=True)

        customer_phone = order_data.get("customer_number", "")
        customer_name = order_data.get("customer_name", "Guest")
        engine_type = order_data.get("engine_type", "TASK")
        lat = order_data.get("customer_lat")
        lng = order_data.get("customer_lng")
        service = order_data.get("service", "General")
        total_amount = order_data.get("total_amount", 0)
        platform_fee = order_data.get("platform_fee", 0)
        helper_charge = order_data.get("helper_charge", 0)

        # ==========================================
        # 🚨 ORDER ID FIX
        # ==========================================
        incoming_order_id = order_data.get("order_id")

        if not incoming_order_id or str(incoming_order_id).isdigit():
            order_id = generate_order_id()
            print("⚠️ Converted to GGO order_id:", order_id)
        else:
            order_id = str(incoming_order_id)

        message_id = order_data.get("message_id")

        # ==========================================
        # 🚨 DUPLICATE CHECK
        # ==========================================
        cursor.execute("""
            SELECT id FROM orders 
            WHERE order_id = %s
        """, (order_id,))

        existing_order = cursor.fetchone()

        if existing_order:
            print("⚠️ Order already exists, skipping insert but updating fees & continuing dispatch:", order_id)
            cursor.execute(
                "UPDATE orders SET platform_fee = %s, helper_charge = %s WHERE order_id = %s",
                (platform_fee, helper_charge, order_id)
            )
            db.commit()
            # We don't return False because we want the safe_dispatch to happen
        else:
            # ==========================================
            # CUSTOMER CHECK
            # ==========================================
            cursor.execute(
                "SELECT id FROM customers WHERE phone = %s",
                (customer_phone,)
            )
            customer = cursor.fetchone()

            if customer:
                customer_id = customer["id"]
            else:
                cursor.execute(
                    "INSERT INTO customers (phone, name) VALUES (%s, %s)",
                    (customer_phone, customer_name)
                )
                db.commit()
                customer_id = cursor.lastrowid

            # ==========================================
            # INSERT ORDER
            # ==========================================
            query = """
                INSERT INTO orders (
                    order_id,
                    message_id,
                    customer_id,
                    customer_number,
                    customer_name,
                    engine_type,
                    customer_lat,
                    customer_lng,
                    service,
                    status,
                    total_amount,
                    platform_fee,
                    helper_charge,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """

            cursor.execute(query, (
                order_id,
                message_id,
                customer_id,
                customer_phone,
                customer_name,
                engine_type,
                lat,
                lng,
                service,
                "CONFIRMED",
                total_amount,
                platform_fee,
                helper_charge
            ))

            db.commit()
            print("✅ Admin dashboard sync SUCCESS:", order_id)

        # ==========================================
        # 🚀 NEW: CONTROLLED DISPATCH
        # ==========================================
        helper_phone = order_data.get("helper_phone")

        if helper_phone:
            safe_dispatch_order(order_id, helper_phone)
        else:
            print("ℹ️ No helper_phone provided → dispatch skipped")

        return True


    except Exception as e:
        print("❌ Admin dashboard sync FAILED:", str(e))
        import traceback
        traceback.print_exc()
        return False

    finally:
        try:
            if cursor:
                cursor.close()
        except:
            pass

        try:
            if db:
                db.close()
        except:
            pass