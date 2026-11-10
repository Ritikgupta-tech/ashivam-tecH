# ASHIVAM TECHNOLOGIES — DEPLOYMENT & DEVOPS READINESS
**Document Reference:** `docs/engineering/DEPLOYMENT_READINESS.md`  
**Classification:** DevOps Infrastructure Specification & Deployment Runbook  
**Date:** 2026-11-10  

---

## 1. MULTI-TIER DEPLOYMENT MATRIX

The Ashivam Technologies ecosystem maintains strict separation between production and staging tiers:

| Subsystem | Service Name | Provider | Plan Tier | Active Branch | Root Directory | Build Command | Start Command |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Website FE** | `ashivam-tec-h` | Vercel | Production | `main` | `/` | `npm run build` | Static Edge CDN |
| **Website BE** | `ashivam-backend` | Render | Starter | `main` | `backend` | `npm ci --omit=dev`| `node src/server.js` |
| **Internship FE**| `ashivam-internship-frontend`| Vercel | Staging | `main` | `frontend` | `npm run build` | Static Edge CDN |
| **Internship BE**| `ashivam-internship-staging` | Render | Free | `main` | `backend` | `npm ci --omit=dev`| `node src/server.js` |
| **HRMS FE** | `ashivam-hrms-frontend` | Vercel | Staging | `main` | `frontend` | `npm run build` | Static Edge CDN |
| **HRMS BE** | `ashivam-hrms-staging` | Render | Free | `main` | `backend` | `npm ci --omit=dev`| `node src/server.js` |

---

## 2. VERCEL REWRITES & ROUTING CONFIGURATION

All three frontends utilize standardized edge rewrite configurations to enable:
1. Seamless proxying of `/api/v1/*` requests directly to their respective Render cloud backends without exposing backend domains to third parties.
2. Full Single Page Application (SPA) fallback to `/index.html`, eliminating HTTP 404 errors on direct navigation, bookmarks, and browser page refreshes.
3. Enforcement of strict HTTP security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy).

### Standardized `vercel.json` Pattern:
```json
{
  "rewrites": [
    { "source": "/api/v1/(.*)", "destination": "https://<app>-staging.onrender.com/api/v1/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://<app>-staging.onrender.com; frame-ancestors 'none';" }
      ]
    }
  ]
}
```

---

## 3. RENDER ENVIRONMENT VARIABLES CHECKLIST

### 3.1. Corporate Website Backend (Production)
- `NODE_ENV`: `production`
- `PORT`: `10000`
- `CLIENT_URL`: `https://ashivam-tec-h.vercel.app`
- `ALLOWED_ORIGINS`: `https://ashivam-tec-h.vercel.app`
- `MONGODB_URI`: Atlas production connection string
- `JWT_SECRET`: High-entropy production key (generateValue)
- `JWT_REFRESH_SECRET`: High-entropy production key (generateValue)
- `INTERNSHIP_SERVICE_URL`: `https://ashivam-internship-staging.onrender.com`
- `INTERNSHIP_SERVICE_SECRET`: Aligned with Internship service secret

### 3.2. Internship Management Backend (Staging)
- `NODE_ENV`: `staging`
- `PORT`: `10000`
- `MONGODB_URI`: Atlas staging connection string (`ashivam_internship`)
- `JWT_SECRET`: High-entropy key (generateValue)
- `JWT_REFRESH_SECRET`: High-entropy key (generateValue)
- `CERTIFICATE_SIGNING_KEY`: High-entropy HMAC signing key (generateValue)
- `WEBSITE_SERVICE_SECRET`: Matches Website `INTERNSHIP_SERVICE_SECRET`
- `HRMS_SERVICE_URL`: `https://ashivam-hrms-staging.onrender.com`
- `HRMS_SERVICE_SECRET`: Aligned with HRMS service secret

### 3.3. HRMS Core Backend (Staging)
- `NODE_ENV`: `staging`
- `PORT`: `10000`
- `MONGODB_URI`: Atlas staging connection string (`ashivam_hrms`)
- `JWT_SECRET`: High-entropy key (generateValue)
- `JWT_REFRESH_SECRET`: High-entropy key (generateValue)
- `CORS_ORIGIN`: `https://ashivam-hrms-frontend.vercel.app,https://ashivam-tec-h.vercel.app`
- `INTERNSHIP_SERVICE_URL`: `https://ashivam-internship-staging.onrender.com`
- `INTERNSHIP_SERVICE_SECRET`: Matches Internship `HRMS_SERVICE_SECRET`

---

## 4. OPERATIONAL READINESS & ROLLBACK PROTOCOL

1. **Rollback Procedure:**
   - **Vercel Frontend:** In Vercel Project Dashboard $\to$ Deployments $\to$ Select prior healthy deployment $\to$ Click "Promote to Production" (instant 5-second CDN rollback).
   - **Render Backend:** If a defect is discovered in production, revert Git commit via `git revert <sha>` on `main` and push; Render will automatically rebuild and deploy the prior state.
2. **Monitoring & Alerts:**
   - Health probes (`/api/v1/health`) return HTTP 200 with service name, timestamp, and status.
   - Any HTTP status $\ge 500$ triggers immediate notification logging.
3. **Zero-Cost Constraint Compliance:**
   - All staging applications operate strictly within Render Free and Vercel Hobby tiers ($0.00/month).
   - Corporate Website runs on Render Starter plan to guarantee high availability and eliminate cold-start timeouts for customer-facing inquiries.
