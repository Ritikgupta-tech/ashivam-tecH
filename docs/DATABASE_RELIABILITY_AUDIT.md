# Ashivam Technologies — Database Reliability & Indexing Audit

## 1. Database Specifications
- **Database Engine:** MongoDB 7.0+ / 8.0 on MongoDB Atlas
- **Driver / ODM:** Mongoose 9.10
- **Connection Configuration:**
  - `serverSelectionTimeoutMS`: 5000ms
  - `maxPoolSize`: 50 connections
  - `minPoolSize`: 5 connections
  - `socketTimeoutMS`: 45000ms
  - `retryWrites`: true
  - `w`: "majority" (strict write concern for financial and compliance data)

---

## 2. Collection Index Audit Matrix

| Collection | Model File | Index Key(s) | Type | Purpose & Query Target |
| :--- | :--- | :--- | :--- | :--- |
| **admins** | `admin.model.js` | `{ email: 1 }` | Unique | Login lookup & uniqueness enforcement |
| **admins** | `admin.model.js` | `{ username: 1 }` | Unique | Username authentication & duplicate protection |
| **refreshtokens** | `refreshToken.model.js` | `{ tokenHash: 1 }` | Unique | Rapid token verification during `/auth/refresh` |
| **refreshtokens** | `refreshToken.model.js` | `{ familyId: 1, isRevoked: 1 }` | Compound | Replay attack revocation of token family lineage |
| **refreshtokens** | `refreshToken.model.js` | `{ expiresAt: 1 }` | TTL | Automated deletion of expired tokens by MongoDB |
| **jobs** | `job.model.js` | `{ slug: 1 }` | Unique | Fast public job lookup by URL slug |
| **jobs** | `job.model.js` | `{ isActive: 1, createdAt: -1 }` | Compound | Public active job listing with sort order |
| **applications** | `application.model.js` | `{ job: 1, email: 1 }` | Compound Unique | Duplicate application prevention per job |
| **applications** | `application.model.js` | `{ status: 1, createdAt: -1 }` | Compound | Admin application dashboard filtering |
| **inquiries** | `inquiry.model.js` | `{ email: 1, createdAt: -1 }` | Compound | Deduplication and customer inquiry history |
| **inquiries** | `inquiry.model.js` | `{ status: 1, createdAt: -1 }` | Compound | Admin inquiry triage queue |
| **interns** | `intern.model.js` | `{ internId: 1 }` | Unique | Collision-safe identifier lookup (`ASH-INT-YYYY-XXXX`) |
| **interns** | `intern.model.js` | `{ email: 1, status: 1 }` | Compound | Active intern duplicate prevention |
| **outboxjobs** | `outbox.model.js` | `{ status: 1, nextAttemptAt: 1 }` | Compound | Worker batch polling and sweep efficiency |
| **outboxjobs** | `outbox.model.js` | `{ dedupKey: 1 }` | Sparse Unique | Idempotent event deduplication |
| **auditlogs** | `audit.model.js` | `{ createdAt: -1 }` | Single | Reverse-chronological audit log timeline |
| **auditlogs** | `audit.model.js` | `{ entity: 1, action: 1, createdAt: -1 }` | Compound | Compliance investigation filtering |
| **systemlocks** | `systemLock.model.js` | `{ lockKey: 1 }` | Unique | Distributed lock acquisition for distributed concurrency |
| **systemlocks** | `systemLock.model.js` | `{ expiresAt: 1 }` | TTL | Auto-release orphaned locks if a node crashes |

---

## 3. Distributed Concurrency & Mutex Verification
To prevent race conditions across multiple Node processes or multiple cloud container instances on Render:
1. **Intern ID Counter:** Atomic `$inc` on `Counter` collection (`sequenceValue`) ensures no duplicate `ASH-INT-YYYY-XXXX` IDs are ever generated.
2. **Distributed Locks:** Backed by MongoDB atomic upserts with lease timeouts (`systemlocks` collection). Protects Superadmin mutations and critical allocations against distributed race conditions.
