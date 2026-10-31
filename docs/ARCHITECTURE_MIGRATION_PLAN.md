# Ashivam Technologies — Architecture Migration & Evolution Plan

## 1. Migration Overview & Non-Disruption Philosophy
The engineering evolution of Ashivam Technologies follows a zero-downtime, non-destructive migration path:
- **No Rewrite:** Preserves the battle-tested React 18 frontend and Node.js Express 5.2 backend.
- **Zero Schema Breaking Changes:** All database enhancements (Outbox collection, Counter collection, SystemLock collection, Audit immutability) are purely additive and backward-compatible with existing production data.
- **Environment Parity:** Local development, cloud staging, and production environments share identical environment variable specifications, build commands, and security invariants.

---

## 2. Migration Execution Phases

### Phase 1: Database Additions & Index Deployment
1. Deploy `outboxjobs` collection schema with compound index `{ status: 1, nextAttemptAt: 1 }` and sparse unique index on `{ dedupKey: 1 }`.
2. Deploy `systemlocks` collection with TTL index `{ expiresAt: 1 }`.
3. Verify compound and unique indexes across `admins`, `refreshtokens`, `jobs`, `applications`, `inquiries`, `interns`, and `auditlogs`.

### Phase 2: Backend Application Release
1. Build and verify backend container using Node.js 22 LTS base image.
2. Verify startup lifecycle: DB connection establishment, automatic Outbox background worker boot (`startOutboxWorker()`), and SMTP/API transport verification.
3. Validate graceful termination (`SIGTERM` / `SIGINT`) handling with 10-second timeout.

### Phase 3: Frontend Distribution
1. Build optimized production bundle with Vite (`npm run build`).
2. Verify asset hash fingerprinting and cache headers (HTML: `no-cache`, JS/CSS: `public, max-age=31536000, immutable`).
3. Deploy to Vercel with clean routing rewrites for SPA history API.

### Phase 4: Post-Migration Validation
1. Execute health probe checks (`/health`, `/api/v1/health/readiness`).
2. Run automated sanity check on contact inquiry submission and verification of transactional outbox processing.
3. Verify admin login and session restoration.
