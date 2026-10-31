# Ashivam Technologies — Environment Variables Specification

**Document Version:** 3.0.0 (Master Engineering Release)  
**Classification:** Confidential — Internal Company & DevOps Use Only  
**Company:** Ashivam Technologies  
**Date:** October 30, 2026  

---

## 1. Zero-Secret Compliance Policy

This specification documents all environment variables, schema validations, defaults, and requirements strictly using placeholders. In compliance with security standards, no actual passwords, API keys, MongoDB Atlas credentials, or private cryptographic keys are recorded in this document or committed to the repository.

---

## 2. Frontend Environment Variables (`.env.local` / Vercel)

| Variable Name | Required | Default in Code | Purpose & Validation Rules | Restart Required |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Mandatory** | `https://ashivam-tech.onrender.com/api/v1` | Base URL used by `src/api.js` for all backend REST calls. Must be full HTTPS URL in production. | Yes (Rebuild required) |
| `VITE_GA_ID` | Optional | `undefined` | Google Analytics 4 Measurement ID (format: `G-XXXXXXXXXX`). If omitted, GA tracking remains inactive. | Yes (Rebuild required) |

---

## 3. Backend Environment Variables (`backend/.env` / Render)

### 3.1 Server & Network Configuration
| Variable Name | Required | Default in Code | Purpose & Validation Rules |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Mandatory** | `development` | Set to `production` in live deployment. Triggers strict security validations. |
| `PORT` | Optional | `5000` (Dev) / `10000` (Prod) | TCP port bound by Express HTTP listener. |
| `CLIENT_URL` | **Mandatory** | `http://localhost:5173` | Canonical public frontend URL used in email action links and CORS allowlisting. |
| `ADMIN_URL` | Optional | `${CLIENT_URL}/admin` | Administrative dashboard URL included in email alerts. |
| `ALLOWED_ORIGINS` | **Mandatory** | Localhost + Vercel domains | Comma-separated list of authorized CORS origins. Localhost origins are stripped in production. |
| `TRUST_PROXY` | Optional | `1` (Prod) / `false` (Dev) | Reverse proxy hop count for accurate client IP resolution behind Render. |

### 3.2 Database & Security Tokens
| Variable Name | Required | Default in Code | Purpose & Validation Rules |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | **Mandatory** | `mongodb://127.0.0.1:27017/...` | MongoDB Atlas connection string. In production, localhost URIs are rejected. |
| `JWT_SECRET` | **Mandatory** | Dev Fallback | HMAC SHA-256 signing secret. **Must be &ge; 32 characters in production**, or startup throws an error. |
| `JWT_EXPIRES_IN` | Optional | `1h` | Access token lifespan (e.g. `1h`, `2h`, `7d`). |

### 3.3 Centralized Company Notification Recipient
| Variable Name | Required | Default in Code | Purpose & Validation Rules |
| :--- | :--- | :--- | :--- |
| `COMPANY_NOTIFICATION_EMAIL` | **Mandatory** | `team.ashivam@gmail.com` | Sole authorized company notification recipient where lead inquiries, applications, and system alerts are sent. |
| `NOTIFICATION_RECIPIENT` | Optional | `team.ashivam@gmail.com` | Backward-compatible alias for `COMPANY_NOTIFICATION_EMAIL`. |
| `ALERT_EMAIL` | Optional | `team.ashivam@gmail.com` | Backward-compatible alias for `COMPANY_NOTIFICATION_EMAIL`. |

### 3.4 Transactional Email Delivery Gateway
| Variable Name | Required | Default in Code | Purpose & Validation Rules |
| :--- | :--- | :--- | :--- |
| `EMAIL_PROVIDER` | Optional | Auto-detected | Delivery driver: `smtp`, `resend`, `brevo`, or `none`. |
| `SMTP_HOST` | Conditional | `smtp.gmail.com` | Outbound SMTP server hostname. Mandatory if using SMTP. |
| `SMTP_PORT` | Conditional | `465` (SSL) / `587` (TLS) | Outbound SMTP TCP port. |
| `SMTP_SECURE` | Conditional | `true` (Port 465) | Enables direct TLS socket for port 465. |
| `SMTP_USER` | Conditional | `teamashivam@gmail.com` | Authentication account username for Google SMTP relay. |
| `SMTP_PASSWORD` | Conditional | `""` | Google Workspace Application-Specific Password. |
| `EMAIL_FROM` | **Mandatory** | `Ashivam Technologies <teamashivam@gmail.com>` | Verified sender identity displayed in recipient headers. |
| `RESEND_API_KEY` | Conditional | `""` | API key for Resend HTTPS delivery alternative. |
| `BREVO_API_KEY` | Conditional | `""` | API key for Brevo HTTPS delivery alternative. |

### 3.5 Private Object Storage (Resumes & HR Documents)
| Variable Name | Required | Default in Code | Purpose & Validation Rules |
| :--- | :--- | :--- | :--- |
| `STORAGE_PROVIDER` | **Mandatory (Prod)** | `local` (Dev) / `s3` (Prod) | Storage mode. Must be `s3` in production to prevent file loss on ephemeral containers. |
| `S3_BUCKET` | Conditional | `""` | Target private AWS S3 or Cloudflare R2 bucket name. |
| `S3_REGION` | Conditional | `us-east-1` (or `ap-south-1`) | AWS S3 region. |
| `S3_ACCESS_KEY_ID` | Conditional | `""` | Programmatic IAM user access key. |
| `S3_SECRET_ACCESS_KEY` | Conditional | `""` | Programmatic IAM user secret key. |
| `S3_ENDPOINT` | Optional | `""` | Custom S3-compatible endpoint (e.g. for Cloudflare R2 or MinIO). |
| `S3_FORCE_PATH_STYLE` | Optional | `false` | Enables path-style bucket URLs when using MinIO or local S3 mock. |

---

## 4. Boot-Time Startup Validation (`backend/src/config/env.js`)

During process initialization, `backend/src/config/env.js` validates all critical configuration:
```javascript
if (env.isProduction) {
  if (!EMAIL_REGEX.test(env.companyNotificationEmail)) {
    throw new Error(
      `Invalid COMPANY_NOTIFICATION_EMAIL: "${env.companyNotificationEmail}". Must be a valid email address.`
    );
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is mandatory in production mode.");
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long in production mode.");
  }
  if (env.mongodbUri.includes("127.0.0.1") || env.mongodbUri.includes("localhost")) {
    throw new Error("Localhost MONGODB_URI is not allowed in production mode. Use MongoDB Atlas URI.");
  }
}
```
If any check fails, the Node.js process logs a clean diagnostic and terminates immediately, preventing insecure execution.
