# Ashivam Technologies — Admin Module Inventory & Traceability Matrix

**Document Version:** 1.0.0  
**Status:** Complete & Verified Baseline  
**Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  

---

## 1. Inventory Summary

The Ashivam Technologies Admin Portal consists of 11 unified modules accessible through the main dashboard navigation (`src/components/Admin/AdminShell.jsx`). Every module is backed by dedicated Express route handlers, controllers, validators, services, Mongoose models, and server-side RBAC middleware.

| Module Index | Module Name | Primary Frontend Tab Component | Backend Route File | Mongoose Model(s) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | **Executive Dashboard & Overview** | `OverviewTab.jsx` | `dashboard.routes.js` | `Inquiry`, `JobApplication`, `Intern`, `Employee`, `HrDocument`, `AuditLog` | **WORKING** |
| **MOD-02** | **Inquiries & Business Leads** | `InquiriesTab.jsx` | `inquiry.routes.js` | `Inquiry` | **WORKING** |
| **MOD-03** | **Careers & Lateral Recruitment** | `CareersTab.jsx` | `career.routes.js` | `Job`, `JobApplication` | **WORKING** |
| **MOD-04** | **Internship & Talent Incubation** | `InternshipsTab.jsx` | `internship.routes.js` | `Internship`, `Intern`, `InternshipProgram` | **WORKING** |
| **MOD-05** | **Employee Management** | `EmployeesTab.jsx` | `employee.routes.js` | `Employee` | **WORKING** |
| **MOD-06** | **HR Document Compliance** | `DocumentsTab.jsx` | `hrDocument.routes.js` | `HrDocument`, `Employee` | **WORKING** |
| **MOD-07** | **Website Content (CMS)** | `ContentTab.jsx` | `content.routes.js` | `Content` | **WORKING** |
| **MOD-08** | **Media Asset Library** | `MediaTab.jsx` | `media.routes.js` | `Media` | **WORKING** |
| **MOD-09** | **Security Audit Logs** | `AuditTab.jsx` | `audit.routes.js` | `AuditLog` | **WORKING** |
| **MOD-10** | **System Settings & Config** | `SettingsTab.jsx` | `settings.routes.js` | `Settings` | **WORKING** |
| **MOD-11** | **Admin Accounts & Roles** | `AdminsTab.jsx` | `admin.routes.js` | `Admin` | **WORKING** |

---

## 2. Detailed Module Inspection & Traceability

### MOD-01: Executive Dashboard & Overview
- **Frontend Tab:** [`src/components/Admin/tabs/OverviewTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/OverviewTab.jsx)
- **Backend Service:** [`backend/src/modules/dashboard/dashboard.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/dashboard/dashboard.service.js)
- **API Helpers:** `getDashboardOverview({ range })`, `getDashboardRecentActivity(limit)`
- **End-to-End Trace:**
  1. Frontend selects time window: `all`, `90d`, `30d`, `7d`.
  2. Dispatches `GET /api/v1/dashboard/overview?range=:range`.
  3. Authenticated by JWT bearer token; authorized by `dashboard` permission.
  4. Backend executes MongoDB aggregation pipelines filtering records with `$gte: startDate`.
  5. Computes real counts for inquiries, applications, interns, employees, and HR documents.
  6. Visualizes stat cards with attention triggers for actionable unread inquiries/applications.
  7. Clicking any metric card navigates directly to the corresponding filtered tab.

### MOD-02: Inquiries & Business Leads
- **Frontend Tab:** [`src/components/Admin/tabs/InquiriesTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/InquiriesTab.jsx)
- **Backend Service:** [`backend/src/modules/inquiry/inquiry.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/inquiry/inquiry.service.js)
- **API Helpers:** `getInquiries(params)`, `updateInquiryStatus(id, data)`, `deleteInquiry(id)`, `exportInquiriesCsv(params)`
- **End-to-End Trace:**
  1. Admin searches by prospect name, email, or filters by status (`new`, `in_progress`, `resolved`, `spam`, `archived`).
  2. Clicking view opens detail modal to read prospect requirements and save internal admin notes.
  3. Status changes update database and dispatch audit log `UPDATE_INQUIRY_STATUS`.
  4. "Export CSV" streams formula-neutralized spreadsheet with sanitized prospect data.

### MOD-03: Careers & Lateral Recruitment
- **Frontend Tab:** [`src/components/Admin/tabs/CareersTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/CareersTab.jsx)
- **Backend Service:** [`backend/src/modules/career/career.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/career/career.service.js)
- **API Helpers:** `getAdminJobs()`, `createJob(data)`, `updateJob(id, data)`, `deleteJob(id)`, `getCareerApplications(params)`, `updateApplicationStatus(id, data)`, `downloadApplicationResume(id)`, `exportCareerApplicationsCsv(params)`
- **End-to-End Trace:**
  1. **Job Vacancies Subtab:** Post new engineering jobs, edit requirements, toggle active/closed, delete opening.
  2. **Applications Subtab:** Review candidate resumes, download stored PDFs securely via authenticated stream, update stages (`applied`, `under_review`, `shortlisted`, `interview_scheduled`, `hired`, `rejected`).
  3. Safe CSV export streams candidate applications pipeline.

### MOD-04: Internship & Talent Incubation
- **Frontend Tab:** [`src/components/Admin/tabs/InternshipsTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/InternshipsTab.jsx)
- **Backend Service:** [`backend/src/modules/internship/internship.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/internship/internship.service.js)
- **API Helpers:** `getInterns(params)`, `createIntern(data)`, `updateIntern(id, data)`, `updateInternStatus(id, data)`, `updateInternOnboarding(id, data)`, `deleteIntern(id)`, `convertInternshipApplication(id, data)`, `getInternshipPrograms(params)`, `createInternshipProgram(data)`, `updateInternshipProgram(id, data)`, `deleteInternshipProgram(id)`, `exportInternshipsCsv(params)`, `exportInternsCsv(params)`
- **End-to-End Trace:**
  1. **Onboarded Interns Directory:** Full roster tracking with collision-safe IDs (`ASH-INT-YYYY-XXX`), mentor assignment, start/end dates, monthly stipend, and compliance document status.
  2. **Direct Onboarding:** "Add New Intern" button opens viewport-constrained modal; validates and provisions intern.
  3. **Candidate Applications:** View student submissions; one-click "Convert to Intern" pre-fills enrollment form and promotes candidate atomically.
  4. **Compliance Checklist:** Live toggle verification for ID Proof, College NOC, Agreement, and NDA.
  5. **Tracks / Programs:** Configure technical tracks published to public website.

### MOD-05: Employee Management
- **Frontend Tab:** [`src/components/Admin/tabs/EmployeesTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/EmployeesTab.jsx)
- **Backend Service:** [`backend/src/modules/employee/employee.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/employee/employee.service.js)
- **API Helpers:** `getEmployees(params)`, `createEmployee(data)`, `updateEmployee(id, data)`, `updateEmployeeStatus(id, isActive)`, `deleteEmployee(id)`
- **End-to-End Trace:**
  1. View corporate staff records with department filtering, search, and pagination.
  2. "Add Employee" opens responsive modal form; enforces required fields and unique active email.
  3. Edit designation, department, work location, social channels, and bio.
  4. Toggle active status; soft-delete preserves linked historical documents and records.
  5. Public website team section consumes sanitized projection (`GET /api/v1/employees/public`).

### MOD-06: HR Document Compliance
- **Frontend Tab:** [`src/components/Admin/tabs/DocumentsTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/DocumentsTab.jsx)
- **Backend Service:** [`backend/src/modules/hr-document/hrDocument.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/hr-document/hrDocument.service.js)
- **API Helpers:** `getHrDocuments(params)`, `uploadHrDocument(formData)`, `updateHrDocumentStatus(id, status)`, `downloadHrDocument(id)`, `deleteHrDocument(id)`
- **End-to-End Trace:**
  1. Upload confidential documents (Offer Letters, ID Proofs, Degrees, Relieving Letters) tied to an employee.
  2. Enforces 10MB size limit and safe MIME type validation in memory before writing to disk.
  3. Download streams file with authenticated Bearer token headers; direct public static browsing is explicitly blocked with 404.
  4. Update verification status (`pending`, `verified`, `rejected`, `archived`).

### MOD-07: Website Content (CMS)
- **Frontend Tab:** [`src/components/Admin/tabs/ContentTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/ContentTab.jsx)
- **Backend Service:** [`backend/src/modules/content/content.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/content/content.service.js)
- **API Helpers:** `getContentBlocks(params)`, `createContentBlock(data)`, `updateContentBlock(id, data)`, `publishContentBlock(id)`, `unpublishContentBlock(id)`, `deleteContentBlock(id)`
- **End-to-End Trace:**
  1. Manage editable copy for website sections (`hero`, `about`, `solutions`, `services`, `contact`).
  2. Supports draft vs. published state machine.
  3. Public website queries only published blocks via `/api/v1/content/public/key/:key`.

### MOD-08: Media Asset Library
- **Frontend Tab:** [`src/components/Admin/tabs/MediaTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/MediaTab.jsx)
- **Backend Service:** [`backend/src/modules/media/media.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/media/media.service.js)
- **API Helpers:** `getMediaList(params)`, `uploadMediaFile(formData)`, `deleteMediaFile(id)`
- **End-to-End Trace:**
  1. Upload image and branding assets.
  2. Public assets served via `/uploads/media/` with security headers (`X-Content-Type-Options: nosniff`, SVG sandbox CSP).
  3. One-click copy URL to clipboard for use in website content blocks.
  4. Delete removes file from disk and deletes database record.

### MOD-09: Security Audit Logs
- **Frontend Tab:** [`src/components/Admin/tabs/AuditTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/AuditTab.jsx)
- **Backend Service:** [`backend/src/modules/audit/audit.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/audit/audit.service.js)
- **API Helpers:** `getAuditLogs(params)`, `exportAuditLogsCsv(params)`
- **End-to-End Trace:**
  1. Displays timeline of administrative events with actor name, IP address, target entity, timestamp, and metadata.
  2. Search by keyword or filter by action type (`LOGIN`, `CREATE_ADMIN`, `UPDATE_EMPLOYEE`, `CONVERT_INTERN`, etc.).
  3. "Export CSV" streams formula-neutralized audit trail for external compliance review.

### MOD-10: System Settings & Config
- **Frontend Tab:** [`src/components/Admin/tabs/SettingsTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/SettingsTab.jsx)
- **Backend Service:** [`backend/src/modules/settings/settings.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/settings/settings.service.js)
- **API Helpers:** `getSettings()`, `updateSettings(data)`, `resetSettings()`
- **End-to-End Trace:**
  1. Edit corporate metadata (company address, phone, GSTIN, social media URLs).
  2. Toggle feature flags (careers recruitment open, internship admissions active, maintenance mode).
  3. Reset to verified system defaults with confirmation dialog.
  4. Public website accesses sanitized configuration via `GET /api/v1/settings/public`.

### MOD-11: Admin Accounts & Access Control
- **Frontend Tab:** [`src/components/Admin/tabs/AdminsTab.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/Admin/tabs/AdminsTab.jsx)
- **Backend Service:** [`backend/src/modules/admin/admin.service.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/admin/admin.service.js)
- **API Helpers:** `getAdmins(params)`, `createAdminAccount(data)`, `updateAdminStatus(id, isActive)`, `updateAdminPermissions(id, perms)`, `deleteAdminAccount(id)`
- **End-to-End Trace:**
  1. Superadmin-exclusive view; operational admins are strictly blocked on both frontend and backend.
  2. Provision operational admin accounts with custom granular permissions (`dashboard`, `inquiries`, `careers`, `employees`, `content`, `media`, `audit`, `settings`).
  3. Edit permissions checklist; toggle active/inactive status.
  4. Built-in concurrency lock prevents removing the last Superadmin or self-deactivation.
