# Ashivam Technologies — Granular Role-Based Access Control (RBAC) Matrix

> **Document Version:** 1.1.0  
> **Classification:** Security Governance Standard  
> **Status:** Production Implemented (Current Monolith) & Target Architecture (Future Services)  
> **Auditors:** Application Security Engineer, Senior Backend Lead  

---

## 1. Executive Summary

This Access Control Matrix defines the exact authorization requirements across all public, protected, and administrative API endpoints in the Ashivam Technologies platform.

In conformance with the Principal of Least Privilege (PoLP), this document distinguishes between:
1. **Current Production Implementation:** The live Express backend utilizing `requireRole` and granular `requirePermission` middlewares.
2. **Target Multi-Application Ecosystem:** The target 10-role RBAC specification for the extracted future standalone applications (Corporate Website, Internship Management, HRMS).

---

## 2. Current Production Implementation (Live Codebase)

### 2.1 Implemented Roles & Permission Schema
In the current production platform (`backend/src/models/admin.model.js` and `backend/src/middlewares/authorization.middleware.js`):

- **`Superadmin`**: Complete root access across all platform modules, accounts, system configurations, and data exports. Automatically bypasses granular permission checks.
- **`Admin`**: Administrative user restricted to explicitly assigned granular permissions from the allowlist:
  - `"inquiries"`: Viewing, updating status, and exporting customer leads.
  - `"careers"`: Managing job listings, viewing candidates, and downloading resumes.
  - `"employees"`: Managing employee master records and KYC document vaults.
  - `"content"`: Editing CMS content blocks.
  - `"media"`: Uploading and managing public website assets.
  - `"settings"`: Managing system-level configuration parameters.

### 2.2 Live Production Endpoint Access Matrix

| API Route | HTTP Method | Public / Unauth | Admin (with Permission) | Superadmin | Enforcing Middleware |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Corporate Website & Inquiries** | | | | | |
| `/api/v1/health` | `GET` | **ALLOW** | **ALLOW** | **ALLOW** | Public probe |
| `/api/v1/inquiries` | `POST` | **ALLOW** | **ALLOW** | **ALLOW** | `publicFormLimiter` |
| `/api/v1/inquiries` | `GET` | 401 | **ALLOW** (`inquiries`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('inquiries')` |
| `/api/v1/inquiries/export` | `GET` | 401 | **ALLOW** (`inquiries`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('inquiries')` |
| `/api/v1/inquiries/:id` | `GET` / `PATCH` | 401 | **ALLOW** (`inquiries`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('inquiries')` |
| `/api/v1/inquiries/:id` | `DELETE` | 401 | 403 | **ALLOW** | `authenticate`, `requireRole('Superadmin')` |
| **Careers & Applicant Intake** | | | | | |
| `/api/v1/career/jobs` | `GET` | **ALLOW** | **ALLOW** | **ALLOW** | Public catalog |
| `/api/v1/career/jobs/:id` | `GET` | **ALLOW** | **ALLOW** | **ALLOW** | Public catalog |
| `/api/v1/career/jobs/:jobId/apply`| `POST` | **ALLOW** | **ALLOW** | **ALLOW** | `publicFormLimiter`, magic-byte upload |
| `/api/v1/career/admin/jobs` | `GET` / `POST` | 401 | **ALLOW** (`careers`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('careers')` |
| `/api/v1/career/admin/jobs/:id` | `PATCH` | 401 | **ALLOW** (`careers`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('careers')` |
| `/api/v1/career/admin/jobs/:id` | `DELETE` | 401 | 403 | **ALLOW** | `authenticate`, `requireRole('Superadmin')` |
| `/api/v1/career/admin/applications` | `GET` | 401 | **ALLOW** (`careers`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('careers')` |
| `/api/v1/career/admin/applications/export`| `GET` | 401 | **ALLOW** (`careers`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('careers')` |
| `/api/v1/career/admin/applications/:id/resume`| `GET` | 401 | **ALLOW** (`careers`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('careers')` |
| **Internship Lifecycle** | | | | | |
| `/api/v1/internships` | `POST` | **ALLOW** | **ALLOW** | **ALLOW** | `publicFormLimiter` |
| `/api/v1/internships/programs/public`| `GET` | **ALLOW** | **ALLOW** | **ALLOW** | Public programs |
| `/api/v1/internships` | `GET` | 401 | **ALLOW** (`careers`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('careers')` |
| `/api/v1/internships/interns` | `GET` / `POST`| 401 | **ALLOW** (`careers`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('careers')` |
| `/api/v1/internships/interns/:id` | `DELETE` | 401 | 403 | **ALLOW** | `authenticate`, `requireRole('Superadmin')` |
| **HRMS & Employee Records** | | | | | |
| `/api/v1/employees/public` | `GET` | **ALLOW** | **ALLOW** | **ALLOW** | Sanitized public team directory |
| `/api/v1/employees` | `GET` / `POST` | 401 | **ALLOW** (`employees`)| **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('employees')` |
| `/api/v1/employees/:employeeId` | `PATCH` | 401 | **ALLOW** (`employees`)| **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('employees')` |
| `/api/v1/employees/:employeeId` | `DELETE` | 401 | 403 | **ALLOW** | `authenticate`, `requireRole('Superadmin')` |
| `/api/v1/employees/:employeeId/restore`| `PATCH` | 401 | 403 | **ALLOW** | `authenticate`, `requireRole('Superadmin')` |
| **Confidential KYC Vault** | | | | | |
| `/api/v1/employee-documents/:employeeId` | `GET` / `POST` | 401 | **ALLOW** (`employees`)| **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('employees')` |
| `/api/v1/employee-documents/file/:documentId`| `GET` | 401 | **ALLOW** (`employees`)| **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')`, `requirePermission('employees')` |
| `/api/v1/employee-documents/document/:id`| `DELETE` | 401 | 403 | **ALLOW** | `authenticate`, `requireRole('Superadmin')` |
| **System Security & Administration** | | | | | |
| `/api/v1/admin/admins` | `GET` / `POST`| 401 | 403 | **ALLOW** | `authenticate`, `requireRole('Superadmin')` |
| `/api/v1/audit` | `GET` | 401 | **ALLOW** (`settings`) | **ALLOW** | `authenticate`, `requireRole('Superadmin', 'Admin')` |

### 2.3 Actual Enforcement Implementation in Code
```javascript
// backend/src/middlewares/authorization.middleware.js
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (req.user.role === "Superadmin") {
      return next(); // Superadmin has unrestricted platform privileges
    }
    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
};
```

---

## 3. Target Multi-Application RBAC Specification (Future Extraction)

When the Internship Management and HR Management applications are fully extracted into independent repositories ([ADR-001](../architecture/decisions/ADR-001-APPLICATION-SEPARATION.md)), the user identity model will transition to a 10-role enterprise hierarchy:

| Target Role | Application Scope | Responsibilities |
| :--- | :--- | :--- |
| `ROLE_ANON` | Corporate Website | Public visitor browsing services and open roles |
| `ROLE_CANDIDATE` | Corporate / Internship | Applying for jobs or technical cohorts |
| `ROLE_INTERN` | Internship System | Enrolled student submitting weekly milestones |
| `ROLE_MENTOR` | Internship System | Reviewing code submissions and scoring rubrics |
| `ROLE_TRACK_LEAD` | Internship System | Managing cohort curriculum and certificate approval |
| `ROLE_EMPLOYEE` | HRMS | Full-time staff accessing self-service & documents |
| `ROLE_DEPT_HEAD` | HRMS | Approving team leaves and project allocations |
| `ROLE_HR_MANAGER` | HRMS | Managing KYC document vault and compliance policies |
| `ROLE_FINANCE` | HRMS | Payroll, tax declarations, and expense approvals |
| `ROLE_SUPERADMIN` | Platform Wide | System configuration and security audit oversight |
