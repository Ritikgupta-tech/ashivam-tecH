# Ashivam Technologies Admin Panel — API Contracts Specification

**Document Version:** 1.0.0  
**Status:** Approved & Canonical  
**Security Baseline:** OWASP REST Security Cheat Sheet, Strict Bearer JWT Authorization, Defense-in-depth Role/Permission Gates

---

## 1. Global API Standards

### 1.1 Base URL & Pathing
- **Local Dev:** `http://localhost:5173/api/v1` (Proxied transparently to `http://localhost:5000/api/v1`)
- **Direct Backend:** `http://localhost:5000/api/v1`
- **Production Base:** `https://ashivam-tech.onrender.com/api/v1`

### 1.2 Common HTTP Request Headers
| Header | Type | Description | Required |
|---|---|---|---|
| `Content-Type` | `application/json` | Body encoding (multipart/form-data for uploads) | For POST/PATCH |
| `Authorization` | `Bearer <jwt>` | Cryptographic access token | All protected endpoints |
| `Accept` | `application/json` or `text/csv` | Requested response media type | Optional |

### 1.3 Uniform JSON Response Envelopes

#### Success Envelope (200 OK, 201 Created)
```json
{
  "success": true,
  "message": "Resource retrieved or mutated successfully",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Envelope (400, 401, 403, 404, 409, 422, 500)
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "errors": {
    "field": "Specific validation failure message"
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 2. Authentication & Account Management (MOD-01)

### 2.1 POST `/api/v1/auth/login`
- **Auth:** Public (Strict IP rate limit: 10 attempts / 15m)
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "StrongPassword123!"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "6720f...",
        "username": "admin",
        "name": "Platform Administrator",
        "email": "admin@ashivam.com",
        "role": "Superadmin",
        "permissions": ["all"],
        "lastLoginAt": "2026-10-29T10:00:00.000Z"
      }
    }
  }
  ```
- **Error Codes:** `400 Bad Request` (missing credentials), `401 Unauthorized` (invalid user/pass with uniform timing delay), `429 Too Many Requests`.

### 2.2 GET `/api/v1/auth/me`
- **Auth:** Authenticated Admin
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "admin": {
        "id": "6720f...",
        "username": "admin",
        "name": "Platform Administrator",
        "email": "admin@ashivam.com",
        "role": "Superadmin",
        "permissions": ["all"],
        "isActive": true,
        "lastLoginAt": "2026-10-29T10:00:00.000Z"
      }
    }
  }
  ```

### 2.3 POST `/api/v1/auth/change-password`
- **Auth:** Authenticated Admin (Self-service)
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewStrongPassword456!"
  }
  ```
- **Validation:** `newPassword` length >= 8 characters. Must not match `currentPassword`.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Password updated successfully. Please log in again.",
    "data": {
      "passwordChangedAt": "2026-10-29T10:30:00.000Z"
    }
  }
  ```
- **Error Codes:** `400 Bad Request`, `401 Unauthorized` (incorrect current password).

---

## 3. Executive Dashboard Analytics (MOD-02)

### 3.1 GET `/api/v1/analytics/dashboard`
- **Auth:** Authenticated Admin (Role: Superadmin or Admin)
- **Query Params:**
  - `range`: `"7d"` | `"30d"` | `"90d"` | `"1y"` (default `"30d"`)
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "metrics": {
        "totalEmployees": 48,
        "activeEmployees": 46,
        "totalJobApplications": 124,
        "pendingJobApplications": 18,
        "totalInternApplications": 89,
        "activeInterns": 14,
        "openInquiries": 7,
        "totalMediaFiles": 32,
        "totalHrDocuments": 58,
        "recentAuditEvents": 150
      },
      "trends": {
        "jobApplications": [{ "date": "2026-10-22", "count": 4 }],
        "internshipApplications": [{ "date": "2026-10-22", "count": 6 }],
        "contactInquiries": [{ "date": "2026-10-22", "count": 2 }]
      },
      "distributions": {
        "internDomains": [{ "domain": "Web Development", "count": 6 }],
        "employeeDepartments": [{ "department": "Engineering", "count": 22 }]
      }
    }
  }
  ```

---

## 4. Inquiries & Leads Management (MOD-03)

### 4.1 GET `/api/v1/contacts`
- **Auth:** Admin (`contacts` permission)
- **Query Params:** `page`, `limit`, `status` (`new`|`in_progress`|`resolved`|`archived`), `search`, `service`
- **Response 200 OK:** List of inquiries with standard pagination.

### 4.2 PATCH `/api/v1/contacts/:id/status`
- **Auth:** Admin (`contacts` permission)
- **Request Body:** `{ "status": "in_progress" }`
- **Response 200 OK:** Updated inquiry object.

### 4.3 PATCH `/api/v1/contacts/:id/notes`
- **Auth:** Admin (`contacts` permission)
- **Request Body:** `{ "notes": "Contacted client via telephone; quote requested." }`
- **Response 200 OK:** Updated inquiry object with updated admin notes.

### 4.4 GET `/api/v1/contacts/export`
- **Auth:** Admin (`contacts` permission)
- **Response 200 OK:** `Content-Type: text/csv`, attachment header, formula-sanitized CSV rows.

---

## 5. Careers & Job Applications (MOD-04)

### 5.1 GET `/api/v1/careers/jobs` & POST `/api/v1/careers/jobs`
- **Auth (GET):** Public or Admin.
- **Auth (POST):** Superadmin or Admin (`careers` permission).
- **POST Body:**
  ```json
  {
    "title": "Senior Cloud Architect",
    "department": "Infrastructure",
    "location": "Noida, India",
    "type": "Full-time",
    "experience": "5-8 Years",
    "salaryRange": "Competitive",
    "description": "Full JD...",
    "requirements": ["AWS", "Docker", "Kubernetes"],
    "isActive": true
  }
  ```

### 5.2 GET `/api/v1/careers/applications`
- **Auth:** Admin (`careers` permission)
- **Query Params:** `page`, `limit`, `jobId`, `status`, `search`
- **Response 200 OK:** List of candidate applications.

### 5.3 PATCH `/api/v1/careers/applications/:id/status`
- **Auth:** Admin (`careers` permission)
- **Request Body:** `{ "status": "shortlisted", "notes": "Cleared technical screen" }`
- **Response 200 OK:** Updated application object.

### 5.4 GET `/api/v1/careers/applications/export`
- **Auth:** Admin (`careers` permission)
- **Response 200 OK:** `Content-Type: text/csv` formula-sanitized applicant rows.

### 5.5 GET `/api/v1/careers/applications/:id/resume`
- **Auth:** Admin (`careers` permission)
- **Response 200 OK:** Binary PDF/DOC stream with `Content-Disposition: inline` or `attachment`.

---

## 6. Internship Programs & Roster Management (MOD-05)

### 6.1 Programs Management
- **`GET /api/v1/internships/programs`**: List all programs (Admin `careers` permission).
- **`GET /api/v1/internships/programs/public`**: Active programs for public applicant forms.
- **`POST /api/v1/internships/programs`**: Create track (Title, domain enum, duration, slots, syllabus, stipend, mentor).
- **`PATCH /api/v1/internships/programs/:id`**: Update track parameters.
- **`DELETE /api/v1/internships/programs/:id`**: Remove program (Superadmin only).

### 6.2 Candidate Applications
- **`GET /api/v1/internships`**: List applicants (`page`, `limit`, `domain`, `status`, `search`).
- **`GET /api/v1/internships/export`**: Export candidate applications as formula-safe CSV.
- **`POST /api/v1/internships/applications/:id/convert`**: Convert candidate to onboarded intern.
  - **Body:** `{ "startDate": "2026-11-01", "endDate": "2027-02-01", "mentorName": "Rahul Verma", "stipend": 15000 }`
  - **Response 201 Created:** Returns `{ candidate, intern }` with generated `ASH-INT-YYYY-XXX` identifier.

### 6.3 Onboarded Interns Directory & Lifecycle
- **`GET /api/v1/internships/interns`**: Filterable, searchable, paginated directory of registered interns.
- **`POST /api/v1/internships/interns`**: Direct manual intern registration without prior public form.
- **`GET /api/v1/internships/interns/:id`**: Complete profile, performance notes, compliance checklist.
- **`PATCH /api/v1/internships/interns/:id`**: Update core fields, mentor, stipend, end date.
- **`PATCH /api/v1/internships/interns/:id/status`**: Transition state (`active`, `extended`, `completed`, `terminated`).
- **`PATCH /api/v1/internships/interns/:id/onboarding`**: Toggle compliance items (`offerLetterIssued`, `idCardIssued`, `ndaSigned`, `repoAccessGranted`).
- **`DELETE /api/v1/internships/interns/:id`**: Soft-delete intern record (Superadmin only).
- **`GET /api/v1/internships/interns/export`**: Export onboarded interns directory as formula-safe CSV.

---

## 7. Employee Management (MOD-06)

### 7.1 GET `/api/v1/employees`
- **Auth:** Admin (`employees` permission)
- **Query Params:** `page`, `limit`, `department`, `designation`, `status` (`all`|`active`|`inactive`), `search`
- **Response 200 OK:** Paginated roster.

### 7.2 GET `/api/v1/employees/export`
- **Auth:** Admin (`employees` permission)
- **Query Params:** `department`, `status`, `search`
- **Response 200 OK:** `Content-Type: text/csv` containing employee ID, name, email, department, designation, joining date, status.

### 7.3 POST `/api/v1/employees`
- **Auth:** Admin (`employees` permission)
- **Request Body:**
  ```json
  {
    "employeeId": "ASH-2026-042",
    "name": "Priya Sharma",
    "email": "priya.s@ashivam.com",
    "phone": "+919876543210",
    "department": "Engineering",
    "designation": "Full Stack Developer",
    "joiningDate": "2026-03-15",
    "isActive": true
  }
  ```
- **Response 201 Created.**

### 7.4 PATCH `/api/v1/employees/:employeeId` & DELETE `/api/v1/employees/:employeeId`
- **PATCH:** Mutate profile attributes.
- **DELETE (Superadmin only):** Soft-delete employee, record `deletedAt` and audit trail.

---

## 8. HR Document Management (MOD-07)

### 8.1 GET `/api/v1/hr-documents` & GET `/api/v1/hr-documents/export`
- **List:** Search by `employeeId`, `documentType`, `status`.
- **Export:** Formula-safe CSV of document audit log and verification records.

### 8.2 POST `/api/v1/hr-documents`
- **Auth:** Admin (`documents` permission)
- **Form Data:** `file` (PDF/JPEG/PNG <= 10MB), `employeeId`, `documentType`, `title`, `notes`.
- **Response 201 Created.**

### 8.3 PATCH `/api/v1/hr-documents/:id/status`
- **Auth:** Admin (`documents` permission)
- **Request Body:** `{ "status": "verified" | "rejected", "rejectionReason": "..." }`
- **Response 200 OK.**

---

## 9. Media & Content Management (MOD-08, MOD-09)

### 9.1 POST `/api/v1/media/upload`
- **Auth:** Admin (`media` permission)
- **Content:** `multipart/form-data` with safe MIME whitelist (`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`).
- **Response 201 Created:** Media URL, dimensions, size, sanitized filename.

### 9.2 GET & PATCH `/api/v1/content/:section`
- **Auth:** GET public; PATCH Admin (`content` permission).
- **Body:** Key-value configuration dictionary for hero headers, announcements, company contacts, stats.

---

## 10. Admin Accounts & RBAC (MOD-10)

### 10.1 GET `/api/v1/admins` & POST `/api/v1/admins`
- **Auth:** Superadmin Only
- **POST Body:**
  ```json
  {
    "username": "lead_recruiter",
    "name": "Neha Gupta",
    "email": "neha.g@ashivam.com",
    "password": "TemporaryPassword123!",
    "role": "Admin",
    "permissions": ["careers"]
  }
  ```
- **Response 201 Created.**

### 10.2 PATCH `/api/v1/admins/:id/toggle-status` & DELETE `/api/v1/admins/:id`
- **Auth:** Superadmin Only
- **Business Rule:** Invariant lock preventing the last active Superadmin from deactivating or deleting their own account.

---

## 11. Audit Logging (MOD-11)

### 11.1 GET `/api/v1/audit-logs`
- **Auth:** Superadmin Only
- **Query Params:** `page`, `limit`, `action`, `adminId`, `startDate`, `endDate`, `search`
- **Response 200 OK:** Paginated immutable audit trail.

### 11.2 GET `/api/v1/audit-logs/export`
- **Auth:** Superadmin Only
- **Response 200 OK:** Formula-sanitized CSV export of historical security and administrative events.
