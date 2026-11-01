# Ashivam Technologies — Testing & QA Report

> **Generated:** 2026-11-01  
> **Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  
> **Commit:** `d330790`

---

## Test Suite Summary

| Suite | Runner | Test Count | Pass | Fail | Coverage Areas |
|---|---|---|---|---|---|
| Frontend Unit & Integration | Node.js `--test` | 107 | **107** | 0 | Components, auth, routing, a11y, session, CSV, API contracts |
| Backend Unit & Integration | Node.js `--test` | 236 | **236** | 0 | Auth, RBAC, CRUD, security headers, rate limiting, CSV, DB |
| Production Build | Vite `build` | — | ✅ 0 errors | — | Bundle integrity, chunk splitting, CSS extraction |

**Total: 343 automated test assertions — all passing.**

---

## Frontend Tests (`tests/**/*.test.js`)

### Test Files

| File | Tests | Focus |
|---|---|---|
| `tests/admin.test.js` | 22 | Admin panel UI, RBAC, forms, navigation, permissions |
| `tests/auth.test.js` | 12 | Login flow, session hint, AuthContext architecture, Web Locks |
| `tests/routes.test.js` | 10 | Route map completeness, SPA rewrite, legal routes |
| `tests/responsive.test.js` | 10 | Mobile stacking, touch targets, fluid typography |
| `tests/accessibility.test.js` | 9 | ARIA attributes, focus management, Navbar a11y |
| `tests/seo.test.js` | 6 | OpenGraph, JSON-LD, canonical URL, sitemap, robots.txt |
| `tests/api.test.js` | 8 | API contract, CSV injection, export utilities |
| `tests/sessionHint.test.js` | 6 | Anonymous visitor optimization, hint lifecycle |
| `tests/localDevelopmentHardening.test.js` | 20 | Fast Refresh, Navbar a11y, Vite proxy, regression |
| `tests/career.test.js` | 4 | Career application duplicate guard, slug generation |

### Selected Test Coverage Details

#### Authentication & Session
- Anonymous visitor produces zero `POST /auth/refresh` when no hint present ✅
- Session hint set on login, cleared on logout ✅
- `localStorage` failure handled gracefully ✅
- Concurrent refresh callers share single in-flight promise ✅
- Web Locks architecture preserved in `src/api.js` ✅
- `AuthContext` exports only `AuthProvider` (Fast Refresh compliant) ✅
- `authContextDef.js` exports only `AuthContext` (no components) ✅

#### Security
- CSV formula injection neutralized in all export paths ✅
- Admin-only routes inaccessible to Normal Admin role ✅
- Superadmin bypasses permission checks (by design) ✅

#### Accessibility
- Navbar hamburger has `aria-expanded`, `aria-controls` ✅
- `inert` attribute on closed drawer ✅
- Focus returns to hamburger on drawer close ✅
- Touch targets meet 44px minimum ✅
- No `aria-hidden` element containing focusable children ✅

#### Routing
- All enterprise routes present in `App.jsx` ✅
- Admin routes correctly map to lazy-loaded `AdminDashboard` / `AdminLogin` ✅
- SPA catch-all rewrite present in `vercel.json` ✅
- Legal governance routes (`/privacy-policy`, `/terms-of-service`, etc.) ✅

---

## Backend Tests (`backend/tests/**/*.test.js`)

### Test Files

| File | Tests | Focus |
|---|---|---|
| `tests/auth.test.js` | 38 | Login, logout, refresh, 405 methods, token rotation, replay detection |
| `tests/admin.test.js` | 32 | Admin CRUD, RBAC, permission management, last-superadmin guard |
| `tests/career.test.js` | 24 | Job CRUD, application lifecycle, resume upload, duplicate guard |
| `tests/internship.test.js` | 28 | Internship CRUD, intern management, distributed lock, RBAC |
| `tests/inquiry.test.js` | 18 | Contact form submission, validation, admin management |
| `tests/employee.test.js` | 22 | Employee CRUD, HR documents, export |
| `tests/dashboard.test.js` | 8 | Overview metrics, range filtering |
| `tests/security.test.js` | 22 | Headers, session invalidation, secrets validation |
| `tests/rateLimit.test.js` | 8 | Health endpoint exemption, 429 envelope format |
| `tests/csv.test.js` | 18 | CSV export for all entities, formula injection, auth guard |
| `tests/validation.test.js` | 10 | Input sanitization, URL normalization, ObjectId validation |
| `tests/query.test.js` | 2 | ReDoS protection in `escapeRegex` |
| `tests/audit.test.js` | 6 | Audit log creation, CSV export |

### Selected Backend Coverage Details

#### Authentication Security
- `POST /auth/login` — valid credentials → 200 + HttpOnly cookie ✅
- `POST /auth/login` — wrong password → 401 ✅
- `POST /auth/login` — inactive account → 401 ✅
- `GET /auth/refresh` → 405 + `Allow: POST` header ✅
- `GET /auth/login` → 405 + `Allow: POST` header ✅
- `POST /auth/refresh` without cookie → 401 ✅
- Token replay — reuse of revoked refresh token revokes entire family ✅
- Password change invalidates all refresh token families ✅

#### RBAC & Authorization
- Normal Admin cannot access Admin Accounts tab → 403 ✅
- Superadmin bypasses permission checks ✅
- Last Superadmin cannot be demoted or deleted ✅
- `requireRole` and `requirePermission` middlewares tested in isolation ✅

#### Security Headers
- `Content-Security-Policy` present on all backend responses ✅
- `Strict-Transport-Security` present ✅
- `X-Frame-Options: DENY` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Permissions-Policy` ✅
- `X-Powered-By` removed ✅

#### Rate Limiting
- Health endpoints exempt from rate limiting ✅
- 429 response uses standard JSON envelope ✅

---

## Build Verification

```
vite v8.3.4 building client environment for production...
✓ 103 modules transformed.

dist/index.html                            5.42 kB │ gzip:   1.56 kB
dist/assets/AdminLogin-*.css               5.11 kB │ gzip:   1.55 kB
dist/assets/AdminDashboard-*.css          37.37 kB │ gzip:   6.65 kB
dist/assets/index-*.css                  121.47 kB │ gzip:  20.00 kB
dist/assets/AdminLogin-*.js                5.81 kB │ gzip:   2.08 kB   ← on-demand
dist/assets/AdminDashboard-*.js          175.28 kB │ gzip:  32.83 kB   ← on-demand
dist/assets/index-*.js                   348.66 kB │ gzip: 101.48 kB   ← main bundle

✓ built in 1.08s
```

- **0 errors, 0 warnings**
- Main bundle reduced from 527 kB → 349 kB (below Vite's 500 kB advisory)
- Admin chunks are separate files fetched only when `/admin/*` is navigated to

---

## Known Gaps (Not Automated)

| Gap | Reason | Mitigation |
|---|---|---|
| Playwright E2E browser automation | No local backend running; production tests against live Render may race on cold start | Manual smoke test verified via `curl` |
| Visual regression (screenshots) | No Playwright baseline images committed | Defer to dedicated QA sprint |
| Load / stress testing | No Locust / k6 suite | Render free tier; defer until paid instance |
| Lighthouse CI | Not integrated into CI workflow | Manual Lighthouse run: Performance ~82, A11y ~94 |

---

## CI Pipeline Status

```yaml
# .github/workflows/ci.yml
jobs:
  test-frontend:  npm test -- --run   → 107/107 ✅
  test-backend:   npm test            → 236/236 ✅
  audit:          npm audit --audit-level=high → 0 high vulnerabilities ✅
  build:          npm run build       → 0 errors ✅
```

---

*Report generated: 2026-11-01*
