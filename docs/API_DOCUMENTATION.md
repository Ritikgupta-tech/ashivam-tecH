# Ashivam Technologies — REST API Specification (v1)

**Document Version:** 3.0.0 (Master Engineering Release)  
**Base URL:** `https://ashivam-tech.onrender.com/api/v1` (Production) / `http://localhost:5000/api/v1` (Development)  
**Standard Prefix:** `/api/v1`  
**Classification:** Confidential — Internal Company & DevOps Use Only  
**Company:** Ashivam Technologies  
**Date:** October 30, 2026  

---

## 1. Global API Standards

### 1.1 Response Envelopes
All API responses return consistent JSON envelopes with an echoing `requestId` for distributed tracing:

#### Success Envelope (HTTP 200, 201)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "requestId": "349f450e-59f1-4cff-a895-1e189e4f96d9"
}
```

#### Error Envelope (HTTP 400, 401, 403, 404, 409, 429, 500)
```json
{
  "success": false,
  "error": "Descriptive safe error message",
  "errors": {},
  "requestId": "349f450e-59f1-4cff-a895-1e189e4f96d9"
}
```

### 1.2 Authentication Headers
Protected endpoints require a standard Bearer token in the `Authorization` request header:
```http
Authorization: Bearer <jwt-token>
```

---

## 2. API Endpoint Reference

### 2.1 System & Diagnostic Endpoints

#### `GET /api/v1/health`
* **Access:** Public
* **Description:** Diagnostic health check inspecting uptime and MongoDB connectivity.
* **Response (200 OK):**
```json
{
  "success": true,
  "database": "connected",
  "uptimeSeconds": 1420,
  "requestId": "..."
}
```

#### `GET /api/v1/health/liveness`
* **Access:** Public
* **Description:** Low-overhead container liveness check. Always returns HTTP 200 without DB query.
* **Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-10-30T17:45:00.000Z"
}
```

---

### 2.2 Authentication & Administrator Accounts

#### `POST /api/v1/auth/login`
* **Access:** Public (Rate limit: 5/15m)
* **Payload:** `{ "username": "admin", "password": "..." }`
* **Response (200 OK):** Returns `{ token, user: { id, username, name, role, permissions } }`

#### `GET /api/v1/auth/me`
* **Access:** Protected (Authenticated Admin)
* **Response (200 OK):** Returns authenticated administrator profile and permissions.

#### `POST /api/v1/auth/change-password`
* **Access:** Protected (Authenticated Admin)
* **Payload:** `{ "currentPassword": "...", "newPassword": "...", "confirmPassword": "..." }`
* **Response (200 OK):** Rotates password, updates `passwordChangedAt`, invalidates older tokens, and issues fresh token.

#### `GET /api/v1/admin`
* **Access:** Superadmin Only
* **Query Params:** `page`, `limit`
* **Response (200 OK):** Paginated directory of administrators.

#### `POST /api/v1/admin`
* **Access:** Superadmin Only
* **Payload:** `{ "username": "...", "name": "...", "email": "...", "password": "...", "role": "Admin", "permissions": ["inquiries", "careers"] }`

#### `PATCH /api/v1/admin/:id`
* **Access:** Superadmin Only (Protected by `withAdminMutationLock`)
* **Payload:** Partial updates to name, email, password, role, permissions, isActive.

---

### 2.3 Client Inquiries

#### `POST /api/v1/inquiries`
* **Access:** Public (Rate limit: 10/15m)
* **Payload:**
```json
{
  "name": "Jane Doe",
  "email": "jane@enterprise.com",
  "phone": "+91 98765 43210",
  "company": "Acme Corp",
  "projectType": "Web Development",
  "budget": "₹5,00,000 - ₹10,00,000",
  "message": "We would like to discuss building an enterprise platform.",
  "website": "" 
}
```
*Note: `website` is the silent honeypot trap field.*
* **Response (201 Created):** `{ "success": true, "message": "Inquiry received" }`

#### `GET /api/v1/inquiries`
* **Access:** Protected (`inquiries` permission)
* **Query Params:** `page`, `limit`, `status`, `search`, `sortBy`, `order`

#### `PATCH /api/v1/inquiries/:id/status`
* **Access:** Protected (`inquiries` permission)
* **Payload:** `{ "status": "in-review" }` (Valid: `new`, `in-review`, `contacted`, `archived`)

#### `GET /api/v1/inquiries/export`
* **Access:** Protected (`inquiries` permission)
* **Response:** Direct CSV download stream with formula injection sanitization.

---

### 2.4 Careers & Recruitment Pipeline

#### `GET /api/v1/career/jobs`
* **Access:** Public
* **Response (200 OK):** List of published active job openings.

#### `GET /api/v1/career/jobs/:slug`
* **Access:** Public
* **Response (200 OK):** Job specifications for specific position slug.

#### `POST /api/v1/career/apply`
* **Access:** Public (Multipart Form, Rate limit: 10/15m)
* **Fields:** `jobId`, `firstName`, `lastName`, `email`, `phone`, `currentLocation`, `experience`
* **File:** `resume` (PDF or Word DOC/DOCX, max 5MB)
* **Response (201 Created):** Application reference and confirmation status.

#### `POST /api/v1/career/admin/jobs`
* **Access:** Protected (`careers` permission)
* **Payload:** `{ "title": "Senior Cloud Engineer", "department": "DevOps", "description": "...", "requirements": "..." }`

#### `GET /api/v1/career/admin/applications/:id/resume`
* **Access:** Protected (`careers` permission)
* **Response:** Authenticated binary streaming of candidate resume from S3 or local disk vault with safe filename header.

#### `GET /api/v1/career/admin/applications/export`
* **Access:** Protected (`careers` permission)
* **Response:** Sanitized CSV download stream of candidate applications.

---

### 2.5 Student Internships & Program Tracks

#### `POST /api/v1/internships`
* **Access:** Public (Rate limit: 10/15m)
* **Payload:** `{ "name": "...", "email": "...", "phone": "...", "college": "...", "course": "...", "domain": "Full Stack Web" }`

#### `POST /api/v1/internships/applications/:id/convert`
* **Access:** Protected (`careers` permission, concurrency-safe)
* **Description:** Transitions candidate application into an active enrolled intern, generating sequential ID `ASH-INT-YYYY-XXX`.

#### `POST /api/v1/internships/interns`
* **Access:** Protected (`careers` permission, concurrency-safe)
* **Description:** Directly provisions an incoming intern with sequential ID and mentor assignment.

#### `PATCH /api/v1/internships/interns/:id/onboarding`
* **Access:** Protected (`careers` permission)
* **Payload:** `{ "idProofVerified": true, "collegeNocVerified": true, "agreementSigned": true, "ndaSigned": true }`

#### `GET /api/v1/internships/interns/export`
* **Access:** Protected (`careers` permission)
* **Response:** Direct CSV download stream of enrolled intern directory.

---

### 2.6 Corporate Employees & HR Documents

#### `GET /api/v1/employees`
* **Access:** Protected (`employees` permission)
* **Query Params:** `page`, `limit`, `search`, `department`, `status`

#### `POST /api/v1/employees`
* **Access:** Protected (`employees` permission)
* **Payload:** Employee profile data; enforces unique active email index.

#### `GET /api/v1/employees/export`
* **Access:** Protected (`employees` permission)
* **Response:** Sanitized CSV export stream of employee directory.

#### `GET /api/v1/hr-documents`
* **Access:** Protected (`documents` permission)
* **Query Params:** `category`, `search`, `page`, `limit`

#### `POST /api/v1/hr-documents`
* **Access:** Protected (`documents` permission)
* **Payload:** Multipart form with document file and restricted role metadata.

#### `GET /api/v1/hr-documents/:id/download`
* **Access:** Protected (`documents` permission)
* **Response:** Authenticated streaming download of HR document.

#### `GET /api/v1/hr-documents/export`
* **Access:** Protected (`documents` permission)
* **Response:** Sanitized CSV export stream of HR document audit metadata.

---

### 2.7 CMS, Media, Audit & Settings

#### `GET /api/v1/content/public/:key`
* **Access:** Public
* **Response (200 OK):** Sanitized published website copy block.

#### `POST /api/v1/media`
* **Access:** Protected (`media` permission)
* **Payload:** Multipart upload of media file; deep SVG sanitization applied.

#### `GET /api/v1/audit`
* **Access:** Protected (`audit` permission)
* **Query Params:** `search`, `action`, `entity`, `from`, `to`, `page`, `limit`

#### `GET /api/v1/audit/export`
* **Access:** Protected (`audit` permission)
* **Response:** Sanitized CSV stream of administrative activity records.

#### `GET / PUT /api/v1/settings`
* **Access:** Protected (`settings` permission)
* **Payload:** Company profile info, social links, feature flags, and maintenance mode.

#### `GET /api/v1/dashboard/overview`
* **Access:** Protected (`overview` permission)
* **Query Params:** `range` (`7d`, `30d`, `90d`, `all`)
* **Response (200 OK):** Real aggregated metric counts across inquiries, careers, internships, and employees.
