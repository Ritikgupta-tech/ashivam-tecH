# Ashivam Technologies — Enterprise Threat Model (STRIDE Methodology)

## 1. Threat Modeling Scope
This threat model assesses the Ashivam Technologies full-stack platform across the six STRIDE threat categories:
1. **S**poofing Identity
2. **T**ampering with Data
3. **R**epudiation
4. **I**nformation Disclosure
5. **D**enial of Service
6. **E**levation of Privilege

---

## 2. STRIDE Evaluation Matrix

| Category | Potential Threat Scenario | Target Asset / Endpoint | Implemented Mitigation & Countermeasure | Residual Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker spoofs client IP to bypass rate limits or brute force login. | Reverse proxy header / `X-Forwarded-For` | `app.set("trust proxy", 1)` strictly trusts 1 upstream proxy hop. Direct client spoofing ignored. | Low |
| **Spoofing** | Attacker steals refresh token cookie and presents it to renew session. | `POST /api/v1/auth/refresh` | `HttpOnly`, `Secure` cookie prevents XSS theft. Replay detection revokes token family if reused. | Low |
| **Tampering** | Attacker modifies or deletes audit logs to hide unauthorized activity. | `AuditLog` collection / `/api/v1/audit` | Mongoose pre-hooks strictly forbid update/delete. Endpoints return 403 Forbidden. | Negligible |
| **Tampering** | Attacker uploads malicious script disguised as a `.pdf` resume. | `/api/v1/careers/jobs/:id/apply` | Binary magic-byte inspection (`validateFileSignature`), strict MIME check, private S3 storage. | Negligible |
| **Repudiation** | Administrator denies performing an employee role change or deletion. | Admin mutations / `/api/v1/admin/` | Every state modification records an immutable AuditLog with user ID, username, IP, and timestamp. | Negligible |
| **Information Disclosure** | Candidate resumes and internal HR docs exposed to unauthorized public. | `uploads/` directory | Direct static public access is blocked (returns 404). Access requires authenticated RBAC streaming. | Negligible |
| **Information Disclosure** | Secrets and passwords printed to cloud logs or error responses. | Application logs & error envelopes | Structured logging redacts passwords, tokens, and authorization headers (`***REDACTED***`). | Negligible |
| **Denial of Service** | Bot floods contact form or application form with spam requests. | `/api/v1/inquiries`, `/api/v1/careers/apply` | Multi-tier express rate limiters (5 req / 15m), honeypot traps, and in-flight deduplication. | Low |
| **Elevation of Privilege** | Operational Admin attempts to elevate privileges to Superadmin. | `PATCH /api/v1/admin/admins/:id/role` | RBAC middleware enforces Superadmin-only role mutation. Superadmin count guard prevents removal of last admin. | Negligible |
