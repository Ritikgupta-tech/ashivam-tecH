# ASHIVAM TECHNOLOGIES — RELEASE CHECKLIST
**Version:** 1.0  
**Prepared by:** Engineering Team  
**Date:** 2026-11-01  
**Release Commit:** `4c2ef98` (pending push)

---

## PRE-PUSH CHECKLIST

### Code Quality
- [ ] All frontend tests PASS: `npm test -- --run` → **107/107** ✅
- [ ] All backend tests PASS: `cd backend && npm test` → **236/236** ✅
- [ ] Production build succeeds: `npm run build` → **0 errors** ✅
- [ ] No TypeScript/ESLint errors in build output ✅

### Security Scan
- [ ] No `.env` files tracked: `git ls-files | grep -i "\.env"` → empty ✅
- [ ] No credentials in diff: `git diff origin/main..HEAD | grep -iE "password|secret|token"` → clean (only code identifiers) ✅
- [ ] `backend/.env` is gitignored and NOT committed ✅
- [ ] `.env.local` is gitignored and NOT committed ✅
- [ ] `npm audit --audit-level=high` → 0 high/critical vulns (run: `npm audit --audit-level=high && cd backend && npm audit --audit-level=high`)

### Test Coverage
- [ ] E2E Playwright tests attempted: `npm run test:e2e`
  - Requires: MongoDB connectivity, Node.js 22, Playwright Chromium
  - See: `tests/e2e-browser-staging.js`
- [ ] Smoke test production endpoints (pre-push): backend health endpoint reachable

### Git State
- [ ] On correct branch: `main`
- [ ] Working tree is clean: `git status` → "nothing to commit"
- [ ] No force-push required (linear history confirmed)
- [ ] Review all commits: `git log --oneline origin/main..HEAD`

---

## DEPLOYMENT CHECKLIST

### Push to GitHub

```powershell
# Step 1 - Fetch latest remote state
git fetch origin
git fetch company

# Step 2 - Verify no divergence
git status   # expect: ahead of origin/main, working tree clean

# Step 3 - Push to personal repository
git push origin main

# Step 4 - Push to company repository
git push company main
```

- [ ] `git push origin main` → success (no rejected / non-fast-forward errors)
- [ ] `git push company main` → success
- [ ] Confirm final commit on `origin/main`: `git log origin/main -1 --oneline`

### Vercel (Frontend) Deployment
- Triggered automatically on push to `origin/main`
- Monitor at: https://vercel.com/dashboard
- Expected build time: ~60–90 seconds

- [ ] Vercel build status: **READY** (green)
- [ ] Deployment URL confirmed: `https://ashivam-tec-h.vercel.app`
- [ ] No build errors in Vercel logs

### Render (Backend) Deployment
- Triggered automatically on push to `main` branch
- Monitor at: https://dashboard.render.com
- Expected build + start time: ~60–120 seconds (cold start on free tier can take 30s extra)

- [ ] Render deploy status: **Live**
- [ ] Health endpoint confirmed reachable (see Post-Deployment Verification below)

---

## POST-DEPLOYMENT VERIFICATION STEPS

### 1. Frontend Health Check

```powershell
$r = Invoke-WebRequest -Uri "https://ashivam-tec-h.vercel.app/" -UseBasicParsing
$r.StatusCode   # expect 200
$r.Headers['content-security-policy']   # expect non-null CSP string
$r.Headers['x-frame-options']           # expect DENY
$r.Headers['referrer-policy']           # expect strict-origin-when-cross-origin
$r.Headers['permissions-policy']        # expect non-null
```

Expected headers (from `vercel.json`):
- `content-security-policy`: contains `default-src 'self'`
- `x-frame-options`: `DENY`
- `referrer-policy`: `strict-origin-when-cross-origin`
- `permissions-policy`: `camera=(), microphone=(), geolocation=()`

### 2. Backend Health Check

```powershell
$r = Invoke-WebRequest -Uri "https://ashivam-tech.onrender.com/api/v1/health" -TimeoutSec 90 -UseBasicParsing
$r.StatusCode   # expect 200
$r.Content      # expect: {"status":"ok","database":"connected",...}
```

### 3. Auth Endpoint Method Guards

```powershell
# GET on POST-only endpoint must return 405
$r = Invoke-WebRequest -Uri "https://ashivam-tech.onrender.com/api/v1/auth/refresh" -Method GET -UseBasicParsing -ErrorAction SilentlyContinue
$r.StatusCode   # expect 405
$r.Headers['Allow']  # expect: POST

# POST without cookie must return 401 (not 500)
try {
  $r = Invoke-WebRequest -Uri "https://ashivam-tech.onrender.com/api/v1/auth/refresh" -Method POST -UseBasicParsing -ErrorAction Stop
} catch {
  $_.Exception.Response.StatusCode.value__  # expect 401
}
```

### 4. Public Endpoints

```powershell
# Careers list
$r = Invoke-WebRequest -Uri "https://ashivam-tech.onrender.com/api/v1/careers" -UseBasicParsing
$r.StatusCode   # expect 200

# Internships list
$r = Invoke-WebRequest -Uri "https://ashivam-tech.onrender.com/api/v1/internships" -UseBasicParsing
$r.StatusCode   # expect 200
```

### 5. Security Headers on API

```powershell
$r = Invoke-WebRequest -Uri "https://ashivam-tech.onrender.com/api/v1/health" -UseBasicParsing
$r.Headers['x-content-type-options']   # expect nosniff
$r.Headers['x-frame-options']          # expect DENY
```

---

## ROLLBACK PROCEDURE

### If Vercel Deployment Fails
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Click **Promote to Production**
4. Investigate build errors in new deployment logs
5. Fix locally, re-run tests, push corrected commit

### If Render Deployment Fails
1. Go to Render Dashboard → Service → Deploys
2. Click on the failed deploy → read build logs
3. If environment variable issue: fix in Render Environment tab (no code push required)
4. If code issue: fix locally, re-run backend tests, push corrected commit
5. Render will auto-redeploy on next push

### If Post-Deployment Tests Fail
1. Identify which check failed and the HTTP status/body received
2. Check Vercel/Render logs for runtime errors
3. If database-related: verify MongoDB Atlas connectivity from Render
4. Do NOT rollback until root cause is confirmed — a cold-start delay may cause transient failures
5. Wait 60 seconds and retry health check before declaring failure
6. If confirmed broken: follow Vercel/Render rollback above

### Emergency Hotfix Procedure
```powershell
# 1. Fix the code locally
# 2. Run targeted tests
cd backend; node --test tests/<affected>.test.js
# 3. Run full suite
cd ..; npm test -- --run; cd backend; npm test
# 4. Build
cd ..; npm run build
# 5. Commit and push
git add <files>
git commit -m "hotfix(<scope>): <description>"
git push origin main
git push company main
```

---

## SIGN-OFF

| Role | Name | Date | Signed |
|---|---|---|---|
| Engineering Lead | Ritik Gupta | 2026-11-01 | ☐ |
| QA Lead | Ritik Gupta | 2026-11-01 | ☐ |
| Security Review | Ritik Gupta | 2026-11-01 | ☐ |
| Deployment Authorization | Ritik Gupta | 2026-11-01 | ☐ |

---

*This checklist must be completed in full before each production release. Archive a copy with the release commit hash after sign-off.*
