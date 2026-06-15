# Need2Done: The Definitive Project Guide & SOP
**Comprehensive Documentation: From Inception to Operational Excellence**

---

## 1. Project Vision & Objective
**Need2Done (N2D)** is a hyperlocal service and delivery platform designed to automate the entire lifecycle of a task via WhatsApp.

---

## 2. Project Directory & File Reference (Technical Map)

### 📁 Root Directory
*   **`.env`**: Global configuration. Contains DB credentials, API URLs, and WhatsApp access tokens.
*   **`run.bat`**: The master startup script for Windows. Launches all four services in separate terminals.

---

### 📁 Backend (Node.js Server) - `/backend`
*   **`server.js`**: Main entry point. Handles static file serving, the tracking-link redirect page, and deep-linking to the Android app.
*   **`routes/tracking.js`**: The heart of the tracking system. Manages GPS pings, active session lookups, and legacy app compatibility.
*   **`routes/support.js`**: Handles API requests for creating and viewing support tickets.
*   **`db/index.js`**: MySQL connection pool configuration.
*   **`public/tracking/index.html`**: The web-based map interface shown to customers.

---

### 📁 WhatsApp Bot (Python) - `/N2D_whatsapp_bot`
*   **`app.py`**: The FastAPI application entry point. Receives webhooks from Meta/WhatsApp.
*   **`router.py`**: The main dispatcher. Decides if a user is a **Customer**, **Helper**, or **Admin**.
*   **`core/helper_router.py`**: Manages the Helper lifecycle (Online status, acceptance, and OTP verification).
*   **`core/support_router.py`**: Processes support-related messages and logs them to the DB.
*   **`db/order_repo.py`**: Database repository for all order operations.
*   **`db/helper_repo.py`**: Manages helper profiles and availability.
*   **`utils/tracking_link.py`**: Generates secure tracking tokens and Android deep links.

---

### 📁 Admin Dashboard (React) - `/admin-dashboard`
*   **`src/App.jsx`**: Main layout and routing.
*   **`src/index.css`**: Global design system & sidebar styling.
*   **`src/pages/LiveMap.jsx`**: Real-time fleet monitoring map.
*   **`src/pages/Support.jsx`**: Interface for managing support tickets.
*   **`src/pages/Dashboard.jsx`**: Summary view of orders and earnings.

---

## 3. Major Features & Development Milestones

### Phase 1: The WhatsApp Ordering Engine
*   **Dynamic Service Routing**: Logic for Task, Ride, and AnyWork categories.
*   **Payload Management**: Storing order details as JSON payloads.

### Phase 2: Agent (Helper) Workflow
*   **Atomic Acceptance**: Safe order assignment logic.
*   **Status Lifecycle**: `PENDING` → `PAID` → `COMPLETED`.
*   **OTP Security**: Dual-layer verification for security.

### Phase 3: Live Tracking & Geography
*   **GPS Pipeline**: Flow from App → Node → Dashboard.
*   **Dynamic Pricing**: Proximity-based fare calculation.
*   **Shared Tracking Links**: Tokenized web-views for customers.

### Phase 4: Support & Admin Stability
*   **Integrated Support**: Support engine in WhatsApp logging to Dashboard.
*   **Fleet Visibility**: Added "Idle" helpers to the Admin Map.

---

## 4. Key Technical Challenges & Resolutions (SOP)

| Issue | Diagnosis | Action Taken |
| :--- | :--- | :--- |
| **App Sync** | Protocol/Field mismatch | Added `gramiogo://` & legacy field mapping. |
| **Invisible Markers** | Asset path failure | Implemented **SVG-based DivIcons**. |
| **Token Expiry** | Temp token limit | Shifted to `.env` based token management. |
| **Sidebar Layout** | Overlap/Cropping | Refactored CSS with fixed footer & scroll-links. |

---

## 5. Daily Maintenance & Troubleshooting Guide

| Component | Error / Symptom | Resolution Action |
| :--- | :--- | :--- |
| **WhatsApp Bot** | Bot is silent | Check `ngrok` URL; Update `WHATSAPP_ACCESS_TOKEN`. |
| **Live Map** | Markers are missing | Check `[TRACKING_PING]` in Node logs. |
| **Dashboard** | 502 Bad Gateway | Restart Node server; check MySQL port `3306`. |
| **Deep Link** | App won't open | Ensure protocol is `gramiogo://`. |

---

## 6. How to Run the Environment
1.  Run `run.bat`.
2.  Update the **Ngrok URL** in Meta Developer settings.
3.  Monitor the **Node.js Terminal** for real-time tracking pings.

---

## 7. Architecture Diagram (System Flow)

```mermaid
graph TD
    subgraph "External Interfaces"
        C[Customer (WhatsApp)]
        H[Helper (WhatsApp)]
        AA[Android Agent App]
        AD[Admin Dashboard (React)]
    end

    subgraph "Public Gateway"
        META[Meta / WhatsApp Cloud API]
        NGROK[Ngrok Tunnel]
    end

    subgraph "Application Layer"
        BOT[WhatsApp Bot (Python/FastAPI)]
        BACKEND[Backend API (Node.js/Express)]
    end

    subgraph "Data Layer"
        DB[(MySQL Database)]
    end

    %% Interactions
    C <--> META
    H <--> META
    META <--> NGROK
    NGROK <--> BOT
    
    BOT <--> DB
    BACKEND <--> DB
    
    AA -- "GPS Pings (API)" --> BACKEND
    BACKEND -- "Live Maps (Web)" --> C
    BACKEND <--> AD
    
    %% Deep Linking
    BOT -- "Deep Link" --> AA
```
