# Ashivam Technologies Admin Panel — Acceptance Test Plan

**Document Version:** 1.0.0  
**Status:** Approved & Canonical  
**Target Quality Bar:** Zero High/Critical Vulnerabilities, 100% Core Regression Pass, Formula-safe CSV Exports, Full Viewport Responsive Integrity

---

## 1. Test Strategy & Quality Gates

Every code change affecting the Admin Panel or its backing services must pass four non-negotiable verification gates prior to deployment readiness:
1. **Automated Backend Regression:** `npm test --prefix backend` must pass with zero failures and zero unhandled rejections.
2. **Automated Frontend Regression:** `npm test` must pass all component and integration suites.
3. **Production Asset Bundling:** `npm run build` must compile clean chunks with zero syntax or bundling errors.
4. **Code Quality & Whitespace Hygiene:** `git diff --check` must return zero whitespace errors, trailing carriage issues, or merge conflict markers.

---

## 2. Test Execution Matrix by Module

| Test ID | Module | Area Tested | Test Type | Target File / Suite | Pass Criteria |
|---|---|---|---|---|---|
| `TC-AUTH-01` | MOD-01 | Superadmin & Admin Login | Integration | `backend/tests/auth.test.js` | Valid credentials return JWT with role & permissions. |
| `TC-AUTH-02` | MOD-01 | Timing Attack Resistance | Security | `backend/tests/auth.test.js` | Constant-time execution path for nonexistent users. |
| `TC-AUTH-03` | MOD-01 | Self-Service Password Change | Integration | `backend/tests/auth.test.js` | Changes hash, updates `passwordChangedAt`, invalidates prior tokens. |
| `TC-AUTH-04` | MOD-01 | Password Change Negative Tests | Integration | `backend/tests/auth.test.js` | Rejects incorrect current password and passwords < 8 chars. |
| `TC-ANL-01` | MOD-02 | Dashboard Aggregation | Integration | `backend/tests/analytics.test.js` | Returns counts across interns, jobs, employees, inquiries. |
| `TC-ANL-02` | MOD-02 | Time Range Filtering | Integration | `backend/tests/analytics.test.js` | Honors `7d`, `30d`, `90d`, `1y` date filters correctly. |
| `TC-CNT-01` | MOD-03 | Inquiries Filter & Status | Integration | `backend/tests/contact.test.js` | Transitions `new` -> `in_progress` -> `resolved`. |
| `TC-CNT-02` | MOD-03 | Inquiries Formula-Safe CSV | Security | `backend/tests/contact.test.js` | Prepends `'` to malicious `=CMD(...)` cells in export. |
| `TC-CAR-01` | MOD-04 | Job Posting CRUD | Integration | `backend/tests/career.test.js` | Admin can create, edit, deactivate job postings. |
| `TC-CAR-02` | MOD-04 | Candidate Resume Access | Security | `backend/tests/career.test.js` | Enforces authentication; prevents directory traversal. |
| `TC-INT-01` | MOD-05 | Program Track CRUD | Integration | `backend/tests/internship-management.test.js` | Creates and updates internship program metadata. |
| `TC-INT-02` | MOD-05 | Direct Intern Onboarding | Integration | `backend/tests/internship-management.test.js` | Generates sequence `ASH-INT-YYYY-XXX` and records audit event. |
| `TC-INT-03` | MOD-05 | Candidate Conversion | Integration | `backend/tests/internship-management.test.js` | Converts application to intern atomically with status update. |
| `TC-INT-04` | MOD-05 | Compliance Checklist Toggle | Integration | `backend/tests/internship-management.test.js` | Updates `ndaSigned`, `idCardIssued`, `repoAccessGranted`. |
| `TC-INT-05` | MOD-05 | Intern Formula-Safe CSV | Security | `backend/tests/internship-management.test.js` | Generates safe CSV with active/domain filters. |
| `TC-EMP-01` | MOD-06 | Employee CRUD & Roster | Integration | `backend/tests/employee.test.js` | Creates and manages employee profiles and departments. |
| `TC-EMP-02` | MOD-06 | Partial Unique Email Index | Data Integrity | `backend/tests/employee.test.js` | Prevents active duplicate emails; allows inactive duplicates. |
| `TC-EMP-03` | MOD-06 | Employee CSV Export | Security | `backend/tests/employee.test.js` | Emits sanitized CSV containing active employee roster. |
| `TC-DOC-01` | MOD-07 | HR Document Upload & Type | Integration | `backend/tests/hrDocument.test.js` | Validates file type and attaches to employee ID. |
| `TC-DOC-02` | MOD-07 | HR Document Metadata Export | Security | `backend/tests/hrDocument.test.js` | Exports sanitized CSV of all documents and statuses. |
| `TC-ADM-01` | MOD-10 | Superadmin Invariant Guard | Integration | `backend/tests/admin.test.js` | Aborts deactivation or deletion if last Superadmin. |
| `TC-ADM-02` | MOD-10 | Granular RBAC Permission Gating | Security | `backend/tests/rbac.test.js` | Admin without permission receives `403 Forbidden`. |
| `TC-UI-01` | UI | Modal Viewport Bounding | Frontend | `src/tests/AdminDashboard.test.jsx` | Modals fit within `100dvh - 2.5rem` and scroll internally. |
| `TC-UI-02` | UI | Responsive Drawer & Nav | Frontend | `src/tests/AdminDashboard.test.jsx` | Sidebar collapses to drawer on <= 1024px screens. |

---

## 3. Security & Vulnerability Test Cases

### 3.1 SEC-01: CSV Formula Injection (DDE) Neutralization
- **Threat:** Attackers enter names like `=cmd|' /C calc'!A0` or `@SUM(1,1)` into contact forms or candidate applications.
- **Verification:** Run export endpoint. Inspect raw output.
- **Assertion:** Any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` must be prefixed with an apostrophe `'` before serialization.

### 3.2 SEC-02: Timing Attack Mitigation on Admin Login
- **Threat:** Enumeration of valid administrative usernames via response time discrepancy in bcrypt comparison.
- **Verification:** Send login request with unknown username.
- **Assertion:** Service executes `bcrypt.compare(password, DUMMY_HASH)` to ensure near-identical execution duration (~60-90ms) regardless of username existence.

### 3.3 SEC-03: Arbitrary File Upload & Traversal Defense
- **Threat:** Uploading `.php`, `.js`, or path traversal sequences (`../../etc/passwd`).
- **Verification:** Attempt upload with unauthorized MIME or malicious filename.
- **Assertion:** Strict MIME whitelist enforcement (`application/pdf`, `image/png`, `image/jpeg`). Random UUID storage keys prevent directory traversal.

---

## 4. UI/UX Usability & Accessibility Test Plan

### 4.1 Viewport Breakpoints
- **Mobile Handset:** 360px & 390px (iPhone 14 / Pixel 7) — Verify zero horizontal overflow, drawer navigation, touch-friendly tap targets (min 44x44px).
- **Tablet / Small Laptop:** 768px & 1024px (iPad / Chromebook) — Verify responsive grids collapse to 2 columns or 1 column.
- **Desktop Workstation:** 1280px & 1440px — Verify full sidebar layout, data table density, sticky headers.

### 4.2 Modal Form Scrolling Invariant
- **Test:** Open employee creation, intern registration, program creation, or admin management modal on a 600px height viewport.
- **Assertion:**
  1. The modal header (title & close button) remains pinned at top.
  2. The modal footer (Cancel & Submit buttons) remains pinned at bottom.
  3. The form body scrolls smoothly with `min-height: 0` and `overflow-y: auto`.
  4. The background page document scroll is locked (`admin-modal-open`).
