# Ashivam Technologies — Staging Deployment Checklist & Runbook

**Environment Target:** Staging (`staging`)  
**Backend Target:** `https://ashivam-tech-staging.onrender.com/api/v1`  
**Frontend Target:** `https://ashivam-tec-h-staging.vercel.app`  
**Document Owner:** Principal DevOps Engineer & Application Security Architect  
**Classification:** Internal Deployment & Verification Guide  
**Release Gate Status:** `READY FOR STAGING`

---

## 1. Executive Summary

This checklist specifies the exact prerequisite resources, environment configurations, and deployment procedures required to instantiate an isolated staging environment for Ashivam Technologies. 

Under strict engineering policy:
- **No production credentials, production databases, production secrets, or production storage** may be referenced or utilized in the staging environment.
- Corporate notification alerts must route strictly to the company-mandated notification address: `team.ashivam@gmail.com`.
- Public inquiry and candidate acknowledgment emails in staging must be captured by an isolated sandbox (Mailtrap or Ethereal) to eliminate any leakage to production recipient inboxes.

---

## 2. Staging Infrastructure Architecture

```
                                  +-------------------------------------------------------+
                                  |                 Vercel Staging Edge                   |
                                  |       https://ashivam-tec-h-staging.vercel.app        |
                                  +---------------------------+---------------------------+
                                                              |
                                                   HTTPS / Cross-Origin
                                               (SameSite=None; Secure=true)
                                                              v
+--------------------------------+        +-----------------------------------------------+
|     AWS S3 Sandbox Storage     |        |            Render Staging Web Service         |
|  ashivam-staging-documents-bucket  <---+--|     https://ashivam-tech-staging.onrender.com   |
+--------------------------------+        +-----------------------+-----------------------+
                                                                  |
                                                                  | TLS
                                                                  v
+--------------------------------+        +-----------------------------------------------+
|   Mailtrap / Ethereal Sandbox  |        |          MongoDB Atlas Staging Cluster        |
|  (Captured Email Testing)      |<-------+                  (ashivam_staging)            |
+--------------------------------+        +-----------------------------------------------+
```

---

## 3. Environment Variable Specification

### 3.1 Backend Staging Configuration (`ashivam-tech-staging.onrender.com`)

| Variable Name | Required Value / Format | Purpose | Security Constraints |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables Express production optimizations, HSTS, secure cookies | Non-development |
| `PORT` | `10000` | Port assigned by Render container runtime | Render standard |
| `MONGODB_URI` | `mongodb+srv://staging_user:StagingPass@cluster0.ashivam.mongodb.net/ashivam_staging?retryWrites=true&w=majority` | Dedicated staging logical database | Strictly isolated from `ashivam_production` |
| `CLIENT_URL` | `https://ashivam-tec-h-staging.vercel.app` | Canonical frontend origin for notifications & links | Must match Vercel staging |
| `CORS_ORIGIN` | `https://ashivam-tec-h-staging.vercel.app,http://localhost:5173,http://localhost:5199` | Allowed CORS origins for browser fetch | Explicit allowlist; no `*` wildcards |
| `JWT_SECRET` | 64-character random hex string (`openssl rand -hex 32`) | Signs access tokens (15-min lifespan) | Must differ from `JWT_REFRESH_SECRET` |
| `JWT_REFRESH_SECRET` | 64-character random hex string (`openssl rand -hex 32`) | Signs refresh tokens (7-day lifespan) | Must differ from `JWT_SECRET` |
| `COOKIE_SAMESITE` | `none` | Cross-domain cookie sharing between Vercel & Render | Mandatory for separate staging domains |
| `COOKIE_SECURE` | `true` | Enforces HTTPS-only cookie transmission | Mandatory for `SameSite=None` |
| `COMPANY_NOTIFICATION_EMAIL` | `team.ashivam@gmail.com` | Sole authorized company notification recipient | **MANDATORY**: Non-overridable |
| `EMAIL_PROVIDER` | `smtp` | Mailer transport driver | Set to `smtp` for Mailtrap sandbox |
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` | Sandboxed SMTP server host | Mailtrap or Ethereal |
| `SMTP_PORT` | `2525` | Sandboxed SMTP port | 587 or 2525 |
| `SMTP_SECURE` | `false` | TLS opportunistic upgrade (STARTTLS) | Standard for port 2525/587 |
| `SMTP_USER` | `staging_mailtrap_user_id` | Mailtrap testing account username | Isolated sandbox credentials |
| `SMTP_PASSWORD` | `staging_mailtrap_secret_pwd` | Mailtrap testing account password | Isolated sandbox credentials |
| `SMTP_FROM` | `Ashivam Technologies <teamashivam@gmail.com>` | Authenticated SMTP sender identity | Must use authenticated sender |
| `AWS_REGION` | `ap-south-1` | AWS S3 region (Mumbai) | AWS Region |
| `AWS_S3_BUCKET` | `ashivam-staging-documents` | Dedicated staging S3 document store | Isolated from production bucket |
| `AWS_ACCESS_KEY_ID` | `AKIA_STAGING_KEY_ID` | Staging IAM user access key | Least-privilege IAM policy |
| `AWS_SECRET_ACCESS_KEY` | `staging_secret_access_key` | Staging IAM user secret | Least-privilege IAM policy |

### 3.2 Frontend Staging Configuration (`ashivam-tec-h-staging.vercel.app`)

| Variable Name | Required Value / Format | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://ashivam-tech-staging.onrender.com/api/v1` | Canonical staging backend API endpoint |
| `VITE_API_BASE_URL` | `https://ashivam-tech-staging.onrender.com/api/v1` | Secondary fallback for backward compatibility |

---

## 4. Step-by-Step Staging Provisioning Runbook

### Step 1: MongoDB Atlas Staging Database Provisioning
1. Log in to the MongoDB Atlas console.
2. Under Cluster `Cluster0`, create a dedicated database user:
   - **Username:** `ashivam_staging_srv`
   - **Authentication:** Password (generate 32-character random string)
   - **Privileges:** `readWrite` strictly on `ashivam_staging` database.
3. Verify IP Access List includes Render outbound IPs (or `0.0.0.0/0` with strong password authentication).
4. Run bootstrap indexing script to provision collections and compound indices:
   ```bash
   NODE_ENV=staging MONGODB_URI="<STAGING_URI>" node backend/src/scripts/init-indexes.js
   ```

### Step 2: AWS S3 Staging Bucket Provisioning
1. In AWS Management Console (Region: `ap-south-1` Mumbai), create bucket `ashivam-staging-documents`.
2. Configure bucket settings:
   - **Block all public access:** Enabled (Strict privacy).
   - **Default encryption:** SSE-S3 (AES-256).
   - **CORS Configuration:**
     ```json
     [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
         "AllowedOrigins": ["https://ashivam-tec-h-staging.vercel.app"],
         "ExposeHeaders": ["ETag"]
       }
     ]
     ```
3. Provision IAM user `ashivam-staging-uploader` with inline policy granting `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` strictly to `arn:aws:s3:::ashivam-staging-documents/*`.

### Step 3: Mailtrap Sandbox Setup
1. Log in to Mailtrap (mailtrap.io).
2. Create staging inbox: `Ashivam Technologies Staging Sandbox`.
3. Capture SMTP credentials:
   - Host: `sandbox.smtp.mailtrap.io`
   - Port: `2525`
   - Username: `<provided-by-mailtrap>`
   - Password: `<provided-by-mailtrap>`
4. Confirm test message delivery to verify TLS handshake.

### Step 4: Render Staging Web Service Creation
1. In Render dashboard, click **New + > Web Service**.
2. Connect GitHub repository `Official-Website-main` (or staging branch).
3. Configure service parameters:
   - **Name:** `ashivam-tech-staging`
   - **Region:** `Singapore` (or `Frankfurt`)
   - **Root Directory:** `backend`
   - **Runtime:** `Node` (or `Docker`)
   - **Build Command:** `npm ci --production`
   - **Start Command:** `node src/server.js`
   - **Instance Type:** `Starter` ($7/mo) or `Free`
4. Add all environment variables listed in Section 3.1.
5. Deploy service and confirm build log terminates with:
   `[Server] Ashivam Technologies backend listening on port 10000`

### Step 5: Initial Administrator Bootstrap
1. Execute staging Superadmin bootstrap via one-time script or secure seed:
   ```bash
   NODE_ENV=staging MONGODB_URI="<STAGING_URI>" node backend/src/scripts/seed-staging-admin.js
   ```
2. Temporary bootstrap credentials generated:
   - **Username:** `staging_superadmin`
   - **Temporary Password:** `TempStaging#2026!`
   - **Role:** `Superadmin`
   - **Flag:** `forcePasswordChange: true`
3. Superadmin must perform an immediate password change upon initial login.

### Step 6: Vercel Staging Frontend Deployment
1. In Vercel dashboard, navigate to project settings.
2. Under **Domains**, attach `ashivam-tec-h-staging.vercel.app` to branch `staging` (or custom staging environment).
3. Under **Environment Variables**, configure for Environment: `Preview` / `Staging`:
   - `VITE_API_URL` = `https://ashivam-tech-staging.onrender.com/api/v1`
   - `VITE_API_BASE_URL` = `https://ashivam-tech-staging.onrender.com/api/v1`
4. Trigger redeploy and verify staging build completion.

---

## 5. Staging Verification Gate Criteria

Prior to accepting staging verification:
- [ ] Health endpoint `https://ashivam-tech-staging.onrender.com/api/v1/health` returns `200 OK` with database `connected`.
- [ ] Staging frontend `https://ashivam-tec-h-staging.vercel.app` loads without console errors.
- [ ] Admin login successfully issues `refreshToken` with `SameSite=None; Secure=true; HttpOnly`.
- [ ] Public contact form submits and creates record in `ashivam_staging.inquiries`.
- [ ] Contact alert email appears in Mailtrap inbox with `To: team.ashivam@gmail.com`.
- [ ] Internship registration triggers candidate acknowledgment in Mailtrap inbox.
- [ ] Zero emails sent to production email inboxes or production databases.
- [ ] All 19 Playwright real-browser E2E scenarios pass against staging URLs.

---

*Document compiled in compliance with Ashivam Technologies Infrastructure Security Standards.*
