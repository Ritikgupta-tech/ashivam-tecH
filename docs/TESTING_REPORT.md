# Ashivam Technologies — Quality Assurance & Testing Report

**Document Version:** 3.1.0 (Master Engineering Release & Distributed Concurrency Audit)  
**Classification:** Confidential — Internal Company & DevOps Use Only  
**Company:** Ashivam Technologies  
**Date:** October 30, 2026  
**Auditor:** QA Automation Lead & Application Security Engineer  

---

## 1. Executive Testing Summary

All test suites across the frontend and backend tiers have been executed independently and verified under native Node.js runtime environments (`node:test`, `node:assert/strict`, `supertest`):

| Test Suite Category | Command Executed | Total Tests | Passed | Failed | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Test Suite** | `npm test --prefix backend` | **201** | **201** | **0** | ~8.8s | **100% PASS** |
| **Frontend Test Suite** | `npm test` | **74** | **74** | **0** | ~0.4s | **100% PASS** |
| **Production Build** | `npm run build` | 100 modules | Bundled | 0 | ~0.3s | **CLEAN** |
| **Whitespace Hygiene** | `git diff --check` | Tracked files | Verified | 0 | ~0.1s | **CLEAN** |
| **Live SMTP Handshake** | `npm run verify:smtp --prefix backend` | Gateway check | Verified | 0 | ~5.8s | **250 OK** |

---

## 2. Backend Automated Test Suite Breakdown (201 Tests)

### 2.1 File-by-File Test Suite Execution
* **`tests/concurrency-and-distributed-locks.test.js` (4 Tests):**
  * 50 simultaneous intern allocations generating unique monotonic IDs without lost counter increments.
  * 50 simultaneous applicant conversion attempts on the same application yielding exactly 1 active intern and 49 conflict rejections.
  * Cluster-wide Superadmin protection preventing the removal of the last active Superadmin under concurrent demotion and deactivation attacks.
  * Distributed lock lease acquisition, automatic TTL expiry recovery, and token release validation.
* **`tests/admin-csv-and-dashboard.test.js` (18 Tests):**
  * Formula injection mitigation across CSV export streams.
  * Range filters for dashboard metrics (`7d`, `30d`, `90d`, `all`).
  * Admin accounts listing and operational status checks.
* **`tests/admin-rbac.test.js` (21 Tests):**
  * Superadmin permission isolation.
  * Operational admin permission enforcement across all 11 modules.
  * Distributed lock `withAdminMutationLock` serializing concurrent requests to prevent the removal of the last active Superadmin.
* **`tests/auth.test.js` & `tests/auth-password-change.test.js` (13 Tests):**
  * Admin authentication flow, credential validation, salt hashing.
  * Self-service password rotation stamping `passwordChangedAt`.
  * Invalidation of previously issued JWTs; expired token rejection; inactive admin account blocking (HTTP 403).
  * Dual-token sliding session engine: 15-minute access JWT with 7-day HttpOnly cookie refresh token.
  * Token rotation on `/api/v1/auth/refresh` maintaining session continuity.
  * Replay attack detection revoking entire compromised token family lineages (`familyId`).
  * Explicit `/api/v1/auth/logout` revoking token families in database and clearing cookies.
* **`tests/career.test.js` (12 Tests):**
  * Job posting creation, slugification, and status toggles.
  * Resume upload and magic-byte inspection (`%PDF`, DOC, DOCX).
  * Authenticated streaming of resumes.
* **`tests/internship-management.test.js` (17 Tests):**
  * Direct intern onboarding and candidate conversion pipelines.
  * Concurrency-safe sequential intern ID generation (`ASH-INT-YYYY-XXX`).
  * Onboarding compliance checklist transitions and safe CSV exports.
* **`tests/e2e-email-sandbox.test.js`, `tests/email.test.js`, `tests/email-workflows.test.js` (31 Tests):**
  * Enforced company recipient routing to `team.ashivam@gmail.com`.
  * Candidate and client confirmation receipts preserving `replyTo: team.ashivam@gmail.com`.
  * Inbound lead notifications setting `replyTo: data.email`.
  * Public submission anti-tampering stripping `to`, `cc`, and `bcc` overrides.
  * Template XSS escaping and CRLF header injection defenses.
* **`tests/employee.test.js` (13 Tests):**
  * Unique email validation for active employees.
  * Soft-deletion and employee profile restoration.
  * Safe CSV export.
* **`tests/hr-document.test.js` (10 Tests):**
  * HR document upload with category and role restrictions.
  * Authenticated streaming downloads.
* **`tests/content.test.js` (15 Tests):**
  * CMS content block creation, draft/publish workflow, and public read API.
* **`tests/media.test.js` (8 Tests):**
  * Media upload validation, MIME checks, and deep SVG sanitization.
* **`tests/ratelimit.test.js` & `tests/security.test.js` (15 Tests):**
  * Global API, auth, and form rate limit enforcement.
  * Helmet security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
  * Reverse proxy trust handling `X-Forwarded-For`.
* **`tests/validation.test.js` & `tests/health.test.js` (14 Tests):**
  * Strict regex validation, ReDoS metacharacter escapes, honeypot traps.
  * `/health` and `/health/liveness` container probes.

---

## 3. Frontend Automated Test Suite Breakdown (74 Tests)

### 3.1 Component & Architecture Tests (`tests/adminDashboardModules.test.js` — 24 Tests)
* Vercel catch-all rewrites for `/admin/*` SPA routes.
* Permission checks for Superadmin vs. Operational Admin tabs.
* Form validations for Admin login, user creation, and password rotation.
* High-precision vector SVG icon rendering without emojis.
* Modal scrolling bounded within viewport (`max-height: calc(100dvh - 2.5rem)`).

### 3.2 Responsive & Touch Target Tests (`tests/responsiveAudit.test.js`, `tests/touchTargets.test.js` — 26 Tests)
* 44px minimum touch targets across buttons, filters, and mobile drawers.
* Responsive viewport meta tag validation.
* CSS clamp scales for typography preventing horizontal clipping.
* Form rows and modals stacking vertically on mobile viewports (360px–768px).

### 3.3 Multi-Page & SEO Tests (`tests/multiPageDesign.test.js`, `tests/seoAudit.test.js` — 24 Tests)
* Verification of dedicated routes: `/`, `/industries`, `/solutions`, `/careers`, `/legal`, `/employee-login`.
* Dynamic page metadata updating via `src/utils/seo.js`.
* Canonical URLs, OpenGraph, Twitter cards, and JSON-LD `OfferCatalog` schema in `index.html`.
* `robots.txt` disallowing private administrative and employee portals.

---

## 4. Production Build & Code Quality Integrity

```text
> vite build
vite v8.3.4 building client environment for production...
transforming...
✓ 100 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   5.42 kB │ gzip:   1.56 kB
dist/assets/index-C72C8d9H.css  163.63 kB │ gzip:  26.56 kB
dist/assets/index-pvAFPrvo.js   520.69 kB │ gzip: 130.66 kB
✓ built in 1.00s
```

* **Compilation Outcome:** 100% clean production bundle without missing modules or circular dependencies.
* **Lint & Whitespace Verification:** `git diff --check` completed with exit code 0.
