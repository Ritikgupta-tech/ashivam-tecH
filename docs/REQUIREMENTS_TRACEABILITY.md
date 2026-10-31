# Ashivam Technologies — Requirements Traceability Matrix (RTM)

**Document Version:** 3.0.0 (Master Engineering Release)  
**Classification:** Confidential — Internal Company & DevOps Use Only  
**Company:** Ashivam Technologies  
**Date:** October 30, 2026  
**Auditor:** Principal Software Architect & QA Automation Lead  

---

## 1. Overview & Traceability Methodology

The Requirements Traceability Matrix (RTM) validates that every functional, security, administrative, and operational requirement has a direct implementation in the codebase and a corresponding automated test verifying its behavior.

---

## 2. Requirements Traceability Matrix

| Req ID | Domain | Requirement Description | Existing Status | Implementation Details | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-AUTH-01** | Authentication | Admin credential login issuing HMAC SHA-256 JWT (1h expiry) | Implemented | `backend/src/modules/auth/auth.service.js` (`loginAdmin`) | `auth.test.js`, `enterprise-security-audit.test.js` (PASS) |
| **REQ-AUTH-02** | Authentication | Self-service password rotation with immediate session token invalidation | Implemented | `backend/src/modules/auth/auth.service.js` (`changeAdminPassword`) | `auth-password-change.test.js` (PASS) |
| **REQ-AUTH-03** | Authentication | Brute-force rate limiting on login endpoint (5 attempts / 15m) | Implemented | `backend/src/middlewares/rateLimit.middleware.js` (`authLimiter`) | `ratelimit.test.js` (PASS) |
| **REQ-RBAC-01** | Authorization | Superadmin role strictly required to manage admin accounts | Implemented | `backend/src/modules/admin/admin.routes.js` (`requireRole("Superadmin")`) | `admin-rbac-and-security.test.js` (PASS) |
| **REQ-RBAC-02** | Authorization | Operational admins restricted by granular permission allowlist | Implemented | `backend/src/middlewares/auth.middleware.js` (`requirePermission`) | `admin-rbac-and-security.test.js` (PASS) |
| **REQ-RBAC-03** | Authorization | Concurrency mutex lock preventing deletion or demotion of the last active Superadmin | Implemented | `backend/src/modules/admin/admin.service.js` (`withAdminMutationLock`) | `admin-rbac-and-security.test.js` (AUD-09, AUD-10 PASS) |
| **REQ-INQ-01** | Inquiries | Public contact form with phone, budget, and message validation | Implemented | `backend/src/modules/inquiry/inquiry.validator.js` | `inquiry.test.js` (PASS) |
| **REQ-INQ-02** | Inquiries | Silent honeypot bot trap discarding automated bot submissions | Implemented | `backend/src/modules/inquiry/inquiry.service.js` (`isHoneypotTriggered`) | `enterprise-security-audit.test.js` (PASS) |
| **REQ-INQ-03** | Inquiries | In-flight deduplication suppressing duplicate submissions within 60s | Implemented | `backend/src/modules/inquiry/inquiry.service.js` | `email-workflows.test.js` (Workflow 1 PASS) |
| **REQ-INQ-04** | Inquiries | Safe CSV export of inquiries with formula injection mitigation | Implemented | `backend/src/modules/inquiry/inquiry.service.js` (`exportInquiriesCsv`) | `admin-csv-and-dashboard.test.js` (PASS) |
| **REQ-CAR-01** | Careers | Job posting lifecycle: create, auto-slugify, publish, close, draft | Implemented | `backend/src/modules/career/career.service.js` | `career.test.js`, `adminDashboardModules.test.js` (PASS) |
| **REQ-CAR-02** | Careers | Resume upload with binary magic-byte inspection (%PDF, DOC, DOCX) | Implemented | `backend/src/services/storage.service.js` (`validateFileSignature`) | `career.test.js`, `enterprise-security-audit.test.js` (PASS) |
| **REQ-CAR-03** | Careers | Private resume storage blocking public static HTTP access | Implemented | `backend/src/app.js` (explicit 404 handler for `/uploads/resumes`) | `career.test.js` (PASS) |
| **REQ-CAR-04** | Careers | Authenticated streaming download of resumes with safe filename header | Implemented | `backend/src/modules/career/career.controller.js` (`downloadResume`) | `career.test.js` (PASS) |
| **REQ-CAR-05** | Careers | Safe CSV export of candidate applications | Implemented | `backend/src/modules/career/career.service.js` (`exportApplicationsCsv`) | `admin-csv-and-dashboard.test.js` (PASS) |
| **REQ-INT-01** | Internships | Public student internship application with duplicate domain guard | Implemented | `backend/src/modules/internship/internship.service.js` (`createInternship`) | `internship-management.test.js` (PASS) |
| **REQ-INT-02** | Internships | Collision-safe sequential intern ID allocation (`ASH-INT-YYYY-XXX`) | Implemented | `backend/src/modules/internship/internship.service.js` (`withInternAllocationLock`) | `internship-management.test.js` (PASS) |
| **REQ-INT-03** | Internships | Atomic applicant-to-intern conversion pipeline | Implemented | `backend/src/modules/internship/internship.service.js` (`convertApplicationToIntern`) | `internship-management.test.js` (PASS) |
| **REQ-INT-04** | Internships | Direct intern provisioning by HR administrators | Implemented | `backend/src/modules/internship/internship.service.js` (`createInternDirectly`) | `internship-management.test.js` (PASS) |
| **REQ-INT-05** | Internships | Onboarding compliance checklist (ID, NOC, Agreement, NDA) | Implemented | `backend/src/modules/internship/internship.service.js` (`updateInternOnboarding`) | `internship-management.test.js` (PASS) |
| **REQ-INT-06** | Internships | Safe CSV export of enrolled intern directory | Implemented | `backend/src/modules/internship/internship.service.js` (`exportInternsCsv`) | `internship-management.test.js` (PASS) |
| **REQ-EMP-01** | Employees | Corporate employee creation with unique active email validation | Implemented | `backend/src/modules/employee/employee.service.js` (`createEmployee`) | `admin-csv-and-dashboard.test.js` (AUD-08 PASS) |
| **REQ-EMP-02** | Employees | Soft-deletion retaining historical records while releasing email | Implemented | `backend/src/modules/employee/employee.service.js` (`deleteEmployee`) | `admin-csv-and-dashboard.test.js` (PASS) |
| **REQ-EMP-03** | Employees | Safe CSV export of corporate employee directory | Implemented | `backend/src/modules/employee/employee.service.js` (`exportEmployeesCsv`) | `admin-csv-and-dashboard.test.js` (PASS) |
| **REQ-DOC-01** | HR Documents | Upload HR documents with category and role access restrictions | Implemented | `backend/src/modules/hr-document/hrDocument.service.js` (`uploadHrDocument`) | `admin-csv-and-dashboard.test.js` (PASS) |
| **REQ-DOC-02** | HR Documents | Authenticated streaming download verifying caller permissions | Implemented | `backend/src/modules/hr-document/hrDocument.controller.js` (`downloadDocument`) | `adminDashboardModules.test.js` (PASS) |
| **REQ-DOC-03** | HR Documents | Safe CSV audit export of HR documents repository | Implemented | `backend/src/modules/hr-document/hrDocument.service.js` (`exportHrDocumentsCsv`) | `admin-csv-and-dashboard.test.js` (PASS) |
| **REQ-CMS-01** | CMS Content | Create, edit, draft, and publish dynamic website copy blocks | Implemented | `backend/src/modules/content/content.service.js` | `content.test.js` (PASS) |
| **REQ-CMS-02** | CMS Content | Public read-only API delivering sanitized content blocks | Implemented | `backend/src/modules/content/content.service.js` (`getPublicContent`) | `content.test.js` (PASS) |
| **REQ-MED-01** | Media Vault | Upload media assets with MIME verification and size bounds (10MB) | Implemented | `backend/src/modules/media/media.service.js` (`uploadMedia`) | `media.test.js` (PASS) |
| **REQ-MED-02** | Media Vault | Deep SVG inspection stripping null bytes, XXE, scripts, and event handlers | Implemented | `backend/src/modules/media/media.validator.js` (`validateMediaFile`) | `media.test.js` (PASS) |
| **REQ-AUD-01** | Audit Logs | Chronological logging of administrative operations with actor metadata | Implemented | `backend/src/modules/audit/audit.service.js` (`createAuditLog`) | `audit.test.js` (PASS) |
| **REQ-AUD-02** | Audit Logs | Safe CSV export of administrative audit trails | Implemented | `backend/src/modules/audit/audit.service.js` (`exportAuditLogsCsv`) | `admin-csv-and-dashboard.test.js` (PASS) |
| **REQ-SET-01** | Settings | Corporate profile, contact info, social channels, and feature toggles | Implemented | `backend/src/modules/settings/settings.service.js` (`updateSettings`) | `settings.test.js`, `adminDashboardModules.test.js` (PASS) |
| **REQ-EML-01** | Email System | Mandated corporate notification recipient: `team.ashivam@gmail.com` | Implemented | `backend/src/config/env.js` (`MANDATED_COMPANY_NOTIFICATION_EMAIL`) | `e2e-email-sandbox.test.js`, `email.test.js` (PASS) |
| **REQ-EML-02** | Email System | Preserved valid SMTP authentication identity: `teamashivam@gmail.com` | Implemented | `backend/src/modules/notification/email.service.js` | `verify:smtp` (Live 250 OK Verified) |
| **REQ-EML-03** | Email System | Submitter confirmations reach submitter with Reply-To `team.ashivam@gmail.com` | Implemented | `backend/src/modules/inquiry/inquiry.service.js`, `career.service.js` | `e2e-email-sandbox.test.js` (PASS) |
| **REQ-EML-04** | Email System | Payload anti-tampering stripping public overrides of `to`, `cc`, or `bcc` | Implemented | `backend/src/modules/notification/email.service.js` (`sendCompanyNotification`) | `e2e-email-sandbox.test.js` (PASS) |
| **REQ-PUB-01** | Public Website | Responsive multi-page architecture (`/`, `/industries`, `/solutions`, `/careers`, `/legal`)| Implemented | `src/App.jsx`, `src/pages/` | `multiPageDesign.test.js`, `responsiveAudit.test.js` (PASS) |
| **REQ-PUB-02** | Public Website | Touch target accessibility (&ge; 44px) across interactive controls | Implemented | `src/styles/` | `touchTargets.test.js` (PASS) |
| **REQ-PUB-03** | Public Website | SEO metadata, OpenGraph tags, and JSON-LD OfferCatalog schema | Implemented | `index.html`, `src/utils/seo.js` | `seoAudit.test.js` (PASS) |
| **REQ-INF-01** | Infrastructure | Vercel SPA routing rewrites and security headers | Implemented | `vercel.json` | `adminDashboardModules.test.js` (PASS) |
| **REQ-INF-02** | Infrastructure | Render web service specification with health checks | Implemented | `render.yaml` | Build & test verification (PASS) |
| **REQ-INF-03** | Infrastructure | Startup environment validation with production security guards | Implemented | `backend/src/config/env.js` | `env.test.js` (PASS) |
