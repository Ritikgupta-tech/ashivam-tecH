# Ashivam Technologies — Production Runbook

> **Version:** 1.0  
> **Maintained by:** Engineering Team  
> **Last updated:** 2026-11-01  
> **Services:** Frontend (Vercel), Backend (Render), Database (MongoDB Atlas)

---

## Table of Contents

1. [Service Inventory](#1-service-inventory)
2. [Health Checks](#2-health-checks)
3. [Deployment Procedures](#3-deployment-procedures)
4. [Incident Response](#4-incident-response)
5. [Common Issues & Resolutions](#5-common-issues--resolutions)
6. [Database Operations](#6-database-operations)
7. [Secret Rotation](#7-secret-rotation)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Local Development Setup](#10-local-development-setup)

---

## 1. Service Inventory

| Service | Provider | URL | Purpose |
|---|---|---|---|
| Frontend SPA | Vercel | `https://ashivam-tec-h.vercel.app` | Public website + admin panel |
| Backend API | Render | `https://ashivam-tech.onrender.com/api/v1` | REST API |
| Database | MongoDB Atlas | (private URI in env) | Primary data store |
| Email | Gmail SMTP | smtp.gmail.com:587 | Transactional email |
| File Storage | Local (Render disk) | `/uploads` on Render | Resume file storage |
| CDN | Cloudflare (auto via Render) | — | DDoS protection, caching |

---

## 2. Health Checks

### Backend Readiness (checks DB connection)
```bash
curl https://ashivam-tech.onrender.com/api/v1/health
# Expected: HTTP 200
# Body: { "status": "ok", "database": "connected", "environment": "production" }
```

### Backend Liveness (always 200 if process is up)
```bash
curl https://ashivam-tech.onrender.com/api/v1/health/liveness
# Expected: HTTP 200
# Body: { "status": "alive" }
```

### Frontend
```bash
curl -I https://ashivam-tec-h.vercel.app/
# Expected: HTTP 200, Content-Type: text/html
```

### Auth Endpoint Method Verification
```bash
# Should return 405, not 404
curl -X GET https://ashivam-tech.onrender.com/api/v1/auth/refresh
# Expected: HTTP 405, Allow: POST

# Should return 401, not 500
curl -X POST https://ashivam-tech.onrender.com/api/v1/auth/refresh
# Expected: HTTP 401
```

---

## 3. Deployment Procedures

> [!IMPORTANT]
> Always obtain explicit written authorization before pushing to `origin/main` or `company/main`.

### Pre-Deployment Checklist

```bash
# 1. Run all tests
npm test -- --run          # Frontend: must be 107/107 PASS
npm test --prefix backend  # Backend:  must be 236/236 PASS

# 2. Build verification
npm run build              # Must be 0 errors

# 3. Audit
npm audit --audit-level=high            # Frontend
npm audit --audit-level=high --prefix backend  # Backend

# 4. Review git log
git log --oneline origin/main..HEAD
```

### Deploy Frontend (Vercel)

```bash
# Vercel auto-deploys from main branch on push
git push origin main

# Or deploy manually via Vercel CLI
vercel --prod
```

### Deploy Backend (Render)

```bash
# Render auto-deploys from main branch on push
git push origin main
# Render detects backend/ changes and redeploys automatically
```

### Post-Deployment Verification

```bash
# Wait ~30s for Render cold start on free tier
sleep 30

# 1. Health check
curl https://ashivam-tech.onrender.com/api/v1/health

# 2. Frontend loads
curl -s https://ashivam-tec-h.vercel.app/ | grep -c "Ashivam"

# 3. Auth endpoints
curl -X GET https://ashivam-tech.onrender.com/api/v1/auth/refresh  # expect 405
curl -X POST https://ashivam-tech.onrender.com/api/v1/auth/refresh  # expect 401
```

---

## 4. Incident Response

### Severity Levels

| Level | Definition | Response Time |
|---|---|---|
| P1 | Site down / data breach | Immediate |
| P2 | Auth broken / admin panel inaccessible | < 1 hour |
| P3 | Feature degraded (e.g., emails not sending) | < 4 hours |
| P4 | Cosmetic / UX issue | Next sprint |

### P1 — Site Down

1. Check Render dashboard → service status
2. Check MongoDB Atlas → cluster health
3. Check Vercel dashboard → deployment status
4. Check Cloudflare → any active attacks / rate-limit triggers

**If Render is down:**
```bash
# Trigger manual redeploy via Render dashboard
# Or via Render API (requires RENDER_API_KEY):
curl -X POST https://api.render.com/v1/services/<service-id>/deploys \
  -H "Authorization: Bearer $RENDER_API_KEY"
```

**If DB is unreachable:**
1. Check Atlas cluster → "Connect" → verify IP allowlist includes `0.0.0.0/0` (Render dynamic IPs)
2. Check Atlas → Data Federation → no quota exceeded

### P2 — Authentication Broken

1. Verify `/api/v1/health` → `database: connected`
2. Check `JWT_SECRET` and `JWT_REFRESH_SECRET` are set correctly in Render env vars
3. Check refresh token TTL — are tokens expiring correctly?
4. Check if `passwordChangedAt` was accidentally updated (would invalidate all sessions)

### P3 — Emails Not Sending

1. Check outbox collection in MongoDB Atlas — are there `pending` or `failed` records?
2. Verify `EMAIL_USER` and `EMAIL_PASS` (Gmail App Password, not account password)
3. Check Gmail "Less secure apps" or 2FA + App Password configuration
4. Check for Gmail daily send limits (500/day for regular accounts)

---

## 5. Common Issues & Resolutions

### Backend Cold Start Timeout

**Symptom:** First request after idle period fails with timeout  
**Cause:** Render free tier spins down after 15 minutes of inactivity  
**Resolution:** Wait 30–60 seconds and retry. Consider upgrading to Render paid tier for always-on.

### `POST /auth/refresh` Returns 401 for Authenticated User

**Cause:** Refresh token cookie missing, expired, or revoked  
**Steps:**
1. Check cookie in browser DevTools → Application → Cookies → `refreshToken`
2. Verify `SameSite=None; Secure` on cookie (required for cross-origin)
3. Verify request is going to the backend origin (not Vercel)
4. If password was recently changed, all sessions are invalidated by design

### Admin Dashboard Blank / 403

**Cause:** Admin account deactivated, or token expired  
**Steps:**
1. Log out and log back in
2. If account was deactivated, a Superadmin must reactivate it in the Employees/Admins tab

### Resume Upload Fails

**Cause:** File size > 5 MB, wrong MIME type, or Render disk full  
**Steps:**
1. Check file size (limit: 5 MB)
2. Accepted types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
3. Check Render disk usage in dashboard

### `ECONNREFUSED` in Local Dev

**Cause:** Local backend (port 5000) is not running  
**Resolution:**
```bash
cd backend
npm run dev
# Backend starts on port 5000
```

---

## 6. Database Operations

### Backup

MongoDB Atlas provides automated daily backups. To take a manual snapshot:
1. Atlas Dashboard → Database → Backup → Take Snapshot Now

### Restore

1. Atlas Dashboard → Database → Backup → Restore  
2. Select snapshot → restore to same or new cluster

### Useful Queries (MongoDB Compass or Atlas Data Explorer)

```js
// Count pending outbox emails
db.outboxemails.countDocuments({ status: 'pending' })

// Find revoked refresh token families
db.refreshtokens.find({ revoked: true }).sort({ revokedAt: -1 }).limit(10)

// Check application duplicates (before unique index migration)
db.applications.aggregate([
  { $group: { _id: { job: "$job", email: "$email" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])

// Active admin accounts
db.admins.find({ isActive: true }).project({ username: 1, role: 1, email: 1 })
```

### Index Verification

After deploying the SEC-01 fix, verify the new index is built:
```js
db.applications.getIndexes()
// Should include: { key: { job: 1, email: 1 }, unique: true, name: "job_email_unique" }
```

> [!NOTE]
> On an existing production database with data, MongoDB will build the index in the background. If duplicate `{job, email}` pairs exist in legacy data, the index build will fail. Run the duplicate query above first and manually resolve any conflicts before deploying.

---

## 7. Secret Rotation

> [!CAUTION]
> Rotating `JWT_SECRET` or `JWT_REFRESH_SECRET` invalidates ALL active sessions. All logged-in users will be logged out immediately.

### Rotate JWT Secrets

1. Generate new secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Run twice — one for JWT_SECRET, one for JWT_REFRESH_SECRET
```

2. Update in Render → Environment → `JWT_SECRET` and `JWT_REFRESH_SECRET`
3. Trigger redeploy (Render redeploys automatically on env var change)
4. All active refresh tokens in MongoDB become invalid (correct — they reference old hashes)
5. Optionally clear the `refreshtokens` collection to avoid confusion:
```js
db.refreshtokens.deleteMany({})
```

### Rotate Gmail App Password

1. Go to Google Account → Security → App Passwords
2. Generate new password
3. Update `EMAIL_PASS` in Render environment vars
4. Trigger redeploy

---

## 8. Monitoring & Alerting

### Current Monitoring (Manual)

| Check | Frequency | How |
|---|---|---|
| Backend health | On-demand | `curl .../health` |
| Frontend availability | On-demand | Browser / curl |
| Auth endpoint methods | On release | curl smoke test |
| Email delivery | On-demand | Check outbox collection |

### Recommended (Not Yet Implemented)

| Tool | Purpose | Cost |
|---|---|---|
| UptimeRobot | Ping `/health` every 5 min; alert on failure | Free tier |
| Render Alerting | CPU/memory threshold alerts | Paid tier |
| Sentry | Frontend JS error tracking | Free tier |
| MongoDB Atlas Alerts | Disk usage, connection count, slow queries | Free tier |

### Render Free Tier Limitations

- Single instance (in-memory rate limiting is therefore effective)
- Spins down after 15 min idle
- Shared CPU — avoid CPU-intensive operations in request handlers
- Disk is ephemeral — resumes uploaded to local disk will be lost on redeploy (switch to S3/Cloudinary for persistence)

---

## 9. Rollback Procedures

### Rollback Frontend (Vercel)

```bash
# Vercel keeps all deployments; roll back via dashboard
# Dashboard → Deployments → click previous deployment → Promote to Production
```

Or via CLI:
```bash
vercel rollback
```

### Rollback Backend (Render)

```bash
# In Render dashboard → Deploys → click previous successful deploy → Rollback
```

Or via git:
```bash
git revert HEAD         # Create a revert commit
git push origin main    # Render auto-deploys
```

### Emergency: Revert specific commit

```bash
git revert <commit-sha> --no-edit
git push origin main
```

---

## 10. Local Development Setup

### Prerequisites

- Node.js 22+
- MongoDB (local) or MongoDB Atlas URI
- Git

### Backend

```bash
cd backend
cp .env.example .env     # Edit with your local values
npm install
npm run dev              # Starts on port 5000 (default)
```

Required `.env` keys for local:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/ashivam_dev
JWT_SECRET=<any 32+ char string>
JWT_REFRESH_SECRET=<any different 32+ char string>
CLIENT_URL=http://localhost:5173
```

Email sending is optional in development — set `NODE_ENV=development` and emails will log to console instead of sending.

### Frontend

```bash
# In project root (not backend/)
npm install
npm run dev              # Starts on port 5173, proxies /api/v1 to http://127.0.0.1:5000
```

### Run Tests

```bash
# Frontend
npm test -- --run

# Backend
npm test --prefix backend

# Build verification
npm run build
```

---

*Runbook version 1.0 — 2026-11-01*
