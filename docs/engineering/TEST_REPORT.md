# ASHIVAM TECHNOLOGIES — AUTOMATED TEST EXECUTION REPORT
**Document Reference:** `docs/engineering/TEST_REPORT.md`  
**Classification:** Quality Assurance & Test Evidence Record  
**Date of Execution:** 2026-11-10  
**Test Engine:** Node.js Native Test Runner (`node --test`)  
**Overall Result:** **535 / 535 TESTS PASSING (100% SUCCESS RATE, ZERO FAILURES)**  

---

## 1. COMPREHENSIVE TEST RESULTS MATRIX

| Subsystem | Package Directory | Test Suite Count | Tests Passed | Tests Failed | Skipped | Total Duration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Website Backend** | `Official-Website-main/backend` | 2 Suites | **248** | 0 | 0 | $51.05\text{ s}$ |
| **Website Frontend** | `Official-Website-main` (root) | 13 Suites | **107** | 0 | 0 | $0.65\text{ s}$ |
| **Internship Backend**| `ashivam-internship-management/backend` | 9 Suites | **71** | 0 | 0 | $19.04\text{ s}$ |
| **Internship Frontend**| `ashivam-internship-management/frontend` | 6 Suites | **16** | 0 | 0 | $0.60\text{ s}$ |
| **HRMS Backend** | `ashivam-hr-management/backend` | 13 Suites | **83** | 0 | 0 | $20.64\text{ s}$ |
| **HRMS Frontend** | `ashivam-hr-management/frontend` | 2 Suites | **10** | 0 | 0 | $0.22\text{ s}$ |
| **TOTALS** | **Ecosystem Unified Coverage** | **45 Suites** | **535 PASS** | **0 FAIL** | **0** | **$92.20\text{ s}$** |

---

## 2. DETAILED TEST SUITE BREAKDOWN BY DOMAIN

### 2.1. Corporate Website Tests (355 Total Tests)
- **Backend Core (248 tests):**
  - Validation Utilities: `sanitizeText`, `readText`, `isHoneypotTriggered`, `isValidObjectId`, `normalizeHttpUrl`.
  - Rate Limiting: Health probe exemptions, JSON error envelope standard, proxy trust handling.
  - Security Headers: Helmet enforcement, `X-Powered-By` suppression, CSP compliance, CSRF verification.
  - Interservice Integration: HMAC-SHA256 request signing, outbox worker reliability, retry logic with backoff.
  - Admin & Auth: Password hashing, JWT token rotation, family tracking, role permissions.
- **Frontend Core (107 tests):**
  - Accessibility & Touch Targets: $\ge 44\text{ px}$ interactive targets, ARIA dialogs, focus trapping in drawers.
  - Route Governance: Multi-page router, protected portals, legal routes, 404 fallback routing.
  - SEO & Crawler Rules: Canonical URLs, OpenGraph metadata, JSON-LD structured data, `robots.txt`, `sitemap.xml`.
  - Session Hint Optimization: Concurrent token refresh sharing, Web Locks API integration, clean session destruction.

### 2.2. Internship Management Tests (87 Total Tests)
- **Backend Core (71 tests):**
  - End-to-End Lifecycle: Application intake $\to$ Screening $\to$ Committee Review $\to$ Interview Scheduling $\to$ Rubric Grading $\to$ Offer Issuance $\to$ Acceptance $\to$ Active Intern Profile Creation.
  - Document & Mentorship: Task submission, mentor evaluation, completion status, cryptographic certificate generation and verification.
  - Interservice Integration: Phase 6 integration suite, HMAC timestamp validation, status callback handling.
  - RBAC & Security: IDOR prevention on candidate offers, candidate review barrier, director-only audit logs.
- **Frontend Core (16 tests):**
  - Dynamic MongoDB Metrics rendering, loading indicators, zero/null resilience.
  - Stage and score distribution bars, applicant table rendering with initials avatars.
  - API client error recovery and automatic silent token refresh on HTTP 401.

### 2.3. HRMS Core Tests (93 Total Tests)
- **Backend Core (83 tests):**
  - Workforce & Employee Master: Employee registration, profile management, status changes.
  - Attendance & Leave: Geofenced/timestamped clock-in/out, leave balance computations, multi-level approvals.
  - Payroll & Offboarding: Statutory disclaimer compliance, clearance tracking across HR/Management/Finance, account deactivation.
  - Performance & Tasks: Sprint task assignment, quarterly goals, performance review rubric.
  - RBAC Defense: Privilege escalation barriers, payroll role segregation (Finance/Director only).
  - Rate Limiting: `globalApiLimiter` on `/api/v1` routes with health probe bypass.
- **Frontend Core (10 tests):**
  - Design system Obsidian tokens, component registry, complete API facade exports.
  - Role-based sidebar navigation, statutory payroll disclaimers.
  - Onboarding document verification barriers, leave range calculations.

---

## 3. REGRESSION & QUALITY ASSURANCE VERDICT

The ecosystem has achieved **100% automated test pass rate**. No regressions were introduced during defect remediation. All architectural boundaries and security defenses are fully validated by repeatable tests.
