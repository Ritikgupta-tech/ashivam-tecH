# ASHIVAM TECHNOLOGIES — INTER-SERVICE API CONTRACT SPECIFICATION
## Phase 6: Standardized API Contracts & Schemas

**Classification:** Internal Technical Standard  
**Revision:** 1.0.0  

---

## 1. Inter-Service Header Specification

All service-to-service communication requires the following mandatory HTTP headers:

| Header Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `x-source-system` | String | Identifier of the originating system | `ashivam-website`, `ashivam-internship`, `ashivam-hrms` |
| `x-request-id` | String | Unique request tracing ID | `req_1794080123_4a9b` |
| `x-correlation-id` | String | Cross-system transaction correlation identifier | `corr_1794080123_ff81` |
| `x-timestamp` | String | Unix epoch timestamp in milliseconds | `1794080123456` |
| `x-idempotency-key` | String | Cryptographically unique idempotency key | `idemp_1794080123_9c82e1` |
| `x-signature` | String | Hex-encoded HMAC-SHA256 signature | `a9f4bc89e3...` |

---

## 2. Endpoint Contracts

### 2.1 Inbound Application Handshake (Website -> Internship System)
- **Path:** `POST http://localhost:5001/api/v1/integrations/receive-application`
- **Authentication:** `verifyServiceAuth({ allowedSources: ['ashivam-website'], secret: WEBSITE_SERVICE_SECRET })`

#### Request Payload
```json
{
  "candidateName": "Aarav Sharma",
  "candidateEmail": "ritik95061@gmail.com",
  "candidatePhone": "+91 98765 43210",
  "track": "Full Stack Engineering",
  "resumeUrl": "https://storage.ashivam.tech/resumes/aarav.pdf",
  "statementOfPurpose": "Eager to contribute to Ashivam's core distributed platforms."
}
```

#### Success Response (`201 Created` or `200 OK` on deduplication)
```json
{
  "success": true,
  "applicationNumber": "ASH-APP-2026-01005",
  "applicantName": "Aarav Sharma",
  "program": "Full Stack Engineering",
  "stage": "Initial Screening",
  "status": "RECEIVED",
  "correlationId": "corr_1794080123_ff81",
  "receivedAt": "2026-11-08T02:40:00.000Z"
}
```

---

### 2.2 Inbound Conversion Proposal (Internship -> HRMS)
- **Path:** `POST http://localhost:5002/api/v1/integrations/receive-conversion`
- **Authentication:** `verifyServiceAuth({ allowedSources: ['ashivam-internship'], secret: INTERNSHIP_SERVICE_SECRET })`

#### Request Payload
```json
{
  "internId": "ASH-INT-2026-0042",
  "certificateNumber": "ASH-CERT-2026-0042",
  "candidateName": "Priya Nair",
  "candidateEmail": "ritik95061@gmail.com",
  "candidatePhone": "+91 98765 11223",
  "track": "Cloud Architecture & DevOps",
  "completionDate": "2026-04-01T00:00:00.000Z",
  "finalScore": 94,
  "grade": "Distinction",
  "mentorRecommendation": "Exemplary performance during internship capstone. Strong hire recommendation.",
  "proposedDepartment": "Engineering",
  "proposedDesignation": "Associate Cloud Engineer"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "conversionId": "ASH-CONV-2026-1002",
  "internId": "ASH-INT-2026-0042",
  "status": "PENDING_HR_REVIEW",
  "message": "Conversion proposal placed in HR Review Queue for mandatory approval",
  "correlationId": "corr_1794080123_ff81",
  "receivedAt": "2026-11-08T02:42:00.000Z"
}
```

---

### 2.3 Status Callback (HRMS -> Internship System)
- **Path:** `POST http://localhost:5001/api/v1/integrations/conversions/status-callback`
- **Authentication:** `verifyServiceAuth({ allowedSources: ['ashivam-hrms'], secret: INTERNSHIP_SERVICE_SECRET })`

#### Request Payload
```json
{
  "internId": "ASH-INT-2026-0042",
  "certificateNumber": "ASH-CERT-2026-0042",
  "decision": "APPROVED",
  "employeeId": "ASH-EMP-2026-1005",
  "rejectionReason": null,
  "hrReviewNotes": "Approved by HR Director following stellar technical evaluation.",
  "reviewedBy": "Dr. Evelyn Vance",
  "reviewedAt": "2026-11-08T02:44:00.000Z"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Conversion handoff updated to HR_APPROVED",
  "internId": "ASH-INT-2026-0042",
  "status": "HR_APPROVED",
  "employeeId": "ASH-EMP-2026-1005",
  "recordedAt": "2026-11-08T02:44:01.000Z"
}
```
