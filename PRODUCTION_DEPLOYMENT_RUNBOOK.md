# PRODUCTION DEPLOYMENT RUNBOOK
## Ashivam Technologies — Google Meet Attendance System Deployment Guide

**Document Version:** 3.0.0-PROD-VERIFIED  
**Target Environments:** Render Backend (`ashivam-tech.onrender.com`) / Vercel Frontend (`ashivam.tech`)  
**Database Cluster:** MongoDB Atlas  

---

## 1. Environment Secrets Setup (Render Dashboard)

Before deploying, navigate to **Render Dashboard > Environment** for the backend service (`ashivam-tech`) and configure the following environment secrets:

| Variable Name | Required | Description / Value Format |
|---|---|---|
| `GOOGLE_CLIENT_ID` | **Yes** | `[REDACTED_GOOGLE_OAUTH_CLIENT_ID]` |
| `GOOGLE_CLIENT_SECRET` | **Yes** | Server-side rotated Google client secret |
| `GOOGLE_REDIRECT_URI` | **Yes** | `https://ashivam-tech.onrender.com/api/v1` *(or `/api/v1/google/oauth/callback`)* |
| `GOOGLE_OAUTH_SCOPES` | **Yes** | `https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/meetings.space.readonly` |
| `GOOGLE_CLOUD_PROJECT_ID` | **Yes** | `ashivam-meet-attendance` |
| `GOOGLE_PUBSUB_TOPIC` | **Yes** | `projects/ashivam-meet-attendance/topics/ashivam-meet-events` |
| `GOOGLE_PUBSUB_SUBSCRIPTION` | **Yes** | `projects/ashivam-meet-attendance/subscriptions/ashivam-meet-events-sub` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | **Yes** | 32-byte cryptographic secret for AES-256-GCM token storage |

---

## 2. Google Cloud Platform Configuration

### 2.1. API Enablement
Ensure the following APIs are enabled in project `ashivam-meet-attendance`:
- `meet.googleapis.com` (Google Meet REST API v2)
- `workspaceevents.googleapis.com` (Google Workspace Events API)
- `pubsub.googleapis.com` (Google Cloud Pub/Sub)

### 2.2. OAuth 2.0 Web Client Configuration
In **APIs & Services > Credentials > Web Client**:
- **Authorized Redirect URIs:**
  - `https://ashivam-tech.onrender.com/api/v1`
  - `https://ashivam-tech.onrender.com/api/v1/google/oauth/callback`

### 2.3. Pub/Sub Push Subscription
In **Pub/Sub > Subscriptions > `ashivam-meet-events-sub`**:
- **Delivery Type:** Push
- **Endpoint URL:** `https://ashivam-tech.onrender.com/api/v1/google/events/pubsub` *(or `/api/v1`)*
- **Acknowledgment Deadline:** 30 seconds

---

## 3. Step-by-Step Deployment Execution

### Step 1: Code Push to GitHub
Once authorized by the project lead, execute:
```bash
git push origin main
```
Render automatically detects the commit on branch `main` and initiates the build pipeline.

### Step 2: Verify Backend Liveness
```bash
curl -s https://ashivam-tech.onrender.com/api/v1/health | grep '"status":"ok"'
```

### Step 3: Authorize Google Workspace Integration
1. Log into the Admin Portal at `https://ashivam.tech/employee-login/admin` using Superadmin credentials.
2. Select the **Google Integration** tab from the navigation sidebar.
3. Click **Connect / Reauthorize Google**.
4. Log into the authorized Google organizer account and grant requested permissions.
5. Confirm redirect to the Admin Dashboard with **OAuth Connection: CONNECTED** (Green).

### Step 4: Execute Production Smoke Test
1. Schedule a 15-minute test meeting in Admin Dashboard > **Attendance** tab.
2. Join the generated Google Meet link from an employee Google account.
3. Verify that the call appears under active meetings.
4. End the call and confirm that the employee's attendance record transitions from `PENDING_VERIFICATION` to `PRESENT`.

---

## 4. Emergency Rollback Plan

If an unexpected production incident occurs:
1. **Frontend:** In Vercel Dashboard, select the previous stable deployment and click **Instant Rollback**.
2. **Backend:** In Render Dashboard, click **Rollback to previous deploy**.
3. **Database:** All schema modifications on `Employee` are optional; existing application versions will continue running without schema conflicts.
