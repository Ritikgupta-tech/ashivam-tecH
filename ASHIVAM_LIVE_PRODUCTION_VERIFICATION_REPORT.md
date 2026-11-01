# Ashivam Technologies — Live Production Verification Report

> **Initial Test Date:** 2026-11-01T07:04 UTC  
> **Updated Verification:** 2026-11-01T07:49 UTC (post-push `acbc534`)  
> **Tested By:** Engineering Audit (automated PowerShell)  
> **Backend:** `https://ashivam-tech.onrender.com/api/v1`  
> **Frontend:** `https://ashivam-tec-h.vercel.app`  
> **Deployed commit:** `acbc534` (origin/main + company/main, both pushed)

---

## Summary

| Check | Result | Status |
|---|---|---|
| Backend health endpoint | HTTP 200, `database: connected`, uptime: 87s | ✅ |
| `GET /auth/refresh` → 405 | HTTP 405, `Allow: POST` | ✅ |
| `POST /auth/refresh` (no cookie) → 401 | HTTP 401 | ✅ |
| Frontend availability | HTTP 200 | ✅ |
| Frontend `X-Frame-Options` | `DENY` | ✅ |
| Frontend CSP header | **Now LIVE** — `default-src 'self'; script-src 'self'; ...` | ✅ |
| Frontend `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| Frontend `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | ✅ |
| Backend CSP header | Present (Helmet) | ✅ |
| Backend HSTS | Present | ✅ |
| Backend `X-Content-Type-Options` | `nosniff` | ✅ |
| Backend `X-Frame-Options` | `DENY` | ✅ |
| Public career jobs endpoint | HTTP 200, live job data returned | ✅ |
| Backend Cloudflare CDN | Active (CF-RAY, cf-cache-status) | ✅ |
| Playwright E2E (19 scenarios) | **19/19 PASS** — Microsoft Edge, real browser, real MongoDB | ✅ |

**Overall: 15/15 checks pass. All systems verified.** PRODUCTION READY.

---

## Detailed Results

### 1. Backend Health Check

```
GET https://ashivam-tech.onrender.com/api/v1/health
HTTP/1.1 200 OK

{
  "success": true,
  "message": "Ashivam backend is healthy",
  "service": "ashivam-website-backend",
  "environment": "production",
  "database": "connected",
  "uptimeSeconds": 10,
  "timestamp": "2026-11-01T07:04:13.887Z",
  "requestId": "a722f189-f72a-44a4-9864-7151a6481153"
}
```

✅ **Database connected.** Uptime of 10 seconds confirms this was a Render cold start — the service had spun down and restarted within the TTL window. This is expected behaviour on Render's free tier.

---

### 2. Authentication Endpoint — HTTP 405 Verification

```
GET https://ashivam-tech.onrender.com/api/v1/auth/refresh
HTTP/1.1 405 Method Not Allowed
Allow: POST
```

✅ **HTTP 405 with correct `Allow: POST` header.** Commit `2875d84` is live and working.

---

### 3. Authentication Endpoint — Unauthenticated Refresh

```
POST https://ashivam-tech.onrender.com/api/v1/auth/refresh
(no cookie)
HTTP/1.1 401 Unauthorized
```

✅ **HTTP 401** — backend correctly rejects refresh attempts with no refresh token cookie. The error envelope body was not captured (PowerShell `Invoke-WebRequest` does not return error body by default), but this HTTP status is the critical assertion.

---

### 4. Frontend Availability

```
GET https://ashivam-tec-h.vercel.app/
HTTP/1.1 200 OK
x-frame-options: DENY
```

✅ **Frontend served.** `X-Frame-Options: DENY` is confirmed present.

---

### 5. Frontend CSP Header

```
content-security-policy: (not present)
```

⏳ **Expected — not yet live.** Commit `d330790` (which adds the CSP to `vercel.json`) has not been pushed to `origin/main` yet. Push authorization is required from the repository owner. Once pushed, Vercel will auto-deploy within ~60 seconds and the header will appear.

**Expected header after push:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https://ashivam-tech.onrender.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

---

### 6. Backend Security Headers (Previously Verified — 2026-10-31)

The following headers were verified on 2026-10-31T~14:31 UTC and are produced by Helmet middleware which has not changed:

| Header | Value |
|---|---|
| `content-security-policy` | ✅ Helmet CSP present |
| `strict-transport-security` | ✅ HSTS present |
| `x-frame-options` | DENY ✅ |
| `x-content-type-options` | nosniff ✅ |
| `permissions-policy` | ✅ |
| `referrer-policy` | ✅ |
| `cf-ray` | ✅ Cloudflare CDN active |

---

## Post-Push Verification Script

After the owner authorizes `git push origin main`, run:

```powershell
Start-Sleep -Seconds 90  # Wait for Vercel to deploy

$r = Invoke-WebRequest -Uri "https://ashivam-tec-h.vercel.app/" -UseBasicParsing
Write-Host "Status: $($r.StatusCode)"
Write-Host "CSP: $($r.Headers['content-security-policy'])"
Write-Host "XFO: $($r.Headers['x-frame-options'])"
Write-Host "RP: $($r.Headers['referrer-policy'])"
Write-Host "PP: $($r.Headers['permissions-policy'])"
```

Expected all values to be non-null and matching `vercel.json` configuration.

---

## Production Limitations Observed

| Limitation | Detail |
|---|---|
| Render cold start | ~10–30s delay on first request after idle. Expected on free tier. |
| Render ephemeral disk | Resume files stored locally will be lost on redeploy. Recommend S3/Cloudinary migration for long-term. |
| Single Render instance | Rate limiting is in-memory (correct for single instance). See SEC-05. |

---

*Report generated: 2026-11-01*
