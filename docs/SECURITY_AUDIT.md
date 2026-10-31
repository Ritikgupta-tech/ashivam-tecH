# Ashivam Technologies — Security Audit & Hardening Report

**Document Version:** 3.0.0 (Master Engineering Release)  
**Standard Baseline:** OWASP ASVS 5.0 (Level 2 Orientation), OWASP Top 10 2025, OWASP API Security Top 10  
**Classification:** Confidential — Internal Company & DevOps Use Only  
**Company:** Ashivam Technologies  
**Date:** October 30, 2026  
**Auditor:** Application Security Engineer & Lead Systems Architect  

---

## 1. Executive Summary

This security audit assesses the defensive controls, cryptographic integrity, access control models, and vulnerability mitigations implemented across the Ashivam Technologies digital platform.

The system incorporates deep defense-in-depth mechanisms designed to neutralize realistic attack vectors:
* **Zero Unauthorized Access:** Strict server-side RBAC with asynchronous concurrency locks defending against administrative privilege escalation.
* **Zero Public Leakage:** Private document vaults (resumes, employee records, HR policies) are physically blocked from public static HTTP endpoints.
* **Zero Spreadsheet Weaponization:** Every CSV export stream prefixes active formula triggers with `'`.
* **Zero Malicious File Masquerading:** File uploads undergo binary magic-byte inspection and strict SVG sanitization.
* **Zero Mail Relay Abuse:** Internal company notifications are hardwired to `team.ashivam@gmail.com`, and public payloads cannot override recipient headers.

---

## 2. Threat Vector Evaluation & Mitigations

### 2.1 Injection Defense (SQL, NoSQL, ReDoS, Command Injection)
* **NoSQL Injection Defense:** All user-supplied parameters undergo strict type casting and validation. Query builders avoid raw object assignment. Automated tests confirm that payloads like `{"$gt": ""}` are rejected by validators with HTTP 400.
* **Regular Expression Denial of Service (ReDoS):** The utility function `escapeRegex()` in `backend/src/utils/query.js` escapes all special regex metacharacters (`[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]`) before passing query patterns to Mongoose.
* **CRLF Header Injection:** The `sanitizeEmailHeader()` utility strips `\r`, `\n`, and `\t` from email headers, neutralizing header splitting attacks.

### 2.2 Broken Object Level Authorization (BOLA / IDOR)
* All resource access endpoints (`/api/v1/inquiries/:id`, `/api/v1/career/admin/applications/:id/resume`, `/api/v1/hr-documents/:id/download`, `/api/v1/internships/interns/:id`) validate caller authentication and permission before querying the database.
* Identifiers are validated using `isValidObjectId()` to reject malformed parameters before reaching Mongoose queries.

### 2.3 Broken Function Level Authorization & Privilege Escalation
* Superadmin capabilities (admin user management, operational role demotion, hard deletion) are guarded by `requireRole("Superadmin")`.
* Operational administrators are restricted by `requirePermission(permissionKey)`.
* **Cluster-Wide Last-Superadmin Invariant & Distributed Concurrency Protection:**
  * Modifying or deleting an administrator is serialized via `withAdminMutationLock`, backed by a cluster-wide MongoDB distributed lock (`withDistributedLock("admin_mutation", ...)` with TTL auto-expiration leases).
  * An active Superadmin cannot demote their own role or delete their account if only one active Superadmin remains, even under concurrent burst conditions across multiple Node.js processes or scaled Render instances.
  * Verified by automated stress tests executing 25 concurrent removal attacks against the last active Superadmin, resulting in 100% rejection (HTTP 400).
* **Collision-Free Atomic Counter Generation:**
  * Intern ID generation uses a database-level atomic sequence counter (`Counter.findOneAndUpdate` with `$inc: 1`), eliminating duplicate IDs and lost counter increments across multi-instance clusters. Verified under 50 simultaneous allocation requests.

### 2.4 Formula Injection in CSV Exports (CWE-1236)
* Export streams across Inquiries, Careers, Internships, Employees, HR Documents, and Audit Logs pass every cell through `sanitizeCsvCell()`.
* Any text cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` has an apostrophe (`'`) prepended, neutralizing formula execution in Microsoft Excel, LibreOffice, and Google Sheets.

### 2.5 File Upload & Active Content Protection
* **Magic-Byte Signature Verification:** `validateFileSignature()` examines the first 4 bytes of uploaded files:
  * PDF: `%PDF` (`0x25 0x50 0x44 0x46`)
  * DOC: OLE (`0xd0 0xcf 0x11 0xe0`)
  * DOCX: ZIP archive (`0x50 0x4b 0x03 0x04`)
* **SVG Hardening:** SVG media uploads are scanned for null bytes (`\0`), XML External Entity (XXE) attacks, `<!DOCTYPE>`, `<!ENTITY>`, `<script>` tags, and inline event handlers (`onload`, `onerror`). Public SVGs are served with `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; sandbox`.
* **Download Filename Sanitization:** `sanitizeDownloadFilename()` strips path traversal sequences (`..`), null bytes, and non-whitelisted extensions, preventing arbitrary Content-Disposition exploitation.

### 2.6 Session Cryptography & Password Security
* Passwords are salt-hashed using `bcryptjs` with 12 rounds.
* JWTs are signed with HMAC SHA-256 and expire in 1 hour.
* **Immediate Token Invalidation:** When an administrator rotates their password, `admin.passwordChangedAt` is updated. Any token issued with an `iat` timestamp predating `passwordChangedAt` is immediately rejected.
* **Minimum Secret Length:** Production startup validates that `JWT_SECRET` is &ge; 32 characters.

### 2.7 Rate Limiting & Resource Exhaustion Defense
* **Global API Limiter:** 100 requests per 15 minutes per IP.
* **Public Form Limiter:** 10 submissions per 15 minutes per IP.
* **Admin Login Limiter:** 5 login attempts per 15 minutes per IP.
* **Health Check Limiter:** 30 requests per minute per IP.
* **Reverse Proxy Trust:** `TRUST_PROXY: 1` correctly parses `X-Forwarded-For` from reverse proxies without crashing or allowing spoofed client IPs.

### 2.8 Corporate Notification Security & Anti-Tampering
* Mandated recipient `team.ashivam@gmail.com` is hardcoded as an immutable fallback in `backend/src/config/env.js` and `email.service.js`.
* `sendCompanyNotification()` strictly routes alerts to `team.ashivam@gmail.com`, stripping any `to`, `cc`, or `bcc` parameters supplied by callers.
* Public submission bodies attempting payload injection of `to`, `cc`, or `bcc` are completely ignored.
* Submitter confirmation emails route directly to the user's submitted email address, preserving `replyTo: team.ashivam@gmail.com`.

---

## 3. Cryptographic Secret Management & Zero-Secrets Compliance

* `.gitignore` explicitly excludes `.env`, `.env.*`, `uploads/`, `dist/`, and local temporary keys.
* Startup environment checks in `backend/src/config/env.js` enforce that missing secrets halt production deployment rather than falling back to insecure defaults.
* No passwords, JWT secrets, application tokens, or private cloud keys are committed to version control.
