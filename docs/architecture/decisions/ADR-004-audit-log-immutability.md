# ADR-004: Audit Log Immutability, Tamper Resistance, and Non-Repudiation

## Status
Accepted

## Context
The Ashivam Technologies administrative platform records audit events for administrative actions, authentication attempts, employee modifications, document access, and role changes.

Previously, the API exposed endpoints `DELETE /api/v1/audit/:id` and `DELETE /api/v1/audit` accessible by Superadmins. Allowing administrative users to delete or clear audit trails violates enterprise security principles (SOC 2, ISO 27001), undermines non-repudiation, and creates a critical vulnerability: if an attacker gains Superadmin credentials, they could wipe the audit logs to conceal unauthorized actions or data exfiltration.

## Decision
1. **Strict Immutability Enforced at Mongoose Model Layer:**
   Attach Mongoose pre-query middleware hooks in `audit.model.js` covering `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `findOneAndDelete`, and `findOneAndRemove`. Any programmatic attempt to modify or delete audit log documents throws an error:
   `"Audit logs are strictly append-only and immutable for compliance and non-repudiation."`
2. **HTTP 403 Forbidden on Deletion Endpoints:**
   Update `removeAuditLog` and `removeAuditLogs` in `audit.controller.js` to reject any DELETE request with HTTP 403 Forbidden. Furthermore, any invocation logs an immutable `SECURITY_VIOLATION_ATTEMPT` audit entry.
3. **Programmatic Service Rejection:**
   Update `deleteAuditLog` and `clearAuditLogs` in `audit.service.js` to unconditionally throw an error.
4. **Export-Only Retention Strategy:**
   Audit logs may only be queried (`GET /api/v1/audit`) or exported to CSV (`GET /api/v1/audit/export`). Long-term retention is managed via secure cold storage archives rather than manual in-app purging.

## Consequences
### Positive
- Strict compliance with enterprise regulatory, legal, and security audit standards.
- Non-repudiation guarantee: malicious actors cannot erase footprints even with compromised credentials.
- Automatic logging of unauthorized tampering attempts.

### Negative / Trade-offs
- Audit log collection size grows indefinitely over time (mitigated by indexed compound queries and pagination).
- Archival must be handled at the database level via MongoDB TTL or external automated backup retention scripts.
