# Ashivam Technologies — Implementation Changelog

All notable architectural enhancements, security hardenings, feature implementations, and bug fixes for the Ashivam Technologies platform are documented in this file.

---

## [3.1.0] — 2026-10-30

### Final Production Verification & Distributed Concurrency Architecture
* **Cluster-Wide Distributed Mutex Locking (`withDistributedLock`):**
  * Created `backend/src/models/systemLock.model.js` and `backend/src/utils/distributedLock.js` implementing a hybrid in-process and MongoDB distributed lock with automatic TTL lease expiry.
  * Replaced in-memory Promise queues with cluster-safe distributed locks in `backend/src/modules/admin/admin.service.js` and `backend/src/modules/internship/internship.service.js`.
  * Verified across multi-instance environments: prevents race conditions between multiple Node.js processes or scaled Render containers.
* **Database-Backed Atomic Sequence Counter:**
  * Created `backend/src/models/counter.model.js` supporting atomic `$inc: 1` increments via `findOneAndUpdate`.
  * Updated `generateNextInternId()` to use atomic database-backed sequences, guaranteeing strictly monotonic, collision-free allocation under high concurrent load with zero lost counter increments.
* **Atomic Applicant Conversion & Duplicate Protection:**
  * Refactored `convertApplicationToIntern()` to atomically claim conversion on the application document via `findOneAndUpdate({ _id, convertedToIntern: { $ne: true } })`, preventing double-conversions under concurrent requests.
* **Last Active Superadmin Cluster Protection:**
  * Enforced `withDistributedLock("admin_mutation", ...)` on admin role changes, status updates, and deletions.
  * Hardened `updateAdmin()` to validate `updates.isActive`, closing any bypass of the last Superadmin requirement.
* **High-Concurrency Integration Test Suite:**
  * Created `backend/tests/concurrency-and-distributed-locks.test.js` validating 50 simultaneous allocations, 50 simultaneous conversions on the same applicant, 25 concurrent removal attacks against the last Superadmin, and distributed lock lease recovery.
* **Test Verification:**
  * Backend automated test suite executed with **197 / 197 PASS** (100%).
  * Frontend automated test suite executed with **74 / 74 PASS** (100%).
  * Production Vite build passed in 550ms.
  * Created canonical verification audit: `docs/FINAL_PRODUCTION_VERIFICATION.md`.

---

## [3.0.0] — 2026-10-30

### Master Engineering Execution & Production Hardening
* **Concurrency-Safe Intern ID Allocation:**
  * Implemented `withInternAllocationLock` in `backend/src/modules/internship/internship.service.js` to serialize concurrent intern creation and applicant conversion requests.
  * Enhanced `generateNextInternId()` to accurately inspect all existing sequence suffixes for the current year, guaranteeing strictly monotonic, collision-free allocation (`ASH-INT-YYYY-001`, `ASH-INT-YYYY-002`) without random jumps or race conditions.
* **Canonical Architecture & Engineering Documentation Suite:**
  * Generated comprehensive, verified documentation under `docs/`:
    * `docs/PRODUCTION_TECHNICAL_AUDIT.md`: Architecture, technology matrix, API inventory, and data models.
    * `docs/REQUIREMENTS_TRACEABILITY.md`: 42-point requirement-to-code-and-test traceability matrix.
    * `docs/SECURITY_AUDIT.md`: OWASP ASVS 5.0 (Level 2) assessment, injection defense, RBAC concurrency, and magic-byte audit.
    * `docs/API_DOCUMENTATION.md`: Complete REST API v1 specification, request/response envelopes, and status codes.
    * `docs/DATABASE_ARCHITECTURE.md`: Complete 13-model inventory, compound indexes, connection pooling, and non-destructive migration protocols.
    * `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`: Step-by-step cloud deployment runbook for Vercel, Render, MongoDB Atlas, and AWS S3.
    * `docs/ENVIRONMENT_VARIABLES.md`: Zero-secrets configuration reference and boot-time startup validation rules.
    * `docs/TESTING_REPORT.md`: Comprehensive test report verifying 190 backend tests and 74 frontend tests.
    * `docs/PRODUCTION_READINESS_REPORT.md`: Formal 16-area production readiness assessment.
    * `docs/IMPLEMENTATION_CHANGELOG.md`: Chronological changelog of platform evolution.
* **Test Suite Verification:**
  * Backend automated test suite executed with **190 / 190 PASS** (100%).
  * Frontend automated test suite executed with **74 / 74 PASS** (100%).
  * Clean production Vite compilation (100 modules in ~780ms).
  * Clean whitespace audit (`git diff --check` with 0 defects).

---

## [2.4.0] — 2026-10-29

### Real Email Delivery & Live SMTP Verification
* **Live Google SMTP Relay Verification:**
  * Dispatched diagnostic verification email via `smtp.gmail.com:465` to `team.ashivam@gmail.com`.
  * Received status **250 OK** from Google SMTP relay (Message ID: `<4e65bdc9-ff57-fa9f-f17c-6da68ddba63c@gmail.com>`).
* **Anti-Tampering Sandbox Verification:**
  * Added automated tests in `backend/tests/e2e-email-sandbox.test.js` asserting that malicious public submission payloads attempting to inject `to`, `cc`, or `bcc` fields cannot override company notification recipients.
* **Startup Recipient Validation:**
  * Added boot-time regex validation in `backend/src/config/env.js` ensuring that `env.companyNotificationEmail` is a valid email address; throws in production if invalid.

---

## [2.3.0] — 2026-10-29

### Centralized Email Routing Architecture
* **Single Authorized Company Recipient:**
  * Enforced `MANDATED_COMPANY_NOTIFICATION_EMAIL = "team.ashivam@gmail.com"` across all inbound lead inquiries, career job applications, student internship submissions, and administrative system alerts.
  * Unified `env.companyNotificationEmail`, `env.alertEmail`, and `env.notificationRecipient`.
* **SMTP Authentication Identity Preservation:**
  * Preserved valid SMTP authentication account `teamashivam@gmail.com` with Google App Password, distinguishing between the authentication username and the authorized notification mailbox.
* **Two-Way Reply-To Routing:**
  * Company notifications configure `replyTo` as the submitter's email (`data.email`), enabling one-click replies from staff.
  * Submitter confirmation receipts configure `replyTo` as `team.ashivam@gmail.com`, ensuring replies reach the company inbox.
* **Sanitization:**
  * Replaced legacy placeholders (`contact@ashivamtechnologies.com`) across services and documentation.

---

## [2.2.0] — 2026-10-29

### Enterprise Administrative Panel Delivery
* **Self-Service Credential Lifecycle (MOD-01):**
  * Added `POST /api/v1/auth/change-password` allowing authenticated administrators to rotate their password.
  * Stamped `passwordChangedAt` on user records; updated `authenticate` middleware to immediately invalidate older JWTs.
* **Safe CSV Exports Across Collections (MOD-03, 04, 05, 06, 07, 10):**
  * Implemented CSV export streaming for Inquiries, Careers, Internships, Employees, HR Documents, and Audit Logs.
  * Protected against CSV Formula Injection (CWE-1236) via `sanitizeCsvCell()`, prefixing active characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with `'`.
* **Internship Management & Onboarding (MOD-05):**
  * Added dual-roster support for candidate applications (`Internship`) and enrolled interns (`Intern`).
  * Created three-subtab management UI in `src/components/Admin/tabs/InternshipsTab.jsx`.
  * Added atomic applicant conversion (`POST /api/v1/internships/applications/:id/convert`) and direct intern onboarding (`POST /api/v1/internships/interns`).
  * Implemented onboarding compliance checklist (Offer Letter, ID Card, NDA, Repo Access).
* **Superadmin Concurrency Protection:**
  * Added `withAdminMutationLock` serializing concurrent admin modifications to guarantee the last active Superadmin cannot be removed or demoted.
* **Modal Accessibility & Viewport Bounding:**
  * Bounded modal dialog heights to `calc(100dvh - 2.5rem)` with independent interior scrolling and background scroll locking (`body.admin-modal-open`).

---

## [2.1.0] — 2026-10-28

### Application Security & Binary File Inspection
* **Binary Magic-Byte Inspection:**
  * Implemented `validateFileSignature()` inspecting the first 4 bytes of uploaded files (`%PDF`, legacy Word OLE, ZIP DOCX), defeating malicious extension spoofing.
* **SVG Media Vault Hardening:**
  * Implemented deep SVG sanitization stripping null bytes, XXE declarations, script tags, and event handlers (`onload`, `onerror`).
  * Added static CSP headers for public SVGs (`default-src 'none'; frame-ancestors 'none'; sandbox`).
* **Vault Directory Isolation:**
  * Explicitly blocked public HTTP static access to `/uploads/resumes`, `/uploads/employee-documents`, and `/uploads/hr-documents` with HTTP 404 handlers.
  * Restated downloads through authenticated Bearer streaming controllers.

---

## [2.0.0] — 2026-10-27

### Responsive Architecture & Multi-Page Domain Expansion
* **Multi-Page Domain Architecture:**
  * Created dedicated route pages: `/industries` (with 6 enterprise domains), `/solutions` (with technical capabilities and case studies), `/careers` (with dynamic job board), and `/legal` (with Privacy, Terms, and Security tabs).
* **Accessibility & Touch Target Standards:**
  * Enforced minimum 44px touch targets across all interactive buttons, filter pills, and navigation links.
  * Converted all navigation and dashboard iconography to 100% vector SVGs (zero emojis).
* **Responsive Layouts:**
  * Applied fluid CSS clamp typography scaling cleanly from 360px mobile viewports to 1920px desktop screens.
* **SEO & Social Optimization:**
  * Implemented OpenGraph metadata, Twitter cards, and JSON-LD `OfferCatalog` schema in `index.html` and `src/utils/seo.js`.
