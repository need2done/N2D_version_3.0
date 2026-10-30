# Need2Done (N2D) — API Catalogue & Contract Registry

| Document Version | Status | Generated Date | Commit SHA | Classification |
|---|---|---|---|---|
| 1.0.0 | Verified from Repository | 2026-10-02 | `a609e45d0701ce9280eb427c8062d87a28578235` | Organization Confidential |

---

## 1. Overview & Verification Methodology

This catalogue provides an exhaustive inventory of every HTTP endpoint, webhook receiver, internal IPC endpoint, and external third-party API integrated into the Need2Done platform. Every entry is linked to concrete source code evidence.

- **Visibility Categories**:
  - `Public`: Accessible by end users without authentication (or with token in URL).
  - `Partner`: Accessible by integrated partners (e.g. Meta Cloud Webhooks, Razorpay Webhooks).
  - `Internal`: Restricted to loopback network (`127.0.0.1`) or secured via internal shared secret.
  - `Admin`: Protected by JWT Bearer token authentication for authorized administrative users.

---

## 2. N2D-Exposed APIs: `n2d-backend` (Node.js Express)

All routes are mounted under the `/api/` prefix unless specified otherwise (e.g. `/webhook`, `/track/:token`, `/open-app`).

### 2.1. System & Ingress Routes

| Method | Path | Visibility | Caller | Auth Scheme | Request Payload / Params | Response Type | Status Codes | Implementation File & Line | Evidence Status |
|---|---|---|---|---|---|---|---|---|---|
| `ALL` | `/webhook` | Partner | Meta WhatsApp Cloud API | Query verification or open POST | GET: `hub.mode`, `hub.challenge`, `hub.verify_token`<br>POST: Meta Webhook JSON | Plain text (challenge) or JSON ack | 200, 403, 500 | `backend/server.js#L64-L96` | Confirmed |
| `GET` | `/api/health` | Public / Monitoring | Uptime Kuma / Load Balancer | None | None | `{ success, status, components, metrics }` | 200, 500 | `backend/server.js#L182-L234` | Confirmed |
| `GET` | `/track/:token` | Public | Customer Browser | URL Token | URL param: `token` (64-char hex) | HTML Page (Leaflet Live Map) | 200, 404 | `backend/server.js#L241-L310` | Confirmed |
| `GET` | `/open-app` | Public | Helper Mobile Browser | URL Query | `order_id`, `helper_code` | HTML Page auto-redirecting to `n2d://track` | 200, 400 | `backend/server.js#L373-L411` | Confirmed |

### 2.2. Orders Subsystem (`backend/routes/orders.js`)

| Method | Path | Visibility | Caller | Auth Scheme | Request Payload / Params | Response Type | Status Codes | Implementation File & Line | Evidence Status |
|---|---|---|---|---|---|---|---|---|---|
| `GET` | `/api/orders` | Admin | Admin Dashboard | JWT Bearer | Query: `status`, `page`, `limit` | `{ success: true, orders: Order[] }` | 200, 401, 500 | `backend/routes/orders.js` | Confirmed |
| `GET` | `/api/orders/:id` | Admin | Admin Dashboard | JWT Bearer | Param: `id` (Order ID or DB ID) | `{ success: true, order: OrderDetails }` | 200, 404, 500 | `backend/routes/orders.js` | Confirmed |
| `POST` | `/api/orders` | Internal / Admin | Bot / Dashboard | JWT or Internal | `{ customer_id, service, payload, lat, lng }` | `{ success: true, order_id }` | 201, 400, 500 | `backend/routes/orders.js` | Confirmed |
| `POST` | `/api/orders/:id/approve` | Admin | Admin Dashboard | JWT Bearer | `{ bill_amount, helper_charge, platform_fee }` | `{ success: true, order }` | 200, 400, 500 | `backend/routes/orders.js` | Confirmed |
| `POST` | `/api/orders/:id/assign` | Admin | Admin Dashboard | JWT Bearer | `{ helper_id }` | `{ success: true, message }` | 200, 400, 500 | `backend/routes/orders.js` | Confirmed |
| `POST` | `/api/orders/:id/assign-vendor`| Admin | Admin Dashboard | JWT Bearer | `{ vendor_id }` | `{ success: true, message }` | 200, 400, 500 | `backend/routes/orders.js` | Confirmed |
| `POST` | `/api/orders/:id/verify-items` | Admin | Admin Dashboard | JWT Bearer | `{ items_verified: boolean }` | `{ success: true }` | 200, 400, 500 | `backend/routes/orders.js` | Confirmed |
| `POST` | `/api/orders/:id/cancel` | Admin | Admin Dashboard | JWT Bearer | `{ reason: string }` | `{ success: true }` | 200, 400, 500 | `backend/routes/orders.js` | Confirmed |
| `PATCH`| `/api/orders/:id/rating` | Public | Customer Post-Delivery | Optional | `{ rating: number (1-5) }` | `{ success: true }` | 200, 400, 500 | `backend/routes/orders.js` | Confirmed |
| `POST` | `/api/orders/:id/unlock` | Admin | Admin Dashboard | JWT Bearer | Param: `id` | `{ success: true }` | 200, 400, 500 | `backend/routes/orders.js` | Confirmed |

### 2.3. Helper & Location Tracking (`backend/routes/helpers.js` & `tracking.js`)

| Method | Path | Visibility | Caller | Auth Scheme | Request Payload / Params | Response Type | Status Codes | Implementation File & Line | Evidence Status |
|---|---|---|---|---|---|---|---|---|---|
| `GET` | `/api/helpers` | Admin | Admin Dashboard | JWT Bearer | None | `{ success: true, helpers: Helper[] }` | 200, 401, 500 | `backend/routes/helpers.js` | Confirmed |
| `POST` | `/api/helpers` | Admin | Admin Dashboard | JWT Bearer | `{ name, phone, helper_code }` | `{ success: true, id }` | 201, 400, 500 | `backend/routes/helpers.js` | Confirmed |
| `POST` | `/api/helpers/:id/status` | Internal / Admin | App / Dashboard | None / JWT | `{ status: 'ONLINE'\|'OFFLINE' }` | `{ success: true }` | 200, 400, 500 | `backend/routes/helpers.js` | Confirmed |
| `PATCH`| `/api/helpers/:id/category` | Admin | Admin Dashboard | JWT Bearer | `{ category: string }` | `{ success: true }` | 200, 400, 500 | `backend/routes/helpers.js` | Confirmed |
| `PUT` | `/api/helpers/:id` | Admin | Admin Dashboard | JWT Bearer | Updated helper fields | `{ success: true }` | 200, 400, 500 | `backend/routes/helpers.js` | Confirmed |
| `DELETE`| `/api/helpers/:id` | Admin | Admin Dashboard | JWT Bearer | Param: `id` | `{ success: true }` | 200, 400, 500 | `backend/routes/helpers.js` | Confirmed |
| `POST` | `/api/helpers/notify-surge` | Admin | Admin Dashboard | JWT Bearer | `{ amount, service }` | `{ success: true, notified }` | 200, 500 | `backend/routes/helpers.js` | Confirmed |
| `POST` | `/api/tracking/start` | Helper / App | Mobile App | None | `{ helper_id, order_id }` | `{ success: true }` | 200, 400, 500 | `backend/routes/tracking.js` | Confirmed |
| `POST` | `/api/tracking/update` | Helper / App | Flutter Tracking App | None | `{ helper_id, order_id, lat, lng, timestamp }` | `{ success: true, message }` | 200, 400, 500 | `backend/routes/tracking.js` | Confirmed |
| `POST` | `/api/tracking/update-location`| Helper / App | Web / Mobile App | None | `{ helper_id, lat, lng }` | `{ success: true }` | 200, 400, 500 | `backend/routes/tracking.js` | Confirmed |
| `POST` | `/api/tracking/stop` | Helper / App | Mobile App | None | `{ helper_id, order_id }` | `{ success: true }` | 200, 400, 500 | `backend/routes/tracking.js` | Confirmed |
| `GET` | `/api/tracking/live/:token` | Public | Live Tracking Map | Token validation | Param: `token` | `{ success: true, location: { lat, lng } }` | 200, 404, 500 | `backend/routes/tracking.js` | Confirmed |
| `GET` | `/api/tracking/active` | Admin | Admin Dashboard | JWT Bearer | None | `{ success: true, activeTrackings: [] }` | 200, 401, 500 | `backend/routes/tracking.js` | Confirmed |

### 2.4. Payments & Billing Subsystem (`backend/routes/payments.js`)

| Method | Path | Visibility | Caller | Auth Scheme | Request Payload / Params | Response Type | Status Codes | Implementation File & Line | Evidence Status |
|---|---|---|---|---|---|---|---|---|---|
| `POST` | `/api/payments/create-order` | Public / Customer | Web Checkout | None | `{ order_id, amount, customer_phone }` | `{ success: true, id: razorpay_order_id, amount, currency }` | 200, 400, 500 | `backend/routes/payments.js` | Confirmed |
| `POST` | `/api/payments/verify` | Public / Customer | Web Checkout | None | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, order_code }` | `{ success: true, message: 'Payment verified' }` | 200, 400, 500 | `backend/routes/payments.js` | Confirmed |
| `POST` | `/api/payments/webhook` | Partner | Razorpay Webhook | HMAC Signature (`x-razorpay-signature`) | Razorpay Payment Event JSON | `{ status: 'ok' }` | 200, 400, 500 | `backend/routes/payments.js` | Confirmed |

### 2.5. Custom Work & Ola Maps Pricing (`backend/routes/customWork.js`)

| Method | Path | Visibility | Caller | Auth Scheme | Request Payload / Params | Response Type | Status Codes | Implementation File & Line | Evidence Status |
|---|---|---|---|---|---|---|---|---|---|
| `POST` | `/api/custom-work/quote` | Public / Bot | Bot / Customer | None | `{ pickup_lat, pickup_lng, drop_lat, drop_lng, work_type }` | `{ success: true, quote: { distanceKm, durationMins, fare } }` | 200, 400, 500 | `backend/routes/customWork.js` | Confirmed |
| `GET` | `/api/custom-work/rate-card` | Public / Admin | Dashboard | None | None | Rate card configuration object | 200, 500 | `backend/routes/customWork.js` | Confirmed |
| `PUT` | `/api/custom-work/rate-card` | Admin | Admin Dashboard | JWT Bearer | Updated rate card JSON | `{ success: true }` | 200, 400, 500 | `backend/routes/customWork.js` | Confirmed |

### 2.6. Subsystems & Vertical Endpoints

| Owning Module | Method | Path | Visibility | Auth | Purpose | Evidence Path |
|---|---|---|---|---|---|---|
| `auth` | `POST` | `/api/auth/login` | Public | Credentials | Admin authentication & JWT token generation | `backend/routes/auth.js` |
| `analytics` | `GET` | `/api/analytics/earnings` | Admin | JWT Bearer | Earnings metrics & aggregate financials | `backend/routes/analytics.js` |
| `analytics` | `GET` | `/api/analytics/orders` | Admin | JWT Bearer | Order distribution & fulfillment KPIs | `backend/routes/analytics.js` |
| `serviceRoutes` | `GET` | `/api/services/` | Public | None | List platform services & status | `backend/routes/serviceRoutes.js` |
| `serviceRoutes` | `GET` | `/api/services/active` | Public | None | List active customer-facing services | `backend/routes/serviceRoutes.js` |
| `serviceRoutes` | `PUT` | `/api/services/:service_id/toggle` | Admin | JWT Bearer | Enable/disable specific service vertical | `backend/routes/serviceRoutes.js` |
| `fruitsVegetables` | `GET` | `/api/fruits-vegetables/products` | Public | None | Produce catalog list with live prices | `backend/routes/fruitsVegetables.js` |
| `fruitsVegetables` | `POST` | `/api/fruits-vegetables/products` | Admin | Session/JWT | Add new produce item | `backend/routes/fruitsVegetables.js` |
| `fruitsVegetables` | `PUT` | `/api/fruits-vegetables/products/:id` | Admin | Session/JWT | Update price or stock of produce item | `backend/routes/fruitsVegetables.js` |
| `fruitsVegetables` | `POST` | `/api/fruits-vegetables/upload` | Admin | Session/JWT | Upload product image (Multer) | `backend/routes/fruitsVegetables.js` |
| `homeServices` | `GET` | `/api/home-services/services` | Public | None | Home services offerings & base rates | `backend/routes/homeServices.js` |
| `homeServices` | `POST` | `/api/home-services/checkout` | Public | None | Create home service appointment & order | `backend/routes/homeServices.js` |
| `homeServices` | `POST` | `/api/home-services/reschedule` | Public | None | Reschedule service appointment slot | `backend/routes/homeServices.js` |
| `ride` | `POST` | `/api/ride/book` | Public | None | Ingest ride booking (Bike/Auto/Car) | `backend/routes/ride.js` |
| `groceries` | `GET` | `/api/groceries/categories` | Public | None | Grocery category list | `modules/.../categoryRoutes.js` |
| `groceries` | `GET` | `/api/groceries/products` | Public | None | Grocery catalog query | `modules/.../productRoutes.js` |
| `groceries` | `POST` | `/api/groceries/cart` | Public | None | Cart management | `modules/.../cartRoutes.js` |
| `vendors` | `GET` | `/api/vendors/` | Admin | JWT Bearer | List merchant vendors & status | `backend/routes/vendors.js` |
| `vendors` | `POST` | `/api/vendors/` | Admin | JWT Bearer | Register merchant vendor | `backend/routes/vendors.js` |
| `wallet` | `GET` | `/api/wallet/helpers` | Admin | JWT Bearer | Helper wallet balances & ledger | `backend/routes/wallet.js` |
| `wallet` | `POST` | `/api/wallet/recharge` | Admin | JWT Bearer | Manual balance credit/debit to helper | `backend/routes/wallet.js` |
| `settings` | `GET` | `/api/settings/pricing` | Public/Admin | None/JWT | Live system pricing & fee structure | `backend/routes/settings.js` |
| `settings` | `POST` | `/api/settings/` | Admin | JWT Bearer | Update runtime configuration | `backend/routes/settings.js` |
| `support` | `GET` | `/api/support/` | Admin | JWT Bearer | Customer support request queue | `backend/routes/support.js` |
| `support` | `POST` | `/api/support/:id/resolve` | Admin | JWT Bearer | Mark support inquiry resolved | `backend/routes/support.js` |
| `otp` | `POST` | `/api/otp/generate` | Internal | None | Generate verification OTP | `backend/routes/otp.js` |
| `otp` | `POST` | `/api/otp/verify` | Internal | None | Verify submitted OTP | `backend/routes/otp.js` |
| `media` | `GET` | `/api/media/:media_id` | Public | None | Download and proxy Meta media attachment | `backend/routes/media.js` |

---

## 3. N2D-Exposed APIs: `N2D_whatsapp_bot` (Python FastAPI)

These endpoints run on `127.0.0.1:8000` and are either forwarded by the Node.js backend or called internally via inter-process communication.

| Method | Path | Visibility | Caller | Auth Scheme | Request Payload / Params | Response Type | Status Codes | Implementation File & Line | Evidence Status |
|---|---|---|---|---|---|---|---|---|---|
| `GET` | `/webhook` | Partner | Meta (proxied) | `hub.verify_token` | `hub.mode`, `hub.challenge`, `hub.verify_token` | `PlainTextResponse(challenge)` | 200, 403 | `N2D_whatsapp_bot/app.py#L167-L175` | Confirmed |
| `POST` | `/webhook` | Partner | Meta (proxied) | In-memory dedup | Meta WhatsApp Cloud API Event Payload | `{"status": "ok"}` | 200, 500 | `N2D_whatsapp_bot/app.py#L176-L242` | Confirmed |
| `GET` | `/health` | Internal / Monitoring | Node API / Uptime Kuma | None | None | `{"status": "Need2Done Bot Active"}` | 200 | `N2D_whatsapp_bot/app.py#L248-L250` | Confirmed |
| `POST` | `/api/tracking/update` | Internal / Mobile | Node Proxy / Flutter | None | `TrackingPayload(helper_id, order_id, lat, lng)` | `{"success": true, "message": "Location updated"}` | 200, 500 | `N2D_whatsapp_bot/app.py#L259-L295` | Confirmed |
| `POST` | `/api/bot/notify-surge` | Internal | Node Backend | None | `SurgePayload(amount, service)` | `{"success": true, "notified": count}` | 200, 500 | `N2D_whatsapp_bot/app.py#L300-L325` | Confirmed |
| `POST` | `/webhook/internal` | Internal | Node Backend | None | `InternalWebhookPayload(event, orderId, ...)` | `{"success": true}` | 200, 400 | `N2D_whatsapp_bot/app.py#L327-L353` | Confirmed |
| `POST` | `/internal/payment-success` | Internal | Node Backend | `X-INTERNAL-SECRET` | `PaymentSuccessPayload(order_code, payment_method, ...)` | Order settlement response | 200, 403, 500 | `N2D_whatsapp_bot/app.py#L359-L373` | Confirmed |

---

## 4. Third-Party External APIs Consumed by N2D

| Service Provider | Integration Purpose | Target Endpoint URL | Authentication Scheme | Implementation File & Line | Evidence Status |
|---|---|---|---|---|---|
| **Meta WhatsApp Cloud API** | Send text messages, interactive list menus, and reply buttons | `https://graph.facebook.com/v19.0/{PHONE_ID}/messages` | Bearer Token (`WHATSAPP_ACCESS_TOKEN`) | `N2D_whatsapp_bot/whatsapp_client.py` | Confirmed |
| **Meta WhatsApp Cloud API** | Download user-submitted photos, voice notes, and receipts | `https://graph.facebook.com/v19.0/{MEDIA_ID}` | Bearer Token (`WHATSAPP_ACCESS_TOKEN`) | `backend/routes/media.js` | Confirmed |
| **Razorpay Payments** | Create payment orders and fetch payment details | `https://api.razorpay.com/v1/orders` | HTTP Basic Auth (`KEY_ID:KEY_SECRET`) | `backend/routes/payments.js#L7-L8` | Confirmed |
| **Ola Maps Identity** | Fetch OAuth 2.0 Client Credentials Access Token | `https://account.olamaps.io/realms/olamaps/protocol/openid-connect/token` | Form POST (`client_id`, `client_secret`) | `backend/services/olaMapsService.js#L10,L27-L39` | Confirmed |
| **Ola Maps Routing** | Compute driving route distance and estimated duration | `https://api.olamaps.io/routing/v1/directions` | Bearer Token & `X-API-KEY` header | `backend/services/olaMapsService.js#L11,L83-L89` | Confirmed |
| **OpenStreetMap** | Map tile server for customer tracking page & mobile app | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | None (Open Web Standard) | `backend/server.js#L277`, `tracking-app/lib/main.dart` | Confirmed |
| **Telegram Bot API** | Outage notifications and status reports | `https://api.telegram.org/bot{TOKEN}/sendMessage` | URL Bot Token | `scripts/setup_telegram_alert.js`, `telegram_summary_report.sh` | Confirmed |

---

## 5. OpenAPI Gap & Specification Reconciliation Report

- **OpenAPI Specification Presence in Source**:
  - `UNVERIFIED — owner/action required`: No formal `openapi.yaml` or Swagger specification file exists in the repository.
- **Paths Discovered in Code but Missing in Spec**:
  - 100% of discovered endpoints (over 45 routes) lack a checked-in OpenAPI specification.
- **Spec Operations Missing Implementation**:
  - None (as no specification exists to conflict with code).
- **Remediation Action**:
  - Implement automated OpenAPI schema generation using `swagger-jsdoc` for `backend/server.js` and FastAPI's native `/docs` (`/openapi.json`) for `N2D_whatsapp_bot/app.py`. Added to Documentation Gaps Register as `GAP-API-01`.
