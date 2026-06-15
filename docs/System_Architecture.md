# Need2Done: System Architecture Diagram

This document provides a high-level visual representation of the Need2Done (N2D) technological ecosystem and data flow.

## 📊 System Flowchart

```mermaid
graph TB
    %% Definitions
    Customer((Customer))
    Helper((Helper))
    Admin((Admin))

    subgraph "Public Cloud"
        WhatsApp[WhatsApp App]
        MetaAPI[Meta Graph API]
        Ngrok[Ngrok Tunnel]
    end

    subgraph "Need2Done Local Server"
        direction TB
        
        subgraph "Intelligence & Chat"
            BotSrv[Python/FastAPI Bot]
            Router[Role Router]
            Engines[Service Engines]
        end

        subgraph "API & Tracking"
            Backend[Node.js Express Server]
            TrackingAPI[Tracking/Support API]
            WebStatic[Live Map Web-View]
        end

        DB[(MySQL Database)]
    end

    subgraph "Agent & Admin Tools"
        AgentApp[Android Agent App]
        Dashboard[React Admin Dashboard]
    end

    %% Connectivity
    Customer <--> WhatsApp
    Helper <--> WhatsApp
    WhatsApp <--> MetaAPI
    MetaAPI <--> Ngrok
    Ngrok <--> BotSrv
    
    BotSrv --> Router --> Engines
    Engines <--> DB
    
    AgentApp -- "GPS Pings / POST" --> TrackingAPI
    TrackingAPI <--> DB
    
    Dashboard <--> Backend
    Backend <--> DB
    
    WebStatic -- "Live Map / GET" --> Customer
    TrackingAPI --> WebStatic

    %% Deep Link Logic
    BotSrv -- "gramiogo:// Deep Link" -.-> AgentApp

    %% Styling
    style DB fill:#f96,stroke:#333,stroke-width:2px
    style BotSrv fill:#3498db,color:#fff
    style Backend fill:#2ecc71,color:#fff
    style Dashboard fill:#9b59b6,color:#fff
    style MetaAPI fill:#eee,stroke-dasharray: 5 5
```

---

## 🛠️ Technology Breakdown

| Layer | Technology Used | Purpose |
| :--- | :--- | :--- |
| **Frontend (Admin)** | React.js, Vite, Leaflet | Real-time monitoring & management interface. |
| **Frontend (Mobile)** | Android (Native/Hybrid) | High-frequency GPS tracking for agents. |
| **Backend (Core)** | Node.js, Express.js | High-concurrency GPS ingestion & tracking APIs. |
| **WhatsApp Logic** | Python, FastAPI | Complex state-machine & automated chat flows. |
| **Database** | MySQL | Persistent storage for orders, users, and history. |
| **Tunneling** | Ngrok | Secure public endpoint for local development. |
| **Messaging** | Meta Graph API | Official integration for WhatsApp Business API. |

---

## 🔄 Core Data Flows

1.  **Order Placement**: `Customer` → `WhatsApp` → `Meta API` → `Python Bot` → `Database`.
2.  **Tracking Update**: `Agent App` → `Node.js API` → `Database` → `Admin Dashboard`.
3.  **Live Visibility**: `Customer` → `Browser (Live Map)` → `Node.js API` → `Database`.
4.  **Support Ticket**: `Customer` → `WhatsApp Bot` → `Database` → `Admin Dashboard`.
