# Ashivam Technologies — Production Readiness Report

> **Assessment Date:** 2026-11-01  
> **Assessed By:** Engineering Audit Cycle  
> **Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  
> **Commit:** `d330790` (6 commits ahead of `origin/main`, unpushed pending authorization)

---

## Verdict

> **CONDITIONALLY PRODUCTION-READY**

The platform meets enterprise production standards in security, authentication, backend reliability, and accessibility. Three open items (rate-limit store, CI node version, and `hashToken` dead code) are low-severity and do not block deployment. The platform **may be pushed to production** once the owner authorizes the push.

---

## Readiness Checklist

### ✅ Authentication & Session Security

- [x] JWT access tokens — short-lived, `HS256`, verified on every protected request
- [x] Refresh tokens — HMAC-SHA256 stored (never raw), rotated on every use
- [x] Token family replay detection — reuse of revoked token revokes entire family
- [x] Password change invalidates all sessions
- [x] HttpOnly, Secure, SameSite=None cookies in production
- [x] Cookie path restricted to `/api/v1/auth`
- [x] CSRF protection — multi-layer (Sec-Fetch-Site + Origin + Referer + custom header)
- [x] Login rate limiting with `skipSuccessfulRequests`
- [x] Anonymous visitors do not trigger `POST /auth/refresh`

### ✅ HTTP Security Headers

**Backend (Render + Cloudflare):**
- [x] `Content-Security-Policy` (Helmet)
- [x] `Strict-Transport-Security` (Helmet + Cloudflare)
- [x] `X-Frame-Options: DENY`
- [x] `X-Content-Type-Options: nosniff`
- [x] `Permissions-Policy`
- [x] `Referrer-Policy`
- [x] `X-Powered-By` removed

**Frontend (Vercel):**
- [x] `Content-Security-Policy` (as of `d330790`)
- [x] `X-Frame-Options: DENY`
- [x] `X-Content-Type-Options: nosniff`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy`

### ✅ Backend Reliability

- [x] MongoDB Atlas (managed, replica set available)
- [x] Distributed lock for ID generation (`withDistributedLock`)
- [x] Transactional outbox for email delivery (no lost emails on crash)
- [x] TTL index on refresh tokens (automatic expiry)
- [x] Health endpoints: `/api/v1/health` (readiness) + `/api/v1/health/liveness` (liveness)
- [x] Docker multi-stage build, non-root user, healthcheck
- [x] Error responses scrub filesystem paths, DB URIs, tokens
- [x] Audit log for all admin mutations

### ✅ Frontend Performance

- [x] Vite production build — 0 errors
- [x] Main bundle: 349 kB / 101 kB gzip (below Vite 500 kB advisory)
- [x] Admin chunks lazy-loaded on-demand (~175 kB / 33 kB gzip)
- [x] Cloudflare CDN caches static assets
- [x] SPA routing via Vercel catch-all rewrite
- [x] `robots.txt` disallows `/admin`, `/employee-login`
- [x] `sitemap.xml` includes all public routes
- [x] `index.html` has OpenGraph, Twitter Card, JSON-LD schema, canonical URL

### ✅ Accessibility

- [x] Navbar mobile drawer: `inert`, `aria-expanded`, `aria-controls`, focus management
- [x] Focus returned to hamburger on drawer close
- [x] No `aria-hidden` element containing focusable children
- [x] Touch targets ≥ 44px
- [x] Fluid typography with `clamp()` — no horizontal overflow

### ✅ Database

- [x] Indexes on all query patterns (auth, career, internship, inquiry, employee, audit)
- [x] Compound unique index `{ job: 1, email: 1 }` on applications (SEC-01 fix)
- [x] TTL index on refresh tokens
- [x] Sparse unique index on admin email (allows null)
- [x] `passwordHash` field has `select: false`

### ✅ CI/CD Pipeline

- [x] GitHub Actions: `test-frontend`, `test-backend`, `audit`, `build` jobs
- [x] Pinned SHA action dependencies
- [x] MongoDB replica set in CI for realistic test conditions
- [x] `npm audit --audit-level=high` — 0 high vulnerabilities

### ✅ Code Quality

- [x] No circular imports in React context graph
- [x] React Fast Refresh compliant (component-only modules)
- [x] No console.log in production paths
- [x] ESLint configured
- [x] All comments and docstrings preserved

---

## Open Items (Not Blocking)

| ID | Severity | Item | Owner | Timeline |
|---|---|---|---|---|
| SEC-02 | 🟡 LOW | Remove `hashToken` dead fallback string | Backend team | Next cleanup sprint |
| SEC-05 | 🟡 LOW | Rate limit store — switch to Redis for multi-instance | Infra team | Before horizontal scaling |
| SEC-06 | 🟡 LOW | Update CI `actions/setup-node` SHA | DevOps | Next maintenance sprint |
| PERF-02 | 🟡 LOW | Admin tab components not individually lazy-loaded | Frontend team | Nice-to-have |

---

## Production Environment Requirements

### Backend (Render)
Required environment variables (set in Render dashboard):
```
NODE_ENV=production
PORT=5000 (or Render default)
MONGO_URI=<Atlas connection string>
JWT_SECRET=<minimum 32 chars>
JWT_REFRESH_SECRET=<minimum 32 chars, distinct from JWT_SECRET>
CLIENT_URL=https://ashivam-tec-h.vercel.app
ADMIN_URL=https://ashivam-tec-h.vercel.app/admin
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=<gmail address>
EMAIL_PASS=<app password>
NOTIFICATION_EMAIL=ritik95061@gmail.com
```

### Frontend (Vercel)
No secrets in frontend. Build command: `npm run build`. Output: `dist/`.

---

## Deployment Authorization Requirement

> [!IMPORTANT]
> **Do NOT push to `origin/main` or `company/main` and do NOT deploy to Vercel or Render without explicit written authorization from the repository owner.**

Current unpushed commits (6 ahead of `origin/main`):
1. `d330790` — fix(security,perf): career unique index, Vercel CSP, Admin lazy-loading
2. `fbbc218` — fix: Fast Refresh, Navbar a11y, Vite proxy
3. `8ae1c85` — docs: duplicate refresh root cause report
4. `20c1c03` — feat: session hint optimization
5. `2875d84` — test: HTTP 405 assertions
6. `1cb7d57` — docs: local dev and accessibility audit

To push when authorized:
```bash
git push origin main
git push company main
```

---

*Report generated: 2026-11-01*
