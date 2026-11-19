# Database Integrity & Concurrency Architecture Report
**Ashivam Technologies Official Platform — Production HRMS & Attendance System**
**Date:** 2026-11-19  
**Classification:** Database Architecture & Reliability Engineering  
**Integrity Status:** **PASS — ALL INVARIANTS & CONCURRENCY CONTROLS VERIFIED**  

---

## 1. Executive Summary

This report evaluates database integrity, index structures, document invariants, and concurrency safety across the employee lifecycle and authentication subsystem of Ashivam Technologies.

---

## 2. Model Architecture & Index Specifications

### 1. `Employee` Model Indexes
To guarantee fast query execution and strict data integrity, the following indexes are actively enforced on `backend/src/modules/employee/employee.model.js`:

| Index Keys | Options | Purpose |
| :--- | :--- | :--- |
| `{ email: 1 }` | `unique: true, partialFilterExpression: { deletedAt: null }` | Enforces unique email among all active employees while permitting re-use after soft-deletion. |
| `{ employeeId: 1 }` | `unique: true, sparse: true, partialFilterExpression: { deletedAt: null }` | Guarantees uniqueness of corporate `ASH-EMP-XXXX` identifiers. |
| `{ googleEmail: 1 }` | `sparse: true` | Fast indexing for Google Meet participant email reconciliation. |
| `{ accountStatus: 1 }` | Standard | High-speed filtering by account standing in the Admin Portal. |
| `{ employmentStatus: 1 }` | Standard | High-speed filtering by HR employment standing. |
| `{ activationTokenHash: 1 }` | `sparse: true` | Instant $O(1)$ lookup for activation token redemption (`select: false`). |
| `{ resetPasswordTokenHash: 1 }` | `sparse: true` | Instant $O(1)$ lookup for password reset token redemption (`select: false`). |

### 2. Immutability of Audit Logs
The `AuditLog` collection strictly forbids mutations and deletions at both document and query middleware levels:
```javascript
const forbidAuditMutation = function () {
  const err = new Error("Audit logs are strictly append-only and immutable for compliance and security.");
  err.statusCode = 403;
  throw err;
};
```
Any `deleteMany`, `deleteOne`, or `updateOne` query against `AuditLog` immediately aborts with a 403 status, preventing tampered compliance records.

---

## 3. Concurrency Safety & Race Condition Defense

1. **Atomic Employee ID Allocation:**
   - Instead of reading count and incrementing in memory, `Counter.findByIdAndUpdate({ _id: "employeeId" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })` ensures concurrent admin creations never collide on duplicate IDs.
2. **Concurrent Activation Defense:**
   - Both `activateEmployeeAccount` and `resetEmployeePassword` atomically verify that the token hash matches and wipe the hash in the exact same write operation.
   - If two concurrent requests arrive with the same token, the first write removes the token hash; the second write finds `null` and fails with `400 Bad Request`.
3. **Session Revocation on State Transitions:**
   - Deactivating an employee or changing passwords executes `RefreshToken.updateMany({ userId: employee._id }, { $set: { isRevoked: true } })`, terminating all outstanding token families.
