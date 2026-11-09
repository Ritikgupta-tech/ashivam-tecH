# Changelog — Ashivam Technologies Platform

All notable changes to the Ashivam Technologies corporate and administrative platforms will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-11-08 — Security Remediation & Production Hardening

### Fixed & Hardened
- **Secret Sanitization:** Scrubbed proposed hex key string from `SECURITY_FINDINGS.md` and `RED_FLAG_REGISTER.md`, replacing with local random generator instructions (`crypto.randomBytes(32)`).
- **Dependency Vulnerability Resolution:** Added `"minimatch": "^11.0.5"` to `backend/package.json` overrides, resolving moderate ReDoS advisory `GHSA-g3hv-75wg-m249` in `nodemon` devDependency. Both frontend and backend `npm audit` report 0 vulnerabilities.
- **OpenAPI Route Alignment:** Reconciled `docs/api/OPENAPI.yaml` paths with actual mounted Express routes (`/auth/refresh`, `/career/jobs`, `/career/jobs/{jobId}/apply`, `/employee-documents/{employeeId}`, etc.).
- **RBAC Matrix Reconciliation:** Synchronized `docs/security/ACCESS_CONTROL_MATRIX.md` with live `requireRole("Superadmin", "Admin")` and `requirePermission(...)` middlewares while preserving the future 10-role specification.
- **Governance Routing:** Mounted `/sla` route alias in `src/App.jsx` pointing to `LegalPage` (terms).
- **Zero Raw Emojis:** Replaced final remaining raw Unicode glyphs in `Navbar.jsx`, `Careers.jsx`, and `InternshipsTab.jsx` with high-precision SVG vector icons (`XMarkIcon`, `CheckIcon`, `ExclamationCircleIcon`).

---

## [1.2.0] - 2026-11-07 — Enterprise Architecture & Documentation Hardening

### Added
- **Target 3-Application Domain Architecture:** Formalized DDD bounded contexts and extraction roadmaps for Corporate Website (`ashivam-corporate-web`), Internship Management (`ashivam-internship-management`), and HRMS (`ashivam-hr-management`).
- **Architectural Decision Records (ADRs):**
  - `ADR-001`: Separation of Platform into Three Independent Applications
  - `ADR-002`: Data Ownership, Isolation, and Cross-Domain Consistency
  - `ADR-003`: Unified Identity, Authentication and Session Strategy
- **Product Requirements Documents (PRDs):**
  - `OFFICIAL_WEBSITE_PRD.md`: Public marketing, lead generation, and compliance showcase.
  - `INTERNSHIP_SYSTEM_PRD.md`: Track admissions, mentor rubrics, and certificate verification.
  - `HRMS_PRD.md`: Enterprise employee directory, KYC vault, and statutory policies.
- **Security & Compliance Specifications:**
  - `THREAT_MODEL.md`: Full STRIDE threat modeling covering public, career, and administrative endpoints.
  - `SECURITY_REQUIREMENTS.md`: Complete OWASP ASVS 5.0 Level 2 conformance matrix.
  - `ACCESS_CONTROL_MATRIX.md`: Granular RBAC permissions for all 10 system roles.
  - `DATA_CLASSIFICATION.md`: 4-tier data handling standard aligned with Indian DPDP Act 2023.
  - `INCIDENT_RESPONSE.md`: CERT-In compliant 6-hour reporting incident response plan.
- **API & Database Standards:**
  - `OPENAPI.yaml`: Machine-readable OpenAPI 3.1.0 specification.
  - `API_STANDARDS.md`: Standard JSON envelopes, error schemas, and pagination protocols.
  - `ER_DIAGRAM.md`: Mermaid visual Entity-Relationship diagrams across all 14 models.
  - `DATABASE_SCHEMA.md`: Field-by-field schema dictionary and validation constraints.
  - `MIGRATION_POLICY.md`: Zero-downtime expand-contract migration protocols.
- **Operations & Quality:**
  - `TEST_STRATEGY.md` & `ACCEPTANCE_CRITERIA.md`: 362-test quality pyramid documentation.
  - `ACCESSIBILITY_REPORT.md`: WCAG 2.1 AA conformance report.
  - `PERFORMANCE_REPORT.md`: Core Web Vitals and Vite bundle budget analysis.
  - `DEPLOYMENT_RUNBOOK.md`, `BACKUP_RESTORE.md`, `ROLLBACK_PROCEDURE.md`: DevSecOps runbooks.
  - `RED_FLAG_REGISTER.md`: Consolidated risk register reconciling all historical audits.
- **Root Discovery Deliverables:**
  - `CURRENT_STATE_AUDIT.md`, `EXISTING_ARCHITECTURE.md`, `CODEBASE_GAP_ANALYSIS.md`, `SECURITY_FINDINGS.md`, `PERFORMANCE_FINDINGS.md`, `DOCUMENTATION_CONSISTENCY_REPORT.md`, `IMPLEMENTATION_ROADMAP.md`.

---

## [1.1.0] - 2026-11-01 — Accessibility, UI Polish & Staging Verification

### Added
- Skip-to-content accessibility link (`#main-content`) in `index.html` and `src/styles/globals.css` (WCAG 2.4.1).
- Careers application modal keyboard focus trapping and Escape key dismissal (WCAG 2.1.2 & 2.4.3).
- High-precision SVG vector icons ([`MapPinIcon`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/icons/index.jsx#L445), [`BriefcaseIcon`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/icons/index.jsx#L465), [`TargetIcon`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/icons/index.jsx#L676), [`PaperclipIcon`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/components/icons/index.jsx#L668)) replacing raw Unicode emojis across the codebase.
- `.btn-secondary` CSS token in `src/styles/globals.css`.
- 404 page atmospheric decorative backdrop and responsive mobile layout.
- `public/sitemap.xml` updated with legal pages and refreshed timestamps.
- Playwright staging browser E2E test suite (`tests/e2e-browser-staging.js`).

---

## [1.0.0] - 2026-10-31 — Production Launch

### Added
- Core corporate website Single-Page Application (React 18 + Vite).
- REST API gateway with Express 5 and MongoDB Atlas.
- JWT authentication with rotating refresh token cookies and Token Family replay attack detection.
- Transactional email service integration (Mailjet).
- Role-Based Access Control (RBAC) and initial admin console.
