# Ashivam Technologies — Audit Log Security Design & Immutability

## 1. Compliance & Security Architecture
Enterprise audit guidelines mandate that audit trails recording security events and administrative mutations must be protected against tampering:
- **Append-Only:** Existing audit log entries cannot be modified or updated via application interfaces.
- **Application-Level Immutability:** Mongoose document and query middleware strictly intercepts and rejects all update, replacement, and deletion attempts.
- **Traceable Attribution:** Captures actor ID, username, role, IP address, user agent, HTTP method, path, target entity ID, and status.

> [!NOTE]
> **Immutability Scope & Boundary:**
> Mongoose middleware enforces **application-level protection** preventing modifications through Express controllers, background services, and Mongoose queries. It is not hardware WORM storage. Operations performed directly through the low-level MongoDB driver (`collection.updateOne`) or database administration tools (`mongosh`, Compass) bypass Mongoose middleware and must be restricted by provisioning least-privilege MongoDB IAM database user accounts without drop or delete privileges.

---

## 2. Technical Architecture & Enforcement Points

### 2.1 Mongoose Model Middleware Interception
In [`backend/src/modules/audit/audit.model.js`](file:///c:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/audit/audit.model.js), document and query middleware hooks intercept all mutation and deletion methods:

```javascript
const forbidAuditMutation = function () {
  const err = new Error(
    "Audit logs are strictly append-only and immutable for compliance and security."
  );
  err.statusCode = 403;
  throw err;
};

// Document-level middleware: forbid updating an existing audit document via save()
auditLogSchema.pre("save", function () {
  if (!this.isNew) {
    forbidAuditMutation();
  }
});

// Query-level middleware: forbid all update, replacement, and deletion queries
auditLogSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "findOneAndRemove",
  ],
  forbidAuditMutation
);
```

### 2.2 Controller & Route Hardening
- Any HTTP `DELETE /api/v1/audit/:id` or `DELETE /api/v1/audit` request immediately returns HTTP 403 Forbidden:
  `{ success: false, message: "Audit logs are strictly append-only and immutable. Deletion is prohibited for compliance and security." }`
- The controller automatically logs a high-priority `SECURITY_VIOLATION_ATTEMPT` audit event recording the actor's identity, IP address, and attempted action.
- Violation logging includes safety handling (`.catch()`) ensuring that logging failures cannot create recursive error loops or cause 500 errors.

### 2.3 Export & Compliance Auditing
Authorized administrators can review logs via paginated search (`GET /api/v1/audit`) and export CSV streams (`GET /api/v1/audit/export`) for external compliance archival. All CSV formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are neutralized with prepended single quotes.
