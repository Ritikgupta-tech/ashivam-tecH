# PUBSUB VERIFICATION REPORT
## Ashivam Technologies — Google Cloud Pub/Sub Webhook Architecture

**Document Version:** 1.0.0-PROD  
**Topic:** `projects/ashivam-meet-attendance/topics/ashivam-meet-events`  
**Subscription:** `projects/ashivam-meet-attendance/subscriptions/ashivam-meet-events-sub`  
**Push Endpoint:** `https://ashivam-tech.onrender.com/api/v1/google/events/pubsub`  
**Standard:** CloudEvents v1.0 over Google Cloud Pub/Sub Push Delivery  

---

## 1. Pub/Sub Delivery Topology & Data Flow

Google Cloud Pub/Sub push subscriptions forward real-time Google Workspace Events directly to our authenticated backend endpoint via HTTPS POST requests:

```
[Google Workspace Meet Service]
               │ (Produces event: participant joined/ended)
               ▼
[Google Cloud Pub/Sub Topic: ashivam-meet-events]
               │
               ▼
[Pub/Sub Subscription: ashivam-meet-events-sub]
               │ (Push HTTP POST with Base64 Encoded CloudEvent)
               ▼
[Express Server: POST /api/v1/google/events/pubsub]
               │
               ├── 1. Verify Shared Bearer Token (GOOGLE_PUBSUB_VERIFICATION_TOKEN)
               │
               ├── 2. Extract Pub/Sub Message ID (`message.messageId`)
               │
               ├── 3. Atomic Idempotency Check in `GoogleEventInbox`:
               │      INSERT { messageId, eventType, publishTime }
               │      ├── DUPLICATE (E11000) ──> Return 200 OK Immediately (Prevent Re-processing)
               │      └── NEW RECORD ──> Continue Processing
               │
               ├── 4. Decode Base64 Payload & Parse CloudEvent JSON
               │
               ├── 5. Ingest Participant Session (`sessionStartTime`, `sessionEndTime`)
               │
               ├── 6. Trigger Asynchronous Attendance Re-evaluation
               │
               ▼
[Return HTTP 200 OK ACK to Pub/Sub]
```

---

## 2. CloudEvents v1.0 Payload Parsing

Google Workspace Events deliver structured CloudEvents v1.0 envelopes encoded in the Pub/Sub message's `data` field. The backend ingestion layer decodes and validates this payload:

### 2.1. Supported Event Types
1. `google.workspace.meet.conference_record.v2.started`: Call initialized in space. Sets `Meeting.status = "ACTIVE"`.
2. `google.workspace.meet.conference_record.v2.ended`: Call concluded. Sets `Meeting.status = "COMPLETED"` and triggers definitive reconciliation.
3. `google.workspace.meet.participant.v2.joined`: Participant entered the room.
4. `google.workspace.meet.participant.v2.left`: Participant exited the room.
5. `google.workspace.meet.participant_session.v2.started`: Sub-session connection started.
6. `google.workspace.meet.participant_session.v2.ended`: Sub-session connection ended. Ingests precise `sessionStartTime` and `sessionEndTime`.

### 2.2. Sample Decoded Payload Structure
```json
{
  "@context": "https://cloudevents.io/spec/v1.0/",
  "specversion": "1.0",
  "id": "event-9843-abcd-2026",
  "source": "//meet.googleapis.com/spaces/abc-defg-hij",
  "type": "google.workspace.meet.participant_session.v2.ended",
  "time": "2026-11-19T05:15:00.120Z",
  "datacontenttype": "application/json",
  "data": {
    "session": {
      "name": "spaces/abc-defg-hij/conferenceRecords/conf-1001/participants/part-2001/participantSessions/sess-3001",
      "startTime": "2026-11-19T04:31:15Z",
      "endTime": "2026-11-19T05:14:45Z"
    },
    "participant": {
      "name": "spaces/abc-defg-hij/conferenceRecords/conf-1001/participants/part-2001",
      "signedinUser": {
        "user": "rohan.google@gmail.com",
        "displayName": "Rohan Verma"
      }
    }
  }
}
```

---

## 3. At-Least-Once Delivery & Idempotency Engine

### The Problem of Duplicate Delivery
Google Cloud Pub/Sub guarantees **at-least-once delivery**. If network acknowledgment is slightly delayed, Pub/Sub will retransmit the identical message. Without idempotency guards, duplicate deliveries would:
1. Double-count participant sessions.
2. Artificially inflate connected minutes.
3. Trigger redundant, high-overhead database re-calculations.

### The Solution: `GoogleEventInbox` Deduplication
- Every incoming push request delivers a globally unique `message.messageId`.
- The webhook controller immediately attempts an atomic insertion into the `GoogleEventInbox` collection:
  ```javascript
  try {
    await GoogleEventInbox.create({
      messageId: message.messageId,
      eventType: eventType || "unknown",
      subscription: req.body.subscription || "default",
      publishTime: message.publishTime ? new Date(message.publishTime) : new Date(),
      status: "RECEIVED",
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate message detected. Acknowledge with 200 OK and abort pipeline.
      return res.status(200).json({ success: true, message: "Duplicate message ignored (idempotent)" });
    }
    throw err;
  }
  ```
- **Automated Retention:** To prevent unbound collection growth, `GoogleEventInbox` includes a MongoDB TTL index on `createdAt` set to 30 days (`2,592,000` seconds).

---

## 4. Webhook Security & CSRF Exemption

1. **Authentication Token Verification:** The push endpoint validates an optional pre-shared bearer token configured in Google Cloud Pub/Sub push subscription settings:
   `Authorization: Bearer <GOOGLE_PUBSUB_VERIFICATION_TOKEN>`
2. **CSRF Middleware Exemption:** Because Google Cloud servers communicate machine-to-machine, browser-specific CSRF tokens (`X-CSRF-Token`) cannot be supplied. The backend CSRF middleware explicitly bypasses CSRF evaluation for:
   - `/api/v1/google/events/pubsub`
   - `/api/v1/attendance/events/pubsub`
   This is verified by unit test `Phase 1: CSRF Middleware` and automated API tests.

---

## 5. Verification Test Evidence

Automated validation of this engine was conducted via `backend/tests/attendance-api.test.js`:
- **Subtest 8:** `Attendance API: Pub/Sub Webhook processes participant event idempotently`
- **Execution Log:**
  ```text
  # Subtest: Attendance API: Pub/Sub Webhook processes participant event idempotently
  ok 8 - Attendance API: Pub/Sub Webhook processes participant event idempotently
    ---
    duration_ms: 54.7608
    type: 'test'
    ...
  ```
- **Test Scenarios Verified:**
  1. Base64 encoded payload delivered -> Correctly unpacked and returned HTTP 200 with `{ success: true, message: "Event processed successfully" }`.
  2. Identical payload delivered a second time with same `messageId` -> Correctly recognized as duplicate, returned HTTP 200 with zero duplicate database rows created.
