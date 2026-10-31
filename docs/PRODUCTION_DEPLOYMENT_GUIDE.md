# Ashivam Technologies — Production Deployment Guide & Runbook

**Document Version:** 3.0.0 (Master Engineering Release)  
**Classification:** Confidential — Internal Company & DevOps Use Only  
**Company:** Ashivam Technologies  
**Target Live Frontend:** `https://ashivam-tec-h.vercel.app/`  
**Target Live Backend:** `https://ashivam-tech.onrender.com/api/v1`  
**Mandated Company Notification Recipient:** `team.ashivam@gmail.com`  
**Date:** October 30, 2026  

---

## 1. Production Architecture Overview

The Ashivam Technologies platform deploys across a high-availability decoupled cloud architecture:
* **Frontend Tier (Vercel):** Single-page application compiled via Vite 8.3 into static assets distributed globally across Vercel's Edge Network.
* **Backend Tier (Render):** Stateless Express 5.2 Node.js container with reverse proxy trust (`TRUST_PROXY: 1`) and automatic HTTPS termination.
* **Database Tier (MongoDB Atlas):** Multi-region replica set with least-privilege user authentication and TLS encryption in transit.
* **Object Storage Tier (AWS S3 / Cloudflare R2):** Private bucket storing candidate resumes and HR documents with server-side AES256 encryption.
* **Transactional Email Tier (Google SMTP / Resend):** TLS encrypted transport delivering lead alerts and candidate receipts.

---

## 2. Step-by-Step Deployment Runbook

### Step 1: Provision MongoDB Atlas Database
1. Create a dedicated company project and M10+ cluster on MongoDB Atlas in AWS Mumbai (`ap-south-1`) or Oregon (`us-west-2`).
2. Create a database user with `readWrite` privileges restricted to the `ashivam_technologies` database.
3. Configure the Network Access IP Access List (allow Render's outbound IPs or `0.0.0.0/0` with strong authentication).
4. Save the connection string: `mongodb+srv://<USER>:<PASSWORD>@<CLUSTER>.mongodb.net/ashivam_technologies?retryWrites=true&w=majority`.

### Step 2: Configure Object Storage (AWS S3 / Cloudflare R2)
1. Create a private bucket named `ashivam-vault-prod`.
2. Block all public access (enable all 4 Block Public Access settings).
3. Create an IAM policy granting `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` restricted strictly to `arn:aws:s3:::ashivam-vault-prod/*`.
4. Generate programmatic Access Key ID and Secret Access Key.

### Step 3: Deploy Backend on Render
1. Connect the company GitHub repository to Render: `https://github.com/AshivamTechnologies/Official-Websites.git`.
2. Create a new Web Service referencing `render.yaml` or configure manually:
   * **Root Directory:** `backend`
   * **Environment:** `Node` (v22 LTS)
   * **Build Command:** `npm ci --omit=dev`
   * **Start Command:** `node src/server.js`
   * **Port:** `10000`
   * **Health Check Path:** `/api/v1/health`
3. Enter Backend Environment Variables:
   ```bash
   NODE_ENV=production
   PORT=10000
   CLIENT_URL=https://ashivam-tec-h.vercel.app
   ALLOWED_ORIGINS=https://ashivam-tec-h.vercel.app,https://ashivamtechnologies.com
   MONGODB_URI=mongodb+srv://<USER>:<PASS>@<CLUSTER>.mongodb.net/ashivam_technologies?retryWrites=true&w=majority
   JWT_SECRET=[GENERATE 32+ CHAR SECURE RANDOM STRING]
   JWT_EXPIRES_IN=1h
   TRUST_PROXY=1

   # Centralized Company Email Notification
   COMPANY_NOTIFICATION_EMAIL=team.ashivam@gmail.com
   NOTIFICATION_RECIPIENT=team.ashivam@gmail.com
   ALERT_EMAIL=team.ashivam@gmail.com

   # SMTP Sender Authentication Identity
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=teamashivam@gmail.com
   SMTP_PASSWORD=[GOOGLE APP PASSWORD]
   EMAIL_FROM=Ashivam Technologies <teamashivam@gmail.com>

   # Private Object Storage
   STORAGE_PROVIDER=s3
   S3_BUCKET=ashivam-vault-prod
   S3_REGION=ap-south-1
   S3_ACCESS_KEY_ID=[IAM ACCESS KEY]
   S3_SECRET_ACCESS_KEY=[IAM SECRET KEY]
   ```
4. Deploy service and verify startup log:
   `[Email Service] Company Notification Recipient: team.ashivam@gmail.com`
   `[Email Service] SMTP connection & authentication verified successfully.`

### Step 4: Seed Superadmin Account
Once backend is connected to the database, open the Render Shell and execute:
```bash
node src/scripts/create-admin.js
```
Follow the interactive prompts to provision the initial Superadmin credentials.

### Step 5: Deploy Frontend on Vercel
1. Import the repository in Vercel.
2. Select Framework Preset: `Vite`.
3. Root Directory: `./`.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Environment Variables:
   ```bash
   VITE_API_URL=https://ashivam-tech.onrender.com/api/v1
   ```
7. Deploy. `vercel.json` automatically manages client SPA routing rewrites.

---

## 3. Post-Deployment Verification & Smoke Tests

Execute these verification checks immediately following deployment:

1. **Liveness & Health Probe:**
   ```bash
   curl -i https://ashivam-tech.onrender.com/api/v1/health
   # Expected: HTTP 200 OK, { success: true, database: "connected" }
   ```
2. **Security Headers Verification:**
   ```bash
   curl -i https://ashivam-tech.onrender.com/api/v1/health
   # Verify: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, no X-Powered-By
   ```
3. **Admin Login Gateway:**
   * Open `https://ashivam-tec-h.vercel.app/employee-login/admin`.
   * Log in using seeded Superadmin credentials.
   * Verify all 11 modules load without console errors.
4. **Live Inbound Lead Submission:**
   * Submit an inquiry on the homepage contact form.
   * Verify lead appears in `/admin` under Inquiries.
   * Confirm email alert arrives in `team.ashivam@gmail.com`.

---

## 4. Rollback & Disaster Recovery Runbook

* **Frontend Rollback:** In the Vercel Dashboard, select the previous successful deployment and click **Promote to Production** (instant zero-downtime rollback).
* **Backend Rollback:** In the Render Dashboard, select the previous commit deployment from the Activity tab and click **Rollback**.
* **Database Recovery:** In the event of catastrophic data corruption, restore from the latest timestamped `mongodump` directory:
  ```bash
  mongorestore --uri="mongodb+srv://<USER>:<PASS>@<CLUSTER>/ashivam_technologies" ./backup_YYYYMMDD/ashivam_technologies
  ```
