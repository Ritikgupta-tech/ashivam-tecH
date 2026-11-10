# ASHIVAM TECHNOLOGIES — MASTER ENGINEERING & ARCHITECTURAL AUDIT
**Document Reference:** `docs/engineering/MASTER_AUDIT.md`  
**Classification:** Confidential & Proprietary — Engineering Release Gate  
**Date of Audit:** 2026-11-10  
**Audit Baseline:**  
- **Corporate Website:** Commit `a644524` (`origin/main`)  
- **Internship Management:** Commit `df4d295` (`origin/main`)  
- **HR Management (HRMS):** Commit `bc8c05b` (`origin/main`)  
**Auditor Roles:** Principal Software Architect, Senior Backend Engineer, Senior Full-Stack Engineer, Security Engineer, QA Automation Lead

---

## 1. ECOSYSTEM ARCHITECTURAL OVERVIEW

The Ashivam Technologies digital platform comprises three decoupled, independently deployable applications connected via secured inter-service HTTP/JSON APIs, forming a unified enterprise ecosystem:

```
+-----------------------------------------------------------------------------------+
|                           ASHIVAM TECHNOLOGIES ECOSYSTEM                           |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [APPLICATION A: CORPORATE WEBSITE]                                               |
|  - Frontend: Vercel CDN (React 18 + Vite, SPA, Modular Design System)             |
|  - Backend: Render Starter Service (Node.js 22 LTS + Express, Modular Domains)    |
|  - Persistence: MongoDB Atlas Production Cluster                                 |
|  - Domain: Inquiries, Public Careers, Content Distribution, Admin Governance       |
|                                                                                   |
|         │                                                                         |
|         │ HMAC-SHA256 Signed Candidate Application Handoff                        |
|         ▼                                                                         |
|                                                                                   |
|  [APPLICATION B: INTERNSHIP MANAGEMENT SYSTEM]                                    |
|  - Frontend: Vercel Staging (React 18 + Vite, Role-gated Review Committee)        |
|  - Backend: Render Free/Staging Service (Node.js 22 LTS + Express)                |
|  - Persistence: MongoDB Atlas Staging Database (`ashivam_internship`)             |
|  - Domain: Application Intake, Review Rubrics, Offers, Mentorship, Certificates   |
|                                                                                   |
|         │                                                                         |
|         │ HMAC-SHA256 Signed Graduate Conversion Workflow                         |
|         ▼                                                                         |
|                                                                                   |
|  [APPLICATION C: HUMAN RESOURCE MANAGEMENT SYSTEM (HRMS)]                         |
|  - Frontend: Vercel Staging (React 18 + Vite, Dark-Theme Operational Dashboard)  |
|  - Backend: Render Free/Staging Service (Node.js 22 LTS + Express)                |
|  - Persistence: MongoDB Atlas Staging Database (`ashivam_hrms`)                   |
|  - Domain: Employee Master, Onboarding Dossiers, Attendance, Leave, Payroll       |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. REPOSITORY & CODEBASE ARCHITECTURE MATRIX

| Attribute | Application A: Corporate Website | Application B: Internship Management | Application C: HRMS Core |
| :--- | :--- | :--- | :--- |
| **Repository** | `Ritikgupta-tech/ashivam-tecH.git` | `Ritikgupta-tech/ashivam-internship-management.git` | `Ritikgupta-tech/ashivam-hr-management.git` |
| **Working Tree** | `c:\Users\DELL\Desktop\Official-Website-main` | `c:\Users\DELL\Desktop\ashivam-internship-management` | `c:\Users\DELL\Desktop\ashivam-hr-management` |
| **Tier** | **PRODUCTION** | **STAGING** | **STAGING** |
| **Frontend URL** | `https://ashivam-tec-h.vercel.app/` | `https://ashivam-internship-frontend.vercel.app/` | `https://ashivam-hrms-frontend.vercel.app/` |
| **Backend URL** | `https://ashivam-tech.onrender.com` | `https://ashivam-internship-staging.onrender.com` | `https://ashivam-hrms-staging.onrender.com` |
| **Health Probe** | `/api/v1/health` (HTTP 200) | `/api/v1/health` (HTTP 200) | `/api/v1/health` (HTTP 200) |
| **Frontend Framework** | React 18 / Vite 8 / Pure CSS tokens | React 18 / Vite 8 / Tailwind-compat CSS | React 18 / Vite 8 / Obsidian Dark CSS |
| **Backend Framework** | Node.js / Express / Mongoose / S3 | Node.js / Express / Mongoose / Multer | Node.js / Express / Mongoose / Multer |
| **Active Test Count** | **355 tests** (107 FE + 248 BE) | **87 tests** (16 FE + 71 BE) | **93 tests** (10 FE + 83 BE) |
| **Ecosystem Tests** | **535 Total Automated Tests Passing (0 Failures, 0 Skipped)** | | |

---

## 3. DEFECT AUDIT & RISK REGISTER (SEVERITY CLASSIFICATION)

### P0 — Critical Security, Data Loss, or Outage Risks
*(No active unmitigated P0 defects exist in current codebase)*

### P1 — Major Functional, Authentication, or Integration Defects
1. **[RESOLVED] HRMS Missing ErrorBoundary on Component Hierarchy (FE-HRMS-01)**
   - *Finding:* Any uncaught error in modern pages caused total white-screen crash.
   - *Resolution:* Implemented `ErrorBoundary.jsx` and mounted on `App.jsx` root.
2. **[RESOLVED] Nonfunctional "Forgot Password" Action (FE-HRMS-02)**
   - *Finding:* State was toggled but no UI was rendered, resulting in dead button behavior.
   - *Resolution:* Implemented full interactive recovery flow connected to `authApi.forgotPassword`.
3. **[RESOLVED] HRMS Missing Global API Rate Limiting (BE-HRMS-01)**
   - *Finding:* Domain routes (`/api/v1/employees`, `/api/v1/payroll`) had no rate limits.
   - *Resolution:* Created `globalApiLimiter` (300 req/15min) with health-check exemption and mounted on `/api/v1`.
4. **[RESOLVED] HRMS Rate Limiter Memory Leak (BE-HRMS-02)**
   - *Finding:* In-memory bucket map never cleared expired keys, creating unbounded RAM growth.
   - *Resolution:* Added 10-minute unref interval timer purging expired entries.
5. **[RESOLVED] HRMS `currentRole` Undefined in `AuthContext` (FE-HRMS-03)**
   - *Finding:* `useAuth().currentRole` was undefined, breaking role-specific metric rendering.
   - *Resolution:* Context value now derives `currentRole` from `user?.role`.

### P2 — Important Usability, Reliability, Performance, or Workflow Defects
1. **[RESOLVED] HRMS Hardcoded Evaluation Credentials (FE-HRMS-04)**
   - *Finding:* Quick-role switcher pre-filled personal developer email and password.
   - *Resolution:* Quick switcher pre-selects role only; credentials must be provided manually.
2. **[RESOLVED] HRMS Personal Email in Form Placeholder (FE-HRMS-05)**
   - *Finding:* Login input showed personal developer Gmail as placeholder.
   - *Resolution:* Replaced with enterprise generic placeholder `corporate.id@ashivam.tech`.
3. **[RESOLVED] Corporate Website Phone Number Placeholder (FE-WEB-01)**
   - *Finding:* Contact section rendered placeholder `+91 XXXXX XXXXX`.
   - *Resolution:* Updated `content.js` to verified active number `+91 92772 29978`.
4. **[RESOLVED] Missing Content Security Policy in Vercel Rewrites (OPS-01)**
   - *Finding:* Internship and HRMS `vercel.json` lacked CSP and Permissions-Policy headers.
   - *Resolution:* Standardized CSP and Permissions-Policy across both root and frontend `vercel.json`.
5. **[RESOLVED] Missing Infrastructure Blueprint for HRMS (OPS-02)**
   - *Finding:* `ashivam-hr-management` lacked a `render.yaml` specification.
   - *Resolution:* Authored standardized zero-cost `render.yaml` specifying secure env vars and ports.
6. **[OPEN — BLOCKED BY FREE TIER] Internship Backend Spin-down Latency (OPS-03)**
   - *Finding:* Render Free tier spins down on inactivity, causing 20-30s first-request latency.
   - *Impact:* Evaluators encountering cold starts may experience delays before backend wakes up.
   - *Mitigation:* Frontend `AuthContext` detects sleeping service and surfaces informative standby toast.

### P3 — Minor Design, Maintainability, or Optimization Issues
1. **[RESOLVED] HRMS StatCards Loading Indicator (FE-HRMS-06)**
   - *Finding:* Raw `...` string displayed during async metric retrieval.
   - *Resolution:* Replaced with modern CSS shimmer skeleton matching exact card geometry.
2. **[VERIFIED ACCURATE] Website SEO Assets (FE-WEB-02)**
   - *Finding:* Need to confirm crawler rules and sitemaps.
   - *Verification:* `public/robots.txt` and `public/sitemap.xml` are active, valid, and properly structured.

---

## 4. SECURITY AUDIT SUMMARY

- **Authentication:** All three applications enforce bcrypt hashing (salt rounds $\ge 10$), cryptographic JWT signing, 15-minute access token lifespans, and refresh token nonce rotation.
- **Role-Based Access Control (RBAC):** Verified fail-closed across all protected routes. Unauthenticated requests strictly return HTTP 401 Unauthorized. Privilege escalation attempts return HTTP 403 Forbidden.
- **Inter-Service Handshakes:** Service-to-service transfers (Website $\to$ Internship, Internship $\to$ HRMS) require HMAC-SHA256 signatures with 5-minute replay defense timestamps and unique idempotency nonces.
- **Input Sanitization & Injection Defense:** NoSQL injection patterns defended via Mongoose schema casting and regex sanitization. HTML/XSS defended via DOMPurify and React virtual DOM escaping.

---

## 5. RECOMMENDED RELEASE GATE VERIFICATION ORDER

1. **Verify Git Synchronization:** Ensure local HEAD equals `origin/main` across all repositories.
2. **Execute Full Ecosystem Automated Test Suite:** Run all 535 tests across frontend and backend packages.
3. **Inspect Production & Staging Health Probes:** Confirm HTTP 200 responses from `/api/v1/health`.
4. **Validate Frontend Production Bundles:** Ensure Vite production builds compile cleanly.
5. **Publish Engineering Dossier:** Maintain audit reports in `docs/engineering/`.
