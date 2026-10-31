# ASHIVAM TECHNOLOGIES — TARGETED REMEDIATION & FINAL ENGINEERING REPORT

**Document ID:** `DOC-TARGETED-REMEDIATION-2026-FINAL`  
**Evaluation Target:** Ashivam Technologies Production Platform  
**Monorepo Location:** `C:/Users/DELL/Desktop/Official-Website-main`  
**Production Frontend Target:** `https://ashivam-tec-h.vercel.app`  
**Production Backend Target:** `https://ashivam-tech.onrender.com/api/v1`  
**Staging Frontend Checked:** `https://ashivam-tec-h-staging.vercel.app` (Status: 404 Not Found)  
**Staging Backend Checked:** `https://ashivam-tech-staging.onrender.com/api/v1` (Status: 404 Not Found)  
**Company Entity:** Ashivam Technologies, Agra, Uttar Pradesh, India  
**Brand Tagline:** *"Endless Innovation. Limitless Possibilities."*  
**Authorized Notification Recipient:** `team.ashivam@gmail.com`  
**Authenticated SMTP Sender:** `teamashivam@gmail.com`  
**Report Date:** October 31, 2026  

---

## SECTION A — REMEDIATION SUMMARY

This targeted engineering remediation addresses the six specific issues identified during the deployment gate review:
1. **Issue 1:** Correct automated test result accounting and separation of build/repository verification gates.
2. **Issue 2:** Cross-tab authentication refresh synchronization via Web Locks API and BroadcastChannel messaging without credential exposure.
3. **Issue 3:** MongoDB transactional outbox consistency, crashed worker lease recovery, monotonic fencing tokens, and transparent at-least-once delivery semantics.
4. **Issue 4:** Audit log mutation protection across all Mongoose document and query methods, recursion-safe violation logging, and accurate application-level vs database-level immutability terminology.
5. **Issue 5:** In-memory DOCX OpenXML structural validation (anti-ZIP bomb, entry verification, path traversal checks) and strict path confinement on HR document downloads.
6. **Issue 6:** Technical correction of SSRF explanation in architecture documentation, replacing incorrect `sessionStorage` claims with accurate client storage analysis and dedicated server-side SSRF defenses.

---

## SECTION B — CONFIRMED FINDINGS & REMEDIATION EVIDENCE

### 1. Issue 1: Correct Automated Test Accounting
- **Previous Condition:** The prior report claimed 324 passed tests, conflating build and whitespace checks with the automated test count (which was actually 227 + 77 + 19 = 323).
- **Actual Evidence:** Executing the actual npm package scripts produced verified results:
  - Backend: 229 passed, 0 failed, 0 skipped.
  - Frontend: 77 passed, 0 failed, 0 skipped.
  - Playwright E2E: 19 passed, 0 failed, 0 skipped.
  - Calculated Total Automated Tests: **325 passed**.
- **Fix Applied:** Separated automated test metrics from static verification gates (Vite production build and Git whitespace check).

### 2. Issue 2: Cross-Tab Authentication Refresh Synchronization
- **Previous Condition:** The client used an in-memory `isRefreshing` variable inside `src/api.js`. In-memory variables are scoped strictly to a single JavaScript context (tab). Two independent tabs could simultaneously trigger refresh calls with the same rotated token, causing the backend to flag a replay attack and revoke the whole family.
- **Actual Evidence:** In multi-tab scenarios, Tab 2 sent the previous refresh token before Tab 1's Set-Cookie was committed, risking session revocation.
- **Fix Applied:**
  - In [`src/api.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/src/api.js): Wrapped `executeTokenRefresh` in the `navigator.locks` Web Locks API (`ashivam_auth_refresh_lock`), serializing refresh calls across all browser tabs. When Tab 2 acquires the lock, it sends the freshly updated cookie set by Tab 1.
  - Added `BroadcastChannel('ashivam_auth_sync')` broadcasting `LOGOUT` and `SESSION_REFRESHED` events.
  - Strictly **zero** access tokens or refresh tokens are transmitted over BroadcastChannel.
  - In [`src/context/AuthContext.jsx`](file:///c:/Users/DELL/Desktop/Official-Website-main/src/context/AuthContext.jsx): Subscribed to `ashivam_auth_sync` to immediately synchronize logged-out state and re-verify sessions across open tabs.
  - In [`tests/e2e-browser-staging.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/tests/e2e-browser-staging.js): Enhanced `E2E-CONC-01` and `E2E-AUTH-05` to verify simultaneous API requests across two independent tabs sharing the same browser context, verifying that both tabs succeed (HTTP 200) and that logging out in Tab 1 synchronizes Tab 2.

### 3. Issue 3: Transactional Outbox Atomicity and Worker Recovery
- **Previous Condition:** The outbox worker in `outbox.service.js` lacked lease timeouts, crashed worker recovery, and fencing tokens. If a worker process died while holding a job in `status: 'processing'`, the job remained stuck forever.
- **Actual Evidence:** `processPendingOutbox` queried only `status: { $in: ["pending", "failed"] }`, omitting abandoned `processing` jobs.
- **Fix Applied:**
  - In [`backend/src/models/outbox.model.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/models/outbox.model.js): Added `lockedAt`, `lockedBy`, `leaseExpiresAt`, and monotonic `fencingToken` fields with compound index `{ status: 1, leaseExpiresAt: 1 }`.
  - In [`backend/src/modules/notification/outbox.service.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/notification/outbox.service.js):
    - Configured atomic lease acquisition with `leaseExpiresAt = now + 5 minutes`.
    - Enhanced `processPendingOutbox` to reclaim abandoned jobs where `status === 'processing'` and `leaseExpiresAt <= now`.
    - Enforced atomic completion checking `fencingToken: currentFencingToken`, preventing stale workers from overwriting reclaimed jobs.
    - Suppressed immediate outbox execution when participating in an uncommitted MongoDB transaction session.
  - Documented delivery semantics: Formally established **at-least-once delivery guarantees**. A crash between SMTP server acceptance and MongoDB update will trigger a retry upon lease expiry, resulting in duplicate delivery.

### 4. Issue 4: Audit Log Immutability Claims and Mutation Paths
- **Previous Condition:** Mongoose query middleware only covered `['updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove']`. Operations such as `findOneAndUpdate`, `replaceOne`, `findOneAndReplace`, and document `save()` on existing records were not blocked. Documentation also claimed cryptographic non-repudiation and WORM storage.
- **Actual Evidence:** Calling `log.save()` on an already-created document or calling `findOneAndUpdate()` bypassed the previous hooks.
- **Fix Applied:**
  - In [`backend/src/modules/audit/audit.model.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/audit/audit.model.js): Added document pre-save hook `if (!this.isNew) forbidAuditMutation()` and expanded query pre-hooks to cover `['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove']`.
  - In [`backend/src/modules/audit/audit.controller.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/audit/audit.controller.js): Wrapped violation audit logging with `.catch()` to prevent recursive failure loops, ensuring the endpoint reliably returns HTTP 403 Forbidden.
  - Corrected terminology: Clarified in documentation that Mongoose middleware provides application-level write-protection. Direct operations via database drivers or the `mongosh` CLI bypass Mongoose and must be governed by database IAM user permissions.

### 5. Issue 5: File Upload Validation, DOCX Structure, and Download Authorization
- **Previous Condition:** DOCX validation only checked the 4-byte `PK\x03\x04` header, which allowed arbitrary ZIP archives to masquerade as Word documents.
- **Actual Evidence:** Any non-DOCX ZIP archive was accepted as `.docx`.
- **Fix Applied:**
  - In [`backend/src/services/storage.service.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/services/storage.service.js): Implemented `validateDocxStructure(buffer)`. It inspects the ZIP local and central directory headers entirely in memory without writing to disk:
    - Enforces max 500 entries (anti-ZIP bomb).
    - Enforces max 50MB total uncompressed size.
    - Rejects directory traversal entries (`..`, `/`, `\`).
    - Verifies presence of OpenXML DOCX components (`[Content_Types].xml` and `word/document.xml`).
  - In [`backend/src/modules/hr-document/hrDocument.service.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/hr-document/hrDocument.service.js): Enforced path confinement in `getDocumentFile` verifying that the target file path resides strictly inside `UPLOAD_DIRECTORY`.
  - Confirmed download authorization: All HR document download and view routes require valid admin authentication and the `employees` RBAC permission.

### 6. Issue 6: Technical Correction of SSRF Documentation
- **Previous Condition:** The statement *"sessionStorage prevents SSRF exposure"* was present in `ENTERPRISE_IMPLEMENTATION_REPORT.md`.
- **Actual Evidence:** SSRF (Server-Side Request Forgery) is a server-side vulnerability occurring when a server fetches an attacker-controlled remote URL. Browser `sessionStorage` has zero relationship with SSRF.
- **Fix Applied:**
  - Corrected `sessionStorage` explanation: `sessionStorage` is a client-side web storage mechanism scoped to an individual browser tab. It prevents unintended credential leakage across tabs in shared workstation scenarios and avoids automatic transmission compared to ambient cookies, but does not prevent XSS (as JavaScript can read `sessionStorage`).
  - Formally explained SSRF separately: Server-Side Request Forgery is mitigated on the backend via URL scheme validation (`http:`, `https:` only), loopback/private IP blocking (`127.0.0.1`, `localhost`, RFC 1918 subnets) in `normalizeHttpUrl`, strict DNS resolution checks, and request timeouts.

---

## SECTION C — TEST EXECUTION RESULTS

| Test Suite / Category | Suite Location | Total Tests | Passed | Failed | Skipped | Status | Duration |
|---|---|---:|---:|---:|---:|---|---:|
| **Backend Test Suite** | `backend/tests/*.test.js` (12 suites) | 229 | 229 | 0 | 0 | **PASS** | 11.61s |
| **Frontend Unit Suite** | `tests/*.test.jsx` (2 suites) | 77 | 77 | 0 | 0 | **PASS** | 0.53s |
| **Playwright Browser E2E** | `tests/e2e-browser-staging.js` | 19 | 19 | 0 | 0 | **PASS** | 14.85s |
| **TOTAL AUTOMATED TESTS** | **All Automated Test Suites** | **325** | **325** | **0** | **0** | **100% PASS** | **26.99s** |

### Static & Quality Verification Gates (Reported Separately)

| Verification Gate | Command | Scope | Result | Details |
|---|---|---|---|---|
| **Vite Production Build** | `npm run build` | 101 client modules | **PASS** | Built in 281ms (dist/assets/index.js: 526kB, css: 163kB) |
| **Git Whitespace Check** | `git diff --check` | Working copy diff | **PASS** | 0 whitespace or formatting errors |

---

## SECTION D — DEPLOYMENT RESULTS & STAGING VERIFICATION

### 1. Staging Infrastructure Status
- Staging frontend checked: `https://ashivam-tec-h-staging.vercel.app` -> **HTTP 404 Not Found** (Project not provisioned on Vercel).
- Staging backend checked: `https://ashivam-tech-staging.onrender.com/api/v1/health` -> **HTTP 404 Not Found** (Web service not provisioned on Render).
- **Finding:** Remote staging infrastructure does not currently exist. Local full-stack staging simulation was verified via Playwright against live local services.

### 2. Production Target Status
- Production frontend: `https://ashivam-tec-h.vercel.app` -> **HTTP 200 OK** (Active).
- Production backend: `https://ashivam-tech.onrender.com/api/v1/health` -> Render web service (sleeping instance on free tier).
- **Production Deployment Status:** **HELD AT GATE**. In accordance with Section 11 of the master prompt, production deployment is strictly blocked until remote staging infrastructure is provisioned and verified. No unauthorized deployments or credential changes were executed.

---

## SECTION E — REMAINING RISKS & PREREQUISITES

1. **Remote Cloud Staging Environment Provisioning:**
   - Isolated staging resources (Vercel preview project, Render staging web service, isolated staging MongoDB Atlas cluster) must be provisioned before final cloud deployment.
2. **At-Least-Once Email Delivery:**
   - The Transactional Outbox pattern guarantees at-least-once delivery. If the container is killed after SMTP accepts a message but before MongoDB updates the job to `sent`, the sweeper will re-deliver the email upon lease recovery.
3. **Database-Level Immutability:**
   - Mongoose middleware enforces application-level protection. Direct access via `mongosh` or administrative database drivers bypasses Mongoose and must be secured via MongoDB user roles.

---

## SECTION F — FINAL READINESS CLASSIFICATION

Authoritative Assessment Gate Status:

# **`LOCAL FULL-STACK VERIFIED`**

**Sign-off Rationale:**
- All six targeted issues have been resolved directly in repository source code with zero scope creep.
- Automated tests pass with 100% success rate: **229 backend tests**, **77 frontend tests**, **19 Playwright browser E2E tests** (Total: **325 automated tests**).
- Production build succeeds in 281ms; zero whitespace errors.
- Codebase is ready for staging deployment as soon as staging cloud infrastructure is provisioned.
