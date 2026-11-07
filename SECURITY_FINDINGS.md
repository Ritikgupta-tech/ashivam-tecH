# Ashivam Technologies — Security Findings & Vulnerability Register

**Document:** `SECURITY_FINDINGS.md`  
**Classification:** Application Security Audit (OWASP ASVS 5.0 Baseline)  
**Date:** 2026-11-07  
**Branch:** `feature/ashivam-production-hardening`  
**Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  
**Repository:** https://github.com/Ritikgupta-tech/ashivam-tecH.git  
**Auditor:** Application Security Engineer & DevSecOps Lead  

---

## 1. Executive Summary

This register details all discovered, mitigated, accepted, and resolved security findings for the Ashivam Technologies corporate platform. In conformance with OWASP ASVS 5.0 Level 2 controls, all critical security mechanisms—authentication lifecycle, refresh token rotation, replay attack revocation, password hashing, role-based authorization (RBAC), multi-layer CSRF defense, CSP headers, and private document access controls—were subjected to automated and manual scrutiny.

**Current Summary:** Zero Critical findings, Zero High findings. All Medium and Low findings are either resolved with automated test assertions or formally documented as accepted operational risks.

---

## 2. Security Findings Matrix

| ID | Severity | Category | Affected Component | Title | Status |
|---|---|---|---|---|---|
| **SEC-001** | 🟠 Medium | Concurrency / Data Integrity | `backend/src/modules/career` | Career Application Duplicate Submission TOCTOU Race | ✅ **RESOLVED** (`d330790`) |
| **SEC-002** | 🟡 Low | Cryptographic Architecture | `backend/src/config/env.js` | JWT Refresh Secret Derivation Fallback | ✅ **MITIGATED** (Startup Guard) |
| **SEC-003** | 🟡 Low | Web Infrastructure Security | `vercel.json` | Missing Content-Security-Policy on Edge CDN | ✅ **RESOLVED** (`d330790`) |
| **SEC-004** | 🟡 Low | Supply Chain / DevDependency | `backend/package.json` | `nodemon` Dependency ReDoS via `minimatch` | 🟡 **ACCEPTED RISK** (Dev only) |
| **SEC-005** | 🟡 Low | Distributed Systems / DoS | `backend/src/middlewares/rateLimit` | In-Memory Rate Limiting Counters | 🟡 **DOCUMENTED** (Single instance) |
| **SEC-006** | 🟡 Low | CI/CD Pipeline Security | `.github/workflows/ci.yml` | GitHub Actions `setup-node` SHA Version Pinning | 🟡 **DOCUMENTED** (Non-breaking) |
| **SEC-007** | 🟠 Medium | Data Custody & Privacy | `backend/src/app.js` | Unauthorized Public Enumeration of Resumes & HR Vaults | ✅ **RESOLVED & VERIFIED** |
| **SEC-008** | 🟠 Medium | Authorization & Privilege | `backend/src/modules/admin` | Race Condition Leaving Zero Active Superadmins | ✅ **RESOLVED & VERIFIED** |
| **SEC-009** | 🟠 Medium | Client-Side Security | `backend/src/middlewares/csrf` | Cross-Site Request Forgery on State Mutations | ✅ **RESOLVED & VERIFIED** |
| **SEC-010** | 🟡 Low | Auditability & Compliance | `backend/src/modules/audit` | Tamper-Resistant Administrative Audit Trail | ✅ **RESOLVED & VERIFIED** |

---

## 3. Detailed Finding Profiles

---

### SEC-001: Career Application TOCTOU Race Condition
- **Unique ID:** `SEC-001`
- **Severity:** 🟠 Medium
- **Affected Component:** `backend/src/modules/career/application.model.js`, `career.service.js`
- **Actual Evidence:**
  Prior implementation used an in-process `Set` (`inFlightApplications`) and an application-level `findOne()` query to block duplicate applications. Under concurrent multi-instance requests, both threads passed the application check and created duplicate records for the same `{ job, email }`.
- **Root Cause:**
  Relying solely on in-process application state rather than enforcing atomic uniqueness at the database engine level.
- **Business Impact:**
  Duplicate notifications sent to hiring managers and skewed recruitment metrics.
- **Proposed Remediation:**
  Enforce compound unique index `{ job: 1, email: 1 }` in MongoDB schema; catch Mongo error code `11000` and map safely to HTTP 409 Conflict.
- **Verification Method:**
  `tests/career.test.js` and `tests/email-workflows.test.js` assert that concurrent duplicate submissions return HTTP 409 and dispatch zero duplicate emails.
- **Current Status:** ✅ **RESOLVED & VERIFIED** (Commit `d330790`).

---

### SEC-002: JWT Refresh Secret Derivation Fallback
- **Unique ID:** `SEC-002`
- **Severity:** 🟡 Low
- **Affected Component:** `backend/src/config/env.js`, `backend/src/utils/jwt.js`
- **Actual Evidence:**
  When `JWT_REFRESH_SECRET` is unset in the environment, `env.js` derives a 64-character hex key from `JWT_SECRET` using HMAC-SHA256:
  ```js
  jwtRefreshSecret: (process.env.JWT_REFRESH_SECRET || "").trim() ||
    (process.env.JWT_SECRET ? deriveRefreshSecret(process.env.JWT_SECRET.trim()) : null)
  ```
- **Root Cause:**
  Developer convenience fallback preventing local crashes when developers only configured `JWT_SECRET`.
- **Business Impact:**
  If `JWT_SECRET` were ever compromised, the refresh token derivation key could mathematically be recalculated by an attacker holding the source code.
- **Proposed Remediation:**
  1. Production startup guard in `backend/src/config/env.js` strictly validates that `JWT_SECRET` is mandatory.
  2. Owner action (Condition C-1): Generate an independent, cryptographically random 64-character secret using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and configure `JWT_REFRESH_SECRET` in the Render environment dashboard. Never commit actual secret values to source control.
- **Verification Method:**
  `tests/phase-1-security-hardening.test.js` Subtest 90 verifies that production startup requires strong secrets and rejects unapproved keys.
- **Current Status:** ✅ **MITIGATED & OPERATIONAL** (Startup guard active; owner entry documented).

---

### SEC-003: Missing Content-Security-Policy on Edge CDN
- **Unique ID:** `SEC-003`
- **Severity:** 🟡 Low
- **Affected Component:** `vercel.json`
- **Actual Evidence:**
  Edge deployment lacked CSP headers, relying only on backend Helmet headers.
- **Root Cause:**
  Initial static hosting deployment configuration focused on client-side routing rewrites (`"source": "/(.*)", "destination": "/index.html"`).
- **Business Impact:**
  Lack of defence-in-depth against client-side script injection at the CDN layer.
- **Proposed Remediation:**
  Configured strict CSP directives in `vercel.json`:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https://ashivam-tech.onrender.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`
- **Verification Method:**
  Live curl / PowerShell inspection of `https://ashivam-tec-h.vercel.app` confirms active CSP header on every response.
- **Current Status:** ✅ **RESOLVED & VERIFIED** (Commit `d330790`).

---

### SEC-004: nodemon Dependency ReDoS (Moderate)
- **Unique ID:** `SEC-004`
- **Severity:** 🟡 Low (Zero Production Exposure)
- **Affected Component:** `backend/package.json` (`devDependencies: nodemon ^3.1.14` -> `minimatch <11.0.1`)
- **Actual Evidence:**
  `npm audit` reports ReDoS advisory GHSA-g3hv-75wg-m249 in development dependency `nodemon`.
- **Root Cause:**
  Upstream transitive dependency in nodemon's file watcher glob parser.
- **Business Impact:**
  Zero runtime or production exposure. `nodemon` is strictly excluded from Docker production images via `npm ci --omit=dev`.
- **Proposed Remediation:**
  Accept risk for local development; preserve `npm audit --audit-level=high` gate in CI; monitor nodemon releases.
- **Verification Method:**
  Inspect production Docker container build: verify `nodemon` is not present in `node_modules`.
- **Current Status:** 🟡 **ACCEPTED DOCUMENTED RISK**.

---

### SEC-005: In-Memory Rate Limiting Counters
- **Unique ID:** `SEC-005`
- **Severity:** 🟡 Low
- **Affected Component:** `backend/src/middlewares/rateLimit.middleware.js`
- **Actual Evidence:**
  `express-rate-limit` maintains counters in local memory.
- **Root Cause:**
  Single-instance container architecture on Render Starter tier.
- **Business Impact:**
  If multi-instance scaling is activated, an attacker could distribute requests across instances, multiplying their rate-limit budget.
- **Proposed Remediation:**
  Document Redis cluster integration adapter (`rate-limit-redis`) for future horizontal scaling while retaining low-latency in-memory store for single-instance operations.
- **Verification Method:**
  Review middleware code and multi-instance stress simulations.
- **Current Status:** 🟡 **DOCUMENTED & MITIGATED**.

---

### SEC-007: Private Document Access Isolation
- **Unique ID:** `SEC-007`
- **Severity:** 🟠 Medium
- **Affected Component:** `backend/src/app.js`, `backend/src/modules/career/career.controller.js`
- **Actual Evidence:**
  Resumes, employee identity proofs, and HR documents could potentially be exposed if static directory mounting was misconfigured.
- **Root Cause:**
  Default Express static file middleware (`express.static`) mounts directories publicly if mounted broadly.
- **Business Impact:**
  Severe risk of confidential candidate and employee PII leakage.
- **Proposed Remediation:**
  1. Only `/uploads/media` is served statically.
  2. Private paths (`/uploads/resumes`, `/uploads/employee-documents`, `/uploads/hr-documents`) are explicitly trapped and return HTTP 404.
  3. Resume downloads require authenticated Bearer tokens and pass through `career.controller.js:downloadApplicationResume` with filename sanitization.
- **Verification Method:**
  `tests/career.test.js` Subtests 20–22 verify that direct GET requests to `/uploads/resumes/*`, `/uploads/employee-documents/*`, and `/uploads/hr-documents/*` return HTTP 404.
- **Current Status:** ✅ **RESOLVED & VERIFIED**.

---

### SEC-008: Last Superadmin Deletion / Demotion Race Condition
- **Unique ID:** `SEC-008`
- **Severity:** 🟠 Medium
- **Affected Component:** `backend/src/modules/admin/admin.service.js`, `backend/src/services/lock.service.js`
- **Actual Evidence:**
  Two concurrent Superadmins could simultaneously delete or demote each other, resulting in zero remaining Superadmins (permanent platform lockout).
- **Root Cause:**
  Non-atomic read-then-write check (`countDocuments({ role: 'superadmin' })`) without concurrency locking.
- **Business Impact:**
  Administrative lockout requiring direct, manual database intervention to restore access.
- **Proposed Remediation:**
  Wrapped all Superadmin mutation operations in distributed database locks (`withDistributedLock('admin:superadmin:mutation')`) with monotonic fencing tokens.
- **Verification Method:**
  `tests/audit-regression-invariants.test.js` Subtests 36 & 37 execute simultaneous concurrent demotion and deletion requests, verifying that exactly one request succeeds and the last Superadmin is preserved.
- **Current Status:** ✅ **RESOLVED & VERIFIED**.

---

### SEC-009: Multi-Layer CSRF Defense
- **Unique ID:** `SEC-009`
- **Severity:** 🟠 Medium
- **Affected Component:** `backend/src/middlewares/csrf.middleware.js`
- **Actual Evidence:**
  Browser-based authenticated requests using cookies require protection against forged cross-site requests.
- **Root Cause:**
  Browsers automatically attach cookies to cross-origin requests unless strictly partitioned.
- **Business Impact:**
  Attacker website could trick an authenticated administrator's browser into performing administrative actions.
- **Proposed Remediation:**
  Engineered multi-layer defense in `csrfProtection`:
  1. Safe HTTP methods (GET, HEAD, OPTIONS) bypass.
  2. Verified `Sec-Fetch-Site` header (blocks `cross-site`).
  3. Strict `Origin` and `Referer` matching against allowlist.
  4. Mandatory custom header verification (`X-Request-Id` or `X-CSRF-Token`).
- **Verification Method:**
  `tests/csrf-protection.test.js` Subtests 6–14 assert that untrusted origins, forged referers, and cross-site form submissions are rejected with HTTP 403.
- **Current Status:** ✅ **RESOLVED & VERIFIED**.

---

### SEC-010: Tamper-Resistant Administrative Audit Trail
- **Unique ID:** `SEC-010`
- **Severity:** 🟡 Low
- **Affected Component:** `backend/src/modules/audit/audit.model.js`, `backend/src/modules/audit/audit.service.js`
- **Actual Evidence:**
  Security compliance requires that all administrative actions (logins, role changes, document access) are recorded in an immutable ledger.
- **Root Cause:**
  Regulatory and enterprise governance requirements.
- **Business Impact:**
  Inability to reconstruct security incidents without reliable audit records.
- **Proposed Remediation:**
  Engineered `AuditLog` schema with strict immutability: schema disables updates and deletions. Records capture `adminId`, `action`, `targetModel`, `targetId`, `ip`, `userAgent`, and `timestamp`.
- **Verification Method:**
  `tests/enterprise-resilience-and-immutability.test.js` asserts that audit logs cannot be updated or modified once created.
- **Current Status:** ✅ **RESOLVED & VERIFIED**.
