# PRODUCTION DEPLOYMENT & LAUNCH GUIDE — ASHIVAM TECHNOLOGIES

**Target:** `ashivam-official-platform`  
**Date:** 2026-10-08  
**Classification:** Operational Runbook  

---

## 1. Architecture Overview

```
[User Browser]
       │ (HTTPS)
       ▼
┌─────────────────────────────────┐
│   Vercel Edge CDN (Frontend)    │  Domain: https://ashivam-tec-h.vercel.app
│   React 18 SPA + Design Tokens  │
└────────────────┬────────────────┘
                 │ (REST API via VITE_API_URL / HTTPS)
                 ▼
┌─────────────────────────────────┐
│   Cloud PaaS / Docker (Backend) │  Platform: Render / Railway / AWS / VPS
│   Express 5.2 + Node 22 (Alpine)│  Port: 5000 / 10000
└───────┬─────────────────┬───────┘
        │ (TLS / MONGODB_URI)│ (STARTTLS / SMTP)
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│MongoDB Atlas │   │ SMTP Gateway │
│Managed Multi-│   │(SendGrid/SES/│
│Node Cluster  │   │  Workspace)  │
└──────────────┘   └──────────────┘
```

---

## 2. Production Checklist

### Phase 1: Managed MongoDB Atlas Setup
1. **Create Cluster:** Deploy an M0/M10 MongoDB Atlas cluster in your target region (e.g., AWS `ap-south-1` Mumbai or `us-east-1`).
2. **Database User:**
   - Create a dedicated database user (e.g. `ashivam_prod_app`).
   - Grant role: `readWrite` on database `ashivam_technologies` (Least-Privilege).
   - Generate a strong random password (32+ alphanumeric characters).
3. **Network Access / IP Whitelist:**
   - For containerized PaaS platforms (Render, Railway, Fly.io), configure IP Access List `0.0.0.0/0` with SCRAM-SHA-256 and strict username/password authentication, or use VPC Peering / Static Outbound IPs if on AWS/GCP.
4. **Connection String:**
   ```
   mongodb+srv://ashivam_prod_app:<PASSWORD>@cluster0.ashivam.mongodb.net/ashivam_technologies?retryWrites=true&w=majority
   ```

### Phase 2: Production SMTP Setup
1. **Provider:** Setup SendGrid, Amazon SES, Mailgun, or Google Workspace SMTP relay.
2. **DNS Records:** Ensure SPF, DKIM, and DMARC records are configured for `ashivamtechnologies.com` to prevent emails landing in spam.
3. **Credentials:**
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASSWORD=<YOUR_SENDGRID_API_KEY>
   EMAIL_FROM=Ashivam Technologies <no-reply@ashivamtechnologies.com>
   NOTIFICATION_RECIPIENT=contact@ashivamtechnologies.com
   ```

### Phase 3: Backend Deployment (Render / Docker / VPS)

#### Option A: One-Click Deploy via Render
1. Connect this GitHub repository to Render.
2. Render detects `render.yaml` automatically.
3. In the Render Dashboard, fill in the required synced secret environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
4. Deploy service. Once deployed, verify health at `https://<your-service>.onrender.com/api/v1/health`.

#### Option B: Docker Container Deployment
```bash
docker build -t ashivam-backend:latest -f backend/Dockerfile .
docker run -d -p 5000:5000 --env-file backend/.env.production ashivam-backend:latest
```

### Phase 4: Frontend Vercel Configuration
1. In the Vercel project settings for `ashivam-tec-h`:
2. Navigate to **Settings** → **Environment Variables**.
3. Add:
   - `VITE_API_URL` = `https://<your-deployed-backend-url>/api/v1`
4. Redeploy the frontend.

### Phase 5: Verification & End-to-End Validation
1. Open `https://ashivam-tec-h.vercel.app/#contact`.
2. Submit a live contact inquiry form.
3. Verify:
   - Frontend shows confirmation modal / banner.
   - Response status `201 Created`.
   - Record created in MongoDB Atlas `inquiries` collection.
   - Confirmation email received by applicant.
   - Admin alert received at `NOTIFICATION_RECIPIENT`.
