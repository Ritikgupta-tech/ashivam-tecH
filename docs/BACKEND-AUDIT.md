# BACKEND AUDIT REPORT — ASHIVAM TECHNOLOGIES

**Date:** 2026-10-08  
**Auditor:** Senior Backend Architect, Application Security Engineer & Production QA Engineer  
**Status:** AUDIT COMPLETED — REMEDIATION IN PROGRESS  
**Target:** `backend/` codebase serving Ashivam Technologies Official Platform  

---

## 1. Current Architecture

The backend is built as a modular REST API running on Node.js (v22.23.1) utilizing ES Modules (`"type": "module"`).
- **Core Framework:** Express 5.2.1
- **Database Layer:** MongoDB connected via Mongoose 9.10.3
- **Entry Points:**
  - `backend/src/server.js`: Server lifecycle bootstrapping, DB connection, HTTP listener, and graceful shutdown handling (`SIGINT`, `SIGTERM`).
  - `backend/src/app.js`: Express application initialization, security middleware registration, and modular route dispatching.
- **Organization Structure:**
  - `src/config/`: Configuration and environment parsing (`env.js`).
  - `src/db/`: MongoDB connection setup (`database.js`).
  - `src/middlewares/`: Authentication, authorization, global rate limiting, and error handling.
  - `src/models/`: Shared models (e.g. `admin.model.js`).
  - `src/modules/`: Domain modules encapsulating routes, controllers, services, models, and validators:
    - `admin`
    - `audit`
    - `auth`
    - `career`
    - `content`
    - `dashboard`
    - `employee`
    - `employee-document`
    - `hr-document`
    - `inquiry`
    - `internship`
    - `media`
    - `notification`
    - `settings`
  - `src/utils/`: Common utilities (`jwt.js`, `query.js`, `validation.js`).
  - `src/scripts/`: Operations scripts (`create-admin.js`).

---

## 2. Existing APIs

All API endpoints are namespaced under `/api/v1` in `backend/src/app.js`:

| Route Prefix | Controller / Module | Public / Protected | Primary Purpose |
|---|---|---|---|
| `GET /` | Root | Public | Service health & identification |
| `/api/v1/health` | `health.routes.js` | Public | Readiness and database ping check |
| `/api/v1/auth` | `auth.routes.js` | Public / Protected | Admin login (`POST /login`) & session verification (`GET /me`) |
| `/api/v1/admin` | `admin.routes.js` | Protected (Superadmin/Admin) | Sub-admin CRUD, status updates, permission assignment |
| `/api/v1/inquiries` | `inquiry.routes.js` | Public (POST) / Protected (Admin) | Public contact inquiries & back-office triage |
| `/api/v1/career` | `career.routes.js` | Public (GET jobs, POST apply) / Protected | Job listings, career applications & resume uploads |
| `/api/v1/internships`| `internship.routes.js`| Public (POST) / Protected | Internship student applications & evaluation |
| `/api/v1/content` | `content.routes.js` | Public (GET) / Protected | Dynamic CMS section blocks, articles, testimonials |
| `/api/v1/media` | `media.routes.js` | Protected (Admin) | Asset management, file uploads, metadata tracking |
| `/api/v1/notifications`| `notification.routes.js`| Protected (Admin) | Internal staff notifications & read statuses |
| `/api/v1/audit` | `audit.routes.js` | Protected (Superadmin/Admin) | System activity audit trails |
| `/api/v1/settings` | `settings.routes.js`| Public (GET) / Protected | Site configuration, social links, SEO tags, hours |
| `/api/v1/dashboard` | `dashboard.routes.js`| Protected (Admin) | Aggregated KPIs, summary metrics, recent actions |
| `/api/v1/employees` | `employee.routes.js` | Public (GET /public) / Protected | Team roster, departments, designations |
| `/api/v1/employee-documents`| `employee-document.routes.js`| Protected (Admin) | Employee contracts, letters, credential files |
| `/api/v1/hr-documents`| `hrDocument.routes.js`| Protected (Admin) | Compliance documentation (Aadhaar, PAN, NDA, etc.) |

---

## 3. Existing Models

1. **Admin** (`models/admin.model.js`): `username`, `name`, `passwordHash` (hidden by default), `role` (`Superadmin`, `Admin`), `permissions` (`[String]`), `isActive`, `lastLoginAt`.
2. **Inquiry** (`modules/inquiry/inquiry.model.js`): `name`, `email`, `phone`, `subject`, `message`, `status` (`new`, `in_progress`, `resolved`, `closed`), `adminNote`, `assignedTo`, `resolvedAt`.
3. **Job** (`modules/career/job.model.js`): `title`, `slug`, `department`, `location`, `employmentType`, `experience`, `description`, `requirements`, `responsibilities`, `skills`, `salary`, `applicationDeadline`, `isActive`, `createdBy`.
4. **Application** (`modules/career/application.model.js`): `job`, `firstName`, `lastName`, `email`, `phone`, `currentLocation`, `experience`, `coverLetter`, `resume` subdocument, `status`, `adminNote`, `reviewedBy`, `reviewedAt`.
5. **Internship** (`modules/internship/internship.model.js`): `name`, `email`, `phone`, `college`, `course`, `year`, `domain`, `duration`, `startDate`, `portfolio`, `message`, `status`, `adminNote`, `assignedTo`.
6. **Content** (`modules/content/content.model.js`): `key` (unique), `section`, `title`, `content` (Mixed), `status` (`draft`, `published`), `sortOrder`, `createdBy`, `updatedBy`, `publishedAt`.
7. **Employee** (`modules/employee/employee.model.js`): `firstName`, `lastName`, `email` (unique), `phone`, `profileImage`, `designation`, `department`, `employmentType`, `joiningDate`, `workLocation`, `bio`, `skills`, `socialLinks`, `displayOrder`, `isFeatured`, `isActive`, `deletedAt`, `createdBy`, `updatedBy`.
8. **EmployeeDocument** (`modules/employee-document/employee-document.model.js`): `employee`, `documentType`, `title`, `description`, `file` subdocument, `status` (`active`, `archived`), `uploadedBy`, `archivedAt`.
9. **HRDocument** (`modules/hr-document/hrDocument.model.js`): `employee`, `documentType` (enum), `title`, `description`, `originalName`, `storedName`, `filePath`, `mimeType`, `fileSize`, `documentNumber`, `issueDate`, `expiryDate`, `status`, `rejectionReason`, `verifiedAt`, `verifiedBy`, `uploadedBy`, `isDeleted`, `deletedAt`, `deletedBy`.
10. **Media** (`modules/media/media.model.js`): `originalName`, `fileName` (unique), `mimeType`, `extension`, `size`, `category`, `storagePath`, `url`, `uploadedBy`, `isActive`.
11. **Notification** (`modules/notification/notification.model.js`): `recipient`, `type`, `title`, `message`, `priority`, `data`, `isRead`, `readAt`, `emailSent`, `emailSentAt`.
12. **AuditLog** (`modules/audit/audit.model.js`): `actor`, `action`, `entity`, `entityId`, `description`, `metadata`, `request`, `status`.
13. **Settings** (`modules/settings/settings.model.js`): `key` (unique), `company`, `social`, `seo`, `branding`, `businessHours`, `maintenance`, `features`, `updatedBy`.

---

## 4. Existing Authentication Flow

1. Admin submits credentials (`username`, `password`) to `POST /api/v1/auth/login`.
2. Service normalizes username (lowercase, trimmed), fetches admin record including `passwordHash`.
3. Verifies account `isActive`.
4. Executes `bcrypt.compare(password, admin.passwordHash)`.
5. Upon match, updates `lastLoginAt = new Date()` and issues a signed JSON Web Token (JWT) with payload `{ sub: admin._id, username, role }`.
6. Token signature uses `env.jwtSecret` and expires based on `env.jwtExpiresIn` (defaults to `1h`).
7. Protected requests transmit the token via standard HTTP header: `Authorization: Bearer <token>`.
8. `authenticate` middleware parses the header, verifies token signature with `verifyAccessToken`, checks admin existence in the DB, verifies `isActive`, and attaches `req.user` to the request lifecycle.

---

## 5. Existing Authorization (RBAC)

1. Two defined roles: `Superadmin` and `Admin`.
2. `requireRole(...roles)` validates `req.user.role`.
3. `requirePermission(permission)` checks whether `req.user.role === 'Superadmin'` (which grants universal bypass) or whether `req.user.permissions` includes the specified privilege string.
4. **Defect Identified:** `admin.validator.js` previously only acknowledged 5 permissions (`["dashboard", "admins", "users", "content", "settings"]`), while other modules enforce permissions not present in that list (`"inquiries"`, `"careers"`, `"media"`). Additionally, several administrative endpoints in `employee.routes.js`, `employee-document.routes.js`, `hrDocument.routes.js`, and `dashboard.routes.js` lacked permission checks beyond basic token authentication.

---

## 6. Existing Security Controls

- **Express Security:** `app.disable("x-powered-by")` removes framework disclosure headers.
- **HTTP Security Headers:** `helmet` active with `crossOriginResourcePolicy: { policy: "cross-origin" }`.
- **CORS:** Configured via `cors({ origin: env.clientUrl, credentials: true })`.
- **Payload Limits:** `express.json({ limit: "1mb" })` and `express.urlencoded({ limit: "1mb" })`.
- **Static Assets:** `/uploads` served with `index: false, dotfiles: "deny"`.
- **Honeypot Support:** Helper `isHoneypotTriggered` checks hidden `website` field to intercept automated bots.
- **Input Sanitization:** `sanitizeText` strips control characters, HTML tags, and redundant whitespace.

---

## 7. Existing Database Indexes

- `Admin`: `username` (unique), `role`, `isActive`.
- `Inquiry`: `email`, `status`, compound `{ status: 1, createdAt: -1 }`, `{ email: 1, createdAt: -1 }`.
- `Job`: `slug` (unique), `isActive`, compound `{ isActive: 1, createdAt: -1 }`, `{ department: 1, employmentType: 1 }`.
- `Application`: `job`, `email`, `status`, compound `{ job: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`, `{ email: 1, createdAt: -1 }`.
- `Content`: `key` (unique), `section`, `status`, compound `{ section: 1, status: 1, sortOrder: 1 }`, text index `{ title: "text", key: "text", section: "text" }`.
- `Employee`: `email` (unique), compound `{ department: 1, isActive: 1 }`, `{ designation: 1, isActive: 1 }`, `{ displayOrder: 1, createdAt: -1 }`, text index.
- `EmployeeDocument`: `employee`, `status`, compound `{ employee: 1, documentType: 1, status: 1 }`, `{ createdAt: -1 }`.
- `HRDocument`: `employee`, `documentType`, `status`, `expiryDate`, `isDeleted`, compound `{ employee: 1, documentType: 1 }`, `{ status: 1, expiryDate: 1 }`.
- `Media`: `fileName` (unique), `uploadedBy`, `category`, `isActive`, text index `{ originalName: "text", fileName: "text" }`.
- `Notification`: `recipient`, `type`, `priority`, `isRead`, compound `{ recipient: 1, isRead: 1, createdAt: -1 }`.
- `AuditLog`: `action`, `entity`, `entityId`, `status`, compound `{ createdAt: -1 }`, `{ "actor.userId": 1, createdAt: -1 }`, `{ entity: 1, action: 1, createdAt: -1 }`.
- `Settings`: `key` (unique).

---

## 8. Existing Validation

- Implemented using modular JavaScript validation functions (`inquiry.validator.js`, `career.validator.js`, etc.) combined with `backend/src/utils/validation.js`.
- Features robust type safety against non-string attacks (preventing NoSQL query selector injections like `{ $ne: null }`).
- Enforces min/max boundaries on text fields.
- Validates email formats using regex and phone numbers.
- Safe query string parsers (`readQueryValue`, `readPositiveInt`) isolate single values and reject array poisoning.

---

## 9. Existing File Upload Behavior

- Handled using `multer`.
- Modules utilizing uploads:
  - `career.routes.js`: Public resume submission directly to `uploads/resumes/` using diskStorage. *(Security risk: lacked `fileFilter` at the multer middleware layer)*.
  - `media.routes.js`: Memory storage with 10MB limit; controller parses MIME, writes to `uploads/media/`, and stores record in MongoDB.
  - `employee-document.routes.js` & `hr-document.routes.js`: Memory storage with MIME filter checking allowed extensions (`PDF`, `JPG`, `PNG`, `WEBP`, `DOC`, `DOCX`).

---

## 10. Existing Email Behavior

- Implemented via Nodemailer in `modules/notification/email.service.js`.
- Configured using SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`).
- **Defect Identified:** Missing graceful degradation: if SMTP credentials are omitted, `getTransporter()` threw a hard error, which could crash or reject public inquiries if called synchronously during form submissions.

---

## 11. Existing Tests

- **Status Before Remediation:** ZERO test files existed in `backend/`. `npm test` script was absent in `backend/package.json`.

---

## 12. Missing Functionality

1. Correlation Request IDs (`X-Request-Id`) across the Express lifecycle to trace transactions from ingress to log.
2. Standardized error payload formatting across all failure types (MongoDB CastError, ValidationError, MongoServerError 11000 duplicate keys).
3. Configurable CORS multi-origin parsing allowing local development (`http://localhost:5173`) alongside staging and production Vercel domains (`https://ashivam-tec-h.vercel.app`).
4. Missing environment variable defaults and validation for rate limits in `env.js`.
5. Automated test suite verifying health, authentication, inquiry validation, rate limits, and security headers.

---

## 13. Security Vulnerabilities Identified

1. **Unchecked Multer Upload in Careers:** `career.routes.js` accepted any file type onto the server disk before controller checks.
2. **Missing Rate Limiting on Login:** `POST /api/v1/auth/login` did not attach `loginLimiter`, leaving credentials exposed to brute-force attacks.
3. **Missing Environment Parameters in Rate Limiter:** `rateLimit.middleware.js` referenced `env.loginRateLimit`, `env.publicFormRateWindowMs`, and `env.publicFormRateLimit`, which were undefined in `env.js`.
4. **Regular Expression Denial of Service (ReDoS):** `audit.service.js` directly injected unescaped query strings into `$regex`.
5. **Rigid Single CORS Origin:** `cors({ origin: env.clientUrl })` rejects cross-origin requests from production Vercel deployment URLs or alternate subdomains.
6. **Hardcoded Admin Password in Seed Script:** `create-admin.js` contained default password fallback without mandatory env override.

---

## 14. Production Blockers

- Undefined rate limiter options in `env.js` causing potential rate limit errors.
- Absence of CORS multi-origin support breaking live frontend on Vercel.
- Lack of an automated regression test suite.
- npm audit advisory (3 high vulnerabilities in legacy transitive dependencies of nodemon).

---

## 15. Recommended Implementation Order

1. **Phase 1: Environment & Config Hardening**
   - Update `backend/src/config/env.js` with full rate limit params, CORS origin parser, and strict validation.
   - Create `backend/.env.example` and `docs/ENVIRONMENT.md`.
2. **Phase 2: Security & Middleware Remediation**
   - Fix `rateLimit.middleware.js` with safe defaults.
   - Apply `loginLimiter` to `/api/v1/auth/login` and `publicFormLimiter` to `/api/v1/inquiries` and `/api/v1/career/jobs/:jobId/apply`.
   - Update `app.js` with dynamic multi-origin CORS and `X-Request-Id` correlation tracing.
   - Harden `error.middleware.js` with structured Mongoose error transformations.
3. **Phase 3: Database & RBAC Hardening**
   - Enhance `database.js` connection resilience and options.
   - Expand `PERMISSIONS` list in `admin.validator.js` and enforce RBAC on employee, HR, and dashboard routes.
   - Escape regex in `audit.service.js` and `media.service.js` to eliminate ReDoS.
4. **Phase 4: File Upload & Email Hardening**
   - Add strict `fileFilter` (PDF, DOC, DOCX) and sanitization in `career.routes.js`.
   - Implement graceful degradation in `email.service.js` and hook background notifications to inquiry submissions.
5. **Phase 5: Automated Testing Suite & Verification**
   - Create test suite in `backend/tests/` covering Health, Auth, Inquiries, Rate Limiting, and Security Headers.
   - Run `npm test` and verify 100% passing results.
   - Run `npm audit` to guarantee 0 vulnerabilities.
6. **Phase 6: Documentation Delivery**
   - Generate `docs/DATABASE-DESIGN.md`, `docs/API-SECURITY-AUDIT.md`, `docs/API.md`, and `docs/BACKEND-TEST-REPORT.md`.
