# Ashivam Technologies — Official Website Project Documentation & Engineering Handover Blueprint

**Document Version:** 2.2 (Audited Handover Blueprint)  
**Preparation Date:** October 16, 2026  
**Verified Git Commit Hash:** `6b2fae02b0aca4138fb4ecb77d7b7cfe744ae408`  
**Target Company Repository:** [https://github.com/AshivamTechnologies/Official-Websites.git](https://github.com/AshivamTechnologies/Official-Websites.git)  
**Previous Personal Repository:** [https://github.com/Ritikgupta-tech/ashivam-tecH.git](https://github.com/Ritikgupta-tech/ashivam-tecH.git)  
**Classification:** Confidential — Internal Company & DevOps Use Only  
**Handover Scope:** Source Code Synchronized (Commit `6b2fae02b0aca4138fb4ecb77d7b7cfe744ae408`) • Company Cloud Provisioning & Live Integration Pending  
**Author:** Lead Systems Architect & DevOps Engineering Team  

---

## Table of Contents
1. [Chapter 1 — Document Control & Metadata (Cover Page)](#chapter-1--document-control--metadata-cover-page)
2. [Chapter 2 — Executive Summary](#chapter-2--executive-summary)
3. [Chapter 3 — Project Scope & Implemented Feature Catalog](#chapter-3--project-scope--implemented-feature-catalog)
4. [Chapter 4 — Comprehensive Technology Stack Matrix](#chapter-4--comprehensive-technology-stack-matrix)
5. [Chapter 5 — Architecture, Component Topography & Data Flows](#chapter-5--architecture-component-topography--data-flows)
6. [Chapter 6 — Complete Project Directory Anatomy](#chapter-6--complete-project-directory-anatomy)
7. [Chapter 7 — Prerequisites & Environmental System Requirements](#chapter-7--prerequisites--environmental-system-requirements)
8. [Chapter 8 — Step-by-Step Installation & Local Setup Guide](#chapter-8--step-by-step-installation--local-setup-guide)
9. [Chapter 9 — Complete Environment Variable Reference](#chapter-9--complete-environment-variable-reference)
10. [Chapter 10 — Database Architecture, Schema Models & Safe Migration Runbook](#chapter-10--database-architecture-schema-models--safe-migration-runbook)
11. [Chapter 11 — Comprehensive REST API Reference](#chapter-11--comprehensive-rest-api-reference)
12. [Chapter 12 — Authentication, Authorization & Security Hardening](#chapter-12--authentication-authorization--security-hardening)
13. [Chapter 13 — Quality Assurance, Automated Testing & Verification Suite](#chapter-13--quality-assurance-automated-testing--verification-suite)
14. [Chapter 14 — Cloud Hosting & Production Deployment Blueprint](#chapter-14--cloud-hosting--production-deployment-blueprint)
15. [Chapter 15 — Operational Maintenance, Troubleshooting & Handover Sign-off](#chapter-15--operational-maintenance-troubleshooting--handover-sign-off)

---

## Chapter 1 — Document Control & Metadata (Cover Page)

| Specification | Value | Notes & Verification Scope |
| :--- | :--- | :--- |
| **Project Name** | Ashivam Technologies Official Website | Full-stack digital corporate presence |
| **Document Version** | 2.2 (Audited Handover Blueprint) | Incorporates evidence-based audit, safe migration runbook, and verified scope |
| **Preparation Date** | October 16, 2026 | Verified current repository state |
| **Verified Git Commit** | `6b2fae02b0aca4138fb4ecb77d7b7cfe744ae408` | `feat(release): optimize UX layout...` |
| **Company Repository** | `https://github.com/AshivamTechnologies/Official-Websites.git` | Official company GitHub remote (`company` remote) |
| **Personal Repository** | `https://github.com/Ritikgupta-tech/ashivam-tecH.git` | Original development remote (`origin` remote) |
| **Current Live Frontend** | `https://ashivam-tec-h.vercel.app/` | Running on existing personal Vercel deployment (Preserved to prevent disruption; unverified uptime) |
| **Current Live Backend** | `https://ashivam-tech.onrender.com/api/v1` | Deployment URL is preserved on personal Render account, but current service/database health was not verified during this audit (health probe timed out on free-tier spin-down). |
| **Company Cloud Accounts (Target)** | Pending Provisioning | Target architecture: Render, Vercel, MongoDB Atlas, S3/R2, and Brevo accounts not yet provisioned |
| **Handover Backup Path** | `C:\Users\DELL\Desktop\Official-Website-Handover-Backup` | Fully verified filesystem snapshot |
| **Confidentiality** | Internal Company & DevOps Use Only | Contains architecture, security, and operations documentation |

---

## Chapter 2 — Executive Summary

### 2.1 Project Overview & Business Purpose
The **Ashivam Technologies Official Website** serves as the central digital flagship and customer engagement platform for Ashivam Technologies. Designed as an enterprise-grade web application, it bridges client acquisition, brand authority, talent recruitment, and internal employee operations into a cohesive, high-performance architecture.

The system is built upon modern full-stack web standards: a **React 18 single-page application (SPA)** powered by **Vite 8** on the client tier, coupled with a hardened, modular **Express 5.2 REST API** backed by **MongoDB Atlas** on the server tier. The user interface embodies a high-contrast dark enterprise aesthetic accented with refined gold gradients, engineered to convey technical rigor, stability, and institutional reliability.

### 2.2 Key Stakeholders & Target User Personas
- **Enterprise B2B Clients & Partners:** Exploring capabilities across custom software, cloud architecture, native mobile applications, and UI/UX design. They interact via the dynamic inquiry portal and sector-specific case study showcases.
- **Engineering Candidates & Job Applicants:** Browsing published technical openings across Android, backend, QA, and frontend roles, submitting applications with PDF/Word resume uploads directly through the public careers gateway.
- **System Administrators & Company Leadership:** Authenticating via dedicated administrative gateways to manage job listings, review inbound project inquiries, inspect recruitment pipelines, and manage corporate settings.
- **Internal Employees & HR Personnel:** Utilizing the employee document and HR management modules for internal operational records and credential verification.

### 2.3 Handover Status & Milestone Verification Scope
> [!IMPORTANT]
> **Handover Scope Clarification:** Source code custody has been transferred and synchronized to the company GitHub repository at commit `6b2fae02b0aca4138fb4ecb77d7b7cfe744ae408`. Company-owned Render, Vercel, MongoDB Atlas, and AWS/Cloudflare cloud accounts represent **target architecture pending setup and provisioning**. Live traffic continues to be served by the preserved personal deployments to prevent premature disruption; live uptime and database health were not continuously monitored or independently verified during this audit.

| Milestone Dimension | Verified Status | Evidence / Location / Constraints |
| :--- | :--- | :--- |
| **Source Code Custody** | **Synchronized** | Transferred to official company repository: `https://github.com/AshivamTechnologies/Official-Websites.git` at commit `6b2fae02b0aca4138fb4ecb77d7b7cfe744ae408`. |
| **Frontend Test Suite** | **65 Passed / 0 Failed** | Static & unit regression suite: routes, 44px touch targets, mobile drawer, responsive clamp typography, and SEO (828ms). |
| **Backend Test Suite** | **79 Passed / 0 Failed** | Unit & supertest HTTP integration suite (mocked infrastructure): validation, auth guards, rate limiters, error envelopes, and proxy trust (5,858ms). |
| **Production Build Integrity** | **Verified** | Vite production build bundles 86 modules into `dist/` in 280ms without errors or warnings. |
| **Current Live Frontend** | **Preserved (Personal)** | Hosted on personal Vercel deployment (`https://ashivam-tec-h.vercel.app/`) serving release bundle `index-0vra-z_U.js`. Preserved during transition; current uptime unverified. |
| **Current Live Backend** | **Preserved (Personal) / Unverified Health** | Deployment URL is preserved (`https://ashivam-tech.onrender.com/api/v1`), but current service/database health was not verified during this audit (health probe timed out due to free-tier spin-down). |
| **Company Cloud Infrastructure (Target)** | **Pending Provisioning** | Target architecture: company-owned Render, Vercel, MongoDB Atlas, and S3 accounts have not been created yet. Handover documents target specifications only. |

---

## Chapter 3 — Project Scope & Implemented Feature Catalog

### 3.1 Public Client-Facing Pages & Workflows
1. **Homepage (`/`):**
   - **Hero Section:** High-impact value proposition ("Endless Innovation. Limitless Possibilities."), dual call-to-action buttons ("Discuss Your Project", "Explore Solutions"), and animated background glow elements.
   - **Institutional Metrics (`Stats`):** Displays operational metrics from marketing copy (active projects, developer contributors, supported technologies) — *[Marketing copy claim — Requires corporate metrics sign-off]*.
   - **Core Capabilities (`Services`):** Interactive 4-card matrix detailing Web Development, Mobile Development, Custom Software Engineering, and UI/UX Design Systems.
   - **Agile Delivery Lifecycle (`Process`):** A modern 4-phase interactive process section ("Discovery & Architecture", "Rapid Prototyping", "Production Hardening", "Deployment & Handover") with numbered indicators, status tags, and deliverable badges.
   - **Client Inquiry & Lead Capture (`Contact`):** High-conversion contact form featuring real-time client-side regex validation, phone capture, silent honeypot anti-spam defense, project budget tiers, and instant confirmation feedback.
   - **Global Sticky Custom Cursor:** Custom gold interactive cursor implemented via `useCursor.js`, featuring hover physics on interactive targets and leak-proof lifecycle listeners.
2. **Dedicated Industries Portal (`/industries`, `/industries/:sector`):**
   - Streamlined single-header layout eliminating legacy double-stacked headings.
   - Interactive sector filter pills (Fintech, Healthtech, Enterprise SaaS, E-Commerce, Logistics, Edtech) with minimum 44px touch targets.
   - Six domain architecture cards detailing regulatory compliance, architecture deliverables, and technical stack tags.
3. **Dedicated Solutions Portal (`/solutions`, `/solutions/:category`):**
   - Modular category filter bar navigating Architecture, Frontend, Cloud Backend, UI/UX, and Storage.
   - Compact SaaS-inspired service cards featuring capability checklists and technology pill badges.
   - Embedded engineering case studies showcase (`Projects`) detailing delivered client solutions.
4. **Careers & Recruitment Gateway (`/careers`):**
   - Dynamic recruitment board fetching published job openings from `/api/v1/career/jobs`.
   - Automatic filtering excluding draft or expired listings from public view.
   - Interactive application modal supporting applicant detail capture and resume upload (.pdf, .doc, .docx up to 5MB).
5. **Legal Governance & Compliance Suite (`/privacy-policy`, `/terms-of-service`, `/security`):**
   - Unified responsive legal container (`LegalPage.jsx`) with persistent tab navigation.
   - **Privacy Policy:** Zero-sale personal data commitment, inquiry data custody, and statutory privacy rights.
   - **Terms of Service:** Engineering governance, 100% client IP assignment upon milestone payment, mutual NDA clauses, and Agra, UP judicial jurisdiction — *[Public website copy claim — Requires corporate legal counsel approval]*.
   - **Security Statement:** Input parameterization, cryptographic JWT sessions, rate limiting, and 24-business-hour vulnerability disclosure SLA — *[Public website copy claim — Requires corporate legal counsel approval]*.

### 3.2 Administrative & Internal Capabilities
- **Dual Portal Selector (`/employee-login`):** Gateway routing staff to Employee Login or Administrator Login.
- **Admin Authentication (`/admin/login`, `/employee-login/admin`):** Cryptographically secured credential login issuing signed JWT tokens with 1-hour expiration and session-storage persistence.
- **Full-Stack Admin Dashboard (`/admin`):** Modular administrative panel managing Inquiries, Job Postings, Candidate Applications, Employees, HR Documents, and Site Settings.
- **Dynamic Job Management:** Real-time job creation, slug generation, activation/deactivation toggles, and applicant resume streaming.

---

## Chapter 4 — Comprehensive Technology Stack Matrix

### 4.1 Frontend Tier Technologies (Root Workspace)
| Technology / Package | Verified Version | Classification | Architectural Responsibility |
| :--- | :--- | :--- | :--- |
| **React** | `^18.3.1` | Runtime Dependency | Core declarative component library and Virtual DOM engine. |
| **React DOM** | `^18.3.1` | Runtime Dependency | DOM renderer for React web application. |
| **React Router DOM** | `^7.18.4` | Runtime Dependency | Declarative client-side routing, route guards, and history management. |
| **Vite** | `^8.3.4` | Build / Dev Tool | Next-generation frontend dev server and production Rollup bundler. |
| **@vitejs/plugin-react** | `^6.1.2` | Build Tool | Babel/Fast-refresh integration for React JSX transformation. |
| **esbuild** | `^0.25.0` | Package Override | Fast JS/TS compilation and minification engine. |
| **CSS3 Custom Properties** | Native | Styling Architecture | Design token system, responsive clamp typography, and theme variables. |

### 4.2 Backend Tier Technologies (`backend/`)
| Technology / Package | Verified Version | Classification | Architectural Responsibility |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v22.23.1` (LTS) | Server Runtime | High-concurrency asynchronous JavaScript runtime engine. |
| **Express** | `^5.2.1` | Runtime Dependency | Modern HTTP server framework routing APIs, middleware, and errors. |
| **Mongoose** | `^9.10.3` | Runtime Dependency | Object Data Modeling (ODM) for MongoDB with schema validation. |
| **Helmet** | `^8.3.0` | Security Middleware | Enforces essential HTTP security headers (HSTS, Sniff, Framing). |
| **CORS** | `^2.8.6` | Security Middleware | Restricts cross-origin resource sharing to authorized frontend domains. |
| **express-rate-limit** | `^8.7.0` | Security Middleware | Multi-tiered IP rate limiter defending against DDoS and brute-force. |
| **jsonwebtoken** | `^9.0.3` | Auth Dependency | Generates and verifies cryptographic HMAC SHA-256 session tokens. |
| **bcryptjs** | `^3.0.3` | Security Dependency | One-way salt-hashed password protection for administrator records. |
| **multer** | `^2.4.0` | File Middleware | Multipart form-data parser for inbound applicant resume uploads. |
| **@aws-sdk/client-s3** | `^3.1148.0` | Cloud Storage SDK | Official AWS SDK client for S3/R2. Implemented in code; target company bucket pending setup *[Requires company verification]*. |
| **nodemailer** | `^10.0.13` | Email Transport | SMTP and HTTPS transport engine (Resend/Brevo/SMTP). Implemented in code; company credentials pending setup *[Requires company verification]*. |
| **dotenv** | `^18.0.5` | Environment Tool | Loads local configuration variables from `.env` files in development. |
| **supertest** | `^7.3.1` | Dev / Test Dependency | HTTP assertions for end-to-end integration test execution. |
| **nodemon** | `^3.1.14` | Dev Dependency | Local development server file watcher with automatic restarts. |
| **chokidar** | `^4.0.3` | Package Override | High-performance cross-platform file watcher override. |

---

## Chapter 5 — Architecture, Component Topography & Data Flows

### 5.1 Full-Stack System Architecture
The platform follows an asynchronous, decoupled client-server architecture. The frontend is distributed across Vercel's global edge network as pre-compiled static assets, while the backend operates as a stateless Express container on Render communicating over TLS with MongoDB Atlas and AWS S3.

```
+-----------------------------------------------------------------------------------+
|                                CLIENT TIER (Browser)                             |
|  React 18 SPA  |  Vite Bundled Assets  |  React Router DOM 7  |  SessionStorage    |
+-----------------------------------------+-----------------------------------------+
                                          |
                      HTTPS (TLS 1.3)     | REST JSON Payloads & Multipart Uploads
                      VITE_API_URL        | X-Request-Id Correlation Header
                                          v
+-----------------------------------------------------------------------------------+
|                         API GATEWAY & SECURITY TIER                               |
|  Render Reverse Proxy (TRUST_PROXY: 1)  -->  Helmet Security Headers              |
|  Multi-Origin CORS Filter                -->  Global & Endpoint Rate Limiters     |
|  Request ID Correlation Middleware      -->  Input Sanitization & Validation      |
+-----------------------------------------+-----------------------------------------+
                                          |
                         Express 5.2 MVC Route Dispatch
                                          v
+-----------------------------------------------------------------------------------+
|                        BUSINESS LOGIC & APPLICATION SERVICES                      |
|  Auth Service (JWT / Bcrypt)    |  Inquiry Service (Honeypot + DB Save)           |
|  Career Service (Multer Upload) |  Email Service (Resend / Brevo / SMTP Fallback) |
|  Storage Service (Dual Adapter) |  Audit Service (Operational Activity Logging)   |
+-------------------+---------------------+---------------------+-------------------+
                    |                     |                     |
     Mongoose / TLS |      @aws-sdk/s3    |        HTTPS / SMTP |
                    v                     v                     v
+-----------------------+ +-----------------------+ +-----------------------+
|  DATABASE TIER        | |  OBJECT STORAGE TIER  | |  COMMUNICATION TIER   |
|  MongoDB Atlas        | |  AWS S3 / R2 Bucket   | |  Resend / Brevo / SMTP|
|  13 Managed Model     | |  Private Resumes &    | |  Applicant Receipt &  |
|  Collections          | |  HR Documents         | |  Admin Inquiries Alert|
+-----------------------+ +-----------------------+ +-----------------------+
```

### 5.2 Core Transactional Sequence Flows

#### 1. Client Inquiry Submission Flow
1. **Client Input:** User inputs name, email, phone, project category, and message on `/` or `/contact`.
2. **Client-Side Validation:** Form verifies email format, phone digits (7-20 characters), and message length (&ge; 10 characters).
3. **Payload Dispatch:** `fetch()` dispatches JSON payload to `POST /api/v1/inquiries` with `X-Request-Id`.
4. **Rate Limiting Guard:** `publicFormLimiter` validates that client IP has not exceeded 10 requests per 15 minutes.
5. **Honeypot Inspection:** Backend validator checks hidden bot trap field; bots are silently acknowledged with 200 without saving.
6. **Persistence:** Sanitized inquiry is written to MongoDB Atlas `inquiries` collection.
7. **Notification Dispatch:** Asynchronous email notification triggered via configured provider (Resend, Brevo, or SMTP) to `NOTIFICATION_RECIPIENT`, plus receipt acknowledgment to applicant.
8. **Response:** Returns standardized JSON envelope `{ success: true, message: "Inquiry received" }` (HTTP 201).

#### 2. Career Application & Resume Storage Flow
1. **Candidate Submission:** Applicant fills modal form at `/careers` and selects PDF/DOC resume file.
2. **Multer Interception:** Backend `multer` memory-buffer middleware captures multipart payload (max 5MB).
3. **Magic-Byte Verification:** `validateFileSignature()` in `storage.service.js` inspects the first 4 bytes of the binary buffer to verify authentic PDF (`%PDF`) or DOC/DOCX signatures, defeating malicious file extension spoofing.
4. **Storage Adapter Routing:**
   - If `STORAGE_PROVIDER === 's3'`: Streams buffer to private S3 bucket using `PutObjectCommand` with generated UUID key and AES256 encryption.
   - If `STORAGE_PROVIDER === 'local'`: Writes file to isolated local disk folder `uploads/resumes/`.
5. **Database Record:** New `Application` document is stored in MongoDB with applicant contact details and `resume: { storageProvider, storageKey, fileName, size }`.
6. **Access Protection:** Uploaded resumes are explicitly blocked from public HTTP access via Express route exclusion. Admin access requires authenticated Bearer JWT token to generate authorized streaming response.

---

## Chapter 6 — Complete Project Directory Anatomy

The project follows a clean monorepo-style structure where frontend client assets reside at the root and server architecture is encapsulated within the `backend/` directory.

```
C:\Users\DELL\Desktop\Official-Website-main\
├── .gitignore                      # Git exclusion rules (node_modules, .env*, dist, uploads)
├── .env.example                    # Frontend environment configuration template
├── index.html                      # Single-page application root HTML entry with JSON-LD
├── package.json                    # Frontend dependencies, build, and test scripts
├── render.yaml                     # Infrastructure-as-code deployment manifest for Render (env: node)
├── vercel.json                     # Vercel SPA routing rewrites and security headers
├── vite.config.js                  # Vite bundler, plugin, and server configuration
│
├── src/                            # Frontend React Source Directory
│   ├── main.jsx                    # Application DOM mount entry point
│   ├── App.jsx                     # Global router defining all 17 public & admin routes
│   ├── api.js                      # Centralized API client with JWT token session handling
│   ├── components/                 # Reusable modular UI components (Navbar, Hero, Stats, Process, etc.)
│   ├── pages/                      # Dedicated multi-page route views (Industries, Solutions, Careers, Legal)
│   ├── data/content.js             # Centralized company data, social links, and navigation
│   ├── hooks/useCursor.js          # Custom interactive cursor hook with cleanup lifecycle
│   ├── styles/                     # Global stylesheets, animation keyframes, and tokens
│   └── utils/                      # Dynamic SEO metadata updater and GA4 analytics
│
├── backend/                        # Express REST API Server Workspace
│   ├── package.json                # Backend dependencies, test scripts, and seed/migration runners
│   ├── Dockerfile                  # Production container specification for portable cloud hosts (node:22-alpine)
│   ├── .env.example                # Backend environment variable template
│   ├── src/
│   │   ├── server.js               # Process bootstrap, unhandled rejection hooks, port listener
│   │   ├── app.js                  # Express app, Helmet, CORS, rate limiters, route mounting
│   │   ├── config/env.js           # Strict environment validator, origin parser, defaults
│   │   ├── db/database.js          # Mongoose connection pooling and error handling
│   │   ├── models/admin.model.js   # Admin credential and RBAC Mongoose model
│   │   ├── middlewares/            # Request correlation, logging, auth guards, rate limiters
│   │   ├── modules/                # Domain modules (auth, career, inquiry, employee, settings)
│   │   ├── scripts/                # create-admin.js, migrate-resumes-to-s3.js, verify-smtp.js
│   │   ├── services/storage.service.js # Dual S3 / local disk storage adapter with magic-byte audit
│   │   └── utils/                  # JWT helpers, input sanitization, structured JSON logger
│   └── tests/                      # 79 automated backend unit & HTTP integration tests
│
└── tests/                          # 65 automated frontend component & SEO regression tests
```

> [!NOTE]
> **Script Execution Scope Notice:** Backend administrative scripts — including `npm run migrate:resumes`, `npm run seed`, and `npm run create:admin` — are declared in `backend/package.json`. They must be executed from within the `backend/` directory (`cd backend && npm run ...`) or targeted via `npm --prefix backend run ...`.

---

## Chapter 7 — Prerequisites & Environmental System Requirements

### 7.1 Supported Operating Systems & Runtimes
| System Component | Minimum Required | Recommended Production | Diagnostic Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js Runtime** | `v20.0.0` | `v22.23.1` (LTS) | `node --version` |
| **Node Package Manager** | `npm 10.0.0` | `npm 10.9.8` | `npm --version` |
| **Git Version Control** | `git 2.30.0` | `git 2.55.0+` | `git --version` |
| **MongoDB Database** | `v6.0.0` | MongoDB Atlas Cluster (v7+) | `mongosh --eval "db.version()"` |
| **Operating System** | Windows 10/11, macOS 12+, Ubuntu 22.04 LTS, or Debian 12 | Linux (Debian/Alpine Docker container) | `uname -a` (Linux/macOS) or `winver` (Windows) |

---

## Chapter 8 — Step-by-Step Installation & Local Setup Guide

Follow these exact copy-paste sequences in your terminal to initialize and run the complete full-stack platform locally.

### 8.1 Dual Platform Commands (PowerShell & Bash)

#### 1. Clone Repository & Navigate to Workspace
```bash
# PowerShell / Windows:
git clone https://github.com/AshivamTechnologies/Official-Websites.git
cd Official-Websites

# Bash / Linux / macOS:
git clone https://github.com/AshivamTechnologies/Official-Websites.git
cd Official-Websites
```

#### 2. Install Root Frontend & Backend Dependencies
> [!WARNING]
> **Important Dependency Isolation:** Root dependencies and backend dependencies are decoupled and must be installed separately. Do not run `npm install` only in root.

```bash
# Install Frontend Dependencies (Root Workspace):
npm install

# Install Backend Dependencies:
cd backend
npm install
cd ..
```

#### 3. Initialize Environment Files
```bash
# Create Frontend Local Environment:
Copy-Item .env.example .env.local    # PowerShell
cp .env.example .env.local           # Bash

# Create Backend Local Environment:
Copy-Item backend/.env.example backend/.env    # PowerShell
cp backend/.env.example backend/.env           # Bash
```

#### 4. Start Backend Server (Terminal 1)
```bash
cd backend
npm run dev
# Expected Output: [Ashivam Backend] Operational on port 5000 (development)
# [Database] MongoDB connected successfully
```

#### 5. Start Frontend Dev Server (Terminal 2)
```bash
npm run dev
# Expected Output: VITE v8.3.4 ready in 240 ms
# ➜  Local:   http://localhost:5173/
```

---

## Chapter 9 — Complete Environment Variable Reference

> [!CAUTION]
> **Zero-Secret Policy & Compliance:** This chapter documents environment variable names, defaults, and requirements strictly using placeholders. In compliance with security standards, no passwords, API keys, MongoDB Atlas connection strings, or JWT secrets are exposed.

### 9.1 Frontend Environment Variables (`.env.local` / Vercel)
| Variable Name | Status | Default in Code / Template | Feature Affected | Restart Required? |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Mandatory** | `https://ashivam-tech.onrender.com/api/v1` | Configures API destination in `src/api.js` for all public forms and admin dashboards. | Yes (Frontend rebuild required) |
| `VITE_GA_ID` | Optional | `undefined` | Google Analytics 4 Measurement ID in `src/utils/analytics.js`. | Yes (Frontend rebuild required) |

### 9.2 Backend Environment Variables (`backend/.env` / Render)
| Variable Name | Status | Default in Code / Template | Purpose & Security Constraint | Restart Required? |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Mandatory** | `development` | Controls production security enforcement in `env.js`. Must be `production` in live hosts. | Yes (Process restart) |
| `PORT` | Optional | `5000` (Local) / `10000` (Render) | TCP port bound by HTTP server listener. | Yes (Process restart) |
| `CLIENT_URL` | **Mandatory** | `http://localhost:5173` (Dev) / Vercel Fallback | Canonical frontend URL used to construct links in transactional emails. | Yes (Process restart) |
| `ALLOWED_ORIGINS` | **Mandatory** | Localhost + Vercel domains | Comma-separated whitelist of allowed CORS origins. Strips localhost in production. | Yes (Process restart) |
| `MONGODB_URI` | **Mandatory** | `mongodb://127.0.0.1:27017/...` | MongoDB connection string. **Must be Atlas URI in production** (rejects localhost). | Yes (Process restart) |
| `JWT_SECRET` | **Mandatory** | Dev fallback (Rejected in Prod) | HMAC secret for admin JWT tokens. **Must be &ge; 32 characters in production**. | Yes (Process restart) |
| `JWT_EXPIRES_IN` | Optional | `1h` | Validity duration for issued admin access tokens. | Yes (Process restart) |
| `TRUST_PROXY` | Optional | `1` (Prod) / `false` (Dev) | Express reverse proxy hop count for accurate client IP resolution behind Render. | Yes (Process restart) |
| `EMAIL_PROVIDER` | Optional | `resend`, `brevo`, or `smtp` | Selects primary email delivery driver (auto-detects from API keys). | Yes (Process restart) |
| `RESEND_API_KEY` | Conditional | `""` | API key for Resend HTTPS delivery (bypasses cloud SMTP port blocks). | Yes (Process restart) |
| `BREVO_API_KEY` | Conditional | `""` | API key for Brevo HTTPS delivery alternative. | Yes (Process restart) |
| `SMTP_HOST` | Conditional | `""` (Template: `smtp.gmail.com`) | SMTP gateway host (e.g. `smtp.sendgrid.net` or Google Workspace). | Yes (Process restart) |
| `SMTP_PORT` | Conditional | `587` | SMTP port (587 for STARTTLS, 465 for SSL). | Yes (Process restart) |
| `SMTP_USER` | Conditional | `""` | Authentication username for SMTP gateway. | Yes (Process restart) |
| `SMTP_PASSWORD` | Conditional | `""` | Authentication secret / application token for SMTP gateway. | Yes (Process restart) |
| `EMAIL_FROM` | **Mandatory** | `Ashivam Technologies <no-reply...>` | Verified sender email header displayed to recipients. | Yes (Process restart) |
| `COMPANY_NOTIFICATION_EMAIL` | **Mandatory** | `team.ashivam@gmail.com` | Sole authorized company recipient inbox where inbound lead inquiries, career/internship applications, and system alerts are sent. (Aliases: `NOTIFICATION_RECIPIENT`, `ALERT_EMAIL`). | Yes (Process restart) |
| `STORAGE_PROVIDER` | **Mandatory (Prod)** | `local` (Dev) / `s3` (Prod) | Object storage mode (`s3` required for non-ephemeral storage in cloud). | Yes (Process restart) |
| `S3_BUCKET` | Conditional | `""` | Target AWS S3 or Cloudflare R2 bucket name. Mandatory if storage is `s3`. | Yes (Process restart) |
| `S3_REGION` | Conditional | `us-east-1` | S3 bucket region (e.g. `ap-south-1` for Mumbai, or `auto` for R2). | Yes (Process restart) |
| `S3_ACCESS_KEY_ID` | Conditional | `""` | IAM programmatic user access key. Mandatory if storage is `s3`. | Yes (Process restart) |
| `S3_SECRET_ACCESS_KEY` | Conditional | `""` | IAM programmatic user secret access key. Mandatory if storage is `s3`. | Yes (Process restart) |

---

## Chapter 10 — Database Architecture, Schema Models & Safe Migration Runbook

### 10.1 Database Connection Configuration
The database tier is managed via Mongoose in `backend/src/db/database.js`. The connection engine employs production-grade pooling parameters:
- `maxPoolSize: 10` and `minPoolSize: 2` maintain warm socket pools while preventing cloud connection limits from exhausting.
- `serverSelectionTimeoutMS: 5000` guarantees fast failure recovery rather than hanging requests during cloud network blips.
- `autoIndex: !env.isProduction` disables automatic runtime index builds in production, preventing unexpected performance degradation on Atlas clusters during boot.

### 10.2 Complete Collection Schema Inventory (13 Models)
1. **Admin** (`admins`, `models/admin.model.js`): `username` (unique index), `name`, `email`, `passwordHash`, `role` (Superadmin, Admin), `permissions`, `isActive`, `lastLoginAt`.
2. **Application** (`applications`, `career/application.model.js`): `jobId`, `fullName`, `email`, `phone`, `experience`, `resume: { storageProvider, storageKey, fileName, size }`, `status` (pending, reviewed, rejected, hired).
3. **Job** (`jobs`, `career/job.model.js`): `title`, `slug` (unique index), `department`, `location`, `type`, `experience`, `description`, `requirements`, `status` (published, draft, closed).
4. **Inquiry** (`inquiries`, `inquiry/inquiry.model.js`): `name`, `email`, `phone`, `company`, `projectType`, `budget`, `message`, `status` (new, in-review, contacted, archived).
5. **Employee** (`employees`, `employee/employee.model.js`): `employeeId`, `firstName`, `lastName`, `email`, `phone`, `role`, `department`, `designation`, `status` (active, inactive, on-leave).
6. **EmployeeDocument** (`employee_documents`, `employee-document.model.js`): `employeeId`, `title`, `documentType`, `fileUrl`, `storageKey`, `verified`.
7. **HrDocument** (`hr_documents`, `hrDocument.model.js`): `title`, `category`, `version`, `description`, `fileUrl`, `storageKey`, `restrictedRoles`.
8. **Internship** (`internships`, `internship.model.js`): `title`, `domain`, `duration`, `stipend`, `requirements`, `active`.
9. **AuditLog** (`audit_logs`, `audit.model.js`): `userId`, `action`, `resource`, `resourceId`, `ipAddress`, `userAgent`, `timestamp`.
10. **Settings** (`settings`, `settings.model.js`): `company: { name, email, phone, address }`, `social: { linkedin, github }`, `maintenance: { enabled, message }`.
11. **Media** (`media`, `media.model.js`): `fileName`, `mimeType`, `size`, `url`, `uploadedBy`, `publicAccess`.
12. **Notification** (`notifications`, `notification.model.js`): `recipient`, `subject`, `body`, `type`, `read`, `sentAt`.
13. **Content** (`contents`, `content.model.js`): `key` (unique), `title`, `body`, `metadata`, `updatedBy`.

### 10.3 Safe Isolated-Target Migration Protocol (Non-Destructive)

> [!CAUTION]
> **CRITICAL DATA SAFETY NOTICE: `--drop` IS DESTRUCTIVE**  
> **Never execute `mongorestore` with the `--drop` flag against production or active databases.** The `--drop` flag purges every existing collection before restoring. The standard migration workflow must always target a fresh, isolated company database cluster without dropping collections. Any destructive option requires verified backup, staging dry-run, and formal company management authorization.

```bash
# 1. Non-destructive backup of live database to local timestamped directory:
# PowerShell:
mongodump --uri="mongodb+srv://<SOURCE_USER>:<PASSWORD>@<SOURCE_CLUSTER>/ashivam_technologies" --out="./backup_$(Get-Date -Format 'yyyyMMdd')"
# Bash:
mongodump --uri="mongodb+srv://<SOURCE_USER>:<PASSWORD>@<SOURCE_CLUSTER>/ashivam_technologies" --out="./backup_$(date +%Y%m%d)"

# 2. Verify backup completeness and document counts:
# PowerShell:
Get-ChildItem -Path "./backup_*/ashivam_technologies" | Select-Object Name, Length
# Bash:
ls -lh ./backup_*/ashivam_technologies

# 3. Safe non-destructive restore into isolated NEW company-owned cluster (NO --drop):
mongorestore --uri="mongodb+srv://<TARGET_USER>:<PASSWORD>@<COMPANY_CLUSTER>/ashivam_technologies" ./backup_*/ashivam_technologies

# 4. Reconcile collection document counts in mongosh between source and target:
use ashivam_technologies
db.admins.countDocuments()
db.jobs.countDocuments()
db.inquiries.countDocuments()
db.applications.countDocuments()
```

---

## Chapter 11 — Comprehensive REST API Reference

All endpoints operate under the `/api/v1` prefix with standardized JSON request/response envelopes. Every response echoes the originating `X-Request-Id` for distributed tracing.

### 11.1 Public Endpoints
- `GET /api/v1/health`: Diagnostic health probe inspecting MongoDB connection and uptime (200 OK: `{ success: true, database: "connected", uptimeSeconds: 42 }`).
- `GET /api/v1/health/liveness`: Kubernetes / cloud container liveness check. Always returns fast 200 without DB query (200 OK: `{ status: "ok" }`).
- `POST /api/v1/inquiries`: Submits client lead. Body: `{ name, email, phone, company, projectType, budget, message }` (Rate limit: 10/15m).
- `GET /api/v1/career/jobs`: Retrieves list of active, published job openings. Excludes draft/closed listings.
- `GET /api/v1/career/jobs/:slug`: Retrieves detailed job specifications for a specific position slug.
- `POST /api/v1/career/apply`: Multipart form submission: applicant fields + resume binary file (PDF/DOC up to 5MB, Rate limit: 10/15m).
- `POST /api/v1/auth/login`: Admin login. Body: `{ username, password }`. Validates salt hash via bcrypt (Rate limit: 5/15m).

### 11.2 Protected Administrative Endpoints (Bearer Token Required)
- `GET /api/v1/auth/me`: Retrieves current authenticated administrator profile and role.
- `GET /api/v1/inquiries`: Lists submitted client inquiries with search, status filtering, and pagination.
- `PATCH /api/v1/inquiries/:id/status`: Updates inquiry processing status (`in-review`, `contacted`, `archived`).
- `POST /api/v1/admin/jobs`: Creates a new career opening with title, department, requirements, and auto-generated slug.
- `PATCH /api/v1/admin/jobs/:id`: Updates opening specifications or toggles publication status (`published`, `closed`).
- `GET /api/v1/admin/applications`: Lists candidate submissions across all positions with status filtering.
- `GET /api/v1/admin/applications/:id/resume`: Streams candidate resume binary directly from S3 or local vault with correct Content-Type.
- `GET / PUT /api/v1/settings`: Inspects or updates global company contact info, social links, and maintenance state.

---

## Chapter 12 — Authentication, Authorization & Security Hardening

### 12.1 Defensive Security Architecture
- **Injection Defense:** Strict payload schema validation, input sanitization, and Mongoose query parameterization preventing SQL & NoSQL injection (`backend/src/utils/validation.js`).
- **Session Cryptography:** HMAC SHA-256 signed JSON Web Tokens (JWT) with 1-hour expiration; enforced &ge; 32-character secret key in production (`backend/src/utils/jwt.js`).
- **Password Storage:** One-way bcrypt cryptographic hashing with salt rounds (12) defending against rainbow tables and brute force (`backend/src/models/admin.model.js`).
- **Spam & Bot Filtering:** Silent honeypot field trapping automated bots on public forms without disturbing human users (`isHoneypotTriggered()` in `validation.js`).
- **DDoS & Brute Force:** Multi-tier rate limiting: 5 logins / 15m, 10 forms / 15m, 100 global requests / 15m per IP with standard 429 response envelopes (`backend/src/middlewares/rateLimit.middleware.js`).
- **Malicious Uploads:** Multer memory storage combined with file signature magic-byte audit verifying authentic PDF/DOC binary headers (`validateFileSignature()` in `storage.service.js`).
- **Data Exposure Prevention:** Private upload routes (`/uploads/resumes`) explicitly blocked with 404 handler; error normalization redacts server stack traces in prod (`backend/src/app.js` lines 136-150).
- **HTTP Security Headers:** Helmet integration: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-Powered-By` disabled (`backend/src/app.js` lines 34, 57-65).

---

## Chapter 13 — Quality Assurance, Automated Testing & Verification Suite

Quality assurance is backed by 144 automated tests running natively on the Node.js test runner without third-party test framework overhead.

### 13.1 Test Execution Taxonomy & Actual Command Results
| Test Suite Category | Execution Command & Working Directory | Count & Duration | Taxonomy & Scope Covered |
| :--- | :--- | :--- | :--- |
| **Frontend Static & Unit Suite** | `npm test`<br>*(Executed in root workspace)* | **65 Passed / 0 Failed**<br>(828ms) | Component, Route & SEO Static Unit Tests: Route declarations, 44px touch targets, mobile drawer, responsive clamp typography, SEO meta, schema JSON-LD, content distribution. |
| **Backend Unit & Integration Suite** | `npm test` or `node --test tests/*.test.js`<br>*(Executed in `backend/` directory)* | **79 Passed / 0 Failed**<br>(5,858ms) | Unit & HTTP Integration Tests (Mocked Infrastructure): Validation regex, honeypot traps, ReDoS escapes, JWT signing, supertest HTTP assertions for security headers, rate limiters, proxy trust, error envelopes. |
| **Production Build Integrity** | `npm run build`<br>*(Executed in root workspace)* | **Clean Bundle**<br>(280ms) | Vite production bundle generated into `dist/` (86 modules) without errors, warnings, or missing imports. |
| **Whitespace Integrity** | `git diff --check`<br>*(Executed in root workspace)* | **0 Errors**<br>(8ms) | Zero carriage return discrepancies or trailing whitespace errors across all tracked source files. |

> [!NOTE]
> **Mocked vs. Live Infrastructure Testing Note:** The 79 backend automated tests execute against an in-memory/mocked HTTP application instance without requiring an active live MongoDB Atlas connection, AWS credentials, or SMTP server. Live database transactions, live S3 bucket streaming, and production email dispatches require active cloud accounts and are verified via staging deployments against live infrastructure.
>
> **Linter Configuration Status:** No code linter (ESLint, Prettier, etc.) is configured in root `package.json` or `backend/package.json`. No linting command was run, and claims of zero lint warnings have been removed.

---

## Chapter 14 — Cloud Hosting & Production Deployment Blueprint

### Current Production State (Preserved to Prevent Disruption)
- **Frontend (Personal Deployment):** `https://ashivam-tec-h.vercel.app/` (Existing personal Vercel deployment; preserved to prevent service disruption; live uptime not independently verified)
- **Backend (Personal Deployment):** `https://ashivam-tech.onrender.com/api/v1` (Existing personal Render service; health probe timed out on free-tier spin-down; current service and database health not independently verified)
- **Status:** Preserved during company transition. All company cloud infrastructure remains target architecture pending setup and provisioning.

### Target Company Infrastructure Blueprint
- **Render Cloud Backend (Target Architecture):** Web Service provisioned via `render.yaml` (`rootDir: backend`, `plan: starter`, `region: oregon`, `env: node` native Node.js runtime, `npm ci --omit=dev`, `node src/server.js`, port 10000, health check `/api/v1/health`) — *[Company account setup pending provisioning]*.
- **Container Alternative (Dockerfile):** Multi-stage `node:22-alpine` image, non-root user (`appuser`), port 5000 with `wget` health probe.
- **Vercel Frontend (Target Architecture):** Team project provisioned via `vercel.json` (Vite preset, root `./`, `npm run build`, `dist`, with `VITE_API_URL` set to company backend) — *[Company account setup pending provisioning]*.
- **MongoDB Atlas (Target Architecture):** Dedicated company cluster with least-privilege database user — *[Company account provisioning & live connectivity unverified / pending]*.
- **Object Storage (Target Architecture):** AWS S3 or Cloudflare R2 bucket for non-ephemeral resume storage — *[Company bucket provisioning & live integration unverified / pending]*.
- **Email Delivery (Target Architecture):** Brevo or Resend HTTPS API key for transactional emails — *[Company account setup & live delivery unverified / pending]*.

---

## Chapter 15 — Operational Maintenance, Troubleshooting & Handover Sign-off

### 15.1 Common Troubleshooting Scenarios
| Observed Symptom | Probable Root Cause | Standard Resolution Protocol |
| :--- | :--- | :--- |
| **Backend boot failure: "JWT_SECRET must be at least 32 characters"** | `JWT_SECRET` environment variable is missing or shorter than 32 characters in production mode. | Generate a 32+ character random string (e.g. `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`) and set in Render dashboard. |
| **CORS error on frontend during form submit** | Frontend domain is not listed in backend `ALLOWED_ORIGINS`. | Add the Vercel domain or custom domain to `ALLOWED_ORIGINS` in Render dashboard and restart backend. |
| **Uploaded resumes disappear after server redeployment** | Backend is running with `STORAGE_PROVIDER=local` on ephemeral Render disk. | Configure AWS S3 or Cloudflare R2 credentials (`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) in `backend/.env` and execute `cd backend && npm run migrate:resumes`. |
| **Contact form emails fail to deliver** | Cloud platform blocks standard outbound SMTP ports (25/587). | Switch `EMAIL_PROVIDER` to `resend` or `brevo` and configure the corresponding HTTPS API key in Render dashboard. |

### 15.2 Handover Verification & Sign-Off Checklist
| Verification Item | Target State | Verified Status |
| :--- | :--- | :--- |
| **Company GitHub Ownership** | `AshivamTechnologies/Official-Websites.git` (Commit `6b2fae0`) | **Verified Match** |
| **Handover Backup Integrity** | `C:\Users\DELL\Desktop\Official-Website-Handover-Backup` | **Verified Present** |
| **Frontend Automated Suite** | 65 passing static & unit tests (routes, 44px touch targets, mobile drawer, responsive clamp typography, SEO meta, schema JSON-LD). | **65 Passed / 0 Failed** |
| **Backend Automated Suite** | 79 passing unit & HTTP integration tests with mocked transports (validation, auth guards, rate limiters, security headers). In-memory mock tests only; live MongoDB/S3/SMTP not executed. | **79 Passed / 0 Failed (Mocked)** |
| **Production Client Build** | Vite production compilation bundling 86 modules into `dist/` in 280ms with 0 errors or warnings. | **Verified Clean** |
| **Whitespace Integrity** | `git diff --check` across all tracked source files; 0 carriage-return discrepancies. (No code linter configured in `package.json`). | **0 Errors (No Linter Configured)** |
| **Candidate Resume Files** | 24 sample candidate resumes confirmed present in local `uploads/` (untracked & protected). | **Verified Present** |
| **Live Personal Backend & DB** | Personal Render deployment & MongoDB Atlas cluster. Real-time health probe timed out during audit; status not independently verified. | **Not Independently Verified** |
| **Company Cloud Hosting (Target)** | Render, Vercel, MongoDB Atlas, S3/R2, and Brevo company accounts. | **Pending Provisioning** |
| **Handover Documentation** | Complete 15-chapter comprehensive PDF manual & Markdown source. | **Complete** |

```
================================================================================
ENGINEERING HANDOVER SIGN-OFF
================================================================================
This technical document confirms that the Ashivam Technologies Official Website 
application source code, automated regression test suites, build pipelines, and 
Git history have been audited, stabilized, and synchronized to company repository 
ownership at commit 6b2fae02b0aca4138fb4ecb77d7b7cfe744ae408. Company cloud 
hosting infrastructure provisioning and live cloud integration testing remain 
pending.

Engineering Specialist : Lead DevOps & Systems Architect
Handover Date          : October 16, 2026
Verified Scope         : Source Code Synchronized (Commit 6b2fae0)
Cloud Status           : Company Cloud Infrastructure (Target Architecture) Pending Provisioning
================================================================================
```
