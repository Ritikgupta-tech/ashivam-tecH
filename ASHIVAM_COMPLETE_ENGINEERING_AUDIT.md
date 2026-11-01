# ASHIVAM TECHNOLOGIES — COMPLETE ENGINEERING AUDIT

**Date:** 2026-10-31  
**Auditor:** Senior Engineering Team (Principal Architect, Security, QA, DevSecOps, Accessibility)  
**Branch:** `main` | **Latest Commit:** `1cb7d57` | **Ahead of `origin/main`:** 5 commits

---

## 1. Architecture Overview

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend | React | 18.3.1 | SPA via Vite, Vercel hosted |
| Router | React Router DOM | 7.18.4 | Client-side SPA routing |
| Build Tool | Vite | 8.3.4 | Production build confirmed |
| Backend | Express.js | 5.x | Node.js 22.23.1 |
| Database | MongoDB Atlas | 7.0 | Mongoose ODM |
| Auth | JWT (HS256) + HttpOnly Cookie refresh | — | Access 15m + Refresh 7d |
| Token storage | sessionStorage + in-memory | — | Refresh token: HttpOnly cookie |
| Session hint | localStorage (`ashivam_auth_hint`) | — | Non-sensitive, anonymous skip optimization |
| Email | Nodemailer (SMTP/Resend/Brevo) | — | Transactional outbox pattern |
| Storage | Local / S3 / R2 adapter | — | Pluggable via `STORAGE_PROVIDER` |
| Hosting | Vercel (FE) + Render (BE) | — | Cloudflare CDN on Render |
| CI/CD | GitHub Actions | — | 3-job pipeline |
| Container | Docker multi-stage non-root | — | node:22-alpine |
| Distributed Lock | MongoDB SystemLock | — | Heartbeat, fencing tokens |
| Rate Limiting | express-rate-limit | — | Per-endpoint budgets |

---

## 2. Repository & Git State

| Check | Result |
|---|---|
| Branch | `main` |
| Working tree | Clean (nothing to commit) |
| Ahead of `origin/main` | 5 commits (not yet pushed) |
| `company` remote | `https://github.com/AshivamTechnologies/Official-Websites.git` |
| `origin` remote | `https://github.com/Ritikgupta-tech/ashivam-tecH.git` |
| Tracked secrets | None found |
| `.env` in `.gitignore` | Yes |
| Commit history verified | `c26be86`, `2875d84`, `20c1c03`, `8ae1c85`, `fbbc218`, `1cb7d57` — all verified |

---

## 3. Environment & Dependency Audit

### Frontend Dependencies

| Package | Version | Status |
|---|---|---|
| react | ^18.3.1 | ✅ Current stable |
| react-dom | ^18.3.1 | ✅ Current stable |
| react-router-dom | ^7.18.4 | ✅ Current stable |
| @vitejs/plugin-react | ^6.1.2 | ✅ Current |
| vite | ^8.3.4 | ✅ Current |
| playwright | ^1.64.1 | ✅ Current |
| **npm audit** | 0 vulnerabilities | ✅ PASS |

### Backend Dependencies

| Package | Version | Status |
|---|---|---|
| express | ^5.x | ✅ Express 5 stable |
| mongoose | Current | ✅ |
| bcryptjs | ^3.0.3 | ✅ |
| jsonwebtoken | Current | ✅ |
| helmet | Current | ✅ |
| cors | ^2.8.6 | ✅ |
| express-rate-limit | Current | ✅ |
| multer | Current | ✅ |
| nodemon (devDep) | ^3.1.14 | ⚠️ Dev-only; `minimatch` ReDoS issue in nodemon. **Not in production Docker image** (npm ci --omit=dev). No production risk. |
| **npm audit** | 2 moderate (nodemon/minimatch dev-only) | ✅ No production vulnerabilities |

### Node.js Version

- Local: **v22.23.1** (matches CI, Docker `node:22-alpine`, package.json `engines`)

---

## 4. Complete Module Architecture

### Backend Modules (15 modules)

| Module | Routes | Auth Required | Notes |
|---|---|---|---|
| auth | login, refresh, logout, me, change-password | Mixed | HTTP 405 for wrong methods |
| admin | CRUD | Yes + Superadmin | Last-superadmin protection |
| inquiry | CRUD, export CSV | Admin | Public submission via inquiry route |
| career | Jobs + Applications | Mixed | Public job list/apply; Admin management |
| internship | Applications + Interns + Programs | Mixed | Distributed lock for ID generation |
| content | CMS blocks | Mixed | Public read, Admin write |
| media | File vault | Admin | SVG CSP hardened |
| notification | Email dispatch | Admin | Outbox pattern |
| audit | Security audit logs | Superadmin | Immutable records |
| settings | Platform config | Superadmin | |
| dashboard | Overview metrics | Admin | |
| employee | Employee CRUD | Admin | |
| employee-document | HR documents per employee | Admin | |
| hr-document | Global HR documents | Admin | |
| health | `/health`, `/liveness` | None | DB state reporting |

### Frontend Pages & Routes

| Route | Component | Auth Guard |
|---|---|---|
| `/` | HomePage | None |
| `/industries` | IndustriesPage | None |
| `/solutions` | SolutionsPage | None |
| `/careers` | CareersPage | None |
| `/employee-login` | EmployeePortalSelector | None |
| `/employee-login/employee` | EmployeeLoginPage | None |
| `/employee-login/admin` | AdminLogin | None |
| `/admin` | AdminDashboard | Client-side auth check |
| `/admin/*` | AdminDashboard | Client-side auth check |
| `/privacy-policy` | LegalPage | None |
| `/terms-of-service` | LegalPage | None |
| `/security` | LegalPage | None |
| `*` | NotFoundPage | None |

---

## 5. Security Architecture Assessment

### Authentication (VERIFIED)
- ✅ JWT HS256 access token (15m TTL)
- ✅ Opaque refresh token (crypto.randomBytes(40)) stored as HMAC-SHA256 hash in MongoDB
- ✅ Refresh token rotation on every use (single-use tokens)
- ✅ Token family replay detection — reuse revokes entire family
- ✅ Password change invalidates ALL existing refresh tokens
- ✅ Admin deactivation checked on every request (auth middleware)
- ✅ `passwordChangedAt` invalidates tokens issued before the change
- ✅ HttpOnly, Secure, SameSite=none (prod) cookie — correctly configured for Vercel→Render cross-site

### Authorization (VERIFIED)
- ✅ `authenticate` middleware on all protected routes
- ✅ `requireRole('Superadmin')` on admin management
- ✅ `requirePermission(...)` for granular access control
- ✅ Superadmin bypasses permission checks (correct)

### Identified Issues

#### MEDIUM — hashToken fallback chain (jwt.js line 35)
```js
const secret = env.jwtRefreshSecret || env.jwtSecret || "default-refresh-secret-seed";
```
If both `JWT_REFRESH_SECRET` and `JWT_SECRET` are somehow undefined, the hash falls back to `"default-refresh-secret-seed"`. In production, `env.js` throws at startup if `jwtRefreshSecret` is null, so this line is never reached in production. However, the fallback chain is defence-in-depth weakness if the startup validation is ever bypassed. **Severity: LOW** (production guard exists, but defense-in-depth improvement available).

#### INFORMATIONAL — CSP `unsafe-inline` in style-src
Backend Helmet CSP includes `style-src: 'self' https: 'unsafe-inline'`. This is pragmatic for the current frontend (injected CSS), but weakens XSS protection for styles. Vercel frontend does not serve a server-side CSP.

#### LOW — Frontend missing CSP header on Vercel
`vercel.json` sets `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` but no `Content-Security-Policy`. The Vite SPA is a static file delivery; CSP would add meaningful XSS defence in depth.

### CORS Assessment
- ✅ Exact origin allowlist (no wildcards with credentials)
- ✅ `credentials: true` only for allowed origins
- ✅ Development localhost permissive, production strict
- ✅ OPTIONS preflight supported
- ✅ CSRF middleware with Sec-Fetch-Site + Origin + Referer + custom header validation

### Rate Limiting
| Endpoint | Limit | Window |
|---|---|---|
| Login | 5 (skip on success) | 15 min |
| Refresh | 30 | 15 min |
| Password change | 5 (skip on success) | 15 min |
| Public forms | 10 | 15 min |
| Global | 100 | 15 min |
| Health | 300 | 1 min |

> [!WARNING]
> Rate limiters use `express-rate-limit` with in-memory store. On multiple Render instances, rate limit state is **not shared across instances**. Render free tier typically runs a single instance, so this is low risk currently, but must be addressed with Redis store before horizontal scaling.

---

## 6. Database Architecture Assessment

### Schemas Reviewed
- **Admin**: username unique+index, email partial unique (sparse), role index, compound (role+isActive)
- **RefreshToken**: tokenHash unique, familyId index, userId+isRevoked compound, TTL index on expiresAt
- **Inquiry**: status+createdAt compound, email+createdAt compound
- **Internship**: domain+status+convertedToIntern compound, email+domain index (not unique — intentional, dedup via ACTIVE_STATUSES query)
- **Career Application**: unique constraint expected per (job+email) — enforced at application layer

### Race Conditions
- ✅ Internship ID generation protected by `withDistributedLock` with heartbeat and fencing tokens
- ✅ Career application dedup: in-flight Set + database check
- ✅ Distributed lock: MongoDB SystemLock with lease expiry and monotonic fencing tokens
- ⚠️ Career application duplicate check uses in-flight Set (in-memory, single-instance only). On multi-instance deployment, two simultaneous requests to different instances can both pass the Set check. The database-level query check `Application.findOne({job, email})` runs after, providing a second defense, but there is a TOCTOU window if both instances reach the DB check simultaneously before either insert completes. Requires a unique compound index `{job, email}` on the Application model for atomic protection.

---

## 7. Frontend Engineering Assessment

### React Quality
- ✅ Single `AuthProvider` instance in `App.jsx`
- ✅ `authContextDef.js` decoupled for Vite Fast Refresh (fixed in `fbbc218`)
- ✅ No duplicate AuthProvider
- ✅ `useCallback` on all auth operations
- ✅ BroadcastChannel cleanup in effect return
- ✅ Storage event listener cleanup
- ✅ Single-flight refresh with Web Locks API

### Accessibility
- ✅ Navbar aria-hidden focus management fixed (`fbbc218`)
- ✅ `inert` attribute on closed drawer
- ✅ `aria-controls` hamburger → drawer
- ✅ `aria-expanded` on hamburger
- ✅ `role="dialog"` + `aria-modal="true"` on drawer
- ✅ Focus restoration to hamburger on close
- ✅ Escape key handling

### Performance
- ⚠️ Single JS bundle: 527.35 kB (gzip: 132 kB). Exceeds Vite's 500 kB advisory. Admin Dashboard is large and always included. Code splitting with `React.lazy()` / `import()` would improve initial load for public visitors.

---

## 8. DevSecOps & Infrastructure

### CI/CD (GitHub Actions)
- ✅ 3 jobs: Frontend QA + Backend tests + Docker verification
- ✅ Pinned action SHAs (supply chain protection)
- ✅ `permissions: contents: read` (least privilege)
- ✅ MongoDB Replica Set started in CI for transaction tests
- ✅ Non-root Docker container verified in CI
- ✅ `npm audit --audit-level=high` on both frontend and backend
- ⚠️ CI uses `Node.js 20` action pinned SHA but forces Node.js 24 runtime (deprecation warning). Non-breaking but should be updated to `actions/setup-node` with Node 22.

### Docker
- ✅ Multi-stage build (builder + minimal runtime)
- ✅ `node:22-alpine`
- ✅ Non-root user (`appuser`)
- ✅ `apk --no-cache upgrade` for security patches
- ✅ HEALTHCHECK configured
- ✅ `ENV NODE_ENV=production`
- ✅ `npm ci --omit=dev` — no devDependencies in image

### Vercel
- ✅ SPA rewrite rule (`/(.*) → /index.html`)
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ⚠️ Missing `Content-Security-Policy` header
- ⚠️ Missing `Strict-Transport-Security` header (Vercel provides HSTS via their infrastructure, but explicit configuration is better)

---

## 9. Issues Summary

| ID | Severity | Component | Description |
|---|---|---|---|
| SEC-01 | MEDIUM | Career Service | No unique DB index on (job+email) — TOCTOU on multi-instance |
| SEC-02 | LOW | jwt.js | hashToken fallback to dev seed string (theoretical) |
| SEC-03 | LOW | vercel.json | Missing CSP header on frontend |
| PERF-01 | MEDIUM | Frontend bundle | 527 kB single bundle; no code splitting |
| INFRA-01 | MEDIUM | Rate limiting | In-memory store — not distributed across instances |
| INFRA-02 | LOW | CI | Node 20 action deprecation warning |
| DEV-01 | LOW | nodemon devDep | minimatch ReDoS — dev environment only |

---

## 10. Remediation Priority

1. **SEC-01** — Add unique compound index `{job: 1, email: 1}` to Application model (prevents duplicate career applications on multi-instance)
2. **SEC-03** — Add CSP header to `vercel.json`
3. **PERF-01** — Lazy-load `AdminDashboard` and admin tabs with `React.lazy()`
4. **INFRA-01** — Document Redis rate limiting requirement for multi-instance scaling
5. **INFRA-02** — Update CI Node.js action version
