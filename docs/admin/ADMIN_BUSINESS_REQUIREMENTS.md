# Ashivam Technologies — Admin Panel Business Requirements

**Document Version:** 1.0.0  
**Target Application:** Ashivam Technologies Official Website & Administrative Portal  
**Target Directory:** `C:\Users\DELL\Desktop\Official-Website-main`  
**Security Baseline:** OWASP ASVS v4.0.3 Level 2, OWASP Authorization Cheat Sheet  
**Status:** Canonical Reference Specification  

---

## 1. Executive Context & Business Purpose

Ashivam Technologies is an enterprise software engineering, cloud solutions, and technology consulting firm headquartered in Agra, India. The company operates a dual model:
1. **Client Services:** Enterprise web, mobile, cloud infrastructure, AI/ML consulting, and managed services.
2. **Talent Incubation & Recruitment:** Structured internship programs, university talent pipelines, and lateral engineering recruitment.

The Admin Panel serves as the central operational hub for executive management, engineering leads, HR administrators, and compliance auditors. Its mandate is to provide reliable, secure, and auditable oversight across corporate identity, talent pipelines, customer engagements, published digital assets, and system configuration.

---

## 2. User Roles & Operational Personas

| Persona / Role | Description | Primary Operational Scope | Security Context |
| :--- | :--- | :--- | :--- |
| **Superadmin (Root)** | Executive leadership and technical directors. | Unrestricted platform access: admin provisioning, permission grants, permanent data archival, system reset. | Root level, immune to role demotion, protected against self-lockout. |
| **Admin (Operational)** | Department managers, project leads, HR leads. | Module-specific management governed by granular permissions (`dashboard`, `inquiries`, `careers`, `employees`, `content`, `media`, `audit`, `settings`). | Restricted access; strictly denied access to `admins` tab and destructive cascade deletions. |
| **Public User / Applicant** | Website visitors, prospective clients, internship candidates, job applicants. | Browsing public content, submitting contact inquiries, applying for job openings and internship tracks. | Unauthenticated public endpoints, strictly rate-limited with anti-automation defenses. |

---

## 3. High-Level Business Requirements by Domain

### 3.1 Authentication & Account Governance
- **REQ-AUTH-01:** Administrators must authenticate using a unique username and strong password (minimum 8 characters with complexity verification).
- **REQ-AUTH-02:** Rate-limiting must prevent credential stuffing and brute-force attacks (`loginLimiter`).
- **REQ-AUTH-03:** Session tokens must be cryptographically signed JWTs with explicit expiration and server-side user status verification.
- **REQ-AUTH-04:** Every administrator must be capable of securely changing their own password by providing their current password.
- **REQ-AUTH-05:** Superadmins can provision operational admin accounts, assign granular permissions, and activate/deactivate accounts.
- **REQ-AUTH-06:** System must guarantee at least one active Superadmin account exists at all times to prevent operational lockout.

### 3.2 Dashboard & Executive Intelligence
- **REQ-DASH-01:** Executive KPIs must be computed from persisted operational records without fabricated or hardcoded statistics.
- **REQ-DASH-02:** Support dynamic rolling time-window filtering (`7d`, `30d`, `90d`, and `all`).
- **REQ-DASH-03:** Provide visual attention indicators when unhandled inquiries, pending applications, or missing compliance documents exceed threshold zero.
- **REQ-DASH-04:** Display real-time security audit events and provide direct deep-links from metric summary cards to corresponding filtered module views.

### 3.3 Employee & Staff Management
- **REQ-EMP-01:** Maintain an accurate directory of full-time, part-time, contract, and intern staff members.
- **REQ-EMP-02:** Enforce unique email constraints across all active staff records to prevent duplicate identity creation.
- **REQ-EMP-03:** Support employee profile updates (designation, department, work location, social links, bio) without data loss.
- **REQ-EMP-04:** Deactivation and soft-deletion must preserve historical links to past documents, audit trails, and mentoring assignments.
- **REQ-EMP-05:** Provide exportable corporate employee directories with CSV formula injection mitigation.
- **REQ-EMP-06:** Expose only approved public profiles on the company website team section (`GET /api/v1/employees/public`).

### 3.4 Internship & Talent Incubation Lifecycle
- **REQ-INT-01:** Publish and manage technical internship program tracks with clear descriptions, domain categories, openings, and stipend details.
- **REQ-INT-02:** Receive student applications from the public portal with contact info, college, degree, and statement.
- **REQ-INT-03:** Support one-click candidate-to-intern conversion, generating collision-safe identifiers formatted as `ASH-INT-YYYY-XXX`.
- **REQ-INT-04:** Support direct manual onboarding of interns without prior public portal application.
- **REQ-INT-05:** Track an onboarding compliance checklist: Government ID Proof, College NOC / Student ID, Internship Agreement, Non-Disclosure Agreement (NDA).
- **REQ-INT-06:** Enforce strict status lifecycle transitions: `active` → `extended` (with recorded justification), `completed` (with performance notes), `withdrawn`, or `terminated`.
- **REQ-INT-07:** Enable formula-neutralized CSV exports for applicant pipelines and active intern directories.

### 3.5 Careers & Lateral Recruitment
- **REQ-CAR-01:** Manage career vacancies with full job descriptions, requirements, responsibilities, department, experience, and publication status (`active` / `closed`).
- **REQ-CAR-02:** Accept applicant resumes in approved formats (`.pdf`, `.doc`, `.docx`) capped at 5MB.
- **REQ-CAR-03:** Securely store resumes in private server-side directories blocked from public HTTP access.
- **REQ-CAR-04:** Provide authenticated resume downloads for authorized HR and recruitment leads.
- **REQ-CAR-05:** Track candidate recruitment stages: `applied` → `under_review` → `shortlisted` → `interview_scheduled` → `hired` or `rejected`.
- **REQ-CAR-06:** Provide safe CSV exports of candidate pipelines.

### 3.6 Contact Inquiries & Business Leads
- **REQ-INQ-01:** Capture prospective client inquiries from public forms with name, email, phone, subject, and message.
- **REQ-INQ-02:** Support administrative triage: status updates (`new`, `in_progress`, `resolved`, `spam`, `archived`) and internal admin notes.
- **REQ-INQ-03:** Provide formula-safe CSV exports of business inquiries.
- **REQ-INQ-04:** Preserve inquiry history when resolving or archiving leads.

### 3.7 HR Document Compliance
- **REQ-DOC-01:** Secure upload and storage of employee HR documents (Offer Letters, ID Proofs, Degrees, Relieving Letters, Certificates).
- **REQ-DOC-02:** Restrict uploads to safe MIME types and enforce 10MB file size limits.
- **REQ-DOC-03:** Enforce private, authenticated streaming for document downloads; deny direct public directory browsing.
- **REQ-DOC-04:** Track verification status: `pending` → `verified`, `rejected`, or `archived`.

### 3.8 Website Content (CMS) & Media Assets
- **REQ-CMS-01:** Manage editable website content blocks categorized by section (`hero`, `about`, `solutions`, `services`, `contact`).
- **REQ-CMS-02:** Enforce separation of `draft` and `published` states to prevent unverified public disclosures.
- **REQ-MED-01:** Provide a centralized media library for corporate imagery, logos, and illustrations.
- **REQ-MED-02:** Validate file formats, sanitize filenames, and serve public media with strict security headers (e.g. SVG sandbox Content-Security-Policy).

### 3.9 System Configuration & Corporate Settings
- **REQ-SET-01:** Maintain editable corporate metadata (company legal name, address, contact phone, support email, GSTIN, social media URLs).
- **REQ-SET-02:** Control feature toggles (Careers portal active, Internship registration open, Maintenance mode banner).
- **REQ-SET-03:** Support reset to verified system defaults with confirmation.
- **REQ-SET-04:** Strictly exclude environment secrets (API keys, SMTP passwords, database URIs) from database settings.

### 3.10 Security Audit Logging & Accountability
- **REQ-AUD-01:** Record immutable audit logs for all administrative actions (login, logout, create, update, status change, delete, export).
- **REQ-AUD-02:** Log actor username, IP address, timestamp, target entity, action, and request correlation ID (`X-Request-Id`).
- **REQ-AUD-03:** Redact all passwords, tokens, and personal credentials from audit logs.
- **REQ-AUD-04:** Provide searchable, filterable log views and authenticated CSV export for compliance auditing.

---

## 4. In-Scope vs. Out-of-Scope Boundaries

### In-Scope (Implemented & Maintained in this Solution)
- Complete administrative UI with 11 unified modules.
- End-to-end backend API routes with server-side RBAC.
- Mongoose data models, indexes, and transaction boundaries.
- Viewport-constrained, accessible modal dialogs and data tables.
- OWASP formula-safe CSV exports.
- Local dev Vite proxy routing without header spoofing.
- Production-grade automated regression test suites.

### Out-of-Scope (Explicitly Excluded)
- Automated banking payroll disbursement / direct salary bank wire integration (out-of-scope; payroll is handled by external bank portals).
- Real-time WebRTC audio/video interviewing within the admin browser (interviews conducted via standard corporate meeting links).
- Public self-registration of administrative users (administrative access is strictly provisioned by Superadmins).
