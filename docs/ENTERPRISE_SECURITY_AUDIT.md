# Ashivam Technologies — Enterprise Security Audit

## 1. Security Baseline & Standards
The Ashivam Technologies platform has been audited against OWASP Top 10 (2021/2025 draft), ASVS Level 2, and enterprise application security standards.

---

## 2. Threat Vector Audits & Verification Evidence

### 2.1 Cross-Origin Resource Sharing (CORS) & CSRF Defense
- **Policy:** Explicit origin whitelist validation. Only configured, authorized origins (production `ashivam-tec-h.vercel.app`, staging `ashivam-tec-h-staging.vercel.app`, and local test runners) are accepted.
- **Enforcement:** Custom origin evaluation callback in `backend/src/app.js`.
- **Evidence:** E2E test `E2E-SEC-01` sends an origin header `Origin: https://malicious-attacker-domain.evil`. The request is immediately rejected with HTTP 403 Forbidden and logged as a security event.
- **CSRF Defense:** State-changing requests are guarded via `X-Requested-With` header verification and SameSite cookie attributes.

### 2.2 Broken Authentication & Session Hijacking
- **Dual Token Isolation:** Short-lived access tokens (15m) are held in `sessionStorage` (tab-isolated) while refresh tokens are held in `HttpOnly; Secure; SameSite=None` partitioned cookies.
- **Token Rotation & Replay Detection:** Single-use rotation with family tracking (`familyId`). If an expired or already-used token is presented outside the 15-second grace window, the entire family is revoked, forcing re-authentication.
- **Account Revocation Hooks:** Deactivating or deleting an admin account purges all associated refresh tokens immediately.

### 2.3 Injection Attacks (SQL/NoSQL/CRLF/Formula)
- **NoSQL Injection:** Mongoose strict schemas and `sanitizeText` sanitization strip mongo operator syntax (`$gt`, `$where`, etc.) from incoming request payloads.
- **CRLF Header Injection:** `sanitizeEmailHeader` and logger utilities strip `\r`, `\n`, and `\t` characters from headers, email fields, and logs.
- **CSV / Formula Injection:** CSV export endpoints (`/api/v1/internships/export`, `/api/v1/hr-documents/export`, `/api/v1/audit/export`) prefix spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quotes (`'`) to neutralize remote code execution when opened in Excel or Google Sheets.

### 2.4 File Upload & Polyglot Executable Execution
- **Multi-Layer Validation:**
  1. Multer memory limits (5 MB for resumes, 10 MB for HR docs).
  2. MIME type whitelist verification.
  3. Binary magic-byte header verification (PDF, DOC, DOCX, JPEG, PNG, WEBP).
  4. Non-executable storage (uploaded files are stored in object storage or isolated paths with direct public static routing blocked).

### 2.5 Audit Log Tampering & Non-Repudiation
- **Append-Only Immutability:** Mongoose pre-query middleware intercepts and rejects any `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `findOneAndDelete`, or `findOneAndRemove` calls on the `AuditLog` collection.
- **Endpoint Hardening:** `DELETE /api/v1/audit/:id` and `DELETE /api/v1/audit` return HTTP 403 Forbidden and record a `SECURITY_VIOLATION_ATTEMPT` audit event.

### 2.6 DoS & Brute-Force Protection
- Multi-tier express rate limiters defend public endpoints (`100/15m` general API, `10/15m` auth, `5/15m` contact inquiries and applications).
- Reverse proxy trust (`app.set("trust proxy", 1)`) ensures client IPs are resolved accurately from reverse proxy hops.
