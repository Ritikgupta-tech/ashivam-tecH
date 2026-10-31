# Ashivam Technologies — E2E Remaining Gaps & Live Staging Transition Plan

**Document Owner:** Principal QA Automation Engineer & DevOps Architect  
**Classification:** Pre-Cloud Deployment Gap Analysis  
**Audit Baseline:** `tests/e2e-browser-staging.js` (Local Full-Stack E2E Verified)  
**Target Next State:** `LIVE STAGING E2E VERIFIED`  
**Date:** 2026-10-31  

---

## 1. Executive Summary

While the Ashivam Technologies platform has attained a **100% pass rate** across 221 backend unit/integration tests, 77 frontend component tests, and 19 Playwright browser E2E scenarios under local full-stack emulation, there remain distinct technical boundaries separating local verification from live cloud verification.

This document identifies the 5 remaining technical gaps between local emulation and live cloud deployment, and details the exact action plan to close each gap once staging cloud infrastructure is provisioned.

---

## 2. Technical Gap Analysis

```
+-------------------------------------------------------------------------------------------------+
|                                    LOCAL EMULATION VS LIVE CLOUD                                 |
+-------------------------------------------------------------------------------------------------+
| LOCAL EMULATION (CURRENT):                                                                      |
| - Origin: localhost:5199 & localhost:5099 (Single domain, port-differentiated)                   |
| - Cookies: SameSite=Lax; Secure=false (Plain HTTP transmission)                                 |
| - Email: In-memory mock transport (Captured in array)                                           |
| - File Storage: Local filesystem or memory buffers                                              |
| - Database: Local MongoDB standalone instance                                                   |
| - Process: Single Node.js event loop                                                            |
+-------------------------------------------------------------------------------------------------+
| LIVE CLOUD STAGING (TARGET):                                                                    |
| - Origin: ashivam-tec-h-staging.vercel.app & ashivam-tech-staging.onrender.com (Cross-TLD)       |
| - Cookies: SameSite=None; Secure=true (HTTPS Third-Party Context)                               |
| - Email: Mailtrap / Ethereal SMTP over TLS (Port 587/2525)                                       |
| - File Storage: AWS S3 Bucket (ap-south-1) with signed presigned uploads                        |
| - Database: MongoDB Atlas 3-node replica set with network latency                               |
| - Process: Multiple Render Web Service container instances                                      |
+-------------------------------------------------------------------------------------------------+
```

---

## 3. Detailed Gap Breakdown

### Gap 1: Cross-Domain HTTPS Cookie Transmission (`SameSite=None; Secure=true`)
- **Current Local State:**
  - In local tests, frontend runs on `http://localhost:5199` and backend runs on `http://localhost:5099`. Because it is HTTP, cookies must use `SameSite=Lax` and `Secure=false` (browsers drop `SameSite=None` without `Secure=true`, and drop `Secure=true` over plain HTTP).
- **Cloud Reality:**
  - In production and cloud staging, frontend is hosted on Vercel (`*.vercel.app`) and backend is hosted on Render (`*.onrender.com`). These are distinct top-level domains.
  - Cross-domain authentication requires `SameSite=None; Secure=true`.
  - While `env.js` and `jwt.js` have been coded with `SameSite=None` and `Secure=true` for `NODE_ENV=production`, this behavior can only be verified in a real browser executing over HTTPS across the distinct Vercel and Render domains.
- **Resolution Action:**
  - Execute Playwright against `https://ashivam-tec-h-staging.vercel.app` after deployment, asserting that `Set-Cookie` with `SameSite=None; Secure=true` is honored and sent on cross-origin requests.

### Gap 2: Live SMTP TLS Handshake & Sandbox Delivery
- **Current Local State:**
  - Email sending in `tests/e2e-browser-staging.js` uses an in-memory transport injected via `setTransporter(...)`. Real network packets never leave the machine.
- **Cloud Reality:**
  - Live staging requires communicating over an external socket to Mailtrap (`sandbox.smtp.mailtrap.io:2525` or `587`) using STARTTLS, verifying firewall rules, port egress on Render, and credential authentication.
- **Resolution Action:**
  - Configure staging Render environment variables with Mailtrap credentials.
  - Run `node backend/src/scripts/verify-smtp.js` in the Render environment to confirm STARTTLS negotiation and message reception in the Mailtrap inbox.

### Gap 3: AWS S3 Remote Binary Storage & Pre-Signed Streaming
- **Current Local State:**
  - Resumes and HR documents are uploaded using Multer memory storage and validated locally. Real AWS S3 API keys are not present in the local environment.
- **Cloud Reality:**
  - Uploading large candidate resumes ($< 5$MB) and HR PDFs requires active credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and an active S3 bucket (`ashivam-staging-documents`) in `ap-south-1`.
  - Secure document downloads stream binary buffers through authenticated Express routes to prevent public bucket exposure.
- **Resolution Action:**
  - Provision the staging S3 bucket with the CORS policy documented in `docs/STAGING_DEPLOYMENT_CHECKLIST.md`.
  - Verify multipart upload and authenticated streaming download in staging.

### Gap 4: Multi-Process Distributed Lock Acquisition on Clustered Render Instances
- **Current Local State:**
  - Distributed mutual exclusion (`SystemLock` with monotonic `fencingToken`) was verified with 50 concurrent integration promises inside a single Node.js process.
- **Cloud Reality:**
  - If Render scales to multiple web service instances (horizontal concurrency), race conditions occur across distinct operating system processes.
  - The MongoDB-backed `SystemLock` model and `Counter` atomic `$inc` updates are architecturally immune to multi-process races, but live multi-instance verification provides definitive proof.
- **Resolution Action:**
  - Provision 2 concurrent Render instances in staging and execute the 50-concurrency test suite against the load-balanced URL.

### Gap 5: Direct Browser Playwright Testing Against Cloud Edge
- **Current Local State:**
  - Playwright browser targets `http://localhost:5199` and proxies `/api` to `127.0.0.1:5099`.
- **Cloud Reality:**
  - Cloud testing introduces CDN caching (Vercel Edge), DNS resolution latencies, cold-start container delays on Render (up to 50 seconds on Free tier), and real cloud WAF inspection.
- **Resolution Action:**
  - Run the parameterized Playwright command against the live staging domains:
    ```bash
    FRONTEND_URL="https://ashivam-tec-h-staging.vercel.app" \
    BACKEND_URL="https://ashivam-tech-staging.onrender.com/api/v1" \
    npm run test:e2e
    ```

---

## 4. Remediation & Transition Roadmap

| Milestone | Action Item | Target Cloud Component | Blocking Dependency | Target Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | Atlas Staging Database Creation | MongoDB Atlas (`ashivam_staging`) | Atlas Account Access | Ready |
| **Phase 2** | S3 Sandbox Storage Provisioning | AWS S3 (`ashivam-staging-documents`) | AWS IAM Credentials | Ready |
| **Phase 3** | Mailtrap Sandbox Provisioning | Mailtrap (`sandbox.smtp.mailtrap.io`) | Mailtrap Inbox Token | Ready |
| **Phase 4** | Render Staging Web Service Deployment | Render (`ashivam-tech-staging`) | GitHub Repo Connection | Ready |
| **Phase 5** | Vercel Staging Edge Deployment | Vercel (`ashivam-tec-h-staging`) | Vercel Project Attachment | Ready |
| **Phase 6** | Cloud Playwright E2E Execution | Browser -> Cloud URLs | Phases 1–5 Completed | **LIVE STAGING E2E VERIFIED** |

---

*Authored by Principal QA Automation Engineer & Cloud Infrastructure Lead.*
