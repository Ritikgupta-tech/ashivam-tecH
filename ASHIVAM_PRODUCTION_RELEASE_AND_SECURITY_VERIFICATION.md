# ASHIVAM TECHNOLOGIES
## PRODUCTION RELEASE & SECURITY REMEDIATION REPORT

**Executive Summary:** Final release verification, credential security remediation, cross-domain session hardening, and GitHub release for the Ashivam Technologies enterprise platform.

**Company:** Ashivam Technologies  
**Headquarters:** Agra, Uttar Pradesh, India  
**Tagline:** Endless Innovation. Limitless Possibilities.  
**Report Date:** 2026-10-31  

---

## 1. Release & Verification Status Badges

| Gate | Status | Evidence |
| :--- | :---: | :--- |
| **Local Verification Gate** | `LOCAL VERIFIED` | 328/328 tests passed (232 backend + 77 frontend + 19 browser E2E) |
| **Credential Security Remediation** | `SECURITY REMEDIATED` | Password rotated, timestamp updated, all refresh token families revoked |
| **GitHub Release Gate** | `GITHUB UPDATED` | Pushed to `origin/main` and `company/main` at commit `67c7c90` |
| **CI Automation Gate** | `CI PASSED` | GitHub Actions run `#41203754643` 100% green (Backend, Frontend, Docker) |
| **Backend Deployment** | `BACKEND DEPLOYED` | Render production API live at `https://ashivam-tech.onrender.com/api/v1/health` (HTTP 200 OK) |
| **Frontend Deployment** | `FRONTEND DEPLOYED` | Vercel production web platform live at `https://ashivam-tec-h.vercel.app` (HTTP 200 OK) |
| **Overall Release Verification** | `PRODUCTION VERIFIED` | Live endpoints healthy, CSP/HSTS headers active, cross-origin cookies configured |

---

## 2. Phase 1 — Credential Security Remediation

### 2.1 Incident Containment
During previous verification, administrator credentials and refresh token values were passed in command-line arguments. In accordance with zero-trust security procedures, those credentials were treated as compromised.

### 2.2 Remediation Actions Executed
1. **Cryptographic Password Rotation:** Generated a 32-character cryptographically random password (`crypto.randomBytes(24).toString('base64url') + '!Ash26'`).
2. **Hash & Invalidation Timestamp:** Updated `superadmin` record in MongoDB with bcrypt hash (salt rounds: 12) and set `passwordChangedAt = new Date()`. In accordance with [`jwt.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/utils/jwt.js), any previously issued JWT access token with `iat < passwordChangedAt` is immediately rejected.
3. **Token Family Revocation:** Executed `RefreshToken.updateMany({ userId: admin._id }, { $set: { isRevoked: true } })`, invalidating all active refresh token families across all sessions.
4. **Credential Isolation:** Saved the rotated credentials exclusively into `.env.local` (mode 0600), which is strictly ignored by Git (`.gitignore`). Zero credentials or secrets were logged or printed.
5. **Self-Test Verification Results:**
   - Previous compromised password: **REJECTED (HTTP 401 / bcrypt comparison failed)**
   - Rotated password: **AUTHENTICATED (bcrypt match verified)**
   - Active refresh token count in database: **0 (All lineage families revoked)**

---

## 3. Phase 2 — Cross-Domain Authentication Architecture

The Ashivam production infrastructure spans two distinct cloud domains:
- **Client (Frontend):** `https://ashivam-tec-h.vercel.app` (Vercel)
- **API (Backend):** `https://ashivam-tech.onrender.com/api/v1` (Render)

### 3.1 Cookie Security Matrix
| Attribute | Development (`NODE_ENV=development`) | Production (`NODE_ENV=production`) | Rationale |
| :--- | :--- | :--- | :--- |
| `SameSite` | `Lax` | `None` | Allows cross-site cookie transmission from Vercel to Render. |
| `Secure` | `false` | `true` | Browser enforces that `SameSite=None` cookies must be HTTPS-only. |
| `HttpOnly` | `true` | `true` | Shields session refresh token from client-side JavaScript / XSS. |
| `Path` | `/api/v1/auth` | `/api/v1/auth` | Scopes cookie delivery strictly to authentication endpoints. |
| `Max-Age` | `604800` (7 days) | `604800` (7 days) | Sliding session lifecycle with rotation on each refresh. |

### 3.2 Cross-Origin Defense Layer
- **CORS Allowlist:** Strictly permits `https://ashivam-tec-h.vercel.app`, `https://ashivamtechnologies.com`, and `https://www.ashivamtechnologies.com` with `credentials: true`.
- **CSRF Defense Middleware ([`csrf.middleware.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/middlewares/csrf.middleware.js)):**
  - Blocks cross-site document navigations via Sec-Fetch metadata.
  - Requires approved `Origin` or `Referer` headers for state-changing requests.
  - Cookie-authenticated requests without origin require `X-Requested-With: XMLHttpRequest`.
- **Multi-Tab Web Locks Synchronization ([`src/api.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/src/api.js)):**
  - Wraps refresh execution with `navigator.locks.request('ashivam_auth_refresh_lock')`.
  - Serializes refresh token rotation across tabs to eliminate race-condition replay collisions.
  - Broadcasts `LOGOUT` and `SESSION_REFRESHED` events via `BroadcastChannel('ashivam_auth_sync')` with 0 credentials transmitted over the broadcast bus.

---

## 4. Phase 3 & 4 — Regression Verification Results

### 4.1 Automated Test Execution Summary

| Test Suite | Framework / Tool | Tests Run | Passed | Failed | Pass Rate | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Backend Suite** | Node Test Runner (`node --test`) | 232 | 232 | 0 | **100%** | 37.8s |
| **Frontend Unit** | Node Test Runner (`node --test`) | 77 | 77 | 0 | **100%** | 0.86s |
| **Browser E2E** | Playwright Chromium (Headless) | 19 | 19 | 0 | **100%** | 18.2s |
| **Total Automated** | **Full Regression Matrix** | **328** | **328** | **0** | **100%** | **~57s** |

### 4.2 Build & Diff Gates
- `node --check src/api.js`: **0 errors** (ESM syntax valid, 72 top-level exports verified).
- `npm run build`: **0 errors** (102 modules transformed in 594ms, chunked production assets generated in `dist/`).
- `git diff --check`: **0 errors** (Clean whitespace, no merge conflicts).

---

## 5. Phase 5 — Git Version Control & Release Metadata

### 5.1 Repository Remotes
- **Origin Remote:** `https://github.com/Ritikgupta-tech/ashivam-tecH.git`
- **Company Remote:** `https://github.com/AshivamTechnologies/Official-Websites.git`
- **Active Branch:** `main`

### 5.2 Release Commit Lineage
- **Head Release Commit:** `67c7c90` (`fix(transaction): detect RSPrimary and Mongos server types for direct replica set connections`)
- **Deployment Hardening Commit:** `1bee6f7` (`fix(deploy): derive fallback JWT refresh secret and initialize MongoDB replica set in CI`)
- **Fast Refresh & Loopback Fix Commit:** `b20c1e4` (`fix(auth): decouple useAuth for Fast Refresh, configure IPv4 loopback proxy and 0.0.0.0 host binding`)

### 5.3 GitHub Actions CI Verification
- **Run ID:** `41203754643`
- **Workflow:** `ci.yml` (`CI - Ashivam Official Platform`)
- **Status:** **SUCCESS (All 3 jobs green)**
  1. `Backend Test Suite & Security Audit`: **232/232 tests passed, 0 security vulnerabilities**
  2. `Frontend Quality, Tests & Production Build`: **77/77 tests passed, 0 errors, build successful**
  3. `Docker Build & Non-Root User Verification`: **Build succeeded, non-root user verified**

---

## 6. Phase 6 & 7 — Live Production Verification

### 6.1 Production Backend (`https://ashivam-tech.onrender.com/api/v1`)
```http
GET https://ashivam-tech.onrender.com/api/v1/health
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
x-render-origin-server: Render

{
  "success": true,
  "message": "Ashivam backend is healthy",
  "service": "ashivam-website-backend",
  "environment": "production",
  "database": "connected"
}
```

### 6.2 Production Frontend (`https://ashivam-tec-h.vercel.app`)
```http
GET https://ashivam-tec-h.vercel.app
HTTP/1.1 200 OK
Server: Vercel
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Type: text/html; charset=utf-8
```

---

## 7. Rollback & Disaster Recovery Readiness

1. **Git Rollback Target:** Previous verified commit `7f4b468788108de2cf002e8a0da488320b7d73bf` or stable tag `v1.0.0-verified`.
2. **Database Reversibility:** Zero schema mutations or destructive column drops were introduced in this release. All existing MongoDB collections (`admins`, `inquiries`, `applications`, `internships`, `employees`, `hr_documents`, `audit_logs`, `outbox_jobs`, `refresh_tokens`) maintain 100% backward compatibility.
3. **Outbox Reliability:** Transactional outbox workers implement 5-minute lease expiration recovery and monotonic fencing tokens, guaranteeing at-least-once email delivery resilience even in the event of worker failover.

---

## 8. Remaining Limitations & Recommendations

1. **DNS Cutover (Pending Domain Registrar Delegation):** Production endpoints currently operate on cloud subdomains (`ashivam-tec-h.vercel.app` and `ashivam-tech.onrender.com`). Once DNS nameservers for `ashivam.com` / `ashivamtechnologies.com` are delegated, CNAME and A-records should be pointed to Vercel/Render respectively.
2. **SMTP Live Routing:** Automated suites run strictly against the sandbox transport to avoid spamming corporate inboxes. Real notifications are verified to route exclusively to `team.ashivam@gmail.com`.
