# Need2Done (N2D) — Dependency & Expiry Register

| Document Version | Status | Generated Date | Commit SHA | Classification |
|---|---|---|---|---|
| 1.0.0 | Verified from Repository | 2026-10-02 | `a609e45d0701ce9280eb427c8062d87a28578235` | Organization Confidential |

---

## 1. System Software, Languages & Runtimes

| Component / Layer | Software / Tool | Configured Version | Licence | Purpose | EOL / Lifecycle Status | Repository Evidence | Status |
|---|---|---|---|---|---|---|---|
| **Host Operating System** | Ubuntu Linux | 22.04 LTS (Jammy) | Open Source (GPL/Canonical) | Production EC2 server OS | Standard Support until April 2027 | `DEPLOYMENT.md#L4,L66` | Confirmed |
| **Backend Runtime** | Node.js | v20.x LTS | MIT | JavaScript API runtime engine | Maintenance until April 2026 | `DEPLOYMENT.md#L75`, `backend/package.json` | Confirmed |
| **Python Runtime** | CPython | 3.10+ / 3.11+ | PSF License | WhatsApp Bot & daemon engine | 3.10 security until Oct 2026; 3.11 until Oct 2027 | `DEPLOYMENT.md#L92`, `N2D_whatsapp_bot/` | Confirmed |
| **Database Engine** | MySQL Server | 8.0.x | GPL / Commercial | Relational data persistence | 8.0 Premier EOL: April 2026 | `DEPLOYMENT.md#L81,L93`, `docs/AWS/` | Confirmed |
| **Reverse Proxy** | Nginx | 1.18+ (Ubuntu apt) | 2-Clause BSD | Edge reverse proxy & SSL termination | Stable branch active | `DEPLOYMENT.md#L85`, `nginx/need2done.conf` | Confirmed |
| **Mobile SDK** | Flutter SDK | `>=3.2.0 <4.0.0` | BSD 3-Clause | Helper tracking mobile app framework | Actively maintained by Google | `tracking-app/pubspec.yaml#L8` | Confirmed |
| **Container Engine** | Docker Engine & Compose | Docker 24+, Compose v2 | Apache 2.0 | Synthetic monitoring orchestration | Actively maintained | `docker-compose.monitoring.yml#L1` | Confirmed |

---

## 2. Core Library Manifests & Direct Dependencies

### 2.1. Backend (`backend/package.json`)

| Package Name | Version Specifier | Licence | Purpose | Vulnerability / Security Action Required | Evidence Reference |
|---|---|---|---|---|---|
| `express` | `^5.2.1` | MIT | Core HTTP routing framework | Standard Express v5 release | `backend/package.json#L17` |
| `mysql2` | `^3.22.0` | MIT | MySQL database client with connection pooling | Maintain pooled connections | `backend/package.json#L19` |
| `razorpay` | `^2.9.8` | MIT | Razorpay official payment gateway SDK | Audit webhook HMAC signature handling | `backend/package.json#L20` |
| `axios` | `^1.7.0` | MIT | HTTP client for proxying webhooks & external APIs | Monitor for SSRF in webhook proxies | `backend/package.json#L14` |
| `cors` | `^2.8.6` | MIT | Cross-Origin Resource Sharing middleware | Restrict origins in production | `backend/package.json#L15` |
| `multer` | `^2.2.0` | MIT | Multipart form file upload middleware | Limit file sizes and MIME types | `backend/package.json#L18` |
| `dotenv` | `^17.4.2` | BSD-2-Clause | Environment variable loading | Standard configuration | `backend/package.json#L16` |

### 2.2. Python WhatsApp Bot (`N2D_whatsapp_bot/requirements.txt`)

| Package Name | Pinned Version | Licence | Purpose | Security & Upgrade Notes | Evidence Reference |
|---|---|---|---|---|---|
| `fastapi` | `0.135.3` | MIT | High-performance asynchronous API framework | Pin dependencies; check Starlette core | `N2D_whatsapp_bot/requirements.txt#L9` |
| `uvicorn` | `0.44.0` | BSD-3-Clause | ASGI server implementation | Run with appropriate worker threads | `N2D_whatsapp_bot/requirements.txt#L23` |
| `pydantic` | `2.13.0` | MIT | Data validation and schema parsing | Pydantic V2 engine | `N2D_whatsapp_bot/requirements.txt#L15` |
| `mysql-connector-python` | `9.6.0` | GPLv2 with FOSS | MySQL DB driver with pool support | Connection pool cleanup verified | `N2D_whatsapp_bot/requirements.txt#L14` |
| `requests` | `2.33.1` | Apache 2.0 | Outbound synchronous HTTP requests to Meta API | Monitor timeouts to prevent thread exhaustion | `N2D_whatsapp_bot/requirements.txt#L18` |
| `urllib3` | `2.6.3` | MIT | Low-level HTTP transport layer | Up-to-date TLS validation | `N2D_whatsapp_bot/requirements.txt#L22` |
| `python-dotenv` | `1.2.2` | BSD-3-Clause | Dotenv parser | Standard configuration | `N2D_whatsapp_bot/requirements.txt#L17` |

### 2.3. Admin Dashboard (`admin-dashboard/package.json`)

| Package Name | Version Specifier | Licence | Purpose | Evidence Reference |
|---|---|---|---|---|
| `react` | `^19.2.4` | MIT | UI library | `admin-dashboard/package.json#L16` |
| `react-dom` | `^19.2.4` | MIT | DOM rendering engine | `admin-dashboard/package.json#L17` |
| `react-router-dom` | `^7.14.1` | MIT | Client-side SPA routing | `admin-dashboard/package.json#L19` |
| `vite` | `^8.0.4` | MIT | Frontend build tooling and dev server | `admin-dashboard/package.json#L35` |
| `leaflet` | `^1.9.4` | BSD-2-Clause | Interactive mapping engine | `admin-dashboard/package.json#L14` |
| `react-leaflet` | `^5.0.0` | Hippocratic | React bindings for Leaflet | `admin-dashboard/package.json#L18` |
| `recharts` | `^3.8.1` | MIT | Analytics charts and KPI visualization | `admin-dashboard/package.json#L21` |
| `lucide-react` | `^1.8.0` | ISC | Modern iconography library | `admin-dashboard/package.json#L15` |
| `tailwindcss` | `^3.4.19` | MIT | Utility-first CSS framework | `admin-dashboard/package.json#L34` |

---

## 3. Expiry, Certificate & Renewal Register

> [!IMPORTANT]
> A missing expiration date in source code indicates that production expiry must be verified in external vendor consoles. It is marked `UNVERIFIED — owner/action required`.

| Asset Type | Asset Name / Identifier (Non-Secret) | Environment | System of Record | Renewal Lead Time | Alert Threshold | Expiry / Deprecation Date | Lifecycle Status | Repository Evidence | Required Action |
|---|---|---|---|---|---|---|---|---|---|
| **Domain** | `need2done.in` | Production | Domain Registrar (UNVERIFIED) | 30 days | 15 days | `UNVERIFIED — owner/action required` | Active | `nginx/need2done.conf#L4`, `DEPLOYMENT.md#L3` | Confirm registrar (GoDaddy/Namecheap) & enable auto-renew |
| **TLS/SSL Cert** | Let's Encrypt Wildcard / SNI (`need2done.in`) | Production | Certbot ACME / Let's Encrypt | 30 days | 15 days | 90 days from issuance (Auto-renewed by cron) | Automated | `nginx/need2done.conf#L70-L73`, `scripts/monitor_expirations.sh#L11,L41` | Verify crontab entry for `certbot renew` |
| **API Version** | Meta Graph API `v19.0` | Production | Meta for Developers | 90 days | 30 days | Deprecation estimated Q1 2026 | Active | `.env.example#L41`, `N2D_whatsapp_bot/config.py#L29` | Upgrade endpoint calls to v20.0+ |
| **API Token** | `WHATSAPP_ACCESS_TOKEN` | Production | Meta Business Manager | 14 days | 5 days | System User: Permanent; User Token: 60 Days | `UNVERIFIED — owner/action required` | `.env.example#L38`, `scripts/monitor_expirations.sh#L54-L65` | Audit token type in Meta dashboard (ensure System User Token) |
| **API Secret** | `WHATSAPP_VERIFY_TOKEN` | Production | Meta App Dashboard & `.env` | Static | N/A | None (Rotate on compromise) | Configured | `.env.example#L40`, `DEPLOYMENT.md#L5` | Securely persist in AWS Secrets Manager |
| **Payment Keys** | Razorpay Key ID (`RAZORPAY_KEY_ID`) | Production / Test | Razorpay Merchant Dashboard | 30 days | 10 days | `UNVERIFIED — owner/action required` | Active | `.env.example#L76-L77`, `backend/routes/payments.js#L7` | Confirm whether Live Mode keys are active in prod `.env` |
| **OAuth2 Client** | Ola Maps Client Secret (`OLA_MAPS_CLIENT_SECRET`) | Production | Ola Maps Developer Portal | 30 days | 15 days | `UNVERIFIED — owner/action required` | Active | `backend/services/olaMapsService.js#L8` | Rotate hardcoded credentials to `.env` |
| **Maps API Key** | Ola Maps API Key (`OLA_MAPS_API_KEY`) | Production | Ola Maps Developer Portal | 30 days | 15 days | `UNVERIFIED — owner/action required` | Active | `backend/services/olaMapsService.js#L9` | Check monthly quota & billing thresholds |
| **Maps API Key** | Google Maps Platform Key (`GOOGLE_MAPS_API_KEY`) | Fallback / Dev | Google Cloud Console | 30 days | 15 days | `UNVERIFIED — owner/action required` | Active | `N2D_whatsapp_bot/config.py#L263`, `admin-dashboard/src/config.js#L9` | Restrict API key by HTTP referrers in GCP Console |
| **JWT Secret** | `JWT_SECRET` | Production | Environment `.env` | 180 days | 30 days | Rotates manually | Active | `.env.example#L64`, `backend/middleware/auth.js` | Enforce minimum 256-bit entropy |
| **SSH Keypair** | EC2 Keypair (`AWS_KEY/n2d_preprod_keypair.pem`) | Pre-Prod | AWS EC2 Console | 365 days | 30 days | `UNVERIFIED — owner/action required` | Active | `AWS_KEY/n2d_preprod_keypair.pem`, `DEPLOYMENT.md#L63` | Rotate keypair immediately; remove from workspace |
| **DB Password** | MySQL `n2d_user` password | Production | Localhost MySQL Engine | 90 days | 15 days | Rotates manually | Active | `DEPLOYMENT.md#L112`, `.env.example#L24` | Rotate password and update systemd unit files |
| **Internal Secret** | `INTERNAL_SECRET` | Production | Environment `.env` | 90 days | 15 days | Rotates manually | Active | `.env.example#L42`, `N2D_whatsapp_bot/app.py#L67` | Rotate shared secret between Node and Python bot |
