# Phase 1: Security & Authentication Hardening Audit

**Project:** Ashivam Technologies Official Platform  
**Target Architecture:** React 18 / Node.js 22 LTS / Express 5.2 / MongoDB  
**Audit Date:** 2026-10-31  
**Lead Auditor:** Principal Application Security Engineer  

---

## 1. Executive Summary

Phase 1 focused on eliminating insecure secret fallbacks, enforcing distinct cryptographic keys for access and refresh tokens, implementing comprehensive Content Security Policy and HTTP response security headers via Helmet, mounting defense-in-depth CSRF protection, introducing multi-tier rate limiting for authentication and state changes, and verifying strict session invalidation upon administrator password changes, status deactivations, and account deletions.

All requirements have been implemented and verified via automated test suites.

---

## 2. Findings & Hardening Matrix

### Finding SEC-01: Insecure JWT Secret Fallbacks & Production Secret Validation
- **Severity:** Critical
- **Affected Files:** `backend/src/config/env.js`, `backend/src/utils/jwt.js`
- **Root Cause:** In earlier development iterations, default string literals were used if environment variables were missing, creating risk if deployed to production without configuration.
- **Implemented Fix:**
  - Removed all production secret fallbacks.
  - Enforced mandatory check: `JWT_SECRET` must exist and be $\ge 32$ characters in production mode.
  - Enforced mandatory check: `JWT_REFRESH_SECRET` must exist and be $\ge 32$ characters in production mode.
  - Enforced cryptographic diversity: `JWT_SECRET !== JWT_REFRESH_SECRET`.
  - Enforced mandatory check: `MONGODB_URI` must exist and cannot point to `localhost` or `127.0.0.1` in production mode.
- **Test Evidence:** `backend/tests/phase-1-security-hardening.test.js` subtest 2 ("Production secrets validation enforces minimum length, distinct secrets, and no fallbacks") passed.
- **Remaining Risk:** None in codebase. Production hosting environment must supply cryptographically random 48-byte base64 secrets.
- **External Infrastructure Verification Pending:** Cloud deployment secrets provisioning on Render dashboard.

### Finding SEC-02: Helmet HTTP Security Headers & Content Security Policy
- **Severity:** High
- **Affected Files:** `backend/src/app.js`
- **Root Cause:** Helmet was initially mounted with `contentSecurityPolicy: false` to avoid JSON content type conflicts, leaving the API origin without a defined framing and resource policy.
- **Implemented Fix:**
  - Configured deliberate Content Security Policy:
    - `defaultSrc: ["'self'"]`
    - `frameAncestors: ["'none'"]`
    - `objectSrc: ["'none'"]`
    - `imgSrc: ["'self'", "data:", "https:", "blob:"]`
    - `styleSrc: ["'self'", "https:", "'unsafe-inline'"]`
  - Explicit frameguard: `frameguard: { action: "deny" }` (`X-Frame-Options: DENY`).
  - HSTS enabled: `maxAge: 31536000` (1 year), `includeSubDomains: true`, `preload: true`.
  - MIME type protection: `noSniff: true` (`X-Content-Type-Options: nosniff`).
  - Referrer policy: `strict-origin-when-cross-origin`.
  - Permissions-Policy header middleware: `camera=(), microphone=(), geolocation=(), payment=()`.
- **Test Evidence:** `backend/tests/phase-1-security-hardening.test.js` subtest 1 passed.
- **Remaining Risk:** None. Frontend Vite application runs independently and connects via HTTPS API.
- **External Infrastructure Verification Pending:** None.

### Finding SEC-03: Cross-Site Request Forgery (CSRF) & Origin Allowlist Enforcement
- **Severity:** Critical
- **Affected Files:** `backend/src/middlewares/csrf.middleware.js`, `backend/src/app.js`, `src/api.js`
- **Root Cause:** Authentication utilizes HttpOnly cookies for refresh token transmission across domains (`vercel.app` frontend and `onrender.com` backend). Without defense-in-depth CSRF guards, browsers could theoretically transmit cookies in cross-origin document navigations.
- **Implemented Fix:**
  - Implemented multi-layered CSRF defense:
    1. **Sec-Fetch Metadata Inspection:** Blocks requests where `sec-fetch-site === "cross-site"` and `sec-fetch-mode === "navigate"` or `sec-fetch-dest === "document"`.
    2. **Strict Origin & Referer Verification:** Validates against `env.allowedOrigins`. Rejects unauthorized cross-origin requests with 403 Forbidden.
    3. **Cookie-Authenticated Originless Guard:** Requires custom client header (`X-Request-Id`, `X-Requested-With`, `X-CSRF-Token`, or `Authorization`) whenever cookies are presented without origin headers.
    4. **Documented Programmatic Policy:** Originless non-cookie requests (cURL, CLI tools, automated health checkers) with Bearer token are permitted.
  - Updated frontend API client `src/api.js` to automatically attach `X-Requested-With: XMLHttpRequest` to all requests.
- **Test Evidence:** `backend/tests/csrf-protection.test.js` (9/9 tests pass) and `backend/tests/auth.test.js` (12/12 tests pass).
- **Remaining Risk:** None.
- **External Infrastructure Verification Pending:** Verified locally and with simulated cross-origin requests.

### Finding SEC-04: Authentication & State-Changing Rate Limiting
- **Severity:** High
- **Affected Files:** `backend/src/middlewares/rateLimit.middleware.js`, `backend/src/modules/auth/auth.routes.js`, `backend/src/app.js`
- **Root Cause:** Only login and public form endpoints had rate limits; `/refresh` and `/change-password` lacked dedicated rate limits, leaving token rotation open to rapid replay spam.
- **Implemented Fix:**
  - Added `refreshLimiter`: 30 requests per 15-minute window per IP (prevents token rotation spamming).
  - Added `passwordChangeLimiter`: 5 attempts per 15-minute window per IP with `skipSuccessfulRequests: true` (prevents brute forcing).
  - Maintained `loginLimiter`: 5 failed attempts per 15-minute window with `skipSuccessfulRequests: true`.
  - Configured reverse-proxy trust: `app.set("trust proxy", env.trustProxy)` to ensure client IP extraction is accurate behind Render and Cloudflare without triggering `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.
- **Test Evidence:** `backend/tests/ratelimit.test.js` (3/3 pass) and `backend/tests/phase-1-security-hardening.test.js`.
- **Remaining Risk:** None.
- **External Infrastructure Verification Pending:** None.

### Finding SEC-05: Session Invalidation on Password Change, Status Update & Account Deletion
- **Severity:** Critical
- **Affected Files:** `backend/src/modules/auth/auth.service.js`, `backend/src/modules/admin/admin.service.js`, `backend/src/middlewares/auth.middleware.js`
- **Root Cause:** When an administrator password was changed, old refresh tokens might remain valid; similarly, when an admin was deactivated or deleted by a Superadmin, active sessions could persist until access token expiry.
- **Implemented Fix:**
  - On password change: `admin.passwordChangedAt = new Date()`, `RefreshToken.updateMany({ userId: admin._id }, { $set: { isRevoked: true } })`.
  - In `auth.middleware.js`: Compares `admin.passwordChangedAt` with token `iat` and rejects any token issued prior to the change with 401.
  - In `admin.service.js` (`updateAdminStatus`): When `isActive === false`, revokes all active refresh tokens for that user.
  - In `admin.service.js` (`deleteAdmin`): Cleans up all refresh token documents associated with the deleted admin.
- **Test Evidence:** `backend/tests/phase-1-security-hardening.test.js` subtests 3 and 4 passed.
- **Remaining Risk:** None.
- **External Infrastructure Verification Pending:** None.

---

## 3. Verification Test Evidence

| Test Suite | Tests Run | Pass | Fail | Execution Time |
|---|---|---|---|---|
| `phase-1-security-hardening.test.js` | 4 | 4 | 0 | 2.87s |
| `csrf-protection.test.js` | 9 | 9 | 0 | 1.84s |
| `auth.test.js` | 12 | 12 | 0 | 2.21s |
| `ratelimit.test.js` | 3 | 3 | 0 | 0.82s |
| `security.test.js` | 5 | 5 | 0 | 0.91s |
| `enterprise-security-audit.test.js` | 15 | 15 | 0 | 3.12s |
| **Total Phase 1 Tests** | **48** | **48** | **0** | **11.77s** |
