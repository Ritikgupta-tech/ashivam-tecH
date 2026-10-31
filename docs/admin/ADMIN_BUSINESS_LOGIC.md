# Ashivam Technologies — Admin Business Logic & Domain Invariants

**Document Version:** 1.0.0  
**Status:** Canonical Reference Specification  
**Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  

---

## 1. Authentication & Session Invariants

### 1.1 Password Hashing & Timing Defense
- Passwords must be hashed using `bcrypt` with cost factor 12 for administrator credentials.
- When an administrator lookup by username returns null or inactive, the backend executes a dummy comparison against a precomputed hash (`DUMMY_HASH`) to prevent timing side-channel attacks that could reveal whether a username exists.
- Inactive accounts (`isActive: false`) are rejected at the authentication layer before JWT issuance.

### 1.2 Self-Service Password Changes
- Any authenticated administrator can change their password via `POST /api/v1/auth/change-password`.
- The request requires `currentPassword`, `newPassword`, and `confirmPassword`.
- The current password is verified against `admin.passwordHash`.
- The new password must be at least 8 characters long, cannot match the current password, and must contain letters and numbers.
- Upon successful update, `passwordChangedAt` is updated to invalidate stale authorization assumptions.

---

## 2. Administrator Governance & Anti-Lockout Invariants

### 2.1 Concurrency Lock (`withAdminMutationLock`)
- All administrative mutations (updating role, modifying status, deleting accounts) execute within an in-process serialized queue (`withAdminMutationLock`).
- This eliminates race conditions where two simultaneous requests could demote or deactivate the last two active Superadmins.

### 2.2 Root Superadmin Safeguards
1. **Self-Deactivation Prevention:** An administrator cannot deactivate their own account (`adminId === currentAdminId && !isActive` throws 400).
2. **Self-Demotion Prevention:** An administrator cannot remove their own Superadmin role (`adminId === currentAdminId && role !== "Superadmin"` throws 400).
3. **Last Superadmin Invariant:** If `Admin.countDocuments({ role: "Superadmin", isActive: true }) <= 1`, any mutation that would demote, deactivate, or delete that Superadmin is rejected with HTTP 400 ("At least one active Superadmin is required").
4. **Duplicate Identity Prevention:** Admin usernames and emails must be unique across all records (enforced via DB index and pre-check throwing 409).

---

## 3. Employee Directory & Integrity Invariants

### 3.1 Partial Unique Index on Email (`email_active_unique`)
- As established in migration AUD-08, employees have a partial unique index on `email` with filter `{ deletedAt: null }`.
- Active employees must possess a globally unique corporate email address.
- Soft-deleted employees (`deletedAt !== null`) do not trigger email collisions, allowing a departing employee's email to be reassigned in the future without destroying historical records.

### 3.2 Employee Archival & Deletion
- Deleting an employee executes a soft-delete (`deletedAt: new Date(), isActive: false`).
- Hard deletion is prohibited to preserve referential integrity for past HR documents, audit logs, and mentoring records.
- Superadmins can restore an archived employee via `PATCH /api/v1/employees/:employeeId/restore`.

---

## 4. Internship Management & Identifier Generation Invariants

### 4.1 Collision-Safe Intern ID Generation (`generateNextInternId`)
The intern identifier format is strictly defined as:
```text
ASH-INT-YYYY-XXX
```
Where:
- `ASH`: Fixed corporate prefix (Ashivam Technologies).
- `INT`: Functional domain identifier (Intern).
- `YYYY`: Current UTC calendar year (e.g. `2026`).
- `XXX`: Zero-padded 3-digit sequential integer starting at `001`.

**Generation Algorithm:**
1. Determine the prefix `ASH-INT-YYYY-`.
2. Query MongoDB for existing interns matching `regex: ^ASH-INT-YYYY-(\d{3})$` sorted descending by `internId`.
3. If no matching records exist for the year, sequence starts at `001`.
4. Otherwise, extract the highest sequential number, increment by 1, pad to 3 digits (`String(nextSeq).padStart(3, '0')`), and return.
5. In the event of a simultaneous write collision, MongoDB unique index `{ internId: 1 }` rejects the duplicate and triggers an automated retry.

### 4.2 Candidate-to-Intern Conversion Invariants
- An internship application (`Internship` model) can only be converted to an intern record if:
  1. The application exists and is not deleted.
  2. The application has not already been converted (`convertedToIntern !== true`).
- Upon conversion:
  1. An `Intern` record is created with a newly generated `ASH-INT-YYYY-XXX` ID.
  2. The source application status is transitioned to `selected`.
  3. `application.convertedToIntern = true` and `application.internId = generatedId` are committed.
- Attempting to re-convert an already converted candidate returns HTTP 409 Conflict.

### 4.3 Direct Onboarding Invariants
- Direct onboarding creates an `Intern` record immediately without a prior `Internship` application record.
- If an active intern already exists with the same email (`email`, `status: active|on_hold|extended`, `deletedAt: null`), the system returns HTTP 409 Conflict to prevent duplicate roster entries.

### 4.4 Onboarding Document Compliance State Machine
An intern record tracks four discrete compliance milestones:
1. `idProofVerified`: Government Photo ID verified.
2. `collegeNocVerified`: College NOC or Student Verification Card verified.
3. `agreementSigned`: Standard Internship Terms & Intellectual Property Agreement signed.
4. `ndaSigned`: Corporate Non-Disclosure Agreement signed.

**State Transition Rule:**
- If all 4 verification flags are `true`, `onboarding.status` is automatically updated to `completed`, and `onboarding.completedAt` is stamped.
- If any flag is `false`, `onboarding.status` remains `in_progress` (or `pending`).

### 4.5 Intern Lifecycle States & Justifications
- `active`: Intern is actively enrolled and attending milestones.
- `on_hold`: Intern has paused internship (e.g. academic university examinations).
- `extended`: Internship duration has been extended. Requires non-empty `extensionReason`.
- `completed`: Intern successfully completed deliverables and graduated. Requires non-empty `performanceNotes`.
- `terminated`: Internship terminated early due to non-performance or withdrawal. Requires `actualEndDate` stamp.

---

## 5. Lateral Recruitment & Career Invariants

### 5.1 Resume Security & Storage Isolation
- Resumes uploaded via `POST /api/v1/career/jobs/:jobId/apply` are inspected in memory (`multer.memoryStorage()`).
- File extension must match `.pdf`, `.doc`, or `.docx` and MIME type must match approved document types.
- Resumes are stored on disk under `uploads/resumes/` using an unguessable UUID-based filename.
- Direct public web access to `uploads/resumes/` is explicitly blocked in Express middleware returning HTTP 404.
- Only authenticated administrators with `careers` permission can stream/download resumes via `GET /api/v1/career/admin/applications/:id/resume`.

### 5.2 Application Duplicate Prevention
- A candidate cannot apply multiple times for the same active job opening within 30 days using the same email address.

---

## 6. Document & Media Management Invariants

### 6.1 Private HR Documents
- Stored under `uploads/hr-documents/`.
- Direct web access via HTTP is completely disabled.
- Downloads are streamed through `GET /api/v1/hr-documents/:id/download` with `Content-Disposition: attachment; filename="<sanitized_name>"`.

### 6.2 Public Media Sanitization
- Public images stored under `uploads/media/`.
- Served statically with `X-Content-Type-Options: nosniff`.
- SVG files are served with a restrictive sandbox header:
  `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; sandbox`
  to neutralize embedded JavaScript or XSS vectors.

---

## 7. CSV Formula Injection (DDE) Mitigation Invariants

All CSV export endpoints across Inquiries, Career Applications, Interns, and Audit Logs adhere to the OWASP CSV Injection Defense guidelines:
- If a cell's string representation begins with any formula trigger character (`=`, `+`, `-`, `@`, `\t`, `\r`), it is prepended with a single apostrophe (`'`).
- Spreadsheet applications (Excel, LibreOffice, Google Sheets) parse the cell as raw text rather than an executable command or formula.
- Double quotes inside cells are escaped as `""`, and cells containing commas or newlines are wrapped in double quotes.
