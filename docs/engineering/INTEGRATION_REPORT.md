# ASHIVAM TECHNOLOGIES — CROSS-APPLICATION INTEGRATION REPORT
**Document Reference:** `docs/engineering/INTEGRATION_REPORT.md`  
**Classification:** Inter-Service Architecture & API Contract Specification  
**Date:** 2026-11-10  

---

## 1. INTEGRATED CANDIDATE-TO-EMPLOYEE LIFECYCLE

The Ashivam Technologies software ecosystem coordinates a secure multi-stage talent pipeline across three decoupled applications:

```
[Corporate Website]
       │
       │ Candidate applies on public Careers page
       │ Outbox event written with unique idempotency key
       ▼
  HMAC-SHA256 Signed HTTP POST
  Header: x-signature, x-timestamp, x-idempotency-key
       │
       ▼
[Internship Management System]
       │
       │ Validates signature, verifies timestamp within 5-minute freshness window
       │ Persists Application record, assigns applicationNumber
       │ Review committee screens, interviews, evaluates, issues offer
       │ Candidate accepts offer, completes internship program and task milestones
       │ Performance review >= 80%, cryptographic completion certificate generated
       │ Eligible for Full-Time Conversion (PPO)
       ▼
  HMAC-SHA256 Signed HTTP POST
  Route: /api/v1/integrations/conversions
       │
       ▼
[HR Management System (HRMS)]
       │
       │ Validates inter-service signature and conversion prerequisites
       │ Intern conversion queued in HR review dossier (InternConversionQueue)
       │ HR Admin / Director approves employee creation
       │ Employee master record generated with department and designation
       ▼
  Status Callback dispatched to Internship System (Conversion Completed)
```

---

## 2. HANDOFF SPECIFICATIONS & API CONTRACTS

### 2.1. Handoff A: Corporate Website $\to$ Internship Management
- **Source Service:** Corporate Website Backend Outbox Worker (`src/modules/integration/handoffService.js`)
- **Target Endpoint:** `POST https://ashivam-internship-staging.onrender.com/api/v1/integrations/receive-application`
- **Request Headers:**
  - `Content-Type: application/json`
  - `x-source-system: ashivam-corporate-website`
  - `x-request-id: <uuidv4>`
  - `x-correlation-id: <uuidv4>`
  - `x-timestamp: <ISO-8601-UTC>`
  - `x-idempotency-key: <sha256-hash-of-payload>`
  - `x-signature: <hmac-sha256-hex>`
- **Payload Schema:**
  ```json
  {
    "applicantName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+91 98765 43210",
    "program": "Full Stack Engineering",
    "institution": "Agra Institute of Technology",
    "graduationYear": 2026,
    "gpa": "3.85",
    "source": "WEBSITE_CAREERS_PORTAL"
  }
  ```
- **Acknowledgment Format:** Supports both top-level and nested application identifiers:
  ```json
  {
    "success": true,
    "data": { "applicationNumber": "ASH-2026-ENG-0042", "status": "RECEIVED" },
    "applicationNumber": "ASH-2026-ENG-0042"
  }
  ```
- **Error & Retry Handling:** Outbox worker executes exponential backoff retries with jitter ($2\text{s}, 4\text{s}, 8\text{s}, \dots$) up to a maximum of 5 attempts. Permanent failures transition the outbox event to `FAILED` with detailed diagnostic audit logs.

### 2.2. Handoff B: Internship Management $\to$ HRMS Core
- **Source Service:** Internship Management (`src/controllers/integrationController.js`)
- **Target Endpoint:** `POST https://ashivam-hrms-staging.onrender.com/api/v1/integrations/conversions`
- **Prerequisite Validation:**
  - Candidate status must be `COMPLETED`.
  - Cryptographic certificate must be issued and verified.
  - Overall performance evaluation score must meet statutory threshold.
- **Payload Schema:**
  ```json
  {
    "internId": "65f1234abcd...",
    "fullName": "Jane Smith",
    "email": "jane.smith@example.com",
    "targetDepartment": "ENGINEERING",
    "targetDesignation": "Junior Software Engineer",
    "completionDate": "2026-05-31",
    "performanceScore": 92.5,
    "certificateId": "CERT-2026-ASH-0981"
  }
  ```
- **HRMS Review Gate:** The incoming conversion request creates a record in `InternConversion` with status `PENDING_HR_APPROVAL`. A candidate **never** becomes an active employee automatically upon HTTP submission; an authenticated `HR_ADMIN` or `DIRECTOR` must explicitly execute `reviewConversion(id, { approved: true, initialSalary, joiningDate })`.

---

## 3. INTER-SERVICE SECRETS ARCHITECTURE & MAPPING MATRIX

To guarantee zero-cost staging and production inter-service communication without mutual lockouts, the following secrets must be aligned:

| Integration Channel | Sending Service Env Key | Receiving Service Env Key | Recommended Staging Secret Value |
| :--- | :--- | :--- | :--- |
| **Website $\to$ Internship** | `INTERNSHIP_SERVICE_SECRET` (in Website) | `WEBSITE_SERVICE_SECRET` (in Internship) | Synchronized 32+ character high-entropy key |
| **Internship $\to$ HRMS** | `HRMS_SERVICE_SECRET` (in Internship) | `INTERNSHIP_SERVICE_SECRET` (in HRMS) | Synchronized 32+ character high-entropy key |

> [!IMPORTANT]
> When updating Render environment variables:
> 1. In `ashivam-tech` (Website Render): Ensure `INTERNSHIP_SERVICE_SECRET` matches `WEBSITE_SERVICE_SECRET` in `ashivam-internship-staging`.
> 2. In `ashivam-internship-staging`: Ensure `HRMS_SERVICE_SECRET` matches `INTERNSHIP_SERVICE_SECRET` in `ashivam-hrms-staging`.
> 3. Never commit these live values to Git repositories. Staging and development environments safely fall back to distinct development test keys when running in local test runners.
