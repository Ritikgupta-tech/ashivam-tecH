# Ashivam Technologies — Enterprise Architecture Gap Analysis

## 1. Executive Summary
This document provides an evidence-based gap analysis comparing earlier platform claims and informal reviews against actual source code implementations. Every finding is classified into one of six standardized states:
1. `CONFIRMED GAP` (Remediated)
2. `PARTIALLY IMPLEMENTED` (Remediated)
3. `ALREADY IMPLEMENTED`
4. `FALSE POSITIVE`
5. `NOT APPLICABLE`
6. `BLOCKED BY INFRASTRUCTURE OR EXTERNAL DEPENDENCY`

---

## 2. Comprehensive Traceability & Classification Matrix

| Item | Area | Initial Claim / Hypothesis | Codebase Inspection Reality | Final Classification | Status & Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **G-01** | **Authentication** | Access tokens are stored in `localStorage`, causing critical XSS exposure. | Code inspection of `src/context/AuthContext.jsx` and `src/api.js` revealed `sessionStorage` with memory fallback, and `HttpOnly` refresh cookies. Zero `localStorage` token storage exists. | **FALSE POSITIVE** | Verified. Documented in ADR-001. |
| **G-02** | **Session Concurrency** | Refresh token rotation breaks multi-tab browsing by triggering reuse detection on simultaneous reloads. | When two tabs refreshed concurrently, the second tab presented a token revoked <15ms prior, triggering family revocation and 401. | **CONFIRMED GAP** | **REMEDIATED**: Implemented 15-second rotation grace period in `auth.service.js`. E2E-CONC-01 passing. |
| **G-03** | **File Upload Security** | Resumes and HR uploads rely strictly on MIME headers and extensions without magic-byte verification. | Storage service had PDF/DOC/DOCX validation for resumes, but lacked JPEG/PNG/WEBP checks, and HR document service lacked magic byte validation. | **CONFIRMED GAP** | **REMEDIATED**: Added JPEG, PNG, WEBP signatures and integrated `validateFileSignature` into `hrDocument.service.js`. |
| **G-04** | **Audit Trail Integrity** | Superadmins can delete or clear audit trails via `DELETE /api/v1/audit/:id` and `DELETE /api/v1/audit`. | Source code exposed deletion endpoints and services, allowing deletion of compliance trails. | **CONFIRMED GAP** | **REMEDIATED**: Enforced append-only immutability via Mongoose pre-query hooks, HTTP 403 controller rejections, and audit violation logging. |
| **G-05** | **Background Email Durability** | Notification emails are fired via unmonitored floating promises (`.catch()`), causing lost messages during SMTP downtime. | `inquiry.service.js`, `career.service.js`, and `internship.service.js` called `sendEmail` without persistent retry queues. | **CONFIRMED GAP** | **REMEDIATED**: Implemented MongoDB Transactional Outbox pattern with atomic locking, exponential backoff, and DLQ. |
| **G-06** | **Database Indexes** | Missing compound and text indexes on core collections (Jobs, Inquiries, Applications). | Schema inspections revealed all necessary indexes (`slug: 1`, `email: 1`, `status: 1`, text indexes) were already present. | **ALREADY IMPLEMENTED** | Verified in schemas. |
| **G-07** | **Graceful Shutdown** | Application abruptly drops connections on container SIGTERM. | `server.js` already trapped `SIGTERM`/`SIGINT`, stopped listening, closed DB connections with a 10s fallback timer. | **ALREADY IMPLEMENTED** | Enhanced with `stopOutboxWorker()`. |
| **G-08** | **React Error Boundary** | Frontend crashes completely on unhandled render exceptions. | `src/components/ErrorBoundary.jsx` was already implemented and mounted at top-level in `src/App.jsx`. | **ALREADY IMPLEMENTED** | Verified. |
| **G-09** | **Framework Migration** | Recommendation to rewrite the entire frontend in Next.js. | Unnecessary architectural rewrite that would delay release and discard a fully working React 18 / Vite SPA. | **NOT APPLICABLE** | Rejected in accordance with prompt guidelines. |
| **G-10** | **Redis / BullMQ Queue** | Recommendation to introduce external Redis cluster for job processing. | Running a separate paid Redis cluster increases hosting costs and external network failure surfaces. | **NOT APPLICABLE** | Replaced with zero-cost MongoDB Transactional Outbox pattern. |
