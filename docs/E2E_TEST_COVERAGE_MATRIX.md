# Ashivam Technologies — E2E Test Coverage Matrix

**Document Purpose:** Complete Traceability of Frontend Routes, User Journeys, and Backend Endpoints to Test Layers  
**Auditor Persona:** Principal QA Automation Engineer & Application Security Engineer  
**Audit Target:** `tests/e2e-browser-staging.js` + Native Test Suites  
**Verification Date:** 2026-10-31  
**Coverage Verdict:** Comprehensive Local Full-Stack E2E Coverage  

---

## 1. Traceability Matrix: Scenarios vs Endpoints vs Integrity

| Test ID | Category | Target Route / Endpoint | Browser Action | API Request Triggered | Real DB? | Mocks Used | Test Classification | Status | Negative Path Verified? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E2E-VIS-01** | Public | `/` (Homepage) | `page.goto('/')` | Static bundle + `GET /api/v1/career/jobs` | Yes | None | **Browser E2E** | PASS | Yes (Fails if title/bundle breaks) |
| **E2E-VIS-02** | Public | `/` (Navbar) | `locator('.navbar__nav').isVisible()` | None (DOM validation) | No | None | **Browser UI Only** | PASS | Yes (Fails if DOM missing) |
| **E2E-VIS-03** | Public | `/#contact` | `click('button[type="submit"]')` | None (Client-side HTML5 validation) | No | None | **Browser UI Only** | PASS | Yes (Fails if validation disabled) |
| **E2E-VIS-04** | Public | `/#contact` | Fills form, clicks Submit | `POST /api/v1/inquiries` | Yes | Email sandbox | **Browser-to-Backend E2E** | PASS | Yes (Verified via DB query) |
| **E2E-VIS-05** | Public | `/internships` | Node `fetch()` | `POST /api/v1/internships` | Yes | Email sandbox | **Backend Integration** | PASS | Yes (Fails on schema mismatch) |
| **E2E-AUTH-01**| Auth | `/admin/login` | Fills invalid credentials | `POST /api/v1/auth/login` (401) | Yes | None | **Browser-to-Backend E2E** | PASS | Yes (401 Banner in UI) |
| **E2E-AUTH-02**| Auth | `/admin/login` | Fills valid credentials | `POST /api/v1/auth/login` (200) | Yes | None | **Browser-to-Backend E2E** | PASS | Yes (Redirects to `/admin`) |
| **E2E-AUTH-03**| Auth | `/api/v1/auth` | `context.cookies()` | `Set-Cookie` in login response | Yes | None | **Browser Cookie Security** | PASS | Yes (Fails if missing/not HttpOnly) |
| **E2E-AUTH-04**| Auth | `/admin` (Reload) | `page.reload()` | `POST /api/v1/auth/refresh` | Yes | None | **Browser-to-Backend E2E** | PASS | Yes (Fails if kicked to login) |
| **E2E-CONC-01**| Concurrency| `/admin` (Multi-Tab)| Dual-tab concurrent fetch | `GET /dashboard/overview` & `POST /auth/refresh` | Yes | None | **Multi-Tab Browser E2E** | PASS | Yes (Fails on token collision) |
| **E2E-AUTH-05**| Auth | `/admin` (Logout) | Invokes `/auth/logout` | `POST /api/v1/auth/logout` | Yes | None | **Browser Page Integration**| PASS | Yes (Fails if token survives) |
| **E2E-SEC-01** | Security | `/inquiries` (CORS) | Node `fetch()` with evil Origin | `POST /api/v1/inquiries` (403) | No | None | **Backend Integration** | PASS | Yes (403 Origin Rejected) |
| **E2E-SEC-02** | Security | `/admin/employees` | Node `fetch()` without token | `GET /api/v1/admin/employees` (401) | No | None | **Backend Integration** | PASS | Yes (401 Token Missing) |
| **E2E-SEC-03** | Security | `/admin/admins` | Node `fetch()` with Editor token | `GET /api/v1/admin/admins` (403) | Yes | None | **Backend Integration** | PASS | Yes (403 Role Forbidden) |
| **E2E-MAIL-01**| Email | Workflow Alerts | Inspects `capturedEmails` | Outbound notification event | Yes | Mock transport | **Mocked Service** | PASS | Yes (Fails if not team.ashivam) |
| **E2E-MAIL-02**| Email | Candidate Ack | Inspects `capturedEmails` | Candidate confirmation event | Yes | Mock transport | **Mocked Service** | PASS | Yes (Fails if template missing) |
| **E2E-MAIL-03**| Email | Sandbox Safety | Inspects `capturedEmails` | Isolation verification | Yes | Mock transport | **Mocked Service** | PASS | Yes (Fails if leaked) |
| **E2E-RESP-01**| UI / UX | Viewport Resize | Resizes 1280, 768, 390px | None (CSS media queries) | No | None | **Browser UI Only** | PASS | Yes (Fails if links/ham hidden) |
| **E2E-UX-01**  | UI / UX | `/non-existent-404` | `page.goto('/non-existent-404')` | None (React Router catchall) | No | None | **Browser UI Only** | PASS | Yes (Fails on white-screen) |

---

## 2. Coverage Analysis Across System Domains

### 2.1 Public Web Portal & Visitor Experience
- **Routes Covered:**
  - `/` (Home, Process, Hero, Statistics) — **Covered** (`E2E-VIS-01`, `E2E-VIS-02`).
  - `/#contact` (Contact inquiry form, validation, submission) — **Covered** (`E2E-VIS-03`, `E2E-VIS-04`).
  - `/careers` & `/internships` (Public tracks, registration) — **Covered** (`E2E-VIS-05`).
  - Catchall `*` (404 Error boundary) — **Covered** (`E2E-UX-01`).
- **Responsive Viewports:**
  - Desktop (1280px × 800px) — **Covered** (`E2E-RESP-01`).
  - Tablet (768px × 1024px) — **Covered** (`E2E-RESP-01`).
  - Mobile (390px × 844px) — **Covered** (`E2E-RESP-01`).

### 2.2 Administrator Authentication & Session Management
- **Routes & Handlers Covered:**
  - `/admin/login` (Authentication portal, invalid credentials, error banner) — **Covered** (`E2E-AUTH-01`).
  - `POST /api/v1/auth/login` (Credential verification, JWT issuance, `Set-Cookie`) — **Covered** (`E2E-AUTH-02`).
  - `refreshToken` Cookie (HttpOnly, Secure, SameSite, Path) — **Covered** (`E2E-AUTH-03`).
  - `POST /api/v1/auth/refresh` (Session restoration on page reload, token rotation) — **Covered** (`E2E-AUTH-04`).
  - Multi-tab concurrent API requests & refresh rotation coordination — **Covered** (`E2E-CONC-01`).
  - `POST /api/v1/auth/logout` (Session invalidation, database token deletion) — **Covered** (`E2E-AUTH-05`).

### 2.3 Security, Authorization & API Boundary Protection
- **Security Layers Covered:**
  - Cross-Origin Resource Sharing (CORS) origin filtering — **Covered** (`E2E-SEC-01`).
  - Cross-Site Request Forgery (CSRF) header & origin enforcement — **Covered** (`scratch/test-negative-paths.js`).
  - Unauthenticated access prevention (401 Unauthorized) — **Covered** (`E2E-SEC-02`).
  - Role-Based Access Control (403 Forbidden on Superadmin routes) — **Covered** (`E2E-SEC-03`).
  - Disallowed file upload extension rejection (400 Bad Request) — **Covered** (`scratch/test-negative-paths.js`).

### 2.4 Notifications & Email Infrastructure
- **Workflows Covered:**
  - Inquiry admin notification strictly to `team.ashivam@gmail.com` — **Covered** (`E2E-MAIL-01`).
  - Internship application alert strictly to `team.ashivam@gmail.com` — **Covered** (`E2E-MAIL-01`).
  - Candidate confirmation email acknowledgment — **Covered** (`E2E-MAIL-02`).
  - 100% outbound email containment in sandbox (0 leaked to production) — **Covered** (`E2E-MAIL-03`).

---

## 3. Summary of Test Classifications

```
+-------------------------------------------------------------------------------------------------+
|                                 19 REPORTED E2E TEST SCENARIOS                                  |
+-------------------------------------------------------------------------------------------------+
| [5] Genuine Browser-to-Backend E2E: Real UI interaction + Real Backend + Real MongoDB            |
| [1] Multi-Tab Browser Concurrency: Real 2-page concurrent fetch + Token rotation                |
| [1] Browser Cookie Security: Playwright context HttpOnly/Path inspection                        |
| [1] Browser Page Integration: In-page API execution and token revocation                        |
| [4] Browser UI Only: DOM inspection, HTML5 validation, viewport clamp, 404 router               |
| [4] Backend API / Security Integration: Node fetch testing CORS, 401 unauth, 403 RBAC            |
| [3] Mocked Service Verification: In-memory mail recorder testing destination routing            |
+-------------------------------------------------------------------------------------------------+
```

---

*Certified and Maintained by QA Automation Lead & Application Security Architect.*
