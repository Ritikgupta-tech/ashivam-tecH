# ASHIVAM TECHNOLOGIES — FINAL ENGINEERING AUDIT
**Supersedes:** `ASHIVAM_COMPLETE_ENGINEERING_AUDIT.md`  
**Date:** 2026-11-01  
**Branch:** `main`  
**Final pre-push commit:** `4c2ef98`  
**Commits ahead of origin/main:** 8 (pending push)

---

## EXECUTIVE SUMMARY

The Ashivam Technologies platform has undergone a comprehensive multi-phase engineering review covering security, performance, test coverage, accessibility, observability, and deployment readiness. All identified critical and high-severity issues have been remediated and verified. The platform is assessed as **READY WITH CONDITIONS** — conditions documented in Section 8.

---

## 1. SCOPE OF AUDIT

| Domain | Files Reviewed | Depth |
|---|---|---|
| Frontend (React 18 + Vite 8) | 40+ components, contexts, hooks | Full |
| Backend (Node.js 22 + Express 5) | 25+ modules, routes, services | Full |
| Authentication & Authorization | auth.service, auth.controller, token.service, AuthContext | Full |
| Database (MongoDB + Mongoose) | 8 models | Full |
| Email Delivery | email.service, outbox pattern | Full |
| Security Headers | vercel.json, helmet config | Full |
| Test Suites | 107 frontend + 236 backend tests | Full |
| CI/CD Pipeline | .github/workflows/ci.yml | Full |
| Accessibility | Navbar, MobileNav, focus management | Full |
| Build & Bundle | Vite config, chunk splitting | Full |

---

## 2. CONFIRMED FIXES IN THIS ENGINEERING CYCLE

### SEC-01 — Duplicate Career Application Submission (HIGH)
**Finding:** No uniqueness constraint on `{job, email}` in `application.model.js`. An applicant could submit the same job application multiple times.  
**Fix:** Added compound unique index `{ job: 1, email: 1, unique: true }` in `application.model.js`. Added E11000 duplicate-key error handler in `career.service.js` returning HTTP 409 Conflict.  
**Commit:** `d330790`  
**Status:** ✅ RESOLVED

### SEC-02 — Missing HTTP Method Guards on Auth Endpoints (HIGH)
**Finding:** `GET /api/v1/auth/refresh` was not rejected — Express would fall through to 404, not 405.  
**Fix:** Added explicit `router.all()` catch-all returning 405 with `Allow: POST` header.  
**Status:** ✅ RESOLVED (verified in production — previous session)

### SEC-03 — Missing Content Security Policy on Frontend (HIGH)
**Finding:** Production Vercel deployment had no `Content-Security-Policy` header.  
**Fix:** Added CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy` headers to `vercel.json`.  
**Commit:** `d330790`  
**Status:** ✅ RESOLVED (awaiting push to activate in production)

### PERF-01 — AdminDashboard Loaded Eagerly on All Routes (MEDIUM)
**Finding:** `AdminDashboard` and `AdminLogin` (175 kB + 6 kB) were eagerly imported in `App.jsx`, loaded on every page visit.  
**Fix:** Converted to `React.lazy()` + `<Suspense>` in `App.jsx`.  
**Commit:** `d330790`  
**Status:** ✅ RESOLVED — Admin chunks now only loaded when admin route is visited.

### BUG-01 — AuthContext React Fast Refresh Incompatibility (MEDIUM)
**Finding:** `AuthContext.jsx` exported both the context object and a Provider component in the same file, preventing React Fast Refresh from hot-reloading.  
**Fix:** Decoupled `AuthContext` and `AuthProvider` into separate exports; ensured file exports only React components at top level.  
**Commit:** `fbbc218`  
**Status:** ✅ RESOLVED

### BUG-02 — Mobile Navigation aria-hidden/focus Accessibility Warning (MEDIUM)
**Finding:** When mobile nav was closed (`aria-hidden="true"`), keyboard focus could move into hidden nav links, generating browser accessibility warnings.  
**Fix:** Added `tabIndex={isOpen ? 0 : -1}` to all focusable elements within the mobile nav, programmatically blocking focus when hidden.  
**Commit:** `fbbc218`  
**Status:** ✅ RESOLVED

### BUG-03 — Duplicate Auth Refresh Calls on Init (LOW-MEDIUM)
**Finding:** `AuthContext` triggered multiple `/api/v1/auth/refresh` calls during React strict-mode double-invocation and tab-focus events.  
**Fix:** Added `hasAttemptedRefresh` ref guard and anonymous visitor session hint in localStorage.  
**Commit:** `20c1c03`, `fbbc218`  
**Status:** ✅ RESOLVED

### TEST-01 — E2E Email Sandbox Test Isolation Failure (MEDIUM)
**Finding:** `backend/tests/e2e-email-sandbox.test.js` tests 95–96 were failing. Node test runner loads all test files into the same process concurrently. Fire-and-forget `processOutboxJob` calls from other test files inflated `dispatchedEmails`, causing `dispatchedEmails.length === 2` assertions to fail non-deterministically.  
**Fix:** Replaced fixed 120ms wait + total-count assertions with `waitForEmails()` spin-wait (stabilises over 80ms ticks) + filter-by-unique-email pattern. Each test now filters the stabilised snapshot by its own unique email address.  
**Commit:** `4c2ef98`  
**Status:** ✅ RESOLVED — 236/236 backend tests PASS

---

## 3. TEST RESULTS

### Frontend Tests (Vitest)
| Metric | Result |
|---|---|
| Total Tests | 107 |
| Passed | 107 |
| Failed | 0 |
| Exit Code | 0 |
| Command | `npm test -- --run` |
| Verified | 2026-11-01 ✅ |

### Backend Tests (Node Test Runner)
| Metric | Result |
|---|---|
| Total Tests | 236 |
| Passed | 236 |
| Failed | 0 |
| Exit Code | 0 |
| Command | `cd backend && npm test` |
| Verified | 2026-11-01 ✅ |

### Playwright E2E Tests
| Metric | Result |
|---|---|
| Status | Pending (Chromium install in progress) |
| Test File | `tests/e2e-browser-staging.js` (588 lines, 19+ scenarios) |
| Prerequisites | MongoDB connectivity, Playwright Chromium, built `dist/` |
| Command | `npm run test:e2e` |

> [!IMPORTANT]
> E2E tests have not been run in this session due to Playwright Chromium installation in progress. This is the primary condition blocking full PRODUCTION READY status.

### Production Build
| Metric | Result |
|---|---|
| Errors | 0 |
| Build time | 628ms |
| Main bundle | 348.66 kB / 101.48 kB gzip |
| Admin Dashboard chunk | 175.28 kB / 32.83 kB gzip |
| Admin Login chunk | 5.81 kB / 2.08 kB gzip |
| Command | `npm run build` |
| Verified | 2026-11-01 ✅ |

---

## 4. SECURITY AUDIT FINDINGS

| ID | Category | Severity | Status |
|---|---|---|---|
| SEC-01 | Duplicate application submission | HIGH | ✅ FIXED (`d330790`) |
| SEC-02 | Missing HTTP 405 on auth endpoints | HIGH | ✅ FIXED (previous session) |
| SEC-03 | Missing CSP headers | HIGH | ✅ FIXED (`d330790`, awaits push) |
| SEC-04 | JWT refresh secret derivation | MEDIUM | ✅ ACCEPTABLE — derived via HMAC-SHA256 from JWT_SECRET; production env.js throws on null |
| SEC-05 | Rate limiting in-memory only | LOW | ✅ ACCEPTABLE — single Render instance; documented |
| SEC-06 | File storage ephemeral on Render | MEDIUM | ⚠️ DOCUMENTED RISK — free tier, no persistent disk |
| SEC-07 | Helmet security headers on backend | MEDIUM | ✅ VERIFIED — helmet enabled in server.js |

### Secrets Management
- `backend/.env` — gitignored, NOT committed ✅
- `.env.local` — gitignored, NOT committed ✅  
- `JWT_REFRESH_SECRET` — derived from `JWT_SECRET` via HMAC-SHA256 in `env.js` ✅
- `SMTP_PASS` — in Render environment variables only, never in code ✅
- `MONGODB_URI` — in Render environment variables only ✅
- Pre-push secret scan: clean ✅

---

## 5. ARCHITECTURE REVIEW

### Frontend Architecture
```
React 18 + Vite 8
├── React Router v7 (file-based routing equivalent)
├── AuthContext (decoupled, Fast Refresh compatible)
├── token.service.js (in-memory + sessionStorage token storage)
├── Session hint (localStorage non-sensitive flag, not a credential)
├── Admin routes (lazy-loaded via React.lazy)
└── Vite proxy → http://127.0.0.1:5000 (local dev)
```

### Backend Architecture
```
Node.js 22 + Express 5
├── /api/v1/auth     — JWT access + refresh tokens, httpOnly cookies
├── /api/v1/careers  — Job listings + applications (unique index enforced)
├── /api/v1/internships — Internship listings + applications
├── /api/v1/contact  — Contact/inquiry form with email outbox
├── /api/v1/admin    — Protected admin CRUD + audit logging
├── /api/v1/health   — Health + DB connectivity check
├── email.service.js — Nodemailer + in-memory outbox (processOutboxJob)
└── MongoDB Atlas    — Mongoose ODM, compound unique indexes
```

### Identified Architectural Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Render free tier cold start (~30s) | API unavailable briefly | Documented in runbook; frontend handles gracefully |
| Ephemeral filesystem on Render | Uploaded files lost on restart | Documented; recommend S3 migration for v2 |
| In-memory rate limiting | Bypassed if multiple instances | Acceptable on single Render instance |
| MongoDB Atlas free tier | Connection pool limits | Monitor Atlas metrics |

---

## 6. PERFORMANCE AUDIT

| Area | Before | After | Change |
|---|---|---|---|
| Admin chunks | Eagerly loaded (part of main bundle) | Lazy-loaded separately | ~175 kB deferred |
| Main bundle | ~524 kB | 348 kB | ▼ ~176 kB (-33%) |
| Auth refresh calls on init | 2–3 (strict mode) | 1 (guarded by ref + session hint) | ▼ -67% |
| Build time | ~630ms | ~628ms | Negligible |

---

## 7. ACCESSIBILITY AUDIT

| Finding | Severity | Status |
|---|---|---|
| Mobile nav links focusable when `aria-hidden="true"` | HIGH | ✅ FIXED — `tabIndex` toggled with nav open state |
| Admin route ARIA labels | LOW | ✅ ACCEPTABLE |
| Form labels on contact/career forms | MEDIUM | ✅ VERIFIED — all inputs have associated `<label>` |
| Color contrast | MEDIUM | Not re-measured; visual review acceptable |
| Keyboard navigation order | LOW | Not changed; preserved from original |

---

## 8. PRODUCTION READINESS VERDICT

### **READY WITH CONDITIONS**

### Conditions

| Condition | Required Action |
|---|---|
| **E2E tests not run** | Run `npm run test:e2e` after Playwright Chromium install completes. If tests pass, upgrade verdict to PRODUCTION READY. |
| **CSP not yet live** | Activate by pushing to `origin/main`. Verify `content-security-policy` header after Vercel deploys. |
| **Ephemeral file storage** | Document clearly for operations. Acceptable for current scale. |

### Blocking Issues (NONE)
No blocking security, correctness, or reliability issues remain unresolved.

### What's Verified
- ✅ 107/107 frontend tests PASS
- ✅ 236/236 backend tests PASS  
- ✅ Production build: 0 errors
- ✅ All critical/high security findings remediated
- ✅ Authentication flow: JWT refresh, session hint, Fast Refresh
- ✅ Career application uniqueness enforced at database level
- ✅ Security headers configured in `vercel.json`
- ✅ Admin lazy-loading implemented and verified in build
- ✅ Accessibility: mobile nav focus management fixed
- ✅ Email routing: 6/6 sandbox tests confirm `team.ashivam@gmail.com` recipient invariant
- ✅ No secrets in git history (pre-push scan clean)
- ✅ Both GitHub remotes authorized for push

### What Remains
- ⏳ Playwright E2E test execution (Chromium downloading)
- ⏳ Push to `origin/main` and `company/main`
- ⏳ Vercel/Render auto-deployment verification
- ⏳ Live CSP header verification

---

## 9. COMMIT HISTORY (THIS ENGINEERING CYCLE)

| Commit | Description | Type |
|---|---|---|
| `2875d84` | Add HTTP 405 handlers, route verification report | fix + docs |
| `20c1c03` | Anonymous visitor session hint optimization | feat |
| `8ae1c85` | Duplicate refresh root cause report + concurrency test | docs + test |
| `fbbc218` | Decouple AuthContext (Fast Refresh), Navbar aria-hidden fix, Vite proxy error handler | fix |
| `1cb7d57` | Local development and accessibility audit report | docs |
| `d330790` | Career unique index + 409 handler, Vercel CSP, Admin lazy-loading | fix |
| `d564d9e` | Complete engineering audit and 6 production deliverable documents | docs |
| `4c2ef98` | E2E email sandbox test isolation fix, routes test hardening | fix |

---

## 10. DELIVERABLES PRODUCED

| Document | Path | Status |
|---|---|---|
| Final Engineering Audit | `ASHIVAM_FINAL_ENGINEERING_AUDIT.md` | ✅ This document |
| Release Checklist | `ASHIVAM_RELEASE_CHECKLIST.md` | ✅ |
| Complete Engineering Audit | `ASHIVAM_COMPLETE_ENGINEERING_AUDIT.md` | ✅ |
| Security Red Flag Register | `ASHIVAM_SECURITY_RED_FLAG_REGISTER.md` | ✅ |
| Bug Fix & Remediation Report | `ASHIVAM_BUG_FIX_AND_REMEDIATION_REPORT.md` | ✅ |
| Testing & QA Report | `ASHIVAM_TESTING_AND_QA_REPORT.md` | ✅ |
| Live Production Verification Report | `ASHIVAM_LIVE_PRODUCTION_VERIFICATION_REPORT.md` | ✅ |
| Production Readiness Report | `ASHIVAM_PRODUCTION_READINESS_REPORT.md` | ✅ |
| Production Runbook | `ASHIVAM_PRODUCTION_RUNBOOK.md` | ✅ |
| Local Development & Accessibility Audit | `ASHIVAM_LOCAL_DEVELOPMENT_AND_ACCESSIBILITY_AUDIT.md` | ✅ |

---

*Prepared by the Ashivam Technologies Engineering Team. This document supersedes all prior audit documents produced in this engineering cycle.*
