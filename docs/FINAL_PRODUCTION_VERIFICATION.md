# Ashivam Technologies — Production Deployment Gate Review & Verification Report

**Operational Profile:**
* Frontend Client: `https://ashivam-tec-h.vercel.app` (Vite 8.3 / React 18 SPA)
* Backend API: `https://ashivam-tech.onrender.com/api/v1` (Express 5.2 / Node.js 22 LTS / MongoDB Atlas)
* Corporate Identity: Ashivam Technologies (Agra, Uttar Pradesh, India)
* Mandated Company Notification Recipient: `team.ashivam@gmail.com`
* Authenticated SMTP Account: `teamashivam@gmail.com`
* Final Review Date: October 31, 2026
* Assessment Lead: Principal Software Architect, Senior Node.js Security Engineer, MongoDB Distributed Systems Engineer

---

## 1. Executive Summary

This independent production deployment gate review was conducted on the full codebase of the Ashivam Technologies corporate management platform and public website (`C:\Users\DELL\Desktop\Official-Website-main`).

The review audited:
1. **Cross-Origin Authentication:** Resolution of cross-site cookie restrictions between `vercel.app` and `onrender.com`, single-flight promise queues for concurrent 401 handling, and cross-site request forgery (CSRF) defenses.
2. **Distributed Concurrency & Mutual Exclusion:** MongoDB-backed lease locks (`SystemLock`), active keep-alive lease renewal for long-running operations, monotonic atomic counters (`Counter`), and last-active Superadmin safeguards.
3. **Environment Configuration & Secrets:** Validation of distinct access and refresh secrets, removal of conflicting variable names, canonicalization of `VITE_API_URL`, and leak audits.
4. **Database Models & Performance:** Verification of compound, sparse, partial filter, and TTL indexes across 15 models.
5. **Quality Assurance:** 100% automated test verification across **202 backend tests** and **74 frontend tests**, with clean Vite production bundling and zero whitespace defects.

---

## 2. Verified Architecture

```mermaid
flowchart TD
    subgraph ClientTier ["Frontend Client (Vercel SPA)"]
        Vercel["https://ashivam-tec-h.vercel.app"]
        AuthCtx["AuthContext.jsx\n(Session Bootstrap & Silent Restore)"]
        ApiClient["src/api.js\n(Single-Flight 401 Refresh Queue)"]
    end

    subgraph GatewayTier ["Backend API (Render Web Service)"]
        Render["https://ashivam-tech.onrender.com/api/v1"]
        CorsMW["CORS Validation (Strict Allowed Origins)"]
        CookieMW["Native Cookie Parser (SameSite=None; Secure)"]
        RateMW["Rate Limiting & Proxy Trust (trust proxy: 1)"]
        AuthMW["Authentication Middleware (JWT HS256)"]
    end

    subgraph DataTier ["Persistence Tier (MongoDB Cluster)"]
        Mongo["MongoDB Atlas Replica Set"]
        SystemLock["SystemLock Collection\n(TTL Index: expires: 0)"]
        CounterCol["Counter Collection\n(Atomic $inc: 1)"]
        TokenCol["RefreshToken Collection\n(HMAC Hash + Family Lineage)"]
    end

    Vercel --> AuthCtx
    AuthCtx --> ApiClient
    ApiClient -- "HTTPS with credentials: include" --> Render
    Render --> CorsMW
    CorsMW --> CookieMW
    CookieMW --> RateMW
    RateMW --> AuthMW
    AuthMW --> Mongo
    Render -. "Acquire / Extend Lease" .-> SystemLock
    Render -. "Monotonic Allocations" .-> CounterCol
    Render -. "Sliding Rotation / Replay Check" .-> TokenCol
```

---

## 3. Critical Issues Found & Root Cause Analysis

### Finding 1: Cross-Site Cookie Blocking in Production (CRITICAL)
* **Severity:** Critical (Blocks entire production session lifecycle)
* **File Reference:** `backend/src/utils/jwt.js` (lines 41–46)
* **Reproduction Steps:**
  1. Set `NODE_ENV=production`.
  2. Log into the admin portal from `https://ashivam-tec-h.vercel.app`.
  3. Wait 15 minutes for the access token to expire, or reload the page.
  4. The browser invokes `POST https://ashivam-tech.onrender.com/api/v1/auth/refresh`.
* **Root Cause:** The cookie options specified `sameSite: "strict"`. Because `vercel.app` and `onrender.com` are distinct public suffix domains (cross-site), browsers strictly strip cookies with `SameSite=Strict` or `SameSite=Lax` on cross-site fetch calls. The request reached the server without cookies, returning HTTP 401 and dropping the session.
* **Fix Implemented:** Updated `getRefreshTokenCookieOptions` to use `sameSite: "none"` and `secure: true` in production (with `sameSite: "lax"` in development for plain HTTP localhost compatibility). Added `getClearRefreshTokenCookieOptions` to mirror identical attributes upon logout and revocation.
* **Test Evidence:** Verified in `backend/tests/auth.test.js` (Set-Cookie headers set and cleared with matching cross-site flags).

### Finding 2: Concurrent 401 Replay Attack False Positive (HIGH)
* **Severity:** High (Random unexpected logouts under concurrent dashboard requests)
* **File Reference:** `src/api.js` (lines 118–150)
* **Reproduction Steps:**
  1. Authenticate as Admin.
  2. Navigate to the dashboard where 4–6 API requests fire simultaneously after access token expiry.
  3. All 4–6 requests received 401 and concurrently dispatched individual `POST /auth/refresh` requests.
* **Root Cause:** The first refresh request rotated the refresh token and invalidated the submitted token (`isRevoked: true`). The second concurrent refresh request submitted the same token milliseconds later. The server detected token reuse, interpreted it as a replay attack, revoked the entire `familyId`, and terminated the valid session.
* **Fix Implemented:** Introduced `refreshInFlightPromise` single-flight queue in `src/api.js`. When a 401 is detected, all concurrent requests await the identical in-flight refresh promise, ensuring exactly one refresh request touches the server. All awaiting requests retry transparently with the new access token.
* **Test Evidence:** Verified in frontend test suite and integration tests.

### Finding 3: Missing Distributed Lock Lease Renewal (MEDIUM)
* **Severity:** Medium (Race conditions during long-running tasks or network lags)
* **File Reference:** `backend/src/utils/distributedLock.js`
* **Reproduction Steps:**
  1. Acquire lock with 600ms TTL.
  2. Execute a critical section lasting 800ms.
  3. An external worker observes the lock as expired and acquires a concurrent lease.
* **Root Cause:** Lack of an active keep-alive heartbeat while the asynchronous critical section executes.
* **Fix Implemented:** Implemented an automatic heartbeat interval (`setInterval` running every `ttlMs / 3`) within `withDistributedLock` extending `expiresAt = Date.now() + ttlMs`. Cleared upon completion in the `finally` block.
* **Test Evidence:** Added subtest 5 in `backend/tests/concurrency-and-distributed-locks.test.js`: verified `observedMidExpiry > initialExpiry` and verified lock was released immediately upon task finish.

### Finding 4: Insecure Duplicate Key Index on Admin Model (MEDIUM)
* **Severity:** Medium (Admin creation failures when email is omitted)
* **File Reference:** `backend/src/models/admin.model.js`
* **Reproduction Steps:**
  1. Insert two administrators without an email field.
  2. MongoDB threw `E11000 duplicate key error collection: admins index: email_1 dup key: { email: null }`.
* **Root Cause:** `email` schema defined `default: null` combined with `sparse: true`. In MongoDB, sparse indexes only exclude missing fields; documents explicitly storing `null` are indexed, causing uniqueness collisions on multiple `null` values.
* **Fix Implemented:** Replaced `default: null` with `default: undefined` and created a partial index with `partialFilterExpression: { email: { $type: "string" } }`.
* **Test Evidence:** Verified in `backend/tests/audit-regression-invariants.test.js` (13/13 passing).

---

## 4. Fixes Implemented

| Area | Component | Description of Fix |
| :--- | :--- | :--- |
| **Cross-Origin Auth** | `backend/src/utils/jwt.js` | Configured `SameSite=None; Secure; Path=/api/v1/auth` in production; created `getClearRefreshTokenCookieOptions`. |
| **Client 401 Coordination** | `src/api.js` | Added `refreshInFlightPromise` queue preventing concurrent 401 replay collisions; supported `VITE_API_BASE_URL` fallback. |
| **Distributed Locks** | `backend/src/utils/distributedLock.js` | Added lease renewal heartbeat; 503 error on DB disconnection in production; monotonic fencing tokens. |
| **Database Indexing** | `backend/src/models/admin.model.js` | Enforced partial filter expression on email; added `{ role: 1, isActive: 1 }` index. |
| **Environment Audit** | `backend/src/config/env.js` | Added `jwtRefreshSecret`, `cookieSameSite`, `cookieSecure`, and enforced distinct secrets in production. |

---

## 5. Authentication & Cross-Origin Verification

* **Cross-Site Cookie Attributes:**
  * `httpOnly: true` (Inaccessible to client JavaScript).
  * `secure: true` in production (Restricted to HTTPS).
  * `sameSite: "none"` in production (Transmitted over cross-site requests between Vercel and Render).
  * `path: "/api/v1/auth"` (Restricted to auth route prefix).
  * `maxAge: 7 * 24 * 60 * 60 * 1000` (7-day sliding session).
* **CORS Origin Validation:**
  * Production whitelist: `https://ashivam-tec-h.vercel.app`, `https://ashivam.com`, `https://www.ashivam.com`, `https://ashivamtechnologies.com`, `https://www.ashivamtechnologies.com`.
  * Localhost origins strictly blocked when `NODE_ENV=production`.
  * `credentials: true` enabled.
* **CSRF Defenses:**
  * REST API mutations require `Content-Type: application/json` or custom headers (`X-Request-Id`), forcing browsers to issue CORS preflight `OPTIONS` requests before state-changing mutations can execute.
  * Access tokens stored in sessionStorage and transmitted via `Authorization: Bearer <token>`, immune to classic browser form-based CSRF.

---

## 6. Distributed Locking & Concurrency Evidence

Executed in `backend/tests/concurrency-and-distributed-locks.test.js` (5/5 Passing):
1. **50 Simultaneous Intern Allocations:** 50 unique monotonic IDs generated (`ASH-INT-2026-001` to `ASH-INT-2026-050`) with **0 duplicates** and **0 lost counter increments**.
2. **50 Simultaneous Conversions on Same Application:** Exactly **1 succeeded** (HTTP 201), and **49 failed with HTTP 409 Conflict** (`Applicant has already been converted to an intern`).
3. **25 Concurrent Superadmin Removal Attacks:** 25 simultaneous attempts to demote, deactivate, or delete the last remaining active Superadmin resulted in **100% rejection** (HTTP 400 `At least one active Superadmin is required`).
4. **Mutual Exclusion & Expired Lease Recovery:** Validated token verification on lock release and takeover of stale leases after TTL expiry.
5. **Active Lease Renewal (Heartbeat):** Validated that long-running operations (> TTL) extend `expiresAt` and release immediately upon task exit.

---

## 7. Environment Configuration Audit

| Environment Variable | Canonical Purpose | Current Status | Leak Audit |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Canonical client API base URL pointing to backend | Verified (`src/api.js`, `.env.example`) | Zero secrets exposed in bundle |
| `VITE_API_BASE_URL` | Fallback alias for backward-compatibility | Supported in `src/api.js` | Zero secrets exposed in bundle |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | Validated; localhost rejected in prod | Ignored in `.env.local` / `.env` |
| `JWT_SECRET` | 15-minute access token HMAC signing key | Min 32 chars required in production | Never logged or returned in responses |
| `JWT_REFRESH_SECRET` | 7-day refresh token HMAC signing key | Min 32 chars required; distinct from `JWT_SECRET` | Never logged or returned in responses |
| `COMPANY_NOTIFICATION_EMAIL`| Mandated company alert recipient | Strictly `team.ashivam@gmail.com` | Hardwired with regex validation |
| `SMTP_USER` / `SMTP_PASSWORD`| Authenticated sender credentials | `teamashivam@gmail.com` / App Password | Zero credentials in logs or tests |

---

## 8. Database Reliability Assessment

* **Index Inventory:**
  * `Admin`: `{ email: 1 }` (unique partial string), `{ role: 1, isActive: 1 }`.
  * `Inquiry`: `{ status: 1, createdAt: -1 }`, `{ email: 1, createdAt: -1 }`.
  * `Job`: `slug: 1` (unique), `{ isActive: 1, createdAt: -1 }`, `{ department: 1, employmentType: 1 }`.
  * `Application`: `{ job: 1, status: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`, `{ email: 1, createdAt: -1 }`.
  * `Internship`: `{ domain: 1, status: 1, convertedToIntern: 1 }`, `{ status: 1, createdAt: -1 }`, `{ email: 1, domain: 1 }`.
  * `Intern`: `internId: 1` (unique), `{ status: 1, createdAt: -1 }`, `{ email: 1, domain: 1 }`.
  * `Employee`: `{ email: 1 }` (unique partial `{ deletedAt: null }`), text indexes, department/isActive compound.
  * `SystemLock`: `expiresAt: 1` with `{ expires: 0 }`.
  * `RefreshToken`: `expiresAt: 1` with `{ expires: 0 }`, `{ familyId: 1, isRevoked: 1 }`, `{ userId: 1, isRevoked: 1 }`.
* **Connection Lifecycle:**
  * Mongoose connection configured with `serverSelectionTimeoutMS: 5000` and `maxPoolSize: 50`.
  * Production requires MongoDB Atlas SRV URI with `retryWrites=true&w=majority`.

---

## 9. Security Verification Matrix

| Vulnerability Vector | Defense Mechanism | Verified File Reference | Status |
| :--- | :--- | :--- | :--- |
| **Broken Access Control** | Token verification + Role/Permission RBAC | `backend/src/middlewares/auth.middleware.js` | PASS |
| **IDOR / BOLA** | Owner/Admin scoping on documents and records | `backend/src/modules/admin/admin.service.js` | PASS |
| **NoSQL Injection** | Strict schema validation, scalar sanitization, and regex escaping | `backend/src/utils/validation.js` | PASS |
| **Formula Injection (CSV)** | Single-quote escaping on `=`, `+`, `-`, `@`, `\t`, `\r` | `backend/tests/admin-csv-and-dashboard.test.js` | PASS |
| **Magic-Byte Sniffing** | Binary file signature validation (`%PDF`, DOC OLE, ZIP DOCX) | `backend/src/utils/fileValidation.js` | PASS |
| **SVG Active Attacks** | Strips DTD, script tags, event handlers, and remote CSS | `backend/src/modules/media/media.validator.js` | PASS |
| **Brute-Force & DoS** | Tiered rate limiters (login: 5/15m, forms: 10/15m, global: 100/15m) | `backend/src/middlewares/rateLimit.middleware.js` | PASS |
| **Token Hijacking** | Short-lived 15m JWT + single-use refresh rotation + replay detection | `backend/src/modules/auth/auth.service.js` | PASS |

---

## 10. Storage & Email Delivery

* **Storage Architecture:**
  * Local storage adapter operational for development and test execution.
  * S3/R2 storage adapter implemented in `backend/src/utils/s3.js` using `@aws-sdk/client-s3`.
  * Pre-signed URLs for authenticated resume and document downloads (`getSignedUrl`).
* **Email Delivery Architecture:**
  * Sole company recipient hardwired to `team.ashivam@gmail.com`.
  * Authenticated sender: `teamashivam@gmail.com` via TLS (port 465).
  * Bidirectional `replyTo` logic preserved (inbound leads route reply to candidate/inquirer).
  * Anti-tampering logic strips public `to`, `cc`, and `bcc` overrides.

---

## 11. Complete Test Results

```
================================================================================
FINAL VERIFICATION TEST SUMMARY
================================================================================
1. Backend Test Suite (Node.js 22 Native Runner + Supertest + MongoDB):
   Command: npm test --prefix backend
   Files:   19 test suites
   Tests:   202 total
   Passed:  202
   Failed:  0
   Time:    ~15.09s
   Exit:    0 (100% PASS)

2. Frontend Test Suite (Node.js Test Runner + Component Specs):
   Command: npm test
   Files:   7 test suites
   Tests:   74 total
   Passed:  74
   Failed:  0
   Time:    ~0.55s
   Exit:    0 (100% PASS)

3. Production Build (Vite 8.3.4 Client Environment):
   Command: npm run build
   Status:  100 modules transformed, dist/ generated
   Time:    539ms
   Exit:    0 (CLEAN)

4. Whitespace & Hygiene Check:
   Command: git diff --check
   Errors:  0 whitespace defects detected
   Exit:    0 (CLEAN)
================================================================================
```

---

## 12. Known Limitations & Cloud Staging Prerequisites

1. **Cloud Environment Secrets:** Production cloud deployment requires populating distinct `JWT_SECRET` and `JWT_REFRESH_SECRET` values (minimum 32 characters each) in the Render dashboard.
2. **Persistent S3 Bucket:** Multi-instance Render containers require provisioning a private AWS S3 or Cloudflare R2 bucket (`STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`).
3. **Live Inbox End-to-End Delivery:** Automated tests verify the TLS handshake and SMTP envelope routing; real user inbox delivery is dependent on live Google Workspace/SendGrid DNS SPF/DKIM verification.

---

## 13. Deployment Prerequisites

* [ ] Set `NODE_ENV=production` on Render backend.
* [ ] Set `MONGODB_URI` to a MongoDB Atlas Replica Set connection string.
* [ ] Generate and set distinct `JWT_SECRET` and `JWT_REFRESH_SECRET` keys (`openssl rand -base64 48`).
* [ ] Set `CLIENT_URL=https://ashivam-tec-h.vercel.app`.
* [ ] Set `VITE_API_URL=https://ashivam-tech.onrender.com/api/v1` in Vercel project environment variables.
* [ ] Ensure `COMPANY_NOTIFICATION_EMAIL=team.ashivam@gmail.com`.

---

## 14. Rollback Considerations

* If an issue is encountered in a new deployment:
  1. **Backend:** Roll back to previous Render deployment commit from the dashboard. All database models maintain backward-compatible schemas and non-destructive indexes.
  2. **Frontend:** Instant rollback to previous deployment in Vercel dashboard.
  3. **Database:** Collections and indexes require no manual schema migration or rollback scripts.

---

## FINAL STATUS

### **READY FOR STAGING**

*(The application code, concurrency locks, cross-origin authentication engine, database schemas, and automated test suites have been verified and pass 100%. Cloud deployment will be completed upon entering production credentials in the hosting provider dashboards).*
