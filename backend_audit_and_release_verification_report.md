# Ashivam Technologies â€” Backend Audit Fixes & Production Release Verification Report

**Repository:** `https://github.com/Ritikgupta-tech/ashivam-tecH.git`
**Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`
**Branch:** `main`
**Verified Commit:** `c4ab9df` (`fix(security): address backend audit findings (AUD-01 to AUD-07, AUD-09, AUD-10)`)
**Production Backend:** `https://ashivam-tech.onrender.com`
**Production Frontend:** `https://ashivam-tec-h.vercel.app`
**Verification Date:** October 29, 2026

---

## 1. Initial Git State and Audit-Patch Availability

- **Branch:** `main` (tracked to `origin/main`).
- **Initial Working Tree:** Clean (0 unstaged changes, 0 untracked files).
- **Initial HEAD:** `5dcbecb` (*fix(ui): resolve responsive filter overflow and improve touch targets*).
- **Audit Patch Availability:** `ashivam-backend-audit-fixes.patch` was **absent** from the workspace, repository, and local system.
- **Commit History Context:** The audit report referenced `4c642f4` (the prior UI layout commit), which was the parent of `3025f5b` and ancestor of `5dcbecb`. All security fixes (AUD-01 through AUD-07, AUD-09, and AUD-10) were directly implemented, validated, and tested without overwriting existing changes.

---

## 2. Verified Status of AUD-01 Through AUD-10

| Finding ID | Security Description | Implemented Resolution | Test Status |
| :--- | :--- | :--- | :---: |
| **AUD-01** | Public employee API exposes sensitive internal data | Defined `PUBLIC_EMPLOYEE_PROJECTION` in `employee.service.js`. Strips `email`, `phone`, `joiningDate`, `isActive`, `createdAt`, `updatedAt` from public queries. | **PASS** |
| **AUD-02** | Production CORS wildcard bypass via `.vercel.app` | Removed wildcard and localhost in production mode from `app.js`. Enforced strict exact-match verification against `env.allowedOrigins`. | **PASS** |
| **AUD-03** | Timing attack on login allowing username enumeration | Precomputed constant dummy hash (`DUMMY_HASH`) in `auth.service.js`. Executes full `bcrypt.compare` when username is non-existent or inactive. | **PASS** |
| **AUD-04** | General admin updates bypass role change & self-demotion guards | `updateAdmin` in `admin.service.js` now enforces self-demotion protection and last-superadmin invariants, passing caller context from `admin.controller.js`. | **PASS** |
| **AUD-05** | JWT tokens remain valid after admin password change | Added `passwordChangedAt` timestamp to `admin.model.js`. `auth.middleware.js` invalidates any token issued prior to the password update (`payload.iat < changedTimestamp`). | **PASS** |
| **AUD-06** | JWT algorithm confusion protection | `jwt.js` pins `algorithm: "HS256"` in `signToken` and `{ algorithms: ["HS256"] }` in `verifyToken`. Rejects `none` and asymmetric public-key spoofing. | **PASS** |
| **AUD-07** | Error stack trace and internal path disclosure | In `error.middleware.js`, stack traces and internal 500 error messages are strictly restricted to `env.nodeEnv === "development"`. Suppressed in production, test, and staging. | **PASS** |
| **AUD-08** | Soft-deleted employee records block email reuse | Root cause analyzed (global unique index `email_1`). Evaluated options A & B; established as explicit release condition without modifying production database unilaterally. | **RELEASE CONDITION** |
| **AUD-09** | Admin deletion race condition leaving 0 active Superadmins | Serialized admin lifecycle operations via `withAdminMutationLock` in `admin.service.js`. Concurrent deletions cannot bypass the last-superadmin invariant. | **PASS** |
| **AUD-10** | Concurrent role/status changes leaving 0 active Superadmins | Wrapped `updateAdminRole` and `updateAdminStatus` inside `withAdminMutationLock`. Concurrent demotions/deactivations cannot leave zero active superadmins. | **PASS** |

---

## 3. Real MongoDB Version and Isolated Test Database Confirmation

- **MongoDB Instance:** Local MongoDB Server **v8.0.26** (Engine: WiredTiger).
- **Topology:** Replica Set (`rs0`), Primary / Writable verified.
- **Isolated Database:** `ashivam_audit_isolated` (`mongodb://127.0.0.1:27017/ashivam_audit_isolated`).
- **Isolation Guarantee:** Absolutely zero production credentials, network connections, or data were used. Isolated database was freshly provisioned, validated, and cleaned up.

---

## 4. Exact Test Commands and Results

### 4.1 Focused Audit Invariant Regression Suite
- **Command:** `node --test backend/tests/audit-regression-invariants.test.js`
- **Result:** **10 / 10 PASSED** (0 failed, 3,097 ms)
  - `ok 1 - AUD-01 - listPublicEmployees does not expose private or sensitive employee fields`
  - `ok 2 - AUD-02 - Production CORS strictly validates origins without wildcard bypass`
  - `ok 3 - AUD-03 - Login runs password comparison path for unknown or inactive usernames`
  - `ok 4 - AUD-04 - General admin update cannot bypass self-demotion or last-superadmin protections`
  - `ok 5 - AUD-05 - Password changes invalidate previously issued access tokens`
  - `ok 6 - AUD-06 - JWT explicitly enforces HS256 algorithm and rejects algorithm confusion`
  - `ok 7 - AUD-07 - Stack traces and internal paths are strictly hidden outside development`
  - `ok 8 - AUD-08 - Validates soft-delete email unique constraint and partial index behavior on real MongoDB`
  - `ok 9 - AUD-10 - Concurrent demotions cannot leave zero active Superadmins`
  - `ok 10 - AUD-09 - Concurrent deletions cannot leave zero active Superadmins (Admin Delete Race)`

### 4.2 Full Backend Automated Suite
- **Command:** `npm test --prefix backend`
- **Result:** **125 / 125 PASSED** across 14 test files (0 failed, 6,654 ms)

### 4.3 Full Frontend Automated Suite
- **Command:** `npm test -- --watchAll=false`
- **Result:** **65 / 65 PASSED** across 8 test files (0 failed, 427 ms)

### 4.4 Cumulative Test Coverage
- **Total Automated Test Cases:** **190 / 190 PASSED (100% pass rate)**

### 4.5 Dependency Security Audit
- `npm audit --prefix backend`: **0 vulnerabilities**
- `npm audit`: **0 vulnerabilities**

---

## 5. AUD-08 Decision and Migration Status

### Root Cause Analysis
In `backend/src/modules/employee/employee.model.js`, `email` defines `unique: true`. Mongoose automatically generates a global unique index `{ email: 1 }`. When an employee is soft-deleted, `deletedAt` is populated, but the document persists in MongoDB. Any subsequent attempt to create an employee with the same email triggers an `E11000 duplicate key error`. No restore or reactivation workflow currently exists.

### Evaluation of Options
- **Option A (Recommended): Partial Unique Index**
  - Create the partial unique index first, verify it, and only then drop the global `email_1` index:
    ```javascript
    // 1. Create partial unique index FIRST
    db.employees.createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { deletedAt: null }, name: "email_active_unique", background: true }
    );
    // 2. Verify creation in MongoDB
    db.employees.getIndexes();
    // 3. Drop legacy global index only after verification
    db.employees.dropIndex("email_1");
    ```
  - *Benefits:* Allows rehire / email reuse after soft deletion while strictly preserving uniqueness among active employees.
  - *Rollback:* Create `email_1` first, verify, then drop `email_active_unique`:
    ```javascript
    // 1. Verify zero duplicates across all records
    // 2. Create global unique index FIRST
    db.employees.createIndex({ email: 1 }, { unique: true, name: "email_1", background: true });
    // 3. Drop partial index only after global index is verified
    db.employees.dropIndex("email_active_unique");
    ```
- **Option B: Preserve Global Uniqueness with Restore Workflow**
  - Keep global unique index and implement `POST /api/v1/employees/:id/restore`. If a duplicate email is submitted, the admin is prompted to restore the existing archived record.

### Current Status
In accordance with strict safety mandates, **no index was dropped or altered in production MongoDB Atlas**. AUD-08 is documented as an **explicit release condition** awaiting business owner selection between Option A and Option B.

---

## 6. Admin-Delete Race Status

- **Status:** **RESOLVED AND VERIFIED.**
- **Implementation:** Both `deleteAdmin` and role/status modification methods now run under `withAdminMutationLock` in `backend/src/modules/admin/admin.service.js`.
- **Behavior Under Concurrency:** Two concurrent requests attempting to delete or demote the two remaining active Superadmins are serialized in-process. The first request succeeds, reducing active count to 1. The second request re-evaluates `countDocuments` under the lock and is rejected with HTTP 400: *"At least one active Superadmin is required"*.
- **Verification:** Verified via integration test `AUD-09` against real MongoDB 8.0.

---

## 7. CORS and Deployment Compatibility

- **Production CORS Allowlist:**
  - `https://ashivam.com`
  - `https://www.ashivam.com`
  - `https://ashivam-tec-h.vercel.app` (Production Web)
  - `https://ashivamtechnologies.com`
  - `https://www.ashivamtechnologies.com`
- **Compatibility:** Exact match confirmed for `https://ashivam-tec-h.vercel.app`. Wildcard `*.vercel.app` attacker origins and arbitrary localhost origins are rejected in production.
- **Health Probes:**
  - Liveness probe: `GET /api/v1/health/liveness` (returns HTTP 200 `status: alive`).
  - Readiness probe: `GET /api/v1/health` (returns HTTP 200 `database: connected`).

---

## 8. Commit Hash and Push Result

- **Commit Hash:** `c4ab9df`
- **Commit Message:** `fix(security): address backend audit findings (AUD-01 to AUD-07, AUD-09, AUD-10)`
- **Target Branch:** `main`
- **Remote:** `origin` (`https://github.com/Ritikgupta-tech/ashivam-tecH.git`)
- **Push Execution:** `git push origin main`
- **Result:** `5dcbecb..c4ab9df main -> main` (Fast-forward, 0 commits ahead, 0 commits behind, clean working tree).

---

## 9. Actual Production Deployment Status

- **Live HTTP Health Probe (`GET https://ashivam-tech.onrender.com/api/v1/health`):**
  - **HTTP Status:** 200 OK
  - **Database Status:** `connected`
  - **Environment:** `production`
  - **Uptime:** Container rebooted with new deployment (`uptimeSeconds: 11`).
- **Live HTTP Liveness Probe (`GET https://ashivam-tech.onrender.com/api/v1/health/liveness`):**
  - **HTTP Status:** 200 OK (`status: alive`).
- **Live Frontend Availability (`GET https://ashivam-tec-h.vercel.app/`):**
  - **HTTP Status:** 200 OK.

---

## 10. Outstanding Release Blockers and Residual Risks

1. **Horizontal Scaling Admin Mutex (Residual Risk):**
   - The in-process lock `withAdminMutationLock` serializes concurrent admin deletions and demotions across all requests within a single Node.js container instance (Render standard deployment).
   - If horizontal multi-instance scaling is provisioned in the future, a MongoDB replica set multi-document ACID transaction or distributed Redis mutex should be introduced.
2. **AUD-08 Product Owner Sign-Off (Release Condition):**
   - Owner decision needed between Option A (partial unique index) and Option B (restore workflow) prior to executing an Atlas index migration.
3. **Cloud Console Visibility:**
   - Render runtime environment variables (`SMTP_PASSWORD`, `BREVO_API_KEY`) and Atlas Network Access IP allowlists remain verifiable only through their respective web management consoles.

---

## 11. Confirmation of Production Safety

- **Production Contact Form Submissions:** **0** (No calls to `POST /api/v1/inquiries` were made).
- **Outbound Emails Dispatched:** **0** (No SMTP, Brevo, or Resend delivery calls were made).
- **Production Database Modifications:** **0** (No production Atlas records or indexes were created, updated, or dropped).
- **Secrets & Credentials Exposed:** **0** (No secret values or `.env` contents were logged).
