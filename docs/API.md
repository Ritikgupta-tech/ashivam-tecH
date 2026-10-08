# REST API SPECIFICATION — ASHIVAM TECHNOLOGIES

**Base URL:** `http://localhost:5000/api/v1` (Development)  
**Production URL:** `https://ashivam-backend.onrender.com/api/v1` *(or configured hosting target)*  
**API Version:** `v1`  
**Authentication Scheme:** HTTP Bearer Token (`Authorization: Bearer <token>`)  
**Standard Response Headers:**
- `Content-Type: application/json`
- `X-Request-Id: <uuid>`

---

## 1. Global Response Standards

### 1.1. Success Envelope
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

### 1.2. Error Envelope
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "errors": {
    "field": "Field specific failure description"
  },
  "requestId": "4d169c8a-77e8-4674-8b6a-939eec4d57c3"
}
```

---

## 2. Public API Endpoints

### 2.1. System Health & Probes
- `GET /`
  - Returns service identification and root metadata.
- `GET /api/v1/health`
  - Returns database connection status and server uptime.
  - Status codes: `200 OK` (DB connected), `503 Service Unavailable` (DB down).
- `GET /api/v1/health/liveness`
  - Lightweight process liveness probe.
  - Status codes: `200 OK`.

---

### 2.2. Contact Inquiries
- `POST /api/v1/inquiries`
  - **Rate Limit:** 10 submissions per 15 minutes per IP.
  - **Request Body:**
    ```json
    {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "subject": "Cloud Architecture Inquiry",
      "message": "We would like to consult on migrating our infrastructure."
    }
    ```
  - **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Inquiry submitted successfully",
      "data": {
        "inquiry": {
          "_id": "6704fa4b...",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "status": "new",
          "createdAt": "2026-10-08T09:00:00.000Z"
        }
      }
    }
    ```

---

### 2.3. Career & Job Openings
- `GET /api/v1/career/jobs`
  - Lists all active published positions.
  - Returns: `200 OK` with array of jobs.
- `GET /api/v1/career/jobs/:id`
  - Retrieves single job opening by MongoDB ObjectId.
  - Returns: `200 OK` or `404 Not Found`.
- `POST /api/v1/career/jobs/:jobId/apply`
  - **Content-Type:** `multipart/form-data`
  - **Rate Limit:** 10 submissions per 15 minutes.
  - **Fields:**
    - `firstName` (String, required)
    - `lastName` (String, required)
    - `email` (String, required)
    - `phone` (String, required)
    - `currentLocation` (String, optional)
    - `experience` (String, optional)
    - `coverLetter` (String, optional)
    - `resume` (File, required, max 5MB, `.pdf`, `.doc`, `.docx`)
  - **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Application submitted successfully",
      "data": {
        "application": {
          "id": "6704fa...",
          "status": "applied"
        }
      }
    }
    ```

---

### 2.4. Student Internship Applications
- `POST /api/v1/internships`
  - **Rate Limit:** 10 submissions per 15 minutes.
  - **Request Body:**
    ```json
    {
      "name": "Alex Smith",
      "email": "alex@university.edu",
      "phone": "+1987654321",
      "college": "Tech Institute",
      "course": "Computer Science",
      "year": "3rd Year",
      "domain": "Full Stack Development",
      "duration": "6 Months",
      "portfolio": "https://github.com/alexsmith",
      "message": "Excited to learn industry-grade software architecture."
    }
    ```
  - **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Internship application submitted successfully",
      "data": { ... }
    }
    ```

---

### 2.5. Public Team & Settings
- `GET /api/v1/employees/public`
  - Returns active team members ordered by display hierarchy.
- `GET /api/v1/settings/public`
  - Returns public branding, company address, SEO metadata, and business hours.
- `GET /api/v1/content/public/key/:key`
  - Retrieves published CMS section block by key.
- `GET /api/v1/content/public/section/:section`
  - Retrieves array of published CMS blocks for a section.

---

## 3. Administrative API Endpoints (Protected)

*All endpoints in this section require header:* `Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 3.1. Authentication
- `POST /api/v1/auth/login`
  - **Rate Limit:** 5 failed attempts per 15 minutes.
  - **Request Body:**
    ```json
    {
      "username": "superadmin",
      "password": "StrongPassword123!"
    }
    ```
  - **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Login successful",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
        "user": {
          "id": "6704f...",
          "username": "superadmin",
          "name": "Super Administrator",
          "role": "Superadmin",
          "permissions": ["dashboard", "inquiries", "careers", ...]
        }
      }
    }
    ```
- `GET /api/v1/auth/me`
  - Returns current logged-in admin session details.

---

### 3.2. Administrative Management (`/api/v1/admin`)
- `GET /api/v1/admin`: List admins (Superadmin only).
- `POST /api/v1/admin`: Create sub-admin (Superadmin only).
- `PATCH /api/v1/admin/:id`: Update sub-admin attributes.
- `DELETE /api/v1/admin/:id`: Remove admin (Superadmin only).

---

### 3.3. Inquiries Management (`/api/v1/inquiries`)
- `GET /api/v1/inquiries?page=1&limit=20&status=new&search=cloud`: List inquiries with filters.
- `GET /api/v1/inquiries/:id`: Retrieve single inquiry details.
- `PATCH /api/v1/inquiries/:id`: Update status (`new`, `in_progress`, `resolved`, `closed`) and internal admin note.
- `DELETE /api/v1/inquiries/:id`: Delete inquiry record (Superadmin only).

---

### 3.4. Career & Internship Management (`/api/v1/career`, `/api/v1/internships`)
- `GET /api/v1/career/admin/jobs`: List all jobs with draft/inactive status.
- `POST /api/v1/career/admin/jobs`: Post a new job requisition.
- `PATCH /api/v1/career/admin/jobs/:id`: Update job description/status.
- `DELETE /api/v1/career/admin/jobs/:id`: Delete job (Superadmin only).
- `GET /api/v1/career/admin/applications`: List candidate applications.
- `PATCH /api/v1/career/admin/applications/:id`: Update candidate review status.
- `GET /api/v1/internships`: List student internship applications.
- `PATCH /api/v1/internships/:id`: Triage internship application status.

---

### 3.5. Employee & Document Management
- `GET /api/v1/employees`: Full employee roster.
- `POST /api/v1/employees`: Create new employee profile.
- `PATCH /api/v1/employees/:employeeId`: Update employee record.
- `DELETE /api/v1/employees/:employeeId`: Remove employee (Superadmin only).
- `POST /api/v1/employee-documents/:employeeId`: Upload employee contract/document (`multipart/form-data`).
- `GET /api/v1/employee-documents/file/:documentId`: Stream and download employee document.
- `POST /api/v1/hr-documents`: Upload verified compliance document (Aadhaar, PAN, NDA).
- `GET /api/v1/hr-documents/:id/download`: Secure download of HR document.
- `DELETE /api/v1/hr-documents/:id`: Purge HR document (Superadmin only).

---

### 3.6. Media Assets (`/api/v1/media`)
- `POST /api/v1/media`: Upload media asset (`multipart/form-data`, file field: `file`, max 10MB).
- `GET /api/v1/media`: List assets with pagination and search.
- `DELETE /api/v1/media/:id`: Delete media asset and purge file from disk.

---

### 3.7. Audit Logs (`/api/v1/audit`)
- `GET /api/v1/audit`: Query system audit logs with date and action filters.
- `GET /api/v1/audit/:id`: View detailed audit trace.
- `DELETE /api/v1/audit/:id`: Delete single log (Superadmin only).
- `DELETE /api/v1/audit`: Clear audit records by date (Superadmin only).

---

### 3.8. Dashboard (`/api/v1/dashboard`)
- `GET /api/v1/dashboard/overview`: High-level system overview.
- `GET /api/v1/dashboard/summary`: Numerical counts of inquiries, applications, and documents.
- `GET /api/v1/dashboard/recent-activity`: Real-time recent event stream.
- `GET /api/v1/dashboard/stats`: Performance statistics.
