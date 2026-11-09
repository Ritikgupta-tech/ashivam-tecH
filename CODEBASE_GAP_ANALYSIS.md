# Ashivam Technologies — Codebase Gap Analysis

**Document:** `CODEBASE_GAP_ANALYSIS.md`  
**Classification:** Enterprise Engineering Gap Assessment  
**Date:** 2026-11-07  
**Branch:** `feature/ashivam-production-hardening`  
**Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  
**Repository:** https://github.com/Ritikgupta-tech/ashivam-tecH.git  
**Auditor:** Principal Software Architect & QA Automation Lead  

---

## 1. Executive Summary

This gap analysis compares the existing implementation against production-grade enterprise standards, OWASP ASVS 5.0 Level 2 guidelines, and the strategic target architecture consisting of three independent business applications:
- **Application A:** Official Corporate Website
- **Application B:** Internship Management System
- **Application C:** HR Management System

---

## 2. Domain & Application Separation Gaps

| Domain Dimension | Current Monolithic Implementation | Target 3-Application Ecosystem | Gap Severity | Action Required |
|---|---|---|---|---|
| **Repository Boundaries** | Single git repository for Corporate Website, Internship, and HR modules | 3 independent repositories (`ashivam-website`, `ashivam-internship`, `ashivam-hrms`) | 🟠 Medium | Prepare repository extraction blueprints & module migration plans |
| **Data Ownership** | Shared MongoDB Atlas database with co-located collections (`inquiries`, `interns`, `employees`) | Dedicated database schemas / stores per business domain with zero direct cross-DB joins | 🟠 Medium | Formalize data isolation and inter-service contract interfaces |
| **Identity & Access** | Unified `admins` collection with permission array (`['inquiries', 'careers', 'employees', 'settings']`) | Centralized Identity / OAuth2 / JWT issuer with scoped claims per application | 🟡 Low | Document SSO and cross-application identity federation blueprint |
| **API Contracts** | Route-level Express controllers (`/api/v1/internships`, `/api/v1/employees`) | Independent versioned APIs with formal OpenAPI 3.1 specifications | 🟡 Low | Generate machine-readable `OPENAPI.yaml` specification |

---

## 3. Application Security Gaps (OWASP ASVS 5.0 Level 2 Baseline)

| ASVS Category | Current Status | Discovered Gap | Severity | Remediation Plan |
|---|---|---|---|---|
| **V1 Architecture & Design** | Single-tier monolithic Express app | Absence of formal Threat Model document mapping STRIDE threats to controls | 🟡 Low | Author comprehensive `THREAT_MODEL.md` in `docs/security/` |
| **V2 Authentication** | JWT + Refresh Token Rotation with Replay Revocation | `JWT_REFRESH_SECRET` fallback logic relies on derived key if unset in Render env | 🟡 Low (Mitigated) | Retain production throw check in `env.js`; provide owner dashboard setup key |
| **V4 Access Control** | Server-side RBAC (`requireRole`, `requirePermission`) | Documented permission matrix lacks a centralized machine-readable access control matrix | 🟡 Low | Generate `ACCESS_CONTROL_MATRIX.md` in `docs/security/` |
| **V8 Data Protection** | Encrypted transport (HTTPS), sanitized downloads, private non-static uploads | Absence of formalized Data Classification policy (PII, Confidential, Public) | 🟡 Low | Author `DATA_CLASSIFICATION.md` covering employee & applicant PII |
| **V14 Configuration** | Strict Helmet headers, CORS allowlist, rate limits | Rate limiting counters are in-memory (per-process), not distributed across Redis | 🟡 Low (Accepted) | Redis store adapter documented for horizontal scaling |

---

## 4. Frontend & User Experience Gaps

| UX / UI Dimension | Current Status | Identified Gap | Severity | Status / Remediation |
|---|---|---|---|---|
| **Design System Centralization** | Design tokens in `globals.css` | `.btn-secondary` was previously undefined in CSS (fixed in `584ad4c`) | ✅ Resolved | All button variants and badges now fully tokenized |
| **Iconography Standard** | Mixed emoji & SVG usage previously | Careers component used raw emojis (📍, 🎯, 💼, 📎) (fixed in `cd13f86`) | ✅ Resolved | Zero emojis in `src/`; replaced with high-precision SVG icons |
| **Accessibility (WCAG 2.1 AA)** | Keyboard navigation, ARIA attributes | Skip-to-content link and modal focus trap were absent (fixed in `584ad4c` & `079b871`) | ✅ Resolved | WCAG 2.4.1 and 2.4.3 compliant |
| **Error Recovery** | Functional `NotFoundPage` | 404 page was visually sparse and lacked brand depth (fixed in `584ad4c`) | ✅ Resolved | Atmospheric 404 backdrop and responsive CTA button stacking |

---

## 5. Testing & Quality Assurance Gaps

| QA Dimension | Current Metric | Target Benchmark | Analysis & Gap Resolution |
|---|---|---|---|
| **Frontend Unit Tests** | 107 passing tests | ≥ 100 tests | Exceeds target; covers all routes, components, and token manager |
| **Backend Integration Tests**| 236 passing tests | ≥ 200 tests | Exceeds target; covers RBAC, distributed locks, outbox jobs, migrations |
| **Staging Real Browser E2E** | 19 scenarios passing (Edge) | Full journey coverage | Covers public visitors, admin auth, CSRF, CORS, email sandbox |
| **E2E Clean Exit Handling** | Clean exit code 0 | Zero hanging sockets | Resolved exit code 0 handling in `tests/e2e-browser-staging.js` |
| **Concurrent Suite Isolation**| 23 test files | Isolated execution | Documented that suite should be run in logical batches against remote Atlas |

---

## 6. Documentation & Governance Gaps

| Document Subject | Current State | Required State | Action |
|---|---|---|---|
| **Architecture Taxonomy** | Flat list of 35+ markdown files in `docs/` and root | Clean hierarchical tree under `docs/` (`architecture/`, `products/`, `security/`, etc.) | Restructure and consolidate documentation |
| **OpenAPI Specification** | Text-based markdown endpoints | Machine-readable `OPENAPI.yaml` v3.1 | Author `docs/api/OPENAPI.yaml` |
| **ER Diagram & Schema** | Markdown descriptions | Mermaid visual entity-relationship diagrams | Author `docs/database/ER_DIAGRAM.md` |
| **Product Requirements (PRDs)**| High-level feature specs | Explicit PRDs for Corporate Website, Internship System, and HRMS | Author PRDs under `docs/products/` |

---

## 7. Gap Remediation Priority Roadmap

```
┌────────────────────────────────────────────────────────────┐
│ Phase 1: Discovery & Gap Documentation (In Progress)       │
│ Phase 2: Standardized Authoritative Docs Taxonomy (docs/)  │
│ Phase 3: Future System Blueprints (Internship & HRMS)      │
│ Phase 4: OpenAPI 3.1 & Threat Modeling Integration        │
│ Phase 5: Verification & Production Release Readiness       │
└────────────────────────────────────────────────────────────┘
```
