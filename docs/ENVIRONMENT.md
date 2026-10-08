# ENVIRONMENT & CONFIGURATION GUIDE — ASHIVAM TECHNOLOGIES

**Target:** `backend/`  
**Updated:** 2026-10-08  
**Classification:** Operational Security & Deployment Documentation  

---

## 1. Overview

The backend uses Node.js ES modules with environment loading orchestrated by `dotenv` in `backend/src/config/env.js`. Configuration variables are validated at boot time, and production execution strictly enforces cryptographic standards (such as requiring a defined `JWT_SECRET`).

---

## 2. Environment Variables Matrix

| Variable | Type | Default | Required? | Purpose / Description |
|---|---|---|---|---|
| `NODE_ENV` | String | `development` | No | Operational mode (`development`, `production`, `test`). |
| `PORT` | Number | `5000` | No | TCP port bound by HTTP listener. |
| `CLIENT_URL` | String | `http://localhost:5173` | No | Single client URL origin (legacy fallback). |
| `ALLOWED_ORIGINS` | Comma-delimited | *(Localhost & Vercel)* | Recommended | Comma-separated CORS origins permitted to access credentials & APIs. |
| `MONGODB_URI` | String | `mongodb://127.0.0.1:27017/ashivam_technologies` | **Yes** in Prod | MongoDB replica set or standalone connection string. |
| `JWT_SECRET` | String | *Dev fallback* | **Yes** in Prod | Secret key utilized for HMAC SHA-256 JWT signing. |
| `JWT_EXPIRES_IN` | String | `1h` | No | Validity duration of issued admin JWT access tokens. |
| `LOGIN_RATE_LIMIT` | Number | `5` | No | Maximum failed login attempts allowed per window. |
| `LOGIN_RATE_WINDOW_MS`| Number | `900000` (15m) | No | Time window in milliseconds for login rate limit. |
| `PUBLIC_FORM_RATE_LIMIT`| Number | `10` | No | Maximum public form submissions per IP per window. |
| `PUBLIC_FORM_RATE_WINDOW_MS`| Number | `900000` (15m) | No | Time window in milliseconds for public form rate limit. |
| `GLOBAL_RATE_LIMIT`| Number | `100` | No | Maximum global requests allowed per IP per window. |
| `GLOBAL_RATE_WINDOW_MS`| Number | `900000` (15m) | No | Time window in milliseconds for global rate limiter. |
| `SMTP_HOST` | String | `""` | Optional | SMTP hostname (e.g. `smtp.sendgrid.net`, `smtp.gmail.com`). |
| `SMTP_PORT` | Number | `587` | No | SMTP TCP port (587 for STARTTLS, 465 for SSL). |
| `SMTP_SECURE` | Boolean | `false` | No | Set to `true` for TLS port 465; `false` for port 587. |
| `SMTP_USER` | String | `""` | Optional | SMTP authentication username. |
| `SMTP_PASSWORD` | String | `""` | Optional | SMTP authentication password / app token. |
| `EMAIL_FROM` | String | `Ashivam Technologies...` | No | Display name and sender email address. |
| `NOTIFICATION_RECIPIENT` | String | `admin@ashivamtechnologies.com` | No | Admin inbox where public form notices are forwarded. |
| `INITIAL_ADMIN_USERNAME`| String | `superadmin` | No | Username used when initializing seed admin script. |
| `INITIAL_ADMIN_PASSWORD`| String | `""` | Recommended | Password used when initializing seed admin script. |

---

## 3. Production Deployment Security Guidelines

1. **JWT Secret Generation:**
   Generate a cryptographically secure 256-bit or 512-bit key before launching in production:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. **CORS Configuration:**
   Ensure `ALLOWED_ORIGINS` includes both the canonical domain and any preview environments:
   ```env
   ALLOWED_ORIGINS=https://ashivamtechnologies.com,https://www.ashivamtechnologies.com,https://ashivam-tec-h.vercel.app
   ```
3. **Database URI:**
   In production, use MongoDB Atlas with standard TLS/SRV connection parameters:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.ashivam.mongodb.net/ashivam_technologies?retryWrites=true&w=majority
   ```
4. **Email Graceful Fallback:**
   If SMTP is not configured, the backend logs a non-blocking diagnostic message while continuing to accept inquiries and applications, preventing end-user transaction failures.
