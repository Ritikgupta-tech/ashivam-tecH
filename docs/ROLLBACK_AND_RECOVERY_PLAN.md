# Ashivam Technologies — Rollback & Disaster Recovery Plan

## 1. Rollback Strategy & Triggers
A rollback is immediately triggered if any of the following occur during staging or production release:
1. Health probe (`/api/v1/health/readiness`) fails for 3 consecutive intervals.
2. Error rate on `/api/v1/*` exceeds 1.0% over a 5-minute window.
3. Database connection pool exhaustion or unhandled rejection boot loops.
4. Authentication failure rate exceeds 5.0% for valid administrative accounts.

---

## 2. Instant Rollback Procedures

### Frontend Rollback (Vercel)
Vercel maintains immutable instant rollbacks for every deployment:
1. Navigate to Vercel Project Dashboard -> Deployments.
2. Select the previous stable deployment (commit baseline `1e759953bee1792fd6c1adcc4f61a083d685059b`).
3. Click "Promote to Production".
4. Propagation time: < 5 seconds globally.

### Backend Rollback (Render)
Render maintains build image history:
1. Open Render Web Service Dashboard -> Deploys.
2. Click on the last known healthy deployment commit.
3. Click "Rollback to this deploy".
4. Traffic automatically drains from the faulty instance to the healthy container without dropping in-flight HTTP connections.

---

## 3. Database Recovery & Data Safety
- **No Destructive Schema Migrations:** All database enhancements (Outbox jobs, Counter model, System lock, Audit immutability) are purely additive. Rolling back backend application code does NOT require rolling back the MongoDB database schema.
- **Outbox Persistence:** Any jobs currently in `outboxjobs` will remain intact in `pending` or `failed` state and can be drained when the service restarts.
- **Point-in-Time Recovery:** MongoDB Atlas continuous automated snapshots provide 1-minute granularity recovery if manual database repair is ever required.
