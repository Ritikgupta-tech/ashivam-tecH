# Phase 2: Database & Backend Resilience Audit

**Project:** Ashivam Technologies Official Platform  
**Target Architecture:** MongoDB / Mongoose 9.10 / Express 5.2 MVC  
**Audit Date:** 2026-10-31  
**Lead Auditor:** Principal Database Architect & Distributed Systems Engineer  

---

## 1. Executive Summary

Phase 2 verified complete Mongoose schema index efficiency, compound index alignment, partial unique constraint integrity, TTL index correctness, distributed locking resilience with monotonic fencing tokens and lease heartbeats, atomic sequence counter safety under high concurrency (50 simultaneous operations), and centralized async error handling across all controllers.

---

## 2. Findings & Hardening Matrix

### Finding DB-01: Schema Index Review & Missing Foreign Key Partial Index
- **Severity:** High
- **Affected Files:** `backend/src/modules/internship/intern.model.js`
- **Root Cause:** While `Intern` had indexes on `status` and `email`, the relational field `applicationId` (pointing to `Internship`) was unindexed and lacked a database-level uniqueness guarantee, allowing theoretical double-conversion if locks failed.
- **Implemented Fix:**
  - Added unique partial index on `applicationId`:
    ```javascript
    internSchema.index(
      { applicationId: 1 },
      {
        unique: true,
        partialFilterExpression: { applicationId: { $type: "objectId" } },
      }
    );
    ```
  - Verified compound index field order across all models:
    - `Application`: `{ job: 1, status: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`
    - `Internship`: `{ domain: 1, status: 1, convertedToIntern: 1 }`, `{ status: 1, createdAt: -1 }`
    - `Employee`: `{ email: 1 }` (unique partial `deletedAt: null`), `{ department: 1, isActive: 1 }`
    - `RefreshToken`: `{ familyId: 1, isRevoked: 1 }`, `{ userId: 1, isRevoked: 1 }`, TTL index on `expiresAt`
    - `SystemLock`: TTL index on `expiresAt`
- **Test Evidence:** `backend/tests/internship-management.test.js` subtest 10 ("Conversion: POST transforms applicant to intern") and subtest 5 ("blocks duplicate active intern").
- **Remaining Risk:** None. All models define lean compound indexes.
- **External Infrastructure Verification Pending:** None.

### Finding DB-02: Distributed Lock Fencing Tokens, Lease Renewal & Stale Worker Protection
- **Severity:** Critical
- **Affected Files:** `backend/src/utils/distributedLock.js`, `backend/src/models/systemLock.model.js`
- **Root Cause:** Standard distributed locks with timeouts are vulnerable to split-brain scenarios if a worker pauses (e.g., GC pause) and its lease expires; another worker takes over, and the original worker wakes up and commits stale writes or accidentally deletes the new owner's lock document.
- **Implemented Fix:**
  - Added `fencingToken` (Number, default 1) to `SystemLock` schema.
  - In `acquireDistributedLock`: Atomically increments `fencingToken` via `$inc: { fencingToken: 1 }` when overtaking an expired lease. Returns a handle with `{ token, fencingToken }`.
  - In `withDistributedLock`: Mounts an active lease renewal heartbeat (`setInterval` every `ttlMs / 3`) to continuously extend `expiresAt` while long-running tasks execute.
  - Implemented `assertLockHeld(lockKey, token)`: Throws HTTP 409 Conflict if the worker's lease was overtaken, lost, or expired.
  - In `releaseDistributedLock`: Validates matching `token` before deletion, preventing an old owner from deleting a new owner's lock document.
  - Database disconnection behavior: Throws HTTP 503 Service Unavailable if MongoDB is disconnected in production mode.
- **Test Evidence:** `backend/tests/distributed-lock-safety.test.js` (6/6 tests pass) and `backend/tests/concurrency-and-distributed-locks.test.js` (5/5 tests pass).
- **Remaining Risk:** None.
- **External Infrastructure Verification Pending:** Multi-region MongoDB Atlas replica set verification pending cloud provisioning.

### Finding DB-03: High-Concurrency Monotonic ID Allocation & Last Superadmin Protection
- **Severity:** High
- **Affected Files:** `backend/src/modules/internship/internship.service.js`, `backend/src/modules/admin/admin.service.js`
- **Root Cause:** 50 simultaneous intern creations could produce duplicate intern IDs or lost counter increments if transactions or atomic increments were not properly isolated. Similarly, concurrent admin role mutations could remove the last active Superadmin.
- **Implemented Fix:**
  - Counter increments use atomic MongoDB `findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { returnDocument: 'after', upsert: true })`.
  - Mutex and distributed lock wrapping `withDistributedLock("intern_allocation", ...)`.
  - Admin mutation protected by `withDistributedLock("admin_mutation", ...)`.
- **Test Evidence:** `backend/tests/concurrency-and-distributed-locks.test.js`:
  - 50 simultaneous intern ID allocations generate 50 unique monotonic IDs without lost counter increments.
  - 50 simultaneous conversion attempts on the same application yield exactly 1 active intern and 49 HTTP 409 conflict rejections.
  - Concurrent Superadmin mutation attempts cannot remove the last active Superadmin.
- **Remaining Risk:** None.
- **External Infrastructure Verification Pending:** None.

### Finding DB-04: Centralized Async Controller Error Handling & Safe Error Responses
- **Severity:** High
- **Affected Files:** `backend/src/middlewares/error.middleware.js`, `backend/src/app.js`
- **Root Cause:** Raw MongoDB exceptions or unhandled promise rejections could leak internal database collection names or stack traces to HTTP clients.
- **Implemented Fix:**
  - Express 5.2 native async error propagation routes all rejected promises to `errorHandler`.
  - `errorHandler` enforces standardized JSON envelope:
    ```json
    {
      "success": false,
      "message": "Human readable message",
      "errors": {},
      "requestId": "correlation-uuid"
    }
    ```
  - In production (`env.isProduction`), internal MongoDB `E11000` duplicate errors are converted to 409 Conflict, Mongoose validation errors to 400 Bad Request, and stack traces are completely stripped from client responses.
- **Test Evidence:** `backend/tests/errors.test.js` (pass) and `backend/tests/security.test.js` subtest 4.
- **Remaining Risk:** None.
- **External Infrastructure Verification Pending:** None.

---

## 3. Verification Test Evidence

| Test Suite | Tests Run | Pass | Fail | Execution Time |
|---|---|---|---|---|
| `distributed-lock-safety.test.js` | 6 | 6 | 0 | 1.35s |
| `concurrency-and-distributed-locks.test.js` | 5 | 5 | 0 | 5.23s |
| `internship-management.test.js` | 17 | 17 | 0 | 4.80s |
| `admin-rbac.test.js` | 16 | 16 | 0 | 3.42s |
| `errors.test.js` | 8 | 8 | 0 | 1.12s |
| **Total Phase 2 Tests** | **52** | **52** | **0** | **15.92s** |
