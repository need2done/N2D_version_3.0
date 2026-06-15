# Need2Done: Customer Request Flow

This document illustrates the step-by-step journey of a customer order, from the initial WhatsApp message to the final delivery.

## 🔄 Lifecycle Visualization

![Customer Request Flow](/C:/Users/chakr/.gemini/antigravity/brain/83941314-5f21-4425-ac26-54939e692c87/n2d_customer_request_flow_diagram_1778181704839.png)

---

## 🛠️ Technical Step-by-Step Flow

### **Step 1: Initiation**
*   **Action**: Customer sends a message (e.g., "Hi") to the WhatsApp Business number.
*   **Behind the Scenes**: Meta Cloud API triggers a webhook to your **Ngrok** URL, which forwards the payload to the **Python Bot (app.py)**.

### **Step 2: Service Selection**
*   **Action**: The Bot responds with an interactive menu (Task, Ride, AnyWork).
*   **Behind the Scenes**: The `router.py` identifies the user as a customer and uses `send_interactive_list` to present options.

### **Step 3: Detail Gathering**
*   **Action**: Customer provides details (Items list for Task, Pickup/Drop for Ride).
*   **Behind the Scenes**: The Bot parses text or downloads voice notes, storing the data in a JSON `payload` field in the database.

### **Step 4: Pricing & Confirmation**
*   **Action**: Bot calculates the estimated cost and distance, then asks for confirmation.
*   **Behind the Scenes**: The **Pricing Engine** calculates proximity to the nearest available helper and adds the platform fees.

### **Step 5: Assignment (Broadcast)**
*   **Action**: The order is broadcasted to all "ONLINE" helpers within range.
*   **Behind the Scenes**: `push_unassigned_orders_to_helper` sends a WhatsApp message with an **[Accept]** button to multiple agents.

### **Step 6: Real-time Tracking**
*   **Action**: A helper accepts. The Customer receives a **Live Tracking Link**.
*   **Behind the Scenes**: The Node.js backend generates a secure token and serves the map web-page via `/track/:token`.
