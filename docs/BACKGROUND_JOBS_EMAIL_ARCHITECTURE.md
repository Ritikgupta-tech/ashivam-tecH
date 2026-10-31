# Ashivam Technologies — Background Jobs & Email Architecture

## 1. System Overview
Ashivam Technologies relies on email dispatch for contact inquiries, job applications, student internship notifications, and administrative alerts.
- **Sole Mandated Recipient:** Exclusively `team.ashivam@gmail.com`.
- **Authenticated Sender:** `teamashivam@gmail.com` via TLS Port 465 (or HTTPS Resend / Brevo API in cloud environments).

---

## 2. Transactional Outbox Pattern Architecture
To eliminate dropped notifications and guarantee at-least-once delivery without running an expensive external Redis cluster, the platform implements the **Transactional Outbox Pattern** on MongoDB:

```
[ Application Controller ]
           │
           ▼
1. Enqueue Job: `enqueueOutboxEmail({ eventType, payload, dedupKey })`
           │
           ├── Writes to `outboxjobs` collection (`status: 'pending'`, `attempts: 0`)
           │
           ▼
2. Immediate Dispatch:
   `processOutboxJob(job)` invoked immediately in background
           │
           ├── Atomic Lock: `findOneAndUpdate({ _id, status: 'pending' }, { $set: { status: 'processing' } })`
           │
           ├── Success: `status: 'sent'`, `processedAt: new Date()`
           │
           └── Failure:
               - Increment `attempts`
               - If attempts < 5: `status: 'failed'`, `nextAttemptAt = now + (2^attempts * 2s)`
               - If attempts >= 5: `status: 'dead_letter'`
```

---

## 3. Worker Polling & Dead-Letter Processing
1. **Periodic Sweeper:** A background worker runs every 5 seconds, querying candidate jobs (`status IN ['pending', 'failed'] AND nextAttemptAt <= now`) sorted by `nextAttemptAt: 1, createdAt: 1`.
2. **Deduplication:** The `dedupKey` field carries a unique sparse index in MongoDB. If a client triggers rapid duplicate submissions (e.g. rapid double-clicking), the second insert catches duplicate key code 11000 and resolves to the existing job without sending duplicate emails.
3. **Graceful Shutdown:** The polling timer is decoupled using `unref()` and explicitly cleared by `stopOutboxWorker()` during graceful SIGTERM termination.
