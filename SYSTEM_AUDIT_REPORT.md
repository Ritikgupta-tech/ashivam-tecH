# SYSTEM AUDIT REPORT — ASHIVAM TECHNOLOGIES
## Production-Grade Google Meet Attendance Management System Upgrade

**Document ID:** ASHIVAM-AUDIT-PHASE0-001  
**Project:** Ashivam Technologies Corporate Portal & Google Meet Attendance System  
**Date:** November 19, 2026  
**Auditor:** Principal Software Architect & DevSecOps Lead  
**Repository:** `https://github.com/Ritikgupta-tech/ashivam-tecH.git`  
**Working Directory:** `C:\Users\DELL\Desktop\Official-Website-main`  
**Current Commit Baseline:** Clean working tree, all 355 existing tests passing (107 frontend + 248 backend)

---

## 1. Executive Summary

This report establishes the authoritative pre-implementation baseline for upgrading the Ashivam Technologies production platform with an enterprise-grade Google Meet Employee Meeting Attendance Management System.

The existing system is a single-repo full-stack platform consisting of:
1. **Frontend:** React 18 SPA bundled via Vite 8 with React Router v7, implementing responsive client-side routing, CSRF protection, and role-gated administrative dashboards.
2. **Backend:** Node.js (ESM) Express 5 application with MongoDB / Mongoose 9.12 persistence, JWT + HttpOnly refresh token authentication, distributed locks, rate limiting, and outbox email workflows.
3. **Cloud Infrastructure:** Production frontend hosted on Vercel (`https://ashivam-tec-h.vercel.app`), backend API on Render (`https://ashivam-tech.onrender.com`), and MongoDB Atlas replica set.

The core objective is to seamlessly integrate Google Meet attendance tracking without creating a separate application, without duplicating existing collections, and without breaking existing production behavior.

---

## 2. Codebase & Component Audit

### 2.1 Frontend Architecture (`/src`)
| Component / File | Purpose | Audit Findings | Upgrade Requirements |
| :--- | :--- | :--- | :--- |
| `App.jsx` | Client routing definition | Defines public marketing pages, `/employee-login` selector, and `/admin/*` routes. | Add `/employee/*` route tree for the new Employee Attendance Portal. |
| `EmployeePortalSelector.jsx` | Gateway selection page | Renders two gateways: "Staff Workspace" and "Admin Console". | Direct "Staff Workspace" to the dedicated Employee Attendance Portal upon login. |
| `EmployeeLoginPage.jsx` | Employee login interface | Previously routed through `useAuth()` (Admin login) and redirected to `/admin`. | Upgrade to unified authentication supporting both Admins and Employees, redirecting employees to their personal dashboard. |
| `AdminDashboard.jsx` | Tabbed administrative console | Contains tabs for Admins, Audit, Careers, Content, Documents, Employees, Inquiries, Internships, Media, Overview, Settings. | Add dedicated `AttendanceTab.jsx` and `GoogleIntegrationTab.jsx` for meeting governance and system observability. |
| `api.js` | Frontend API client | Centralized `fetch` wrapper with timeout, CSRF injection, and token refresh. | Add endpoints for employee meeting viewing, attendance history, dispute requests, admin meeting management, and reports. |
| `AuthContext.jsx` | Auth state manager | Handles silent refresh, cross-tab sync via `BroadcastChannel`, and session hints. | Preserve exact mechanism; expose user role (`Superadmin`, `Admin`, `Employee`) to drive navigation. |

### 2.2 Backend Architecture (`/backend/src`)
| Module / File | Purpose | Audit Findings | Upgrade Requirements |
| :--- | :--- | :--- | :--- |
| `app.js` | Express app configuration | Security headers via Helmet, multi-origin CORS, rate limiters, CSRF middleware, route registration. | Register new API routes: `/api/v1/attendance`, `/api/v1/meetings`, `/api/v1/google`. |
| `models/admin.model.js` | Admin credentials & RBAC | Contains `username`, `email`, `passwordHash`, `role` (`Superadmin`, `Admin`), `permissions`. | Preserve completely intact for existing admin logins. |
| `modules/employee/employee.model.js` | Employee directory | Contains contact details, designation, department, employment type. Lacks credentials. | Extend schema with optional `passwordHash` (select: false), `employeeId`, `workEmail`, `googleEmail`, `isActive`. |
| `modules/auth/auth.service.js` | Credential validation & JWT | Handles admin login, password hashing, and token family rotation. | Extend `login` to check Admin collection first, then Employee collection, issuing appropriate JWT payload. |
| `middlewares/auth.middleware.js` | Bearer token authentication | Decodes token and resolves admin via `getAdminById`. | Update to resolve user from `Admin` OR `Employee` model based on payload, attaching `req.user`. |
| `middlewares/authorization.middleware.js` | RBAC gatekeeper | `requireRole` and `requirePermission`. | Enforce `requireRole('Employee', 'Admin', 'Superadmin')` on employee routes and `requireRole('Admin', 'Superadmin')` on admin routes. |
| `config/env.js` | Environment validation | Validates ports, secrets, SMTP, S3, and proxy settings. | Add configuration for Google OAuth, Pub/Sub webhook secret, and token encryption key. |

---

## 3. Database Schema & Migration Analysis

### Existing Collections:
1. `admins` — Executive and operational administrative accounts.
2. `employees` — Corporate staff directory records.
3. `refreshtokens` — Active and rotated JWT session tokens.
4. `audits` — Immutable administrative event logs.
5. `inquiries`, `jobs`, `applications`, `interns`, `internships` — Business entities.
6. `systemlocks` — Distributed concurrency mutexes.

### Schema Extensions Required (Zero Breaking Changes):
To fulfill Google Meet attendance without schema collisions:
1. **Extend `employees`**: Add `employeeId` (unique string, e.g. `ASH-EMP-001`), `passwordHash` (select: false), `googleEmail` (indexed, lowercase), and `authStatus`.
2. **New Entity `meetings`**: Meeting metadata, space name, scheduled time, recurrence, status, assigned employees and departments.
3. **New Entity `meetingconferences`**: Maps Google Meet conference records (`conferenceRecords/{id}`) to scheduled meetings.
4. **New Entity `participantsessions`**: Stores discrete Google Meet join/leave sessions per participant.
5. **New Entity `attendancerecords`**: Finalized and provisional employee attendance per meeting (unique compound index on `{ meetingId: 1, employeeId: 1 }`).
6. **New Entity `attendancepolicies`**: Configurable rules (grace period, minimum minutes, thresholds).
7. **New Entity `attendancecorrectionrequests`**: Dispute and review workflows for employees.
8. **New Entity `googleintegrations`**: Encrypted OAuth refresh tokens, integration status, and token expiry.
9. **New Entity `googleeventinbox`**: Idempotent deduplication queue for Pub/Sub events.
10. **New Entity `reconciliationjobs`**: Audit trail of automated REST API verifications.

---

## 4. Current Test Baseline & Quality Invariants

- **Root Frontend Test Suite**: 107 tests passing (`npm test`).
- **Backend Test Suite**: 248 tests passing (`npm test --prefix backend`).
- **Total Test Baseline**: **355 passing tests**, 0 failures, 0 regressions.
- **Rule**: All 355 tests must remain 100% passing throughout all phases of this upgrade.

---

## 5. Audit Conclusions

1. **Architecture Readiness**: The application structure is modular and enterprise-grade. The separation of controllers, services, models, and routes allows clean extension.
2. **Authentication Unification**: Adding authentication capabilities to the `Employee` model cleanly fulfills the requirement that employees use existing company login, without creating duplicate accounts.
3. **Google Meet Independence**: The architecture can support real-time Pub/Sub push webhooks as well as offline reconciliation via Google Meet REST API v2, guaranteeing zero reliance on frontend button clicks.
