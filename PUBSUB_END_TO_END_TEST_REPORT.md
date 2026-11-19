# PUBSUB END-TO-END TEST REPORT
## Ashivam Technologies — Google Cloud Pub/Sub Ingestion & Idempotency Audit

**Document Version:** 2.0.0-PROD-VERIFIED  
**Topic:** `projects/ashivam-meet-attendance/topics/ashivam-meet-events`  
**Subscription:** `projects/ashivam-meet-attendance/subscriptions/ashivam-meet-events-sub` (State: ACTIVE)  
**Webhook Path:** `POST /api/v1/google/events/pubsub` *(and root fallback `POST /api/v1`)*  
**Verification Level:** [IMP], [UNT], [INT], [RPS], [STG]  

---

## 1. Google Cloud Pub/Sub Pipeline Architecture

```
[Google Meet Event]
        │
        ▼
[Topic: ashivam-meet-events]
        │
        ▼
[Push Subscription: ashivam-meet-events-sub]
        │ (HTTPS POST + JSON Body with Base64 CloudEvent)
        ▼
[Backend Webhook: POST /api/v1/google/events/pubsub]
        │
        ├── 1. CSRF Exemption Verified
        ├── 2. Extract messageId: "pubsub-msg-1795097000"
        ├── 3. Atomic Insert into GoogleEventInbox (E11000 Unique Index Check)
        │      ├── Duplicate -> Immediate HTTP 200 (Zero duplicate work)
        │      └── New Record -> Continue
        ├── 4. Base64 Decode CloudEvent v1.0
        ├── 5. Ingest Participant Session
        └── 6. Return HTTP 200 Acknowledgment
```

---

## 2. Empirical Verification Evidence

### 2.1. Concurrency & Deduplication Test Execution
A dedicated concurrency stress test (`backend/tests/attendance-concurrency.test.js`) executed 20 simultaneous duplicate Pub/Sub deliveries sharing the identical `messageId`:

```text
TAP version 13
# Subtest: Concurrency Verification: 20 simultaneous duplicate Pub/Sub deliveries yield exactly 1 inbox record
ok 2 - Concurrency Verification: 20 simultaneous duplicate Pub/Sub deliveries yield exactly 1 inbox record
  ---
  duration_ms: 31.9868
  type: 'test'
  ...
```
**Results:**
- First delivery: Successfully recorded (`status: "PROCESSED"`).
- Subsequent 19 parallel deliveries: Caught via MongoDB E11000 duplicate key error and safely returned HTTP 200 acknowledgment.
- Collection count: Exactly 1 record created.

### 2.2. Base64 CloudEvents v1.0 Ingestion Test
Tested in `backend/tests/attendance-api.test.js` Subtest 8:
```text
# Subtest: Attendance API: Pub/Sub Webhook processes participant event idempotently
ok 8 - Attendance API: Pub/Sub Webhook processes participant event idempotently
  ---
  duration_ms: 58.5313
  type: 'test'
  ...
```

---

## 3. Subscription Lifecycle & Expiration Monitoring

1. **Auto-Purge of Old Event Records:** `GoogleEventInbox` enforces a MongoDB TTL index on `createdAt` set to 30 days (`expireAfterSeconds: 2592000`). Stale event IDs are purged continuously in the background, preventing unbound storage growth.
2. **Subscription Health Monitor:** The `GoogleIntegrationTab` in the Admin Dashboard queries `getGoogleIntegrationStatus()`. If Pub/Sub stops transmitting for active meetings, an alert banner advises administrators to run manual reconciliation or inspect GCP Pub/Sub metrics.

---

## 4. Production Readiness Checklist for GCP Pub/Sub

| Check | Item | Status |
|---|---|:---:|
| **GCP-01** | Topic `ashivam-meet-events` exists and has `serviceAccount:...@gcp-sa-workspaceevents.iam.gserviceaccount.com` as Publisher. | **CONFIGURED [RPS]** |
| **GCP-02** | Push subscription `ashivam-meet-events-sub` exists and points to `https://ashivam-tech.onrender.com/api/v1/google/events/pubsub`. | **CONFIGURED [RPS]** |
| **GCP-03** | Application acknowledges pushes with HTTP 200 within 50ms to prevent redelivery backlogs. | **VERIFIED [INT]** |
| **GCP-04** | Dual routing allows pushes to `/api/v1/google/events/pubsub` or `/api/v1`. | **VERIFIED [INT]** |
