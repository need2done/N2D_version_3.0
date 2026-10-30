# Need2Done (N2D) — AWS Architecture & Integration Catalogue

| Document Version | Status | Generated Date | Commit SHA | Classification |
|---|---|---|---|---|
| 1.0.0 | Verified from Repository | 2026-10-02 | `a609e45d0701ce9280eb427c8062d87a28578235` | Organization Confidential |

---

## 1. Executive Summary & Verification Methodology

This catalogue provides an evidence-based audit of all cloud infrastructure, AWS resources, network topologies, and systems integrations used by the Need2Done (N2D) platform.

### Evidence Standard
- **Confirmed from repository**: Supported by explicit scripts, configuration files, manifests, or database dumps in the repository.
- **Inferred from repository**: Deduceable from network bindings, variable patterns, or operational conventions.
- **UNVERIFIED — owner/action required**: Cloud assets, services, or configurations not provable from source code artifacts alone.

### High-Level Cloud Assessment
- **Infrastructure Pattern**: Single-Instance Compute Monolith on AWS EC2 running Ubuntu 22.04 LTS.
- **IaC Status**: `UNVERIFIED — owner/action required`. No Terraform (`*.tf`), AWS CloudFormation (`*.template`), AWS CDK, AWS SAM, or Kubernetes/Helm manifests exist in the codebase. Provisioning is performed via manual AWS Console setup and shell automation scripts (`docs/AWS/ec2_setup.sh`, `docs/AWS/deploy_n2d.sh`, `scripts/deploy_prod.sh`).
- **Managed Services Adoption**: Minimal. The application currently self-hosts MySQL 8.0, Nginx reverse proxy, and local disk storage rather than consuming AWS RDS, AWS S3, AWS ALB, AWS Route 53, or AWS Secrets Manager.

---

## 2. Comprehensive AWS Resource Inventory

### 2.1. Confirmed & Inferred AWS Infrastructure Resources

| AWS Service / Resource | Safe Resource Identifier | Status | Region | Purpose | Owning Workload | Public / Private | Inbound / Outbound Rules | IAM Role / Policy | Encryption | Scaling & Availability | Backup & DR | Repository Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **EC2 Compute Instance** | `i-xxxxxxxxxxxxxxxxx` (Safe ID) | Confirmed | `ap-south-1` (Inferred) | Hosts Nginx, Node.js API, Python WhatsApp bot, Docker Uptime Kuma, and MySQL DB | N2D Core Monolith | Public Elastic IP (`need2done.in`) | Inbound: 22, 80, 443<br>Outbound: 0.0.0.0/0 (Internet) | `UNVERIFIED` (No IAM instance profile in code) | EBS Default (UNVERIFIED) | Single Instance (No Auto Scaling Group) | Manual SQL dumps (`docs/AWS/full_data_backup.sql`) | `DEPLOYMENT.md#L4,L63`, `docs/AWS/ec2_setup.sh#L3` |
| **EC2 Security Group** | `sg-xxxxxxxxxxxxxxxxx` (Safe ID) | Confirmed | `ap-south-1` (Inferred) | Firewall boundary restricting inbound traffic to port 22, 80, and 443 | EC2 Ingress Firewall | Edge Filter | Inbound:<br>- 22 (SSH - Admin IP only)<br>- 80 (HTTP 0.0.0.0/0)<br>- 443 (HTTPS 0.0.0.0/0)<br>Blocked: 5000, 8000, 3001, 3306 | N/A (EC2 SG) | N/A | Regional SG | N/A | `DEPLOYMENT.md#L47-L56` |
| **EC2 Keypair** | `n2d_preprod_keypair` | Confirmed | `ap-south-1` (Inferred) | RSA SSH Keypair for administrative server login | DevOps Administration | Confidential | SSH Port 22 | Root / `ubuntu` user | RSA 2048-bit | N/A | Key in workspace (`AWS_KEY/`) — **CRITICAL RISK** | `AWS_KEY/n2d_preprod_keypair.pem`, `DEPLOYMENT.md#L63` |
| **EBS Block Volume** | `vol-xxxxxxxxxxxxxxxxx` (Root/Data) | Inferred | `ap-south-1` (Inferred) | Root filesystem, MySQL data (`/var/lib/mysql`), and store receipt photos (`/uploads/bills`) | Operating System & Storage | Private to EC2 | Attached via Xen/NVMe | N/A | `UNVERIFIED` (KMS encryption not confirmed) | Single EBS volume | Snapshot status `UNVERIFIED` | `docs/AWS/ec2_setup.sh#L73`, `N2D_whatsapp_bot/app.py#L97` |
| **Elastic IP (EIP)** | `eipalloc-xxxxxxxx` (Safe ID) | Inferred | `ap-south-1` (Inferred) | Static IPv4 mapped to `need2done.in` domain | Public Ingress | Public IPv4 | Ingress to Port 80 & 443 | N/A | N/A | Single IP | N/A | `DEPLOYMENT.md#L135`, `nginx/need2done.conf#L4` |

---

### 2.2. Unused / Unverified AWS Services Audit

The following AWS services are frequently expected in modern cloud architectures but have **no evidence of usage** in the N2D repository:

| AWS Platform Service | Evidenced in Repository? | Actual Implementation in N2D | Recommendation / Architectural Gap |
|---|---|---|---|
| **AWS RDS / Aurora** | No (Mentioned only as future `TODO` in `.env.example#L21`) | Self-hosted MySQL 8.0 on EC2 localhost (`127.0.0.1:3306`) | Migrate to AWS RDS MySQL Multi-AZ for high availability (`GAP-OPS-02`). |
| **AWS S3 (Simple Storage Service)** | No (No `@aws-sdk/client-s3` or `boto3` found) | Local EC2 filesystem directories: `N2D_whatsapp_bot/uploads/bills/` and `backend/public/uploads/` | Offload image uploads to S3 with pre-signed URLs to protect EC2 disk. |
| **AWS Application Load Balancer (ALB)** | No | Standalone Nginx reverse proxy running on the EC2 host | Deploy AWS ALB for health checks, auto-scaling, and SSL termination. |
| **AWS Route 53** | `UNVERIFIED` (Domain registered externally or in Route 53) | DNS A-records pointing to EC2 IP | Confirm domain registrar and manage DNS records in Route 53. |
| **AWS Certificate Manager (ACM)** | No | Certbot (Let's Encrypt) managing local certificates on Nginx | Migrate public certs to ACM once ALB/CloudFront is provisioned. |
| **AWS Secrets Manager / Parameter Store**| No | Unencrypted local `.env` files in root, `backend/`, and `N2D_whatsapp_bot/` | Store production secrets in AWS Secrets Manager (`GAP-SEC-01`). |
| **AWS CloudWatch Logs & Metrics** | No (Local logs in `/logs/`) | Local logrotate files (`scripts/need2done-logrotate.conf`) and rotating loggers | Install CloudWatch Agent to centralize application logs (`GAP-OPS-03`). |
| **AWS SQS / SNS / EventBridge** | No | Synchronous HTTP calls and in-memory background threads | Introduce SQS for WhatsApp webhook event buffering during traffic spikes. |
| **AWS ECS / EKS / Fargate** | No | Systemd services on EC2; local Docker Compose for Uptime Kuma | Containerize services via Docker and deploy on ECS Fargate. |
| **AWS WAF / Shield** | No | Express in-memory rate limiting (`backend/middleware/rateLimiter.js`) | Protect public ingress routes (`/webhook`, `/api/*`) using AWS WAF. |

---

## 3. End-to-End AWS Infrastructure Topology

*See standalone Mermaid source: [`docs/architecture/diagrams/aws-topology.mmd`](file:///c:/Users/chakr/.gemini/antigravity/scratch/Need2Done/docs/architecture/diagrams/aws-topology.mmd)*

```mermaid
flowchart TB
    subgraph Clients["Clients & External Actors"]
        Customer["Customer (WhatsApp & Browser)"]
        Helper["Helper Agent (Flutter App)"]
        Admin["Ops Admin (React Dashboard)"]
    end

    subgraph ExternalGateways["Third-Party Partner Gateways"]
        Meta["Meta WhatsApp Cloud API Gateway"]
        Razorpay["Razorpay Payment Gateway"]
        OlaMaps["Ola Maps OAuth & Directions API"]
    end

    subgraph AWSCloud["AWS Cloud Infrastructure (Region: ap-south-1 / Inferred)"]
        subgraph VPC["Virtual Private Cloud (VPC)"]
            subgraph SecurityGroup["EC2 Security Group (Firewall)"]
                SG_22["Port 22: SSH (Admin IP Restricted)"]
                SG_80["Port 80: HTTP (0.0.0.0/0 -> Redirects to 443)"]
                SG_443["Port 443: HTTPS (0.0.0.0/0 Public TLS)"]
            end

            subgraph EC2["AWS EC2 Compute Instance (Ubuntu 22.04 LTS)"]
                Nginx["Nginx Reverse Proxy & SSL Engine\n- Certbot Let's Encrypt\n- Static SPAs: /website & /admin-dashboard/dist"]
                NodeAPI["Node.js Express Server (:5000)\n- REST APIs, Bill Approvals, Razorpay Handshake\n- Customer Live Map HTML & GPS Ingestion"]
                PythonBot["Python FastAPI WhatsApp Bot (:8000)\n- Dialog State Machine & WhatsApp Webhooks\n- Auto-Assigner Background Polling Thread"]
                Kuma["Docker: Uptime Kuma (:3001)\n- 14 Synthetic Health Monitors"]
                MySQL[("MySQL 8.0 Server (:3306)\n- Database: N2D (utf8mb4)\n- User: n2d_user")]
                EBSStorage["Attached EBS Volume\n- /uploads/bills/\n- /logs/"]
            end
        end
    end

    %% Network Flows
    Customer -->|HTTPS Messages| Meta
    Meta -->|POST /webhook| SG_443
    Customer -->|HTTPS GET /track/:token| SG_443
    Helper -->|POST /api/tracking/update| SG_443
    Admin -->|HTTPS Admin Operations| SG_443

    SG_80 --> Nginx
    SG_443 --> Nginx

    Nginx -->|Proxy :5000| NodeAPI
    Nginx -->|Proxy :3001| Kuma
    NodeAPI -->|Internal Proxy :8000/webhook| PythonBot
    NodeAPI -->|Internal Sync :8000/internal/*| PythonBot

    NodeAPI -->|TCP Conns (10)| MySQL
    PythonBot -->|TCP Conns (32)| MySQL
    PythonBot -->|Write Store Receipts| EBSStorage
    NodeAPI -->|Read/Serve Uploads| EBSStorage

    NodeAPI -->|HTTPS Basic Auth| Razorpay
    NodeAPI -->|HTTPS OAuth2| OlaMaps
    PythonBot -->|HTTPS Graph API v19.0| Meta
```

---

## 4. Architectural Boundaries: Internal vs. AWS vs. Third-Party

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               ARCHITECTURAL BOUNDARIES                                 │
├──────────────────────────┬───────────────────────────┬─────────────────────────────────┤
│ 1. N2D INTERNAL WORKLOADS│ 2. AWS-MANAGED PLATFORM   │ 3. THIRD-PARTY EXTERNAL SYSTEMS │
├──────────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ • Node.js Express API    │ • EC2 Compute Instance    │ • Meta WhatsApp Cloud API       │
│ • Python FastAPI Bot     │ • EC2 Security Group      │ • Razorpay Payment Gateway      │
│ • React Admin Dashboard  │ • EBS Block Storage       │ • Ola Maps Routing & OAuth      │
│ • Flutter Tracking App   │ • Elastic IP (EIP)        │ • OpenStreetMap Tile CDN        │
│ • Nginx Web Proxy        │ • Default VPC / Subnets   │ • Telegram Incident Bot API     │
│ • Self-Hosted MySQL 8.0  │                           │ • Let's Encrypt CA (Certbot)    │
│ • Uptime Kuma Container  │                           │                                 │
└──────────────────────────┴───────────────────────────┴─────────────────────────────────┘
```

---

## 5. End-to-End Systems Integration Matrix

| Integration ID | Calling Component | Called Component | Boundary Crossed | Network Protocol & Port | Endpoint / Topic | Authentication Scheme | Data Transferred & Classification | Version / Spec | Failure / Retry / Compensation Behavior | Monitoring & Alerting | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **INT-01** | Meta Cloud API | N2D Nginx | External -> AWS Ingress | HTTPS (443) | `POST /webhook` | Shared Verify Token on GET; In-memory dedup on POST | Inbound customer & helper chat messages, location pings, media IDs (`PII`) | Meta Graph API `v19.0` | 60-second in-memory dedup; drops passive messages; 500 error on crash | Uptime Kuma monitor #6; Nginx access/error logs | `nginx/need2done.conf#L96`, `N2D_whatsapp_bot/app.py#L167` |
| **INT-02** | N2D Nginx | Node.js Backend | AWS Ingress -> Internal | HTTP (5000) | `ANY /webhook`, `/api/*`, `/track/*` | Loopback trust | Full HTTP payloads, GPS updates, admin commands | Express v5.2 | Nginx timeout 60s; returns 502 Bad Gateway if Node process down | Uptime Kuma monitor #2; `backend/logs/backend.log` | `nginx/need2done.conf#L114-L130` |
| **INT-03** | Node.js Backend | Python FastAPI Bot | Internal -> Internal | HTTP (8000) | `POST /webhook` | Loopback trust | Forwarded Meta webhook payload | FastAPI v0.135 | Axios timeout 5000ms; returns 500 Proxy Failed if bot down | Uptime Kuma monitor #3; `N2D_whatsapp_bot/logs/bot.log` | `backend/server.js#L64-L96` |
| **INT-04** | Node.js Backend | Python FastAPI Bot | Internal -> Internal | HTTP (8000) | `POST /internal/payment-success` | `X-INTERNAL-SECRET` Header | Order code, payment method, transaction ID (`Financial`) | REST JSON | Synchronous call; aborts if secret invalid (403) | Bot error log | `N2D_whatsapp_bot/app.py#L359-L373` |
| **INT-05** | Python FastAPI Bot | Meta Cloud API | AWS Internal -> External | HTTPS (443) | `POST /v19.0/{PHONE_ID}/messages` | Bearer Token (`WHATSAPP_ACCESS_TOKEN`) | Outbound WhatsApp messages, interactive buttons, list menus | Meta Graph API `v19.0` | Synchronous `requests.post`; logs response status; no DLQ | Daily token monitor (`scripts/monitor_expirations.sh#L58`) | `N2D_whatsapp_bot/whatsapp_client.py` |
| **INT-06** | Node.js Backend | Razorpay API | AWS Internal -> External | HTTPS (443) | `POST /v1/orders` | HTTP Basic Auth (`KEY_ID:KEY_SECRET`) | Order amount in paise, receipt order code (`Financial`) | Razorpay REST v1 | Throws 500 on auth failure; returns error JSON to client | Daily key monitor (`scripts/monitor_expirations.sh#L77`) | `backend/routes/payments.js#L18-L35` |
| **INT-07** | Razorpay Gateway | N2D Node.js | External -> AWS Ingress | HTTPS (443) | `POST /api/payments/webhook` | HMAC SHA-256 (`x-razorpay-signature`) | Payment captured / failed event JSON (`Financial`) | Razorpay Webhook v1 | Rejects invalid signatures with 400; idempotent order status update | Node backend request logger | `backend/routes/payments.js#L75-L105` |
| **INT-08** | Node.js Backend | Ola Maps Identity | AWS Internal -> External | HTTPS (443) | `POST /realms/olamaps/protocol/openid-connect/token` | OAuth 2.0 Client Credentials (`CLIENT_ID`, `CLIENT_SECRET`) | Client credentials form data | OAuth 2.0 | Cached token in-memory with 60s buffer; falls back to Haversine formula on failure | Console error logger | `backend/services/olaMapsService.js#L20-L58` |
| **INT-09** | Node.js Backend | Ola Maps Directions | AWS Internal -> External | HTTPS (443) | `GET /routing/v1/directions` | Bearer Token + `X-API-KEY` | Origin/Destination coordinates (`Geolocation`) | Ola Routing v1 | Falls back to Haversine distance * 1.25 if API returns non-200 | Uptime Kuma monitor #7 | `backend/services/olaMapsService.js#L69-L95` |
| **INT-10** | Flutter Mobile App | N2D Node.js | Client -> AWS Ingress | HTTPS (443) | `POST /api/tracking/update` | None (Unauthenticated) | Helper ID, Order ID, Latitude, Longitude, Timestamp (`Geolocation`) | REST JSON | Ignored on connection drop; app repeats every 10s via Foreground Task | Uptime Kuma monitor #10 | `tracking-app/lib/tracking_service.dart#L55-L59` |
| **INT-11** | Customer Browser | N2D Node.js | Client -> AWS Ingress | HTTPS (443) | `GET /api/tracking/live/:token` | Token validation (`order_tracking_tokens`) | Current helper latitude and longitude | REST JSON | Browser polls every 10s; gracefully logs error if token expired | Nginx access log | `backend/server.js#L286-L303` |
| **INT-12** | Node.js & Python | MySQL Database | AWS Internal -> Localhost | TCP (3306) | MySQL Wire Protocol | Username + Password (`n2d_user`) | Relational database reads and writes | MySQL 8.0 Protocol | Node pool: 10 conns; Python pool: 32 conns; fails with DB error if pool exhausted | Uptime Kuma monitor #4; `backend/server.js#L186` | `backend/config/db.js`, `mysql_conn.py` |
| **INT-13** | Uptime Kuma Docker | Telegram Bot API | AWS Internal -> External | HTTPS (443) | `POST /bot{TOKEN}/sendMessage` | URL Bot Token | Outage alerts and downtime notifications | Telegram Bot API | Queued in container; retried on network failure | Telegram channel notifications | `scripts/setup_telegram_alert.js` |

---

## 6. Reconciliation, Compliance & Security Drift Report

### 6.1. IaC & Drift Findings
1. **Absence of Infrastructure as Code**: All AWS infrastructure was manually provisioned via the AWS Management Console. No state file exists to detect Terraform drift.
2. **Missing Cost Allocation Tags**: Inferred EC2 and EBS resources lack standardized cost allocation tags (e.g. `Project: Need2Done`, `Environment: Production`, `ManagedBy: Terraform`).
3. **Public Exposure of Administration Port**: SSH Port 22 is exposed on the EC2 Security Group. While restricted in documentation to `Your IP only` (`DEPLOYMENT.md#L51`), best practice mandates AWS Systems Manager (SSM) Session Manager without opening inbound port 22.
4. **Local Database Placement**: MySQL resides directly on the application server. This violates cloud architectural decoupling principles, risking complete service outage if the EC2 instance runs out of memory or disk space.
5. **No Cloud Backup Automation**: Backups are performed via manual shell scripts (`docs/AWS/full_data_backup.sql`) stored on the same local volume. No automated AWS Backup vault or EBS snapshot lifecycle policy is configured.
