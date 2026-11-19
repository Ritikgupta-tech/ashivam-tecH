# Full Backend Regression Report
**Ashivam Technologies Official Platform — Production HRMS & Attendance System**
**Date:** 2026-11-19  
**Test Runner:** `node --test --test-concurrency=1 tests/**/*.test.js`  
**Node.js Version:** v22.23.1  
**Database:** MongoDB 7.0 (Local Replica Set)  
**Status:** **100% PASS (316 / 316 Tests Passed, 0 Failures)**  

---

## 1. Test Suite Summary

The entire backend test suite comprising all 31 test files was executed end-to-end:

| Metric | Result |
| :--- | :---: |
| **Total Test Suites / Files** | 31 test files |
| **Total Test Cases Executed** | 316 tests |
| **Tests Passed** | **316** |
| **Tests Failed** | **0** |
| **Tests Cancelled / Skipped** | 0 cancelled, 0 skipped |
| **Exit Code** | **0 (Success)** |
| **Total Execution Duration** | ~129.8 seconds |

---

## 2. Test File Breakdown

| Test File | Focus Area | Cases | Result |
| :--- | :--- | :---: | :---: |
| `admin-csv-and-dashboard.test.js` | CSV Export & Dashboard Metrics | 18 |  PASS |
| `admin-rbac.test.js` | RBAC Isolation & Admin Security | 11 |  PASS |
| `attendance-api.test.js` | Attendance APIs & Pub/Sub Webhooks | 9 |  PASS |
| `attendance-concurrency.test.js` | Concurrency & Session Locks | 6 |  PASS |
| `attendance-engine.test.js` | Policy Evaluation & Status Rules | 8 |  PASS |
| `attendance-workflow-12cases.test.js` | 12 Real Attendance Scenarios | 12 |  PASS |
| `audit-regression-invariants.test.js` | Soft Delete, Superadmin Counts, Imm. | 13 |  PASS |
| `auth-password-change.test.js` | Password Change Invalidation | 6 |  PASS |
| `auth.test.js` | Login, Cookie, JWT, Refresh Token | 16 |  PASS |
| `career.test.js` | Job Applications & S3 Uploads | 14 |  PASS |
| `concurrency-and-distributed-locks.test.js` | Distributed Locking Safety | 10 |  PASS |
| `csrf-protection.test.js` | CSRF Middleware & Origin Validation | 8 |  PASS |
| `database-safety.test.js` | DB Constraints & Schema Casting | 5 |  PASS |
| `distributed-lock-safety.test.js` | Redlock Fencing & TTL | 7 |  PASS |
| `e2e-email-sandbox.test.js` | Transactional Outbox Worker | 12 |  PASS |
| `email-workflows.test.js` | Inquiries & Notification Dispatch | 14 |  PASS |
| `email.test.js` | Email Templates & SMTP Handshake | 15 |  PASS |
| `employee-email-migration.test.js` | Partial Index Migration & Rollback | 11 |  PASS |
| `employee-lifecycle.test.js` | 37-Scenario Onboarding & Auth | 37 |  PASS |
| `enterprise-resilience-and-immutability.test.js` | Audit Log Immutability | 16 |  PASS |
| `enterprise-security-audit.test.js` | CORS, XSS, Header Hardening | 18 |  PASS |
| `errors.test.js` | Standardized Error Envelopes | 8 |  PASS |
| `health.test.js` | Liveness & Readiness Probes | 4 |  PASS |
| `inquiry.test.js` | Contact Form Ingestion & Rate Limits | 7 |  PASS |
| `integration.test.js` | Public API Root & Route Discovery | 6 |  PASS |
| `internship-management.test.js` | Internships, Programs & Certificates | 20 |  PASS |
| `phase-1-security-hardening.test.js` | CSP, HSTS, Permissions Policy | 4 |  PASS |
| `ratelimit.test.js` | Rate Limiter Envelopes & Whitelists | 3 |  PASS |
| `security.test.js` | Helmet Headers & X-Request-Id Echo | 5 |  PASS |
| `validation.test.js` | Input Sanitization, Honeypot, ReDoS | 13 |  PASS |
| **TOTAL** | **Comprehensive Full Regression** | **316** |  **100% PASS** |
