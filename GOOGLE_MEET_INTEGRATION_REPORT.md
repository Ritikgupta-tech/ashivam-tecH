# GOOGLE MEET INTEGRATION REPORT
## Ashivam Technologies — Production Google Meet API v2 Architecture

**Document Version:** 1.0.0-PROD  
**Integration Scope:** Google Meet REST API v2, OAuth 2.0 PKCE, Google Workspace Events  
**API Specification:** `https://developers.google.com/workspace/meet/api/guides/overview`  
**Security Profile:** AES-256-GCM Encrypted Token Storage, Zero-Plaintext Transmission  

---

## 1. Google Meet API v2 Architecture & Resource Hierarchy

The Google Meet REST API v2 models virtual meetings through a distinct four-tier hierarchical resource graph. The Ashivam attendance system models this hierarchy faithfully across its services and database schemas:

```
[Space: spaces/{spaceId}]
    │
    └── [Conference Record: conferenceRecords/{conferenceRecordId}]
            │
            └── [Participant: .../participants/{participantId}]
                    │
                    └── [Participant Session: .../participantSessions/{sessionId}]
```

### Resource Tier Breakdown:
1. **Spaces (`spaces/*`):** The persistent virtual room where calls occur. Identified by a space resource name and associated with a friendly meeting code (e.g., `abc-defg-hij`). A single space can host dozens of distinct conference calls over time.
2. **Conference Records (`conferenceRecords/*`):** Created when a call physically starts inside a space and completed when all participants leave. A single space will generate a new conference record each time a meeting is held.
3. **Participants (`conferenceRecords/{recordId}/participants/*`):** Represents an individual identity (or anonymous caller) who joined the conference. Contains identity metadata (`signedinUser`, `anonymousUser`, or `phoneUser`).
4. **Participant Sessions (`.../participants/{participantId}/participantSessions/*`):** Represents a specific contiguous connection interval between `startTime` and `endTime`. If an employee's connection drops and they rejoin, Google Meet generates multiple participant sessions under the same participant parent.

---

## 2. Participant Identity Resolution & Anti-Spoofing Policies

A critical vulnerability in naive meeting trackers is relying on participant "display names", which can be trivially forged in Google Meet by joining with arbitrary names. The Ashivam engine implements strict identity verification rules:

```
Participant Discovered in Conference Record
               │
      Is participant type SIGNED_IN?
             ├── NO ──> Classify as ANONYMOUS / PHONE ──> Requires Manual Admin Review
             │
            YES
             │
      Extract Google Identity Email:
      `participant.signedinUser.user`
             │
      Query Canonical Employee Collection:
      $or: [ { googleEmail: email }, { email: email } ]
             ├── NO MATCH ──> Unmapped Google Account ──> Flag as NEEDS_REVIEW
             │
         MATCH FOUND
             │
      Associate Session with Canonical Employee
             │
      Process Start Time, End Time & Reconnections
```

### Strict Identity Governance:
1. **No Attendance for Anonymous Users:** Unauthenticated or anonymous users are never automatically credited with attendance. Their records are logged as `NEEDS_REVIEW` for administrative review.
2. **Verified Google Identity Matching:** Google Meet REST API v2 reports `signedinUser.user` for authenticated users. The backend normalizes this address and looks up the employee via `googleEmail` or active `email`.
3. **Phone Participant Dial-In:** Phone participants display masked phone numbers (e.g., `+1 ***-***-1234`). These are logged in `ParticipantSession` and held in `PENDING_VERIFICATION` until linked via dispute or admin override.

---

## 3. OAuth 2.0 PKCE Flow & Cryptographic Token Storage

### 3.1. Required Least-Privilege Scopes
Audit findings during Phase 0 revealed that the initial scope `https://www.googleapis.com/auth/meetings.space.created` was insufficient for meetings scheduled outside the application (such as meetings scheduled through Google Calendar). The application requests the minimal necessary combination:

| Scope | Purpose | Principle of Least Privilege |
|---|---|---|
| `https://www.googleapis.com/auth/meetings.space.created` | Programmatic creation of company meeting spaces through the Admin Portal. | Write access restricted strictly to spaces created by the app. |
| `https://www.googleapis.com/auth/meetings.space.readonly` | Read-only access to conference records, participants, and participant sessions. | Grants audit capability without write access to company calendars or drives. |

### 3.2. Cryptographic Secret Management (AES-256-GCM)
OAuth refresh tokens permit long-lived offline access. Storing refresh tokens in plaintext is a severe compliance violation.
- Every refresh token is encrypted at rest using native Node.js `crypto` with `aes-256-gcm`.
- Encryption parameters:
  - **Cipher:** `aes-256-gcm`
  - **Key:** 32-byte secret derived from `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`
  - **IV (Initialization Vector):** 12-byte cryptographically secure pseudo-random bytes per record (`crypto.randomBytes(12)`)
  - **Auth Tag:** 16-byte authentication tag ensuring ciphertext integrity and anti-tampering
- In the `GoogleIntegration` MongoDB document, `encryptedRefreshToken`, `iv`, and `authTag` are stored as hex strings. Plaintext tokens exist only ephemerally in RAM during API calls.

### 3.3. Proactive Token Refresh Strategy
Google access tokens expire in 3600 seconds (1 hour). The `googleMeet.service.js` module maintains an internal expiration timestamp:
$$\text{tokenExpiresAt} \le \text{Date.now()} + 300\,000\text{ ms (5 minutes)}$$
If an API operation is requested within 5 minutes of expiration, the service automatically requests a new access token using the encrypted refresh token before dispatching the request, eliminating mid-call `401 Unauthorized` token expiry errors.

---

## 4. Google Meet REST API v2 Client Methods

The integration layer (`backend/src/modules/attendance/services/googleMeet.service.js`) provides 6 core operations:

1. `createMeetSpace(meetingConfig)`
   - Calls `POST https://meet.googleapis.com/v2/spaces`
   - Configures access policies and default conference settings.
   - Returns `{ spaceName, meetingUri, meetingCode }`.
2. `getMeetSpace(spaceName)`
   - Calls `GET https://meet.googleapis.com/v2/{name=spaces/*}`
   - Retrieves live space active status and conference URIs.
3. `listConferenceRecords(spaceName, filter)`
   - Calls `GET https://meet.googleapis.com/v2/conferenceRecords?filter=space.name="{spaceName}"`
   - Finds conference sessions attached to a specific space.
4. `listConferenceParticipants(conferenceRecordName)`
   - Calls `GET https://meet.googleapis.com/v2/{conferenceRecordName}/participants`
   - Extracts all attendee profiles, identity types, and Google user emails.
5. `listParticipantSessions(participantResourceName)`
   - Calls `GET https://meet.googleapis.com/v2/{participantResourceName}/participantSessions`
   - Returns micro-level connection intervals: `{ sessionStartTime, sessionEndTime }`.
6. `getIntegrationHealth()`
   - Inspects DB connectivity, token expiration, granted scopes, and Google API responsiveness.

---

## 5. Resilience & Rate Limiting

- **Google API Quota Compliance:** Google Meet API enforces read quotas per project per minute. The service implements exponential backoff with randomized jitter on HTTP 429 and HTTP 503 responses:
  $$t_{\text{wait}} = 2^{\text{attempt}} \times 500\text{ ms} + \text{rand}(0, 250)\text{ ms}$$
- **Zero Drift Reconciliation:** Because conference records may finalize minutes after a call ends, meeting reconciliation runs in two tiers:
  1. Instant push via Google Cloud Pub/Sub webhooks on participant disconnect.
  2. Authoritative background sync 10 minutes post-scheduled end time to ingest delayed Google final records.
