# Ashivam Technologies — Security Red Flag Register

> **Classification:** Internal Engineering  
> **Generated:** 2026-11-01  
> **Status:** Active — reviewed after each engineering cycle  
> **Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`

---

## How to Read This Register

| Severity | Meaning |
|---|---|
| 🔴 HIGH | Exploitable in production; immediate action required |
| 🟠 MEDIUM | Exploitable under specific conditions; fix before next deployment |
| 🟡 LOW | Defence-in-depth gap; fix in upcoming sprint |
| ✅ RESOLVED | Fixed and verified by automated test or production check |

---

## Summary

| ID | Severity | Title | Status |
|---|---|---|---|
| SEC-01 | 🟠 MEDIUM | Career application duplicate submission — TOCTOU race | ✅ RESOLVED `d330790` |
| SEC-02 | 🟡 LOW | `hashToken` fallback secret chain in `jwt.js` | ✅ MITIGATED (startup throws in production) |
| SEC-03 | 🟡 LOW | Missing Content-Security-Policy on Vercel frontend | ✅ RESOLVED `d330790` |
| SEC-04 | 🟡 LOW | `nodemon` devDep depends on `minimatch` ReDoS (moderate) | ✅ ACCEPTED (devDep only; never in production image) |
| SEC-05 | 🟡 LOW | Rate limiting uses in-memory store (not distributed) | 🟡 DOCUMENTED — acceptable on single Render instance |
| SEC-06 | 🟡 LOW | CI `actions/setup-node` SHA targets Node 20; runtime is Node 24 | 🟡 DEFERRED — cosmetic deprecation warning only |

---

## Detailed Findings

---

### SEC-01 — Career Application TOCTOU Race Condition ✅ RESOLVED

**Severity:** 🟠 MEDIUM  
**Component:** `backend/src/modules/career/application.model.js`, `career.service.js`  
**Commit fixed:** `d330790`

**Description:**  
`career.service.js` used an in-process `Set` (`inFlightApplications`) plus an application-level `findOne()` duplicate check to prevent a candidate from submitting multiple applications for the same job posting. These guards are **per-instance only** — they do not protect against concurrent requests arriving at different Node.js processes (e.g., Render multi-instance scaling, rolling deployments, or horizontal autoscaling).

The window:
1. Process A reads `inFlightApplications` → not present → proceeds to `findOne` (no record yet)
2. Process B reads `inFlightApplications` on its own instance → also not present → proceeds to `findOne`
3. Both processes pass the `findOne` check (race window)
4. Both processes call `Application.create()` → two records created for the same `{job, email}`

**Fix applied:**
- Added compound unique MongoDB index `{ job: 1, email: 1 }` in `application.model.js`
- Added E11000 duplicate-key error handler in `career.service.js` `catch` block — surfaces HTTP 409 with the same user-friendly message instead of a raw 500
- The in-process Set guard is preserved as a fast, zero-latency first-line check within a single instance

**Verification:**  
Backend test suite 236/236 PASS. The existing career service tests exercise the duplicate-check path.

---

### SEC-02 — `hashToken` Fallback Secret Chain ✅ MITIGATED

**Severity:** 🟡 LOW  
**Component:** `backend/src/utils/jwt.js` ~line 35

**Description:**  
```js
const secret = env.jwtRefreshSecret || env.jwtSecret || "default-refresh-secret-seed";
```
A hardcoded fallback `"default-refresh-secret-seed"` is reachable if both `jwtRefreshSecret` and `jwtSecret` are falsy at runtime.

**Mitigation (already in place):**  
`backend/src/config/env.js` validates and **throws at startup** if `jwtRefreshSecret` is missing in production mode (`NODE_ENV=production`). The process never starts without the secret. The fallback string is therefore unreachable in any deployed environment.

**Residual risk:** Low — only exploitable if `env.js` startup validation is bypassed (not possible through the current startup path).

**Recommendation:** Remove the final fallback string in a future cleanup sprint to eliminate the dead code path.

---

### SEC-03 — Missing Content-Security-Policy on Vercel Frontend ✅ RESOLVED

**Severity:** 🟡 LOW  
**Component:** `vercel.json`  
**Commit fixed:** `d330790`

**Description:**  
`vercel.json` only set `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`. There was no `Content-Security-Policy` header, leaving the frontend without XSS mitigations at the CDN/edge layer.

The backend (Render) already had a strong CSP via Helmet. The frontend (Vercel SPA) was the gap.

**Fix applied:**
```
Content-Security-Policy: default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:;
  font-src 'self' data: https:; connect-src 'self' https://ashivam-tech.onrender.com;
  worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

Also added: `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`.

**Note:** `'unsafe-inline'` for `style-src` is required by the current Vite build (no CSS nonce injection). This is acceptable for a production marketing SPA. A nonce-based approach requires server-side rendering.

---

### SEC-04 — `nodemon` DevDependency ReDoS (moderate) ✅ ACCEPTED

**Severity:** 🟡 LOW (devDependency; zero production exposure)  
**Component:** `backend/package.json` — `nodemon ^3.1.14` → `minimatch <11.0.1`

**Description:**  
`nodemon` depends on `minimatch` versions below `11.0.1` which has a known ReDoS potential via the `globparts` regex. npm audit classifies this as **moderate**.

**Why accepted:**
- `nodemon` is listed only in `devDependencies`
- The production Docker image runs `npm ci --omit=dev` — `nodemon` is never installed in production
- CI gate is `--audit-level=high` — this moderate finding does not break CI
- Updating `nodemon` to a version that pulls `minimatch ≥11.0.1` would require a major version bump with breaking changes

**Action:** Review when `nodemon` releases a compatible version. No action required now.

---

### SEC-05 — Rate Limiting In-Memory Store (Not Distributed) 🟡 DOCUMENTED

**Severity:** 🟡 LOW  
**Component:** `backend/src/middlewares/rateLimit.middleware.js`

**Description:**  
`express-rate-limit` uses its default in-memory store. Rate limit counters are **per-process only**. If the backend scales to multiple instances, each instance maintains independent counters — an attacker could distribute requests across instances to effectively multiply the rate limit budget.

**Current state:**  
Render free/starter tier runs a **single instance**. The in-memory store is effective for the current deployment topology.

**If/when scaling:**  
Replace the default store with `rate-limit-redis` pointing at an Upstash Redis or Render Redis instance:
```js
import RedisStore from 'rate-limit-redis';
// ...
store: new RedisStore({ sendCommand: (...args) => redis.call(...args) })
```

**Action:** No immediate code change required. Revisit when Render service is upgraded beyond single-instance.

---

### SEC-06 — CI `actions/setup-node` SHA Targets Node 20 🟡 DEFERRED

**Severity:** 🟡 LOW  
**Component:** `.github/workflows/ci.yml`

**Description:**  
The pinned `actions/setup-node` SHA resolves to a release that expects Node 20, but the workflow `node-version: 22` directive and GitHub's runner now use Node 24. This produces a deprecation warning in CI output but does not fail the build or tests.

**Action:** Update the SHA to the latest `actions/setup-node@v4` compatible release in a maintenance sprint. Non-blocking.

---

## Threat Model Notes

### Authentication Security Chain (Verified)

- JWT access tokens: short-lived, `HS256`, verified on every protected request
- Refresh tokens: `crypto.randomBytes(40)` → stored as HMAC-SHA256 hash (never raw in DB)
- Token rotation: every use creates a new record; old token is revoked immediately
- Replay detection: reuse of a revoked token revokes the **entire family** (all sessions for that user)
- Password change: invalidates all refresh token families
- Cookie attributes: `HttpOnly`, `SameSite=None` (production), `Secure`, `Path=/api/v1/auth`
- CSRF: multi-layer — `Sec-Fetch-Site`, `Origin`, `Referer`, custom `X-Requested-With` header chain

### Infrastructure Security (Verified)

- Backend: Helmet CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Permissions-Policy`, `Referrer-Policy`
- Frontend: `X-Frame-Options: DENY`, `X-Content-Type-Options`, CSP, `Referrer-Policy`, `Permissions-Policy` (as of `d330790`)
- CORS: explicit origin allowlist; `credentials: true`
- Error responses: filesystem paths, DB URIs, and Bearer tokens scrubbed before response
- Audit log: all administrative mutations recorded with `adminId`, IP, `userAgent`, timestamp

---

*Register last updated: 2026-11-01 by engineering audit cycle.*
