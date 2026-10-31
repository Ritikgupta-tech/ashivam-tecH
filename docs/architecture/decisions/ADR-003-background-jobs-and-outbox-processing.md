# ADR-003: Background Job Processing via MongoDB Transactional Outbox

## Status
Accepted

## Context
The platform dispatches notifications across multiple core workflows:
- Workflow 1: Public Contact Inquiries (Company Alert & User Confirmation)
- Workflow 2 & 3: Job Applications (Company Alert & Candidate Confirmation)
- Workflow 5 & 6: Internship Applications (Company Alert & Student Confirmation)

Previously, notification dispatches used unmonitored floating promises (`sendEmail(...).catch(...)`). If external SMTP or API delivery failed due to network hiccups, or if the container process restarted, notification messages were lost permanently.

Proposals recommended introducing Redis with BullMQ. However, adding a dedicated Redis cluster increases hosting costs, adds external networking failure modes, and requires credential rotation for another cloud resource on Render.

## Decision
1. **MongoDB Transactional Outbox Pattern:**
   Implement an Outbox collection (`outboxjobs`) in MongoDB:
   - Fields: `eventType`, `payload`, `status` (`pending`, `processing`, `sent`, `failed`, `dead_letter`), `attempts`, `maxAttempts` (default: 5), `nextAttemptAt`, `lastError`, `processedAt`, `dedupKey`.
   - Compound Indexes: `{ status: 1, nextAttemptAt: 1 }` and sparse unique index on `{ dedupKey: 1 }`.
2. **Immediate Async Dispatch + Periodic Polling Worker:**
   - **Low Latency:** Upon enqueuing, the job triggers immediate asynchronous dispatch via `processOutboxJob(job)`.
   - **Atomic Claiming:** `processOutboxJob` utilizes `findOneAndUpdate({ _id: job._id, status: { $in: ['pending', 'failed'] } }, { $set: { status: 'processing' }, $inc: { attempts: 1 } }, { returnDocument: 'after' })` to prevent double-dispatch across concurrent worker instances or threads.
   - **Resilience Worker:** A background worker runs every 5 seconds, querying due candidate jobs (`status IN ['pending', 'failed'] AND nextAttemptAt <= now`) and retrying failed transmissions with exponential backoff (`Math.pow(2, attempts) * 2000` ms, max 60s).
   - **Dead Letter Queue (DLQ):** After exhausting `maxAttempts`, jobs transition to `dead_letter` for administrative inspection without losing user submission data.
3. **Graceful Shutdown:**
   The outbox worker timer is cleared and decoupled on `SIGINT` / `SIGTERM` signals.

## Consequences
### Positive
- Zero data loss for email notifications across process crashes or SMTP timeouts.
- Zero extra operational infrastructure or monthly hosting expenses (no Redis cluster required).
- Native transactional support (can be bound to Mongoose sessions if atomic commit is needed).
- Automatic deduplication prevents duplicate dispatches from rapid retries.

### Negative / Trade-offs
- Slight MongoDB write amplification (one record created per email dispatch).
- Polling adds minimal background database queries when idle (every 5 seconds, indexed on `{ status: 1, nextAttemptAt: 1 }`).
