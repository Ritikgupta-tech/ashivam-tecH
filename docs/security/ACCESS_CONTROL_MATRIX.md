# Ashivam Technologies — Granular Role-Based Access Control (RBAC) Matrix

> **Document Version:** 1.0.0  
> **Classification:** Security Governance Standard  
> **Status:** Production Enforced  
> **Target Audience:** Backend Engineers, QA Engineers, Security Auditors  

---

## 1. Executive Summary

This Access Control Matrix defines the exact permissions and authorization requirements across all public, protected, and administrative API endpoints in the Ashivam Technologies ecosystem. Access is governed by the Principle of Least Privilege (PoLP).

---

## 2. Defined System Roles

| Role Identifier | Description & Responsibility Scope |
| :--- | :--- |
| **`ANON`** | Anonymous public visitor to the corporate website. |
| **`CANDIDATE`**| External applicant applying for careers or internship cohorts. |
| **`INTERN`** | Enrolled student in an active internship track. |
| **`MENTOR`** | Ashivam senior engineer mentoring an intern pod. |
| **`EMPLOYEE`** | Confirmed full-time staff member. |
| **`DEPT_HEAD`**| Lead managing a specific engineering or operational department. |
| **`HR_MANAGER`**| People Operations manager administering staff records, KYC vault, and policies. |
| **`FINANCE`** | Payroll and compensation administrator. |
| **`ADMIN`** | System operations administrator managing site content and lead queues. |
| **`SUPERADMIN`**| Highest authority; manages credentials, system configuration, and audit logs. |

---

## 3. Granular API Endpoint Access Matrix

**Legend:**
- `ALLOW`: Full operational access.
- `OWN`: Access restricted exclusively to records owned by the authenticated user.
- `DEPT`: Access restricted to records within the user's assigned department.
- `DENY`: Explicitly forbidden (HTTP 401 or 403 returned).

| API Route | HTTP Method | ANON | CANDIDATE | INTERN | MENTOR | EMPLOYEE | DEPT_HEAD | HR_MANAGER | ADMIN | SUPERADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Corporate Website & Inquiries** | | | | | | | | | | |
| `/api/v1/inquiries` | `POST` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/api/v1/inquiries` | `GET` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW | ALLOW |
| `/api/v1/inquiries/:id` | `GET` / `PATCH` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW | ALLOW |
| `/api/v1/inquiries/:id` | `DELETE` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW |
| **Careers & Applicant Intake** | | | | | | | | | | |
| `/api/v1/careers` | `GET` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/api/v1/careers/apply` | `POST` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/api/v1/careers/manage` | `GET` / `POST` | DENY | DENY | DENY | DENY | DENY | DEPT | ALLOW | ALLOW | ALLOW |
| `/api/v1/careers/:id` | `DELETE` | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW | ALLOW | ALLOW |
| **Internship Lifecycle** | | | | | | | | | | |
| `/api/v1/internships/catalog`| `GET` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/api/v1/internships/apply` | `POST` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | ALLOW | ALLOW |
| `/api/v1/interns/me` | `GET` | DENY | DENY | OWN | DENY | DENY | DENY | DENY | ALLOW | ALLOW |
| `/api/v1/interns/submit` | `POST` | DENY | DENY | OWN | DENY | DENY | DENY | DENY | ALLOW | ALLOW |
| `/api/v1/interns/evaluate` | `POST` | DENY | DENY | DENY | OWN POD | DENY | DEPT | ALLOW | ALLOW | ALLOW |
| `/api/v1/certificates/verify/:id`| `GET` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| **HRMS & Employee Records** | | | | | | | | | | |
| `/api/v1/employees/me` | `GET` / `PATCH` | DENY | DENY | DENY | DENY | OWN | OWN | OWN | OWN | OWN |
| `/api/v1/employees` | `GET` | DENY | DENY | DENY | DENY | ROSTER | DEPT | ALLOW | ALLOW | ALLOW |
| `/api/v1/employees` | `POST` | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW | ALLOW | ALLOW |
| `/api/v1/employees/:id` | `PATCH` / `DELETE` | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW | ALLOW | ALLOW |
| **Confidential KYC Vault** | | | | | | | | | | |
| `/api/v1/employee-documents/upload`| `POST`| DENY | DENY | DENY | DENY | OWN | OWN | ALLOW | ALLOW | ALLOW |
| `/api/v1/employee-documents/:id` | `GET` | DENY | DENY | DENY | DENY | OWN | DENY | ALLOW | ALLOW | ALLOW |
| `/api/v1/employee-documents/:id/verify`| `PATCH`| DENY | DENY | DENY | DENY | DENY | DENY | ALLOW | DENY | ALLOW |
| **HR Statutory Policies** | | | | | | | | | | |
| `/api/v1/hr-documents` | `GET` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/api/v1/hr-documents/:id/ack` | `POST` | DENY | DENY | DENY | DENY | OWN | OWN | OWN | OWN | OWN |
| `/api/v1/hr-documents` | `POST` / `DELETE`| DENY | DENY | DENY | DENY | DENY | DENY | ALLOW | ALLOW | ALLOW |
| **System Security & Audit Logs**| | | | | | | | | | |
| `/api/v1/audit-logs` | `GET` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW | ALLOW |
| `/api/v1/audit-logs/export` | `POST` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW |
| `/api/v1/auth/revoke-sessions/:id`| `POST` | DENY | DENY | DENY | DENY | DENY | DENY | DENY | DENY | ALLOW |

---

## 4. Enforcement Implementation Pattern

All endpoints enforce authorization using the standard `authorizeRole` middleware:

```javascript
// Express RBAC Middleware Pattern
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Authentication required. No credentials supplied.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: `Forbidden. Role '${req.user.role}' is unauthorized for this resource.`
      });
    }

    next();
  };
};
```
