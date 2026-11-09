# Ashivam Technologies — System Data Flow & Sequence Specifications

> **Document Version:** 1.0.0  
> **Classification:** Technical Reference Architecture  
> **Status:** Production Standard  
> **Target Audience:** Engineering Leads, Full-Stack Developers, Security Architects  

---

## 1. Overview

This document specifies the end-to-end data flows, sequence interactions, protocol boundaries, and security validation gates across all core business journeys in the Ashivam Technologies platform ecosystem.

---

## 2. Core Business Journeys

### 2.1 Lead Capture & Corporate Inquiry Submission

The inquiry submission pathway handles inbound customer and enterprise leads. It features a defense-in-depth sanitization pipeline, anti-spam honeypot detection, sliding-window rate limiting, and reliable transactional email notification via an asynchronous outbox worker.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Website Visitor
    participant Browser as React SPA (Vite)
    participant RateLimiter as Rate Limit & WAF
    participant Controller as Inquiry Controller
    participant Validator as Zod / Joi Schema
    participant DB as MongoDB Atlas (Inquiries)
    participant Outbox as Email Queue / Outbox
    participant Mailer as Transactional Mailer (Mailjet)
    actor Admin as Ashivam Operations

    Client->>Browser: Submits Contact / Inquiry Form
    Browser->>RateLimiter: POST /api/v1/inquiries (JSON Payload)
    
    Note over RateLimiter: Check IP & Email rate limits (max 5/hr)<br/>Check honeypot field (_gotcha == empty)
    alt Rate Limit Exceeded or Honeypot Tripped
        RateLimiter-->>Browser: 429 Too Many Requests / 400 Bot Detected
        Browser-->>Client: Displays user-friendly error notice
    else Rate Limit OK
        RateLimiter->>Controller: Forward sanitized request
    end

    Controller->>Validator: Validate fields (name, email, phone, message)
    alt Schema Validation Fails
        Validator-->>Controller: Field error details
        Controller-->>Browser: 422 Unprocessable Entity
    else Schema Valid
        Validator-->>Controller: Sanitized input
    end

    Controller->>DB: Inquiries.create({ status: 'NEW', ... })
    DB-->>Controller: Saved Record (ID: INQ-XXXXX)

    Controller->>Outbox: Enqueue Customer Confirmation & Admin Alert
    Controller-->>Browser: 201 Created { success: true, inquiryId }
    Browser-->>Client: Success confirmation UI & tracking reference

    Note over Outbox,Mailer: Asynchronous Background Outbox Processor
    Outbox->>Mailer: Send Confirmation to Client
    Outbox->>Mailer: Send Alert to ritik95061@gmail.com
    Mailer-->>Client: Email: "Thank you for contacting Ashivam Technologies"
    Mailer-->>Admin: Email: "New Inbound Enterprise Inquiry: [Company Name]"
```

---

### 2.2 Careers & Resume Application Workflow

The careers intake workflow securely accepts applicant profiles and CVs/resumes. Uploaded files undergo strict MIME and magic-byte inspection before persistence.

```mermaid
sequenceDiagram
    autonumber
    actor Applicant as Job / Internship Applicant
    participant UI as Careers Application Portal
    participant API as Backend Ingress (/api/v1/careers)
    participant Multer as Multer Memory Storage
    participant Scanner as Magic-Byte & Malware Scanner
    participant Storage as Cloudinary / AWS S3
    participant DB as MongoDB (Careers Collection)
    participant Mail as Mailjet Service

    Applicant->>UI: Selects Opening, Fills Details, Attaches Resume (PDF/DOCX)
    UI->>UI: Client-side validation (Size <= 5MB, Extension .pdf, .docx)
    UI->>API: POST /api/v1/careers/apply (multipart/form-data)
    
    API->>Multer: Stream file to memory buffer
    Multer->>Scanner: Read initial 4100 bytes (file signature check)
    
    alt Invalid Magic Bytes (e.g. Executable disguised as .pdf)
        Scanner-->>API: Magic byte mismatch (application/x-dosexec)
        API-->>UI: 400 Bad Request (Invalid file format signature)
        UI-->>Applicant: Error: "Uploaded file is not a valid PDF or DOCX document"
    else Magic Bytes Verified (application/pdf)
        Scanner-->>API: File Signature Valid
    end

    API->>Storage: Upload buffer with randomized UUID filename
    Storage-->>API: Secure Storage URL (HTTPS)

    API->>DB: Careers.create({ candidateData, resumeUrl, status: 'SUBMITTED' })
    DB-->>API: Created Application Record

    API->>Mail: Trigger Application Acknowledgement Email
    Mail-->>Applicant: Delivery: "Application Received - Ashivam Careers"
    API-->>UI: 201 Created { success: true, applicationId }
    UI-->>Applicant: Application confirmation modal & tracking ID
```

---

### 2.3 Authentication, Token Lifecycle & Silent Web Lock Refresh

Ashivam Technologies implements the OWASP Session Management standard using short-lived JWT Access Tokens (15-minute expiry) in memory and rotation-secured `HttpOnly` Refresh Tokens (7-day sliding expiry). Concurrent tabs coordinate refresh calls via the W3C Web Locks API (`navigator.locks`) to eliminate race conditions and avoid accidental family revocation.

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated Admin / Staff
    participant TabA as Browser Tab A (Active)
    participant TabB as Browser Tab B (Background)
    participant AuthContext as React AuthContext / API Client
    participant AuthAPI as /api/v1/auth
    participant RedisDB as Refresh Token Store / MongoDB

    Note over TabA,TabB: Access token expires at T = 15m. Both tabs make concurrent API calls.
    TabA->>AuthContext: API call triggers 401 Unauthorized (Token Expired)
    TabB->>AuthContext: API call triggers 401 Unauthorized (Token Expired)

    Note over AuthContext: Acquire Web Lock: 'ashivam_auth_refresh_lock'
    TabA->>AuthContext: Acquires Web Lock
    TabB->>AuthContext: Queues, waiting for Lock release

    TabA->>AuthAPI: POST /api/v1/auth/refresh-token (Cookie: refreshToken=v1)
    
    AuthAPI->>RedisDB: Verify refreshToken v1 in Family Store
    alt Token Reused or Revoked (Replay Attack Detected)
        AuthAPI->>RedisDB: Revoke entire token family for user!
        AuthAPI-->>TabA: 403 Forbidden (Session compromised)
        TabA->>User: Forced logout & alert
    else Token Valid
        AuthAPI->>RedisDB: Invalidate v1, persist new refreshToken v2
        AuthAPI-->>TabA: 200 OK { accessToken: new_jwt } + Set-Cookie: refreshToken=v2 (HttpOnly, SameSite=Strict)
    end

    Note over AuthContext: Update in-memory accessToken. Broadcast to TabB via BroadcastChannel / State.
    AuthContext-->>TabA: Release Web Lock
    
    TabB->>AuthContext: Web Lock Acquired
    Note over TabB: Sees freshly updated accessToken from TabA. Skips redundant network call!
    AuthContext-->>TabB: Release Web Lock

    TabA->>AuthAPI: Re-executes original failed request with new_jwt
    TabB->>AuthAPI: Re-executes original failed request with new_jwt
    AuthAPI-->>TabA: 200 OK (Data returned)
    AuthAPI-->>TabB: 200 OK (Data returned)
```

---

### 2.4 HRMS Employee Document Vault & Cryptographic Verification

Employee sensitive identity documents (Aadhaar, PAN, Academic Degrees, Experience Letters) require cryptographic verification, immutable audit logging, and role-restricted viewing.

```mermaid
sequenceDiagram
    autonumber
    actor Employee as Onboarding Employee
    actor HR as HR Operations Lead
    participant Portal as HRMS Web Interface
    participant DocController as Document Controller (/api/v1/employee-documents)
    participant S3Store as Encrypted S3 Bucket (SSE-KMS)
    participant AuditLog as System Audit Logger
    participant DB as MongoDB Atlas

    Employee->>Portal: Uploads Identity Verification Document (PAN Card PDF)
    Portal->>DocController: POST /api/v1/employee-documents/upload (Bearer JWT)
    
    DocController->>DocController: Compute SHA-256 Checksum of Buffer
    DocController->>S3Store: PutObject with Server-Side KMS Encryption (AES-256)
    S3Store-->>DocController: ObjectKey: "vault/emp_098/pan_a48f.enc"

    DocController->>DB: EmployeeDocument.create({ empId, docType: 'PAN', checksum, status: 'PENDING_VERIFICATION' })
    DocController->>AuditLog: LogAction('DOC_UPLOADED', { empId, docType: 'PAN' })
    DocController-->>Portal: 201 Created { documentId, status: 'PENDING_VERIFICATION' }

    HR->>Portal: Navigates to Employee KYC Verification Queue
    Portal->>DocController: GET /api/v1/employee-documents/:id/preview
    DocController->>DocController: Verify HR Role & Permissions
    DocController->>S3Store: Generate Pre-signed URL (Valid for 120 seconds only)
    S3Store-->>DocController: Pre-signed Time-Limited URL
    DocController-->>Portal: 200 OK { previewUrl }
    HR->>Portal: Inspects document, clicks "Approve KYC"

    Portal->>DocController: PATCH /api/v1/employee-documents/:id/verify { status: 'VERIFIED' }
    DocController->>DB: Update status to 'VERIFIED', verifiedBy: hrId, verifiedAt: Date.now()
    DocController->>AuditLog: LogAction('DOC_VERIFIED', { documentId, hrId })
    DocController-->>Portal: 200 OK { success: true }
    Portal-->>HR: Badge updated to "Verified"
```

---

## 3. Data Integrity & Consistency Rules

1. **At-Least-Once Delivery for Email Outbox:** All business events that generate outbound notifications persist an outbox record in MongoDB in the same database session as the domain entity update.
2. **Pre-Signed S3 Access Expiry:** Direct storage links are never publicly exposed. All document URLs are ephemeral pre-signed links expiring within 120 seconds.
3. **Audit Trail Immutability:** Audit log entries (`auditlogs` collection) are strictly append-only; update and delete operations on the audit collection are rejected by database triggers.
