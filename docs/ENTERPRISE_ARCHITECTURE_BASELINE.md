# Ashivam Technologies — Enterprise Architecture Baseline

## 1. System Identity & Profile
- **Entity Name:** Ashivam Technologies
- **Headquarters:** Agra, Uttar Pradesh, India
- **Brand Tagline:** *"Endless Innovation. Limitless Possibilities."*
- **Authorized Corporate Recipient:** Exclusively `team.ashivam@gmail.com`
- **Authenticated SMTP Sender:** `teamashivam@gmail.com`

---

## 2. Infrastructure & Topology Overview
Ashivam Technologies operates a decoupled, distributed full-stack cloud architecture:
- **Frontend Presentation Layer:** Single Page Application (SPA) built with React 18, React Router DOM v7, Vite 8.3, and semantic CSS design tokens. Hosted on Vercel Edge (`https://ashivam-tec-h.vercel.app`).
- **Backend Application Layer:** Node.js 22 LTS with Express 5.2 MVC architecture. Hosted on Render (`https://ashivam-tech.onrender.com/api/v1`).
- **Database Layer:** MongoDB with Mongoose 9.10 ODM. Hosted on MongoDB Atlas with primary replica-set failover and automated point-in-time recovery.
- **Media & Document Storage:** Object storage via Cloudflare R2 / AWS S3 (`@aws-sdk/client-s3`) with isolated local fallback for local development and integration tests.

```
[ User Browser / Client ]
       │
       ├── HTTPS (Port 443) ──> [ Vercel Edge CDN: React 18 SPA ]
       │                                  │
       └── CORS Credentials Request ──────┼──> [ Render Cloud: Node.js 22 / Express 5.2 API ]
                                                                   │
                                                                   ├── MongoDB Atlas Replica Set (Port 27017)
                                                                   ├── Cloudflare R2 / AWS S3 (Encrypted Storage)
                                                                   └── Gmail SMTP Relay / Resend API (TLS Port 465)
```

---

## 3. Core Software Modules
1. **Authentication & Session Management (`backend/src/modules/auth/`):**
   - Dual-token architecture: 15-minute JWT access tokens and 7-day single-use rotating refresh tokens stored in `HttpOnly`, `Secure`, `SameSite=None` cookies.
   - Concurrency grace period (15s) absorbing multi-tab race conditions.
2. **Administration & RBAC (`backend/src/modules/admin/`):**
   - Hierarchical access control: `Superadmin` and `Admin`.
   - Least privilege permissions: `manage_admins`, `manage_employees`, `manage_inquiries`, `careers`, `audit`, `settings`.
   - Protection against removing or deactivating the last active Superadmin.
3. **Inquiries & Public Engagement (`backend/src/modules/inquiry/`):**
   - Contact inquiries with honeypot bot defense, input sanitization, and in-flight deduplication.
   - Automatic dispatch to corporate mailbox and customer acknowledgment.
4. **Careers & Talent Acquisition (`backend/src/modules/career/`):**
   - Job vacancy listings, applicant submissions, and resume handling with binary signature validation.
5. **Internship Programs & Management (`backend/src/modules/internship/`):**
   - Program track enrollment, applicant-to-intern conversion, collision-safe ID allocation (`ASH-INT-YYYY-XXXX`), and onboarding checklists.
6. **HR Document Management (`backend/src/modules/hr-document/`):**
   - Secure employee documentation, identity verification, contract tracking, and CSV exports.
7. **Audit Trail & Governance (`backend/src/modules/audit/`):**
   - Immutable, append-only log capturing all administrative mutations and security attempts.
8. **Asynchronous Background Processing (`backend/src/modules/notification/`):**
   - MongoDB-backed Transactional Outbox pattern guaranteeing durable email delivery with exponential backoff and dead-letter queues.
