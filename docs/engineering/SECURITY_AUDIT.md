# ASHIVAM TECHNOLOGIES — APPLICATION SECURITY AUDIT
**Document Reference:** `docs/engineering/SECURITY_AUDIT.md`  
**Classification:** Enterprise Security & Vulnerability Assessment  
**Evaluation Standard:** OWASP Top 10 (2021) & CIS Controls Baseline  
**Date:** 2026-11-10  

---

## 1. EXECUTIVE SECURITY SUMMARY

An independent security evaluation was performed across all three Ashivam Technologies applications. The platform exhibits a strong security posture with defense-in-depth architectural patterns implemented at both network and application layers. 

### Key Security Metrics:
- **Hardcoded Secret Exposure:** **ZERO** (all hardcoded credentials removed; audited via static analysis).
- **Authentication Bypass Defense:** **VERIFIED** (unauthenticated requests consistently return HTTP 401 Unauthorized).
- **Privilege Escalation Defense:** **VERIFIED** (role checks enforced server-side; frontend claims disregarded).
- **Cryptographic Hashing:** **VERIFIED** (bcrypt salt rounds $\ge 10$; HMAC-SHA256 inter-service signatures).
- **Transport Security:** **VERIFIED** (TLS 1.3 enforced by Vercel Edge and Render reverse proxies).

---

## 2. DETAILED SECURITY CONTROL EVALUATION

### 2.1. Authentication & Session Security (OWASP A07:2021)
- **Password Storage:** All passwords hashed via `bcryptjs` with salt rounds $\ge 10$. Plaintext passwords are never logged, stored, or echoed.
- **Access Tokens:** Signed with high-entropy cryptographic secrets, set to 15-minute validity windows.
- **Refresh Tokens:** Stored with family tracking, single-use nonce rotation, and replay detection. Attempting to reuse an invalidated refresh token revokes all associated sessions across the token family.
- **Brute-Force Lockout Defense:**
  - Login endpoints enforce 5-attempt rate-limiting thresholds.
  - Exceeding failure limits triggers automatic 15-minute account lockouts returning HTTP 423 / 429.
  - Password reset flows operate timing-safely and return generic success messages to prevent user enumeration.

### 2.2. Authorization & Broken Access Control (OWASP A01:2021)
- **Server-Side Enforcement:** User roles (`SUPERADMIN`, `DIRECTOR`, `HR_ADMIN`, `HR_EXECUTIVE`, `MANAGER`, `EMPLOYEE`, `FINANCE`, `CANDIDATE`, `INTERN`) are determined strictly by backend JWT payload lookup against the database, never by client-supplied request bodies.
- **IDOR Protection:**
  - HRMS and Internship controllers utilize `enforceOwnershipOrRoles` middleware.
  - Employees cannot view or alter peer attendance, leave dossiers, performance appraisals, or payroll slips.
  - Candidates cannot inspect other applicants' resumes or offer letters.

### 2.3. Inter-Service Handshake & Integration Security
- **HMAC-SHA256 Signing:** Service-to-service transfers (Website $\to$ Internship, Internship $\to$ HRMS) are cryptographically signed using pre-shared service secrets.
- **Replay Protection:** Every payload carries an `x-timestamp` validated against a strict 5-minute freshness window. Future or stale timestamps are rejected with HTTP 401.
- **Idempotency Guard:** `x-idempotency-key` prevents duplicate transaction creation if network retries occur.

### 2.4. Injection Defense (OWASP A03:2021)
- **NoSQL Injection:** Mongoose strict schema enforcement converts user input into typed primitives, mitigating `$ne` and `$gt` query operator injections.
- **XSS Defense:** React JSX virtual DOM escapes user input by default. Public rich text fields in Website content are sanitized with DOMPurify.
- **Formula Injection in CSV Exports:** Application and intern CSV exporters sanitize leading `=`, `+`, `-`, and `@` characters to neutralize spreadsheet command execution.

### 2.5. Network & Security Headers
- **Helmet Middleware:** Configured with `crossOriginResourcePolicy: { policy: 'cross-origin' }`, `x-dns-prefetch-control: off`, and `x-download-options: noopen`.
- **Content Security Policy (CSP):** Deployed across all Vercel edge rewrite configurations:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' <whitelisted-render-backend>; frame-ancestors 'none';
  ```
- **Clickjacking Defense:** Enforced via `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- **Hardware API Restrictions:** Enforced via `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

### 2.6. Rate Limiting & DoS Mitigation
- **Website Backend:** Global rate limiter (100 req/min), contact form limiter (10 req/15min), login limiter (5 req/15min).
- **Internship Backend:** `apiLimiter` (120 req/min), `authLimiter` (20 req/15min), `applicationLimiter` (10 req/hr).
- **HRMS Backend:** `globalApiLimiter` (300 req/15min) mounted on `/api/v1` with automatic memory cleanup timer; `rateLimiter` (20 req/15min) on `/login`.
- **Health Exemption:** Health probes (`/api/v1/health`) bypass rate limiters to ensure monitoring tools never face false-positive downtime alerts.

---

## 3. RESIDUAL RISKS & RECOMMENDATIONS

1. **HRMS File Upload Storage (Operational Risk — Medium):**
   - *Current State:* HRMS uploads are stored on the local Render filesystem (`uploads/`).
   - *Risk:* In Render free/starter tiers, container restarts reset the filesystem, which would erase uploaded employee documents.
   - *Recommendation:* Configure AWS S3 or Cloudflare R2 bucket credentials (`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) in the Render environment settings before production launch.
2. **MongoDB Atlas M0 Sandbox Backup (Operational Risk — Low):**
   - *Current State:* Databases reside on MongoDB Atlas free tier (M0), which does not include continuous Point-in-Time Recovery (PITR).
   - *Recommendation:* Implement a nightly cron-triggered `mongodump` script to S3 or upgrade to M10+ when budget permits.
