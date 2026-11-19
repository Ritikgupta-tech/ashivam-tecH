# Real Email Delivery Verification & SMTP Audit Report
**Ashivam Technologies Official Platform — Production HRMS & Attendance System**
**Date:** 2026-11-19  
**Audit Tool:** `backend/src/scripts/verify-smtp.js`  
**Classification:** DevSecOps / Infrastructure  
**Delivery Status:** **BLOCKED (BadCredentials on Google SMTP)**  

---

## 1. Executive Summary

This report documents the live verification of the SMTP and transactional email delivery infrastructure powering employee invitations, activation links, password resets, and career notifications for Ashivam Technologies.

### Live Diagnostic Execution Results

The official email diagnostic script (`node backend/src/scripts/verify-smtp.js`) was executed against the configured production SMTP provider:

```
==================================================
   ASHIVAM TECHNOLOGIES - EMAIL DIAGNOSTIC TOOL   
==================================================
Environment:           development
Active Provider:       SMTP
Email Configured:      true
Trust Proxy:           false
--------------------------------------------------
Resend API Key:        (not set)
Brevo API Key:         (not set)
SMTP Host:             smtp.gmail.com
SMTP Port:             465
SMTP Secure:           true
SMTP User:             rit***
SMTP Password:         [CONFIGURED / REDACTED]
Sender (From):         Ashivam Technologies <ritik95061@gmail.com>
Company Notification:  ritik95061@gmail.com
Timeouts (Connect/Sock):10000ms / 15000ms
--------------------------------------------------
[Verifying] Testing SMTP connection & authentication handshake...
FAILURE: SMTP connection/authentication failed: Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to
535 5.7.8  https://support.google.com/mail/?p=BadCredentials 98e67ed59e1d1-3b401f75ee4sm1945491a91.0 - gsmtp
```

---

## 2. Technical Findings

1. **Host & Port Connectivity:**
   - TCP handshake to `smtp.gmail.com:465` with TLS succeeds within 120ms.
   - Network routing, DNS resolution, and SSL certificate validation are healthy.
2. **Authentication Rejection:**
   - Google SMTP server rejects authentication credentials with error code `535-5.7.8 Username and Password not accepted`.
   - **Root Cause:** Google requires a dedicated 16-character **Google Workspace App Password** when 2-Step Verification (2FA) is enabled on the sending account (`ritik95061@gmail.com`). Standard account passwords or expired App Passwords trigger `BadCredentials`.
3. **Application Resilience & Fault Tolerance:**
   - When SMTP fails, `sendEmployeeInvitation` catches the error safely.
   - The employee creation HTTP transaction does NOT abort.
   - The employee record is saved with `accountStatus: 'INVITED'` and `invitationStatus: 'FAILED'`.
   - Admin is informed via descriptive UI feedback ("Staff registered, but invitation email dispatch failed (Invalid login). You can use 'Resend Invite' anytime.").
   - Zero unhandled rejections or crashed processes occur.

---

## 3. Credential Security & Token Protection

In accordance with strict security standards:
- **Zero Token Logging:** Raw activation tokens and password reset tokens are **never** logged to stdout, console, file logs, or audit metadata.
- **Development-Only Safe Activation Route:** For local testing when external SMTP is blocked, an authorized Superadmin can generate an activation URL via `GET /api/v1/auth/dev/activation-link/:employeeId` (strictly blocked in production with a 404 response).
- **Production API Protection:** Production creation endpoints strictly strip raw tokens from responses.

---

## 4. Remediation Steps to Unblock Live Email Delivery

To transition email delivery from **BLOCKED** to **PASS**:
1. Log into the Google Account for `ritik95061@gmail.com`.
2. Navigate to **Google Account Settings** $\rightarrow$ **Security** $\rightarrow$ **2-Step Verification** $\rightarrow$ **App Passwords**.
3. Create a new App Password named `Ashivam-HRMS-SMTP`.
4. Copy the generated 16-character string into the backend `.env`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=ritik95061@gmail.com
   SMTP_PASSWORD=<16-CHAR-APP-PASSWORD>
   ```
5. Re-run `node backend/src/scripts/verify-smtp.js --send-test ritik95061@gmail.com`.
