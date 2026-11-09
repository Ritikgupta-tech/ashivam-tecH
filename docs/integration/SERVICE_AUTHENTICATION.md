# ASHIVAM TECHNOLOGIES — SERVICE AUTHENTICATION SPECIFICATION
## Phase 6: HMAC-SHA256 Cryptographic Transport Security

---

## 1. Cryptographic Signature Algorithm

The inter-service authentication scheme prevents spoofing, tampering, and replay attacks by signing a canonical request representation with HMAC-SHA256:

$$\text{CanonicalString} = \text{Timestamp} + \text{"."} + \text{RequestId} + \text{"."} + \text{PayloadString}$$

$$\text{Signature} = \text{HMAC-SHA256}(\text{ServiceSecret}, \text{CanonicalString})$$

Where:
- `Timestamp`: String representation of Unix epoch milliseconds.
- `RequestId`: Unique identifier generated for the transmission.
- `PayloadString`: Normalized JSON string (`JSON.stringify(req.body)` or `""` if body is empty).
- `ServiceSecret`: Dedicated cryptographic secret key $\ge 32$ characters.

---

## 2. Inbound Verification State Machine

```mermaid
flowchart TD
    Start([Inbound Request]) --> HeadersCheck{All mandatory<br/>headers present?}
    HeadersCheck -- No --> Reject401Headers[HTTP 401: AUTH_MISSING_SERVICE_HEADERS]
    HeadersCheck -- Yes --> SourceCheck{Source system in<br/>allowedSources whitelist?}
    SourceCheck -- No --> Reject403Source[HTTP 403: AUTH_SOURCE_FORBIDDEN]
    SourceCheck -- Yes --> TimeCheck{Timestamp drift<br/>within ±5 minutes?}
    TimeCheck -- No --> Reject401Time[HTTP 401: AUTH_EXPIRED_TIMESTAMP]
    TimeCheck -- Yes --> SigCheck{HMAC-SHA256 equals<br/>expected signature?<br/>(timingSafeEqual)}
    SigCheck -- No --> Reject401Sig[HTTP 401: AUTH_INVALID_SIGNATURE]
    SigCheck -- Yes --> IdempCheck{IdempotencyKey<br/>already in cache?}
    IdempCheck -- Yes --> CachedHit[HTTP 200: Return cached response<br/>x-cache: IDEMPOTENT_HIT]
    IdempCheck -- No --> Proceed[Attach req.integration context<br/>& invoke downstream handler]
```

---

## 3. Constant-Time Signature Comparison

To defeat micro-timing side-channel attacks where attackers guess signatures byte-by-byte, verification is strictly implemented using `crypto.timingSafeEqual`:

```javascript
const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
const receivedBuffer = Buffer.from(signature, 'utf8');

if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
  return res.status(401).json({
    success: false,
    code: 'AUTH_INVALID_SIGNATURE',
    message: 'HMAC signature verification failed. Unauthorized payload or secret mismatch.'
  });
}
```

---

## 4. Key Management & Rotation Protocol

- **Dev / Staging Defaults:** Provided in local `.env` files with descriptive keys.
- **Production Keys:** Generated using high-entropy random byte sequences:
  ```bash
  openssl rand -hex 32
  ```
- **Key Rotation Procedure:**
  1. Generate new key version (`v2`).
  2. Deploy receiver services supporting dual-key validation during transition window.
  3. Deploy sender services with `v2` active.
  4. Deprecate and remove `v1` key.
