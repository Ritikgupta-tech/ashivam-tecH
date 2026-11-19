# DEPLOYMENT GUIDE
## Ashivam Technologies — Google Meet Attendance System Production Runbook

**Document Version:** 1.0.0-PROD  
**Target Infrastructure:** Render Backend / Vercel Frontend / Google Cloud Platform  
**Target Environment:** Production  
**Backend Base URL:** `https://ashivam-tech.onrender.com`  
**Frontend URL:** `https://ashivam.tech` (or `https://ashivam-tec-h.vercel.app`)  

---

## 1. Google Cloud Platform Configuration

### 1.1. Project & Required APIs
- Project ID: `ashivam-meet-attendance`
- Enable the following APIs via Google Cloud Console or `gcloud`:
  ```bash
  gcloud services enable \
    meet.googleapis.com \
    workspaceevents.googleapis.com \
    pubsub.googleapis.com \
    --project ashivam-meet-attendance
  ```

### 1.2. OAuth 2.0 Credentials & Consent Screen
1. Navigate to **Google Cloud Console > APIs & Services > Credentials**.
2. Select your Web Application OAuth 2.0 Client ID.
3. Configure **Authorized Redirect URIs**:
   - `https://ashivam-tech.onrender.com/api/v1/attendance/admin/google/callback`
   - `http://localhost:5000/api/v1/attendance/admin/google/callback` (for local development)
4. Configure **OAuth Consent Screen**:
   - Publishing Status: **In Production** (or Internal Workspace).
   - Scopes to add:
     - `https://www.googleapis.com/auth/meetings.space.created`
     - `https://www.googleapis.com/auth/meetings.space.readonly`

### 1.3. Google Cloud Pub/Sub Topic & Push Subscription
1. Create or verify the Topic:
   - Resource: `projects/ashivam-meet-attendance/topics/ashivam-meet-events`
2. Grant IAM Publisher permissions to Google Workspace Events:
   ```bash
   gcloud pubsub topics add-iam-policy-binding ashivam-meet-events \
     --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-workspaceevents.iam.gserviceaccount.com" \
     --role="roles/pubsub.publisher" \
     --project=ashivam-meet-attendance
   ```
3. Configure the Push Subscription:
   - Subscription ID: `ashivam-meet-events-sub`
   - Topic: `ashivam-meet-events`
   - Delivery Type: **Push**
   - Push Endpoint: `https://ashivam-tech.onrender.com/api/v1/google/events/pubsub`
   - Acknowledgment Deadline: **30 seconds**
   - Retries: **Exponential backoff**

---

## 2. Render Environment Variables Configuration

Set the following environment variables in the **Render Dashboard > Environment** for the backend service:

| Variable Name | Required | Example / Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | **Yes** | `<GOOGLE_CLIENT_ID>.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **Yes** | `<ROTATED_GOOGLE_CLIENT_SECRET>` |
| `GOOGLE_REDIRECT_URI` | **Yes** | `https://ashivam-tech.onrender.com/api/v1/attendance/admin/google/callback` |
| `GOOGLE_PUBSUB_VERIFICATION_TOKEN` | **Yes** | Secure random token (matches Pub/Sub push bearer) |
| `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` | **Yes** | 64-character hex string (32-byte AES-256 key) |
| `GOOGLE_PUBSUB_TOPIC` | **Optional** | `projects/ashivam-meet-attendance/topics/ashivam-meet-events` |
| `GOOGLE_PUBSUB_SUBSCRIPTION` | **Optional** | `projects/ashivam-meet-attendance/subscriptions/ashivam-meet-events-sub` |

> [!CAUTION]
> Never commit actual secret values into Git. Ensure `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` is backed up in your company password vault; losing this key prevents decryption of stored Google refresh tokens.

---

## 3. Deployment Procedure

### 3.1. Code Deployment
1. Verify all tests pass locally:
   ```bash
   npm test --prefix backend
   npm test
   npm run build
   ```
2. Commit and push changes to the repository:
   ```bash
   git add .
   git commit -m "feat(attendance): production Google Meet attendance system"
   git push origin main
   ```
3. Render automatically detects the `main` branch push and builds the Express backend.
4. Vercel automatically deploys the updated React frontend.

### 3.2. Post-Deployment Verification
1. Verify Backend Health Probe:
   ```bash
   curl -s https://ashivam-tech.onrender.com/api/v1/health | grep '"status":"ok"'
   ```
2. Connect Google Integration:
   - Sign into the Admin Portal at `https://ashivam.tech/employee-login/admin`.
   - Open the **Google Integration** tab.
   - Click **Connect Google Workspace**. Complete Google OAuth consent.
   - Verify health status indicators turn **CONNECTED** (Green).
3. Verify Employee Workspace:
   - Sign into `https://ashivam.tech/employee-login/employee`.
   - Confirm Today's Meeting card renders without errors.

---

## 4. Rollback Plan

If an unexpected production incident occurs:
1. **Application Code Rollback:**
   - In Render Dashboard: Click **Deploys** > Click **Rollback to previous deploy**.
   - In Vercel Dashboard: Click **Deployments** > Select previous deployment > Click **Instant Rollback**.
2. **Database Backward Compatibility:**
   - All newly added fields on `Employee` (`employeeId`, `googleEmail`, `passwordHash`, `role`) are optional and non-breaking.
   - Zero collections or existing indexes were removed.
   - Pre-existing queries will continue executing with zero downtime or database schema migration rollback required.
