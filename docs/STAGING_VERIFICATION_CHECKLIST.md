# Ashivam Technologies — Staging Verification Checklist

## Pre-Deployment Verification Gate
Before staging deployment, all items below must be verified against actual code and test artifacts:

- [x] **Repository Cleanliness:** No committed `.env` secrets or production credentials in git history.
- [x] **Backend Test Suite:** 227 / 227 unit and integration tests passing (100%).
- [x] **Frontend Test Suite:** 77 / 77 frontend tests passing (100%).
- [x] **Browser E2E Automation:** 19 / 19 Playwright browser tests passing against live frontend and backend stack (100%).
- [x] **Frontend Production Build:** `npm run build` succeeds cleanly producing minified bundle.
- [x] **Whitespace & Formatting:** `git diff --check` passes with zero whitespace defects.

---

## Cloud Staging Deployment Invariants

### 1. Environment Variable Separation
- [ ] `NODE_ENV`: Set to `staging`.
- [ ] `PORT`: Render dynamically assigned port (default 10000).
- [ ] `MONGODB_URI`: Dedicated staging MongoDB database instance (e.g. `ashivam_staging`), completely separate from production database cluster.
- [ ] `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Distinct cryptographically strong 64-character hex strings generated specifically for staging.
- [ ] `CLIENT_URL` & `FRONTEND_URL`: Canonical staging frontend URL (`https://ashivam-tec-h-staging.vercel.app`).
- [ ] `VITE_API_URL` & `VITE_API_BASE_URL`: Canonical staging backend URL (`https://ashivam-tech-staging.onrender.com/api/v1`).
- [ ] `EMAIL_RECIPIENT`: Exclusively `team.ashivam@gmail.com`.
- [ ] `EMAIL_PROVIDER`: Set to `smtp` or cloud API with staging credentials. Zero test traffic sent to public customers.

---

## Smoke Test Verification Matrix (Post-Deploy)
- [ ] `GET /health` returns HTTP 200 OK with `status: "healthy"`.
- [ ] `GET /api/v1/health/readiness` returns HTTP 200 OK with database connection confirmed.
- [ ] Public visitor navigates to `/`, `/solutions`, `/industries`, `/careers`.
- [ ] Public visitor submits contact inquiry at `/contact` -> Outbox enqueues and dispatches alert.
- [ ] Admin navigates to `/employee-login/admin` and signs in.
- [ ] Token rotation and multi-tab session coordination confirmed.
- [ ] Admin attempts audit log deletion -> Returns HTTP 403 Forbidden.
