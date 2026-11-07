# Ashivam Technologies — Security Requirements & OWASP ASVS 5.0 Level 2 Checklist

> **Document Version:** 1.0.0  
> **Target Standard:** OWASP Application Security Verification Standard (ASVS) 5.0 — Level 2 (Standard Enterprise Applications)  
> **Status:** Production Validated  
> **Lead Security Architect:** Application Security Engineer  

---

## 1. Executive Summary

This specification maps the Ashivam Technologies corporate and administrative platforms against the 14 verification chapters of **OWASP ASVS 5.0 Level 2**. Every requirement includes its compliance status, verifying tests, and architectural controls.

---

## 2. OWASP ASVS 5.0 Level 2 Conformance Matrix

| Chapter | Domain | Target ASVS Controls | Verification Method | Status |
| :--- | :--- | :--- | :--- | :---: |
| **V1** | **Architecture & Design** | Threat modeling documented (STRIDE), clear trust boundaries, separation of concerns. | Architecture review, `THREAT_MODEL.md` | **COMPLIANT** |
| **V2** | **Authentication** | Password complexity ($\ge 12$ chars, mixed case, symbols), bcrypt salt rounds 12, brute-force lockout. | Unit & security test suites (`test:security`) | **COMPLIANT** |
| **V3** | **Session Management** | Short-lived JWT (15m), rotating refresh tokens (7d) in `HttpOnly` cookie, token family replay detection. | Integration tests (`tests/security/auth.security.test.js`) | **COMPLIANT** |
| **V4** | **Access Control** | Granular RBAC, prevention of IDOR via ownership checks, least privilege principle. | RBAC tests (`tests/integration/admin-rbac.test.js`) | **COMPLIANT** |
| **V5** | **Input & Sanitization** | Strict schema validation (Joi/Zod), NoSQL injection prevention, HTML entity encoding. | Unit tests & controller input filters | **COMPLIANT** |
| **V6** | **Stored Cryptography** | Passwords hashed with bcrypt; documents encrypted with AES-256-GCM via AWS KMS. | Cryptographic library audit | **COMPLIANT** |
| **V7** | **Logging & Error Handling**| Structured audit logging, no credentials in logs, production sanitized error responses. | Error middleware tests (`tests/unit/error.test.js`) | **COMPLIANT** |
| **V8** | **Data Protection** | Aadhaar 4-digit masking, confidential KYC isolation, Indian DPDP Act compliance. | KYC vault audit & API response assertions | **COMPLIANT** |
| **V9** | **Communications** | Mandatory TLS 1.3, HSTS header (`max-age=31536000`), secure cookies (`SameSite=Strict`). | Staging curl & SSL Labs A+ check | **COMPLIANT** |
| **V10** | **Malicious Code Search** | Automated npm audit in CI, zero high/critical CVEs in production dependencies. | CI workflow (`ci.yml`), `npm audit` | **COMPLIANT** |
| **V11** | **Business Logic** | Multi-step transaction safety, idempotent webhooks, anti-spam honeypot. | Integration test suites (`tests/integration/`) | **COMPLIANT** |
| **V12** | **File Handling** | In-memory buffering, magic-byte inspection (PDF/DOCX), pre-signed short-lived S3 links. | Multer config & upload security tests | **COMPLIANT** |
| **V13** | **API & Web Services** | Standard envelope schema, rate limiting per IP/route, CORS origin whitelisting. | API integration tests & OpenAPI 3.1 spec | **COMPLIANT** |
| **V14** | **Configuration** | Security headers (Helmet), disabling `x-powered-by`, hardened cookie flags. | Helmet middleware & header audit | **COMPLIANT** |

---

## 3. Detailed Verification Deep Dive

### 3.1 V2: Authentication & Password Security
- **ASVS 2.1.1 (Minimum Length):** Enforces minimum length of 12 characters (`password.length >= 12`).
- **ASVS 2.1.2 (Entropy Requirements):** Enforces regex requiring uppercase, lowercase, numbers, and symbols.
- **ASVS 2.1.7 (Breached Credentials):** Blocks common passwords and dictionary patterns.
- **ASVS 2.2.1 (Credential Storage):** Passwords hashed using standard `bcrypt` with work factor 12.

### 3.2 V3: Session Management & Refresh Security
- **ASVS 3.2.1 (Cookie Security):** All session refresh cookies configure:
  - `HttpOnly = true` (blocks DOM access).
  - `Secure = true` in production (blocks cleartext transmission).
  - `SameSite = 'Strict'` (blocks cross-site request forgery).
- **ASVS 3.3.1 (Session Revocation):** User password changes or administrative offboarding immediately revokes the entire refresh token family in the database.

### 3.3 V5: Input Validation & NoSQL Injection Safeguards
- **ASVS 5.1.1 (Server-Side Enforcement):** Client-side validation in React SPA is mirrored and enforced strictly on backend controllers using schema validators.
- **ASVS 5.3.4 (NoSQL Query Sanitization):** MongoDB query parameters are sanitized using `mongo-sanitize` to strip `$` operators, preventing query selector injection (e.g. `{ $ne: null }`).

### 3.4 V7: Error Handling & Security Telemetry
- **ASVS 7.1.1 (Generic Error Messages):** Uncaught exceptions in production return generic error envelopes:
  ```json
  {
    "success": false,
    "statusCode": 500,
    "message": "An internal server error occurred. Please contact team.ashivam@gmail.com with your correlation ID.",
    "correlationId": "req_4fae109..."
  }
  ```
  Stack traces and system internals are strictly suppressed in non-development environments.

### 3.5 V12: File Handling & Resume Upload Security
- **ASVS 12.1.1 (File Extension & MIME Verification):** Validates uploaded file extension against strict whitelist (`.pdf`, `.docx`).
- **ASVS 12.1.2 (Magic-Byte Inspection):** Inspects the file stream header buffer. If an uploaded `.pdf` does not begin with `%PDF-` bytes, it is rejected immediately before saving to storage.
- **ASVS 12.3.1 (Direct Execution Prevention):** All user-uploaded documents are served with `Content-Disposition: attachment` or through sandboxed S3 signed links, preventing direct execution within the application domain.
