# Need2Done (N2D) — Documentation Gaps & Risk Register

| Document Version | Status | Generated Date | Commit SHA | Classification |
|---|---|---|---|---|
| 1.0.0 | Verified from Repository | 2026-10-02 | `a609e45d0701ce9280eb427c8062d87a28578235` | Organization Confidential |

---

## 1. Overview & Prioritization Matrix

This register details all unverified technical assumptions, security risks discovered in source control, absent architectural artifacts, and operational vulnerabilities identified during the master technical audit.

- **Severity Levels**:
  - `CRITICAL`: Immediate security vulnerability, credential compromise, or unauthenticated exposure. Requires remediation within 24–48 hours.
  - `HIGH`: Architectural fragility, single point of failure, missing specification, or compliance non-conformance. Target: 30 days.
  - `MEDIUM`: Operational inefficiency, missing test automation, or monitoring blindspots. Target: 60 days.
  - `LOW`: Documentation drift, code cleanliness, or minor refactoring. Target: 90 days.

---

## 2. Prioritized Gaps & Action Items

| Gap ID | Category | Severity | Item & Repository Evidence | Technical Impact & Finding | Needed Owner | Proposed Remediation Action | Milestone |
|---|---|---|---|---|---|---|---|
| **GAP-SEC-01** | Security | `CRITICAL` | `rzp-test-key.xlsx` committed in Git root (`git ls-files`) | Payment gateway credential artifact is tracked in Git history, exposing merchant keys to anyone with repository clone access. | Security Lead / DevOps | Revoke and regenerate Razorpay API keys immediately in the Razorpay Dashboard. Purge file from Git history using `git-filter-repo` or BFG Repo-Cleaner. | Immediate (24h) |
| **GAP-SEC-02** | Security | `CRITICAL` | `AWS_KEY/n2d_preprod_keypair.pem` present in workspace | Private SSH RSA keypair used for EC2 server administration is stored within the project workspace. | DevOps Engineer | Delete file from local workspace. Generate new EC2 keypair in AWS Console. Ensure `*.pem` remains strictly enforced in `.gitignore`. | Immediate (24h) |
| **GAP-SEC-03** | Security | `CRITICAL` | `backend/services/olaMapsService.js#L7-L9` | Hardcoded fallback credentials (`CLIENT_ID`, `CLIENT_SECRET`, `API_KEY`) for Ola Maps embedded directly in source code. | Backend Lead | Rotate Ola Maps credentials in Ola Developer Portal. Remove code defaults and enforce mandatory extraction from `process.env`. | Immediate (48h) |
| **GAP-SEC-04** | Security | `CRITICAL` | `N2D_whatsapp_bot/config.py#L263` & `admin-dashboard/src/config.js#L9` | Hardcoded fallback Google Maps API key embedded in Python configuration and frontend React build config. | Frontend & Bot Leads | Restrict API key by HTTP referrer and IP in Google Cloud Console. Remove hardcoded strings from code; require `.env` loading. | Immediate (48h) |
| **GAP-SEC-05** | Security | `HIGH` | `docs/AWS/schema_live_full.sql#L117` & `backend/db/schema_v2.sql#L42` | Helper agent default password (`ggo123`) is defined in plain text schema without cryptographic hashing or salting. | Security & Backend Lead | Implement bcrypt password hashing for all helper accounts and enforce mandatory credential change on initial onboarding. | 30 Days |
| **GAP-API-01** | Architecture | `HIGH` | Entire codebase (no OpenAPI / Swagger file present) | Over 45 exposed REST and webhook endpoints lack machine-checkable API contracts or schema documentation. | Staff Solutions Architect | Introduce `swagger-jsdoc` for Express backend and leverage FastAPI native Swagger UI on port 8000. Generate `openapi.yaml`. | 30 Days |
| **GAP-OPS-01** | DevOps | `HIGH` | Absence of `.github/workflows/` or CI configuration | Deployments rely entirely on manual SSH execution of `scripts/deploy_prod.sh` without automated test gating or rollback. | DevOps Lead | Build GitHub Actions CI/CD pipeline with linting, unit test execution, Docker build, and automated deployment via AWS SSM. | 30 Days |
| **GAP-MIG-01** | Database | `HIGH` | `migration_v3.js`, `v4.js`, `v5.js`, `v6_services.js` | Database schema updates are executed via ad-hoc procedural scripts without atomic rollback or migration version tracking. | Data Engineer | Adopt formal migration tool (e.g. Prisma Migrate, Knex, or Flyway) to enforce transactional DDL and revision tracking. | 60 Days |
| **GAP-OPS-02** | Resilience | `HIGH` | `DEPLOYMENT.md#L81-L120`, `docker-compose.monitoring.yml` | MySQL database resides on the same single EC2 instance as application runtimes without automated offsite backups. | Infrastructure Lead | Migrate MySQL to AWS RDS Multi-AZ instance with automated daily point-in-time recovery (PITR) snapshots. | 60 Days |
| **GAP-OWN-01** | Governance | `HIGH` | Repository metadata (no `CODEOWNERS` file) | Business owners, on-call rotations, and technical leads for external vendor accounts (Meta, Razorpay, Ola Maps) are unrecorded. | Engineering Director | Establish `CODEOWNERS` file and assign formal account custodians for cloud, payment, and communications providers. | 30 Days |
| **GAP-TEST-01**| Quality | `MEDIUM` | `tests/test_*.py`, `tests/test_*.js` | Test scripts are standalone ad-hoc invocations rather than integrated into an automated test runner with coverage metrics. | QA / Staff Backend | Refactor test scripts into standard Pytest and Jest test suites with automated execution in CI. | 60 Days |
| **GAP-OPS-03** | Observability | `MEDIUM` | `scripts/archive_logs.sh`, `scripts/need2done-logrotate.conf` | Logs are rotated locally on the EC2 filesystem without streaming to centralized log aggregators (e.g. CloudWatch / Grafana). | DevOps Lead | Configure AWS CloudWatch Logs Agent or Promtail/Loki to centralize access, error, and bot logs. | 60 Days |
| **GAP-DATA-01**| Compliance | `MEDIUM` | `docs/AWS/schema_live_full.sql#L258-L261` | Unencrypted customer phone numbers and GPS coordinates stored in `orders` without defined data retention or deletion policies. | Privacy / DPO | Establish automated retention policy to anonymize or purge historical customer location breadcrumbs after 30 days. | 90 Days |
| **GAP-RATE-01**| Resilience | `MEDIUM` | `backend/middleware/rateLimiter.js` | Rate limiting uses in-memory counters; will not scale horizontally across multiple application server instances. | Backend Lead | Migrate rate limiting state to a distributed Redis cache (e.g. `express-rate-limit` with Redis store). | 90 Days |

---

## 3. Unverified Asset Ownership Register

The following systems and accounts lack documented ownership in the repository source code:

1. **Meta Business Manager & WhatsApp Business Account (WABA)**:
   - Status: `UNVERIFIED — owner/action required`
   - Action: Document company Meta Business Manager ID, WABA owner, billing admin, and primary system user.
2. **Razorpay Merchant Account**:
   - Status: `UNVERIFIED — owner/action required`
   - Action: Document Razorpay Merchant ID (MID), finance owner, settlement bank account details, and webhook signing secret holder.
3. **Domain Registrar (`need2done.in`)**:
   - Status: `UNVERIFIED — owner/action required`
   - Action: Identify registrar (e.g. GoDaddy, Namecheap, Route 53), administrative contact, renewal payment method, and DNS custodians.
4. **AWS Cloud Account**:
   - Status: `UNVERIFIED — owner/action required`
   - Action: Document AWS Account ID, Root Account custodian, IAM policies, and VPC architecture ownership.
5. **Ola Maps Developer Account**:
   - Status: `UNVERIFIED — owner/action required`
   - Action: Document Ola Maps portal login, billing plan, and API quota tier.
