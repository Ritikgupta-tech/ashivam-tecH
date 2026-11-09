# ASHIVAM TECHNOLOGIES — RESILIENCE & FAILURE RECOVERY SPECIFICATION
## Phase 6: Fault Tolerance, Backoff Retries & Operational Reconciliation

---

## 1. Resilience Philosophy

In distributed inter-service systems, network partitions, temporary restarts, and downstream rate limiting are expected operational events. Systems must:
1. **Never drop data:** Outbound handoffs must persist in the sender's local database before dispatch.
2. **Never block the user:** Inbound user requests (e.g., candidate application submission) must succeed immediately regardless of downstream availability.
3. **Gracefully recover:** Outbound dispatchers retry with bounded exponential backoff and provide administrative reconciliation APIs.

---

## 2. Bounded Exponential Backoff Schedule

When a downstream service is unreachable or responds with a $5\text{xx}$ error, the sender records the attempt and schedules the next retry using bounded exponential backoff with jitter:

$$t_{\text{retry}} = \min(t_{\text{max}}, t_{\text{base}} \times 2^{\text{attempt}}) \pm \text{jitter}$$

- Base Interval ($t_{\text{base}}$): 15 seconds
- Multiplier: $2\times$
- Maximum Interval ($t_{\text{max}}$): 30 minutes
- Maximum Retry Attempts: 5 attempts
- After 5 failed attempts, the record moves to status `FAILED` and an operational alert is dispatched to `ritik95061@gmail.com`.

---

## 3. Administrative Reconciliation APIs

For automated monitoring and emergency operational recovery, both the Website and Internship Management systems provide protected reconciliation endpoints:

### 3.1 Website Reconciliation Endpoint
- **Path:** `POST /api/v1/integrations/reconcile`
- **Authorization:** `requireRole('Superadmin', 'Admin')`
- **Behavior:** Queries `IntegrationHandoff` for records in `RETRYING` or `FAILED` status with `attemptCount < 5`, re-dispatches each, and reports batch statistics.

### 3.2 Internship Management Reconciliation Endpoint
- **Path:** `POST /api/v1/integrations/reconcile`
- **Authorization:** `requireRole(ROLES.DIRECTOR)`
- **Behavior:** Queries `ConversionHandoff` for proposals in `PENDING_DISPATCH` or `FAILED`, re-dispatches signed payloads to HRMS, and reports counts.
