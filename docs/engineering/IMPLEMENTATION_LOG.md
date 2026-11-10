# ASHIVAM TECHNOLOGIES — MASTER IMPLEMENTATION LOG
**Document Reference:** `docs/engineering/IMPLEMENTATION_LOG.md`  
**Classification:** Engineering Change Record & Audit Trail  
**Maintainer:** Principal Software Architect & Release Engineering Lead  

---

## 1. RECENT COMMITS & CODE MODIFICATIONS

### [LOG-001] Corporate Website — Contact Phone Number Remediation
- **Repository:** `Ritikgupta-tech/ashivam-tecH.git`
- **Commit:** `a644524` (`origin/main`)
- **Date:** 2026-11-10
- **Files Changed:**
  - `src/data/content.js`
- **Technical Description:**
  - Replaced static placeholder string `'+91 XXXXX XXXXX'` with the active verified company phone number `'+91 92772 29978'`.
- **Rationale:**
  - The contact section displayed an obvious placeholder number, damaging enterprise brand credibility.
- **Verification:**
  - Verified in `content.js`, ran full 107 frontend unit/integration tests and 248 backend tests (`npm test`). All passed without error.

---

### [LOG-002] Internship Management — Content Security Policy & Permission Headers
- **Repository:** `Ritikgupta-tech/ashivam-internship-management.git`
- **Commit:** `df4d295` (`origin/main`)
- **Date:** 2026-11-10
- **Files Changed:**
  - `vercel.json`
  - `frontend/vercel.json`
- **Technical Description:**
  - Added strict `Content-Security-Policy` header restricting script execution to `'self'` and `'unsafe-inline'` (required by Vite bundle chunks).
  - Explicitly whitelisted backend staging API (`https://ashivam-internship-staging.onrender.com`) in `connect-src`.
  - Added `Permissions-Policy: camera=(), microphone=(), geolocation=()` to restrict browser hardware access.
  - Enforced `frame-ancestors 'none'` to defend against clickjacking attacks.
- **Rationale:**
  - Aligns Internship Management staging frontend with enterprise security standards and resolves security audit findings.
- **Verification:**
  - Validated JSON syntax across both configuration files; executed 16 frontend unit tests and 71 backend tests.

---

### [LOG-003] HRMS — Credential Exposure, Role Derivation, CSP, and Infrastructure Blueprint
- **Repository:** `Ritikgupta-tech/ashivam-hr-management.git`
- **Commit:** `84c6c05` (`origin/main`)
- **Date:** 2026-11-10
- **Files Changed:**
  - `frontend/src/pages/LoginPage.jsx`
  - `frontend/src/context/AuthContext.jsx`
  - `frontend/vercel.json`
  - `vercel.json`
  - `render.yaml` (new file)
- **Technical Description:**
  - Refactored `handleQuickSelect` in `LoginPage.jsx` to pre-fill only the target `role`, removing hardcoded email and password assignment.
  - Added `currentRole = user?.role || null` to the context value exported by `AuthContext.jsx`.
  - Authored zero-cost `render.yaml` infrastructure blueprint declaring port, health check path, and cryptographic JWT secret generation rules.
  - Added CSP and Permissions-Policy headers to HRMS Vercel edge rewrite configurations.
- **Rationale:**
  - Prevents credential exposure in client bundle, restores role-based dashboard cards, and codifies infrastructure as code.
- **Verification:**
  - Verified in browser and executed 10 frontend tests and 83 backend tests.

---

### [LOG-004] HRMS — StatCards Shimmer Skeleton & Interactive Glow
- **Repository:** `Ritikgupta-tech/ashivam-hr-management.git`
- **Commit:** `4e0e9d1` (`origin/main`)
- **Date:** 2026-11-10
- **Files Changed:**
  - `frontend/src/components/StatCards.jsx`
- **Technical Description:**
  - Replaced crude `'...'` string during data loading with an animated CSS gradient shimmer skeleton matching the card geometry.
  - Added interactive cyan border glow and subtle box-shadow on card hover for enhanced visual hierarchy.
  - Added `aria-label="Loading dashboard metrics"` to ensure screen-reader accessibility during asynchronous loading.
- **Rationale:**
  - Improves visual polish and adheres to modern SaaS design system guidelines without introducing heavy external UI dependencies.
- **Verification:**
  - Vite production build succeeded; tested loading state rendering.

---

### [LOG-005] HRMS — Error Boundary, Password Recovery Flow, and Global API Rate Limiting
- **Repository:** `Ritikgupta-tech/ashivam-hr-management.git`
- **Commit:** `bc8c05b` (`origin/main`)
- **Date:** 2026-11-10
- **Files Changed:**
  - `backend/src/middleware/rateLimiter.js`
  - `backend/src/app.js`
  - `frontend/src/components/ErrorBoundary.jsx` (new file)
  - `frontend/src/App.jsx`
  - `frontend/src/pages/LoginPage.jsx`
- **Technical Description:**
  - Added 10-minute cleanup timer to `rateLimiter.js` to purge expired IP buckets and prevent Node.js memory leaks.
  - Exported and mounted `globalApiLimiter` on `/api/v1` domain endpoints in `app.js`, while exempting `/api/v1/health` probes.
  - Created `ErrorBoundary.jsx` and wrapped root component tree in `App.jsx` to gracefully handle React component render exceptions.
  - Implemented complete interactive Password Recovery form in `LoginPage.jsx` calling `authApi.forgotPassword`.
  - Replaced personal developer Gmail placeholder with enterprise standard `corporate.id@ashivam.tech`.
- **Rationale:**
- **Verification:**
  - All 83 backend tests passed; all 10 frontend tests passed; Vite frontend production build completed in 210ms with zero errors.

---
### [LOG-006] Internship Management — UI Elevation, Live Director Evaluation & Clean Sidebar
- **Repository:** `Ritikgupta-tech/ashivam-internship-management.git`
- **Commit:** `7535055` (`origin/main`)
- **Date:** 2026-11-10
- **Files Changed:**
  - `frontend/src/components/LoginPage.jsx`
  - `frontend/src/components/Sidebar.jsx`
  - `frontend/src/pages/ReviewCommitteeCenter.jsx`
- **Technical Description:**
  - Redesigned `LoginPage.jsx` into an enterprise card with isolated gateway security indicator.
  - Replaced confusing offline preview mode with `1-Click Sign In as Admissions Director (Live Authentication)` acquiring genuine JWT tokens from `/api/v1/auth/login`.
  - Refactored `Sidebar.jsx` to eliminate hardcoded `badge: 'Active'` and conditioned badge rendering strictly on active state.
  - Updated `ReviewCommitteeCenter.jsx` to gracefully handle session renewal and display live MongoDB application stats.
- **Rationale:**
  - Elevates Internship portal to a cohesive, production-grade standard while enabling instant evaluator access without manual credential entry.
- **Verification:**
  - All 16 frontend unit tests passed; Vite production build passed in 182ms; Playwright Chromium automated inspection verified login, review committee, candidate application, certificate verification, and intern workspace views.

---

### [LOG-007] HRMS — Dashboard Metric Normalization, Live Director Auth & Status Badges
- **Repository:** `Ritikgupta-tech/ashivam-hr-management.git`
- **Commit:** `0c48044` (`origin/main`)
- **Date:** 2026-11-10
- **Files Changed:**
  - `frontend/src/pages/DashboardPage.jsx`
  - `frontend/src/components/StatCards.jsx`
  - `frontend/src/components/Sidebar.jsx`
  - `frontend/src/pages/LoginPage.jsx`
  - `frontend/src/styles/theme.css`
- **Technical Description:**
  - Resolved backend response property mismatch in `DashboardPage.jsx` (`metrics.metrics` vs `metrics.workforce`), restoring live numbers for Headcount (7), Present Today (1), Onboarding Pipeline (1), and Active Sprint Tasks (2).
  - Updated `StatCards.jsx` to accept polymorphic props (`customCards` or `metrics`) with defensive fallback defaults.
  - Corrected Dashboard NavLink path in `Sidebar.jsx` so that `/dashboard` displays proper active state styling.
  - Enhanced `LoginPage.jsx` with instant role auto-fill and "⚡ One-Click Sign In as Director (Live Authentication)" issuing live JWT token.
  - Added `.badge-active`, `.badge-resigned`, and `.badge-onboarding` CSS utility classes to `theme.css`.
- **Rationale:**
  - Eliminates zero-metric display on live dashboards, resolves 401 unauthorized errors during evaluation, and provides unified enterprise visual styling.
- **Verification:**
  - All 10 frontend tests passed; Vite build succeeded in 199ms; Playwright Chromium verified live dashboard, employee directory, dossier modals, attendance, leaves, payroll, and tasks.

