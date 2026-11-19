# API DOCUMENTATION
## Ashivam Technologies — Google Meet Attendance Management System

**Document Version:** 1.0.0-PROD  
**Base URL:** `https://ashivam-tech.onrender.com/api/v1`  
**Authentication Scheme:** Bearer Token (JWT) in `Authorization` header  
**Response Format:** Standard JSON Envelope `{ "success": boolean, "data": any, "message": string, "error": any }`

---

## 1. Authentication & Identity Endpoints

### 1.1. Unified Gateway Login
Authenticates both Administrative staff (`Admin`, `Superadmin`) and Company Employees (`Employee`) through a single unified endpoint.

- **Method:** `POST`
- **Route:** `/auth/login`
- **Auth Required:** No (Public Gateway)
- **Request Headers:**
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "username": "rohan.verma@ashivam.com",
    "password": "EmpSecurePassword!2026"
  }
  ```
  *(Note: `username` accepts employee email, `employeeId` like `ASH-EMP-1042`, or `googleEmail`)*
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "6732f91a4e21...",
        "role": "Employee",
        "email": "rohan.verma@ashivam.com",
        "employeeId": "ASH-EMP-1042",
        "name": "Rohan Verma",
        "department": "Engineering",
        "designation": "Senior Frontend Engineer"
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Error Codes:**
  - `400 Bad Request`: Validation failure (missing username or password).
  - `401 Unauthorized`: Invalid credentials or account deactivated.

---

## 2. Employee Attendance Workspace Endpoints

All employee endpoints require `Authorization: Bearer <Employee_JWT>`. Access is strictly scoped to the authenticated employee's records (`req.user.employeeId` or `req.user.sub`).

### 2.1. Get Personal Attendance Summary & Analytics
- **Method:** `GET`
- **Route:** `/attendance/my`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "metrics": {
        "totalMeetings": 42,
        "attendedMeetings": 39,
        "attendancePercentage": 92.86,
        "presentCount": 35,
        "lateCount": 4,
        "shortCount": 1,
        "absentCount": 2,
        "pendingCount": 0
      },
      "employee": {
        "name": "Rohan Verma",
        "employeeId": "ASH-EMP-1042",
        "googleEmail": "rohan.google@gmail.com"
      }
    }
  }
  ```

### 2.2. Get Today's Meeting Card & Live Status
- **Method:** `GET`
- **Route:** `/attendance/my/today`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "hasMeeting": true,
      "meeting": {
        "id": "6733a10c9b81...",
        "title": "Daily Standup — Engineering",
        "scheduledStartTime": "2026-11-19T04:30:00.000Z",
        "scheduledEndTime": "2026-11-19T05:15:00.000Z",
        "googleMeetingUri": "https://meet.google.com/abc-defg-hij",
        "meetingCode": "abc-defg-hij",
        "status": "ACTIVE"
      },
      "attendance": {
        "status": "PENDING_VERIFICATION",
        "isProvisional": true,
        "connectedMinutes": 0,
        "lateArrivalMinutes": 0
      }
    }
  }
  ```

### 2.3. Get Personal Meeting & Attendance History
- **Method:** `GET`
- **Route:** `/attendance/my/history?page=1&limit=15&month=2026-11`
- **Query Parameters:**
  - `page` (`number`, default: `1`): Pagination page.
  - `limit` (`number`, default: `20`): Page size.
  - `month` (`string`, optional): Format `YYYY-MM`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "records": [
        {
          "recordId": "6733b412...",
          "meetingTitle": "Sprint Planning",
          "scheduledStartTime": "2026-11-18T05:00:00.000Z",
          "status": "PRESENT",
          "connectedMinutes": 58,
          "lateMinutes": 0,
          "verifiedVia": "MEET_REST_API",
          "sessionCount": 1
        }
      ],
      "pagination": { "page": 1, "limit": 15, "total": 1, "totalPages": 1 }
    }
  }
  ```

### 2.4. Submit Attendance Correction Dispute
- **Method:** `POST`
- **Route:** `/attendance/corrections`
- **Request Body:**
  ```json
  {
    "attendanceRecordId": "6733b412...",
    "requestedStatus": "PRESENT",
    "reason": "Rejoined from phone due to broadband outage; total session exceeded 40 minutes.",
    "proofDocumentUrl": "https://drive.google.com/file/d/proof-file"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Dispute submitted successfully for administrative review",
    "data": {
      "id": "6733c990...",
      "status": "PENDING",
      "createdAt": "2026-11-19T06:00:00.000Z"
    }
  }
  ```

---

## 3. Administrative Attendance Dashboard Endpoints

All admin endpoints require `Authorization: Bearer <Admin_JWT>` and enforce `requireRole(["Superadmin", "Admin"])`.

### 3.1. Get Administrative Overview Metrics
- **Method:** `GET`
- **Route:** `/attendance/admin/dashboard`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "totalEmployees": 128,
      "activeEmployees": 124,
      "presentToday": 98,
      "lateToday": 14,
      "shortToday": 3,
      "absentToday": 7,
      "pendingVerification": 2,
      "meetingsScheduledToday": 5,
      "averageAttendanceRate": 88.75,
      "departmentBreakdown": [
        { "department": "Engineering", "total": 45, "present": 42, "rate": 93.33 },
        { "department": "Design", "total": 15, "present": 13, "rate": 86.67 }
      ]
    }
  }
  ```

### 3.2. List and Filter Scheduled Meetings
- **Method:** `GET`
- **Route:** `/attendance/admin/meetings?status=SCHEDULED&page=1&limit=20`
- **Query Parameters:** `status`, `from`, `to`, `search`, `page`, `limit`
- **Response (200 OK):** Array of `Meeting` objects with assigned counts and organizer details.

### 3.3. Create / Schedule New Google Meeting
- **Method:** `POST`
- **Route:** `/attendance/admin/meetings`
- **Request Body:**
  ```json
  {
    "title": "Client Retrospective & Weekly Sync",
    "meetingType": "Daily Standup",
    "scheduledStartTime": "2026-11-20T04:30:00.000Z",
    "scheduledEndTime": "2026-11-20T05:30:00.000Z",
    "googleMeetingUri": "https://meet.google.com/xyz-uvwx-rst",
    "assignedDepartments": ["Engineering", "Product"],
    "assignedEmployees": ["6732f91a..."]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Meeting scheduled successfully",
    "data": {
      "id": "6734d101...",
      "title": "Client Retrospective & Weekly Sync",
      "googleMeetingSpaceName": "spaces/xyz-uvwx-rst",
      "status": "SCHEDULED"
    }
  }
  ```

### 3.4. Manual Attendance Status Override (Audit Trail Logged)
- **Method:** `PATCH`
- **Route:** `/attendance/admin/records/:id`
- **Request Body:**
  ```json
  {
    "status": "PRESENT",
    "reason": "Verified Google Meet phone dial-in participant mapped to employee phone record."
  }
  ```
- **Response (200 OK):** Updated `AttendanceRecord` with `manualCorrection` metadata.

### 3.5. Dispute Management: List & Adjudicate
- **List Disputes:** `GET /attendance/admin/corrections?status=PENDING`
- **Adjudicate Dispute:** `PATCH /attendance/admin/corrections/:id`
  - **Request Body:**
    ```json
    {
      "status": "APPROVED",
      "reviewNotes": "Approved based on verified Google Meet phone dial-in logs."
    }
    ```

### 3.6. Trigger Meeting Attendance Reconciliation
- **Method:** `POST`
- **Route:** `/attendance/admin/reconcile/:meetingId`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Meeting reconciliation executed successfully",
    "data": {
      "meetingId": "6734d101...",
      "status": "COMPLETED",
      "recordsUpdated": 18
    }
  }
  ```

### 3.7. Export Attendance Report (CSV Streaming)
- **Method:** `GET`
- **Route:** `/attendance/admin/export?from=2026-11-01&to=2026-11-30&department=Engineering`
- **Response:** `200 OK` with `Content-Type: text/csv` and sanitized spreadsheet cells.

---

## 4. Google Integration & Pub/Sub Webhook Endpoints

### 4.1. Integration Health Check
- **Method:** `GET`
- **Route:** `/attendance/admin/google/status`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "connected": true,
      "accountEmail": "workspace-admin@ashivam.com",
      "tokenExpiresAt": "2026-11-20T12:00:00.000Z",
      "grantedScopes": [
        "https://www.googleapis.com/auth/meetings.space.created",
        "https://www.googleapis.com/auth/meetings.space.readonly"
      ],
      "pubsubConfigured": true
    }
  }
  ```

### 4.2. Cloud Pub/Sub Push Webhook
- **Method:** `POST`
- **Route:** `/google/events/pubsub` *(Mounted also at `/attendance/events/pubsub`)*
- **Auth Scheme:** Optional Bearer Token matching `GOOGLE_PUBSUB_VERIFICATION_TOKEN`
- **Request Body (Standard Google Cloud Pub/Sub Envelope):**
  ```json
  {
    "message": {
      "data": "eyJAY29udGV4dCI6ICJodHRwczovL2Nsb3VkZXZlbnRzLmlvL3NwZWMvdjEuMC8iLCAidHlwZSI6ICJnb29nbGUud29ya3NwYWNlLm1lZXQucGFydGljaXBhbnRfc2Vzc2lvbi52Mi5lbmRlZCIsICJyZXNvdXJjZSI6ICJzcGFjZXMvYWJjLWRlZmctaGlqL2NvbmZlcmVuY2VSZWNvcmRzLzEyMzQvcGFydGljaXBhbnRzLzU2Nzgvc2Vzc2lvbnMvOTAiLCAicGFydGljaXBhbnRFbWFpbCI6ICJyb2hhbi5nb29nbGVAZ21haWwuY29tIiwgImpvaW5UaW1lIjogIjIwMjYtMTEtMTlUMDQ6MzI6MDBaIiwgImVuZFRpbWUiOiAiMjAyNi0xMS0xOVQwNToxNDowMFoifQ==",
      "messageId": "pubsub-msg-1795097000",
      "publishTime": "2026-11-19T05:14:05.120Z"
    },
    "subscription": "projects/ashivam-meet-attendance/subscriptions/ashivam-meet-events-sub"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Event processed successfully",
    "data": { "messageId": "pubsub-msg-1795097000" }
  }
  ```
- **Behavior:**
  - Idempotent: If `messageId` was previously processed, returns `200 OK` immediately without re-processing.
  - CloudEvents parsed: Extracts participant email, join time, and leave time.
  - Triggers asynchronous attendance evaluation for the corresponding meeting.
