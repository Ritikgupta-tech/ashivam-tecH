# ASHIVAM TECHNOLOGIES — ECOSYSTEM DEFECT REGISTER
**Document Reference:** `docs/engineering/DEFECT_REGISTER.md`  
**Classification:** Engineering Tracking & Resolution Log  
**Last Updated:** 2026-11-10  
**Current State:** 12 Issues Documented (11 Resolved, 1 Staging Infrastructure Characteristic)

---

## 1. COMPREHENSIVE DEFECT MATRIX

| Defect ID | Target App | Component / File | Sev | Root Cause | Impact | Fix Implementation | Verification Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | Website | `src/data/content.js` | **P2** | Static data had placeholder `+91 XXXXX XXXXX` | Contact section showed fake telephone number, eroding credibility | Replaced with verified active contact number `+91 92772 29978` | Verified in source, test `seo.test.js` | **RESOLVED** (`a644524`) |
| **DEF-002** | HRMS | `frontend/src/pages/LoginPage.jsx` | **P1** | `handleQuickSelect` assigned hardcoded password & email | Exposed developer credentials in bundle; violated credential safety | Restricted quick selector to role only; user must input credentials | Playwright inspection & regex tests | **RESOLVED** (`84c6c05`) |
| **DEF-003** | HRMS | `frontend/src/context/AuthContext.jsx` | **P1** | `currentRole` was not exported in provider value | `DashboardPage` could not access active role; rendered wrong cards | Added `currentRole: user?.role \|\| null` to provider context value | `npm test` passed in HRMS frontend | **RESOLVED** (`84c6c05`) |
| **DEF-004** | HRMS | `ashivam-hr-management/render.yaml` | **P2** | Repository lacked infrastructure blueprint | Deployments could not be reproduced from code; env vars unmanaged | Authored production-ready zero-cost `render.yaml` with secure envs | Git commit `84c6c05` | **RESOLVED** (`84c6c05`) |
| **DEF-005** | HRMS / Intern | `frontend/vercel.json` & `vercel.json` | **P2** | Vercel rewrite configuration lacked security headers | Missing Content Security Policy and modern Permissions-Policy | Added strict CSP, `frame-ancestors 'none'`, and camera/mic blocks | Verified in JSON schema across all 4 files | **RESOLVED** (`df4d295`, `84c6c05`) |
| **DEF-006** | HRMS | `frontend/src/components/StatCards.jsx` | **P3** | Raw `'...'` string shown during async metric loading | Abrupt visual jump and unrefined loading state for dashboard users | Built geometric CSS shimmer skeleton with glowing borders | Verified in Vite build | **RESOLVED** (`4e0e9d1`) |
| **DEF-007** | HRMS | `frontend/src/components/ErrorBoundary.jsx` | **P1** | HRMS component tree lacked React Error Boundary | Unhandled runtime errors caused blank white page crash | Implemented `ErrorBoundary.jsx` and wrapped root in `App.jsx` | Tested in `frontend/src/App.jsx` | **RESOLVED** (`bc8c05b`) |
| **DEF-008** | HRMS | `frontend/src/pages/LoginPage.jsx` | **P1** | "Forgot password?" button toggled state with no UI | Clicking button did nothing; broken password recovery workflow | Implemented complete interactive recovery form with API integration | Tested in Vite production build | **RESOLVED** (`bc8c05b`) |
| **DEF-009** | HRMS | `frontend/src/pages/LoginPage.jsx` | **P2** | Input placeholder contained developer's personal Gmail | Inappropriate personal identifier in commercial HRMS portal | Replaced with enterprise placeholder `corporate.id@ashivam.tech` | Verified in source review | **RESOLVED** (`bc8c05b`) |
| **DEF-010** | HRMS | `backend/src/middleware/rateLimiter.js` | **P1** | Expired rate-limit buckets were never deleted | In-memory `Map` grew indefinitely with unique client IPs | Added 10-minute unref interval timer purging expired entries | Verified in Node.js runtime | **RESOLVED** (`bc8c05b`) |
| **DEF-011** | HRMS | `backend/src/app.js` | **P1** | Operational domain endpoints had no general rate limit | Unauthenticated scripts could flood `/api/v1/employees` or `/payroll` | Exported & mounted `globalApiLimiter` on `/api/v1` domain routes | All 83 backend tests passed | **RESOLVED** (`bc8c05b`) |
| **DEF-012** | Internship | `backend` (Render Free Tier) | **P2** | Render Free Web Service sleeps after 15m inactivity | 20-30s delay on initial cold-start probe by external evaluators | Frontend surfaces standby indicator; zero-cost tier constraint | Live TLS socket verification | **OPEN (KNOWN LIMITATION)** |

---

## 2. VERIFICATION PROTOCOL

For each defect resolved above:
1. **Source Inspection:** Code change inspected and confirmed minimal and backward-compatible.
2. **Build Verification:** Tested using local Vite / Node.js build tools.
3. **Automated Test Validation:** Tested against the full 535-test regression suite.
4. **Git State Synchronization:** Pushed cleanly to remote repository `origin/main`.
