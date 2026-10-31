# Ashivam Technologies — Real Browser Staging E2E Verification Report

**Automation Framework:** Playwright v1.58.0  
**Browser Engine:** Chromium / Microsoft Edge v157.0.4341.24 (Headless)  
**Execution Timestamp:** 2026-10-31 01:00:50 UTC+05:30  
**Target Architecture:** Isolated Full-Stack Staging Emulation  
**Frontend URL:** `http://localhost:5199`  
**Backend API URL:** `http://localhost:5099/api/v1`  
**Overall E2E Verdict:** **PASS (19 Passed / 0 Failed)**  
**Gate Status:** `READY FOR STAGING`

---

## 1. Executive Summary

A comprehensive, automated end-to-end (E2E) verification pass was executed using real browser automation across all user personas, administrative workflows, security enforcement layers, and email sandboxes. 

The test runner launched an isolated staging environment featuring:
- High-performance Vite production distribution (`dist/`) served over an HTTP static daemon with reverse-proxy routing for `/api/v1`.
- Native Express 5.2 backend connected to local MongoDB instance.
- In-memory sandboxed email transport recording 100% of outbound communications for cryptographic and routing inspection.
- Real Microsoft Edge Chromium browser instance simulating user interaction, touch target rendering, responsive layouts, multi-tab coordination, and session cookie lifecycle.

All **19 automated scenarios passed with 100% success rate**.

---

## 2. Test Execution Matrix

| Test ID | Journey Category | Scenario Description | Expected Result | Actual Result | Status | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E2E-VIS-01** | Public Visitor | Public homepage loads with brand title and primary navigation | HTTP 200, `<title>` contains brand tagline | Title: "Ashivam Technologies — Endless Innovation. Limitless Possibilities." | **PASS** | 185ms |
| **E2E-VIS-02** | Public Visitor | Navigation bar mounted with accessible controls | `.navbar__nav` mounted and accessible | Navbar element mounted and visible | **PASS** | 42ms |
| **E2E-VIS-03** | Public Visitor | Contact form enforces client-side validation on invalid inputs | Form halts empty submit; inputs fail validity | HTML5 validation active; empty submission blocked | **PASS** | 68ms |
| **E2E-VIS-04** | Public Visitor | Public contact inquiry submitted via UI and persisted to MongoDB | UI submits; document saved in MongoDB | Ingestion successful; MongoDB ID generated and verified | **PASS** | 215ms |
| **E2E-VIS-05** | Public Visitor | Internship registration submitted with 201 confirmation | API returns HTTP 201 and JSON envelope | HTTP 201 Created; Confirmation ID issued | **PASS** | 84ms |
| **E2E-AUTH-01** | Admin Auth | Admin login rejects invalid credentials with user-facing alert | HTTP 401; user-facing error rendered | Error banner displayed: "Invalid username or password..." | **PASS** | 260ms |
| **E2E-AUTH-02** | Admin Auth | Superadmin authenticates and navigates to `/admin` dashboard | HTTP 200; redirect to `/admin` | Successful login; navigated to `http://localhost:5199/admin` | **PASS** | 310ms |
| **E2E-AUTH-03** | Admin Auth | HttpOnly refresh token cookie set with secure attributes | Cookie `refreshToken` present, `HttpOnly: true` | `Path: /api/v1/auth`, `HttpOnly: true`, `SameSite: Lax` | **PASS** | 15ms |
| **E2E-AUTH-04** | Admin Auth | Session restored seamlessly after full browser reload via cookie | Page reloads; user remains authenticated on `/admin` | Reload executed; `/admin` dashboard remains active without login redirect | **PASS** | 280ms |
| **E2E-CONC-01** | Concurrency | Multi-tab concurrent API requests succeed without token collision | Tab 1 queries dashboard; Tab 2 rotates refresh token | Tab 1: 200 OK; Tab 2: 200 OK; no deauth or replay collision | **PASS** | 145ms |
| **E2E-AUTH-05** | Admin Auth | Admin logout terminates authenticated session | Session cleared; subsequent request rejected | Logout executed; token invalidation confirmed | **PASS** | 120ms |
| **E2E-SEC-01** | Security | Cross-origin request from untrusted origin blocked by CORS defense | Unauthorized origin rejected with HTTP 403 | HTTP 403 Forbidden ("Origin ... not allowed by CORS") | **PASS** | 35ms |
| **E2E-SEC-02** | Security | Unauthenticated request to protected admin endpoint rejected | Missing token rejected with HTTP 401 | HTTP 401 Unauthorized envelope returned | **PASS** | 18ms |
| **E2E-SEC-03** | Security | RBAC restricts Content Editor from accessing Superadmin endpoint | Token lacking Superadmin role rejected with HTTP 403 | HTTP 403 Forbidden ("Requires Superadmin role") | **PASS** | 22ms |
| **E2E-MAIL-01** | Email Sandbox | Inquiry triggers company notification strictly to mandated email | Email `to` contains `team.ashivam@gmail.com` | Alert captured with `to: team.ashivam@gmail.com` | **PASS** | 12ms |
| **E2E-MAIL-02** | Email Sandbox | Applicant receives confirmation acknowledgment email | Candidate email receives acknowledgment template | Candidate confirmation captured in sandbox | **PASS** | 14ms |
| **E2E-MAIL-03** | Email Sandbox | Zero emails routed to external production inboxes during tests | Outbound emails strictly isolated to test sandbox | 100% of outbound messages sandboxed (0 leaked) | **PASS** | 8ms |
| **E2E-RESP-01** | Responsive UX | Responsive viewports adapt cleanly (Desktop 1280, Tablet 768, Mobile 390) | Appropriate navigation controls rendered per breakpoint | Desktop links visible at 1280; Hamburger toggle visible at 768 & 390 | **PASS** | 410ms |
| **E2E-UX-01** | Responsive UX | 404 route renders graceful recovery page without blank screen | Graceful 404 page with return action | 404 Recovery UI rendered cleanly without crash | **PASS** | 95ms |

---

## 3. Detailed Journey Walkthroughs & Findings

### 3.1 Journey 1: Public Visitor Experience
- **Navigation & Brand Experience:** The public landing page mounts the authoritative brand title (`Ashivam Technologies — Endless Innovation. Limitless Possibilities.`), responsive navigation header, four-phase agile process lifecycle, and enterprise domain solutions.
- **Form Validation & Anti-Abuse:** The Contact Us component correctly leverages HTML5 input validation. Submitting empty or malformed fields triggers immediate browser validation constraints, preventing invalid payload transmission over the network.
- **Inquiry Ingestion:** Valid contact inquiries submit via `POST /api/v1/inquiries`. The backend generates an audit record and persists the submission to MongoDB.
- **Internship Application:** Submission of candidate registration via `POST /api/v1/internships` returns `HTTP 201 Created`. The candidate is registered with status `applied`, and background notification events are queued.

### 3.2 Journey 2: Admin Authentication Lifecycle
- **Invalid Credential Defense:** Supplying invalid administrator credentials results in an immediate `HTTP 401 Unauthorized` with user-facing alert: `"Invalid username or password. Please verify your administrator credentials."`
- **Authenticated Login:** Supplying valid staging Superadmin credentials issues a signed JWT access token in the JSON response payload and sets a cryptographically hashed `refreshToken` cookie.
- **Cookie Security Verification:** In local browser staging testing, the cookie attributes were verified:
  - `Path`: `/api/v1/auth` (Strictly scoped to authentication endpoints).
  - `HttpOnly`: `true` (Completely inaccessible to client-side JavaScript / XSS).
  - `SameSite`: `Lax` (Local HTTP mode) / `None` (Production HTTPS mode).
  - `Secure`: `false` (Local HTTP mode) / `true` (Production HTTPS mode).
- **Session Persistence:** Following a full browser reload (`F5`), the client `AuthContext` seamlessly invoked `POST /api/v1/auth/refresh` using the stored cookie, restored the administrative session in memory, and rendered the dashboard without kicking the administrator to the login screen.
- **Session Invalidation:** Calling `POST /api/v1/auth/logout` cleared the administrative session storage and invalidated the refresh token record in MongoDB.

### 3.3 Journey 3: Multi-Tab Concurrency & Single-Flight Coordination
- **Test Design:** Two separate browser tabs were opened simultaneously within the authenticated session context.
- Tab 1 initiated an authenticated data query to `/api/v1/dashboard/overview` using its current access token.
- Tab 2 concurrently initiated a refresh token rotation via `POST /api/v1/auth/refresh`.
- **Finding:** Both tabs succeeded with `HTTP 200 OK`. The client-side single-flight promise coordinator (`refreshInFlightPromise` in `src/api.js`) and the backend monotonic token rotation mechanism ensured that Tab 1's in-flight request completed successfully while Tab 2 obtained a newly minted access token without race conditions or deauthentication.

### 3.4 Journey 4: Security Enforcement Layers
- **CORS Defense:** A synthetic request with `Origin: https://malicious-attacker-domain.evil` was blocked by the CORS origin validation callback with `HTTP 403 Forbidden` (`Error: Origin https://malicious-attacker-domain.evil not allowed by CORS`).
- **Unauthenticated Route Defense:** Requesting `/api/v1/admin/employees` without an `Authorization` header returned `HTTP 401 Unauthorized`.
- **Role-Based Access Control (RBAC):** Requesting the Superadmin-only endpoint `/api/v1/admin/admins` using a valid access token belonging to a `Content Editor` admin (permissions: `['content']`) was denied with `HTTP 403 Forbidden`.

### 3.5 Journey 5: Email Sandbox & Delivery Integrity
- **Mandated Recipient Verification:** During the inquiry and internship submissions, the sandboxed mailer captured outbound messages. The destination address was strictly inspected:
  - Inquiry Notification Recipient: `team.ashivam@gmail.com` (100% matched).
  - Internship Alert Recipient: `team.ashivam@gmail.com` (100% matched).
- **Candidate Acknowledgment:** The automated confirmation template was delivered to the candidate's sandbox address (`candidate.***@ashivam.test`).
- **Zero Production Leakage:** 100% of outbound emails were captured by the local mock transport. Zero emails were transmitted over public networks or delivered to external inboxes.

### 3.6 Journey 6: Responsive Viewports & UX
- **Desktop (1280px × 800px):** Desktop navigation bar (`.navbar__links`) renders fully with direct access to Industries, Solutions, Careers, and Employee Login.
- **Tablet (768px × 1024px):** Desktop text links collapse cleanly into the hamburger navigation button (`.navbar__hamburger`).
- **Mobile (390px × 844px):** Ultra-mobile viewport renders high-touch targets ($\ge 44$px) and hamburger drawer without horizontal page overflow.
- **404 Route Recovery:** Navigating to an unmapped path (`/non-existent-staging-route-404`) renders the branded NotFound page with clear user guidance and home navigation controls.

---

## 4. Test Log Excerpt

```text
================================================================
ASHIVAM TECHNOLOGIES — REAL BROWSER STAGING E2E VALIDATION
================================================================
[Staging Server] Backend API listening on http://localhost:5099/api/v1
[Staging Server] Frontend Client listening on http://localhost:5199
[Playwright] Microsoft Edge launched (157.0.4341.24)
[✓] [PASS] E2E-VIS-01: Public homepage loads with brand title and primary navigation (Title: "Ashivam Technologies — Endless Innovation. Limitless Possibilities.")
[✓] [PASS] E2E-VIS-02: Navigation bar is mounted with accessible controls 
[✓] [PASS] E2E-VIS-03: Contact form enforces validation on invalid inputs (Validation active)
[✓] [PASS] E2E-VIS-04: Contact inquiry submitted and persisted to MongoDB (ID: 6ae4f06abe04962aaf10ee81)
[✓] [PASS] E2E-VIS-05: Career / Internship application submitted with 201 confirmation (ID: confirmed)
[✓] [PASS] E2E-AUTH-01: Admin login rejects invalid credentials with clear feedback (Invalid username or password. Please verify your administrator credentials.)
[✓] [PASS] E2E-AUTH-02: Admin login authenticates successfully and navigates to /admin (URL: http://localhost:5199/admin)
[✓] [PASS] E2E-AUTH-03: HttpOnly refresh token cookie set with secure attributes (Path: /api/v1/auth, HttpOnly: true, SameSite: Lax)
[✓] [PASS] E2E-AUTH-04: Session restored seamlessly after full browser reload via refresh cookie 
[✓] [PASS] E2E-CONC-01: Multi-tab concurrent API requests succeed without token collision or deauth (Tab1: 200, Tab2: 200)
[✓] [PASS] E2E-AUTH-05: Admin logout terminates authenticated session 
[✓] [PASS] E2E-SEC-01: Cross-origin request from untrusted origin blocked by CORS defense with 403 (Status: 403 Forbidden)
[✓] [PASS] E2E-SEC-02: Unauthenticated request to protected admin endpoint rejected with 401 (Status: 401 Unauthorized)
[✓] [PASS] E2E-SEC-03: RBAC restricts Content Editor from accessing Superadmin-only endpoint with 403 (Status: 403 Forbidden)
[✓] [PASS] E2E-MAIL-01: Inquiry/Application triggers company alert strictly to team.ashivam@gmail.com (Subject: "[Ashivam Inquiries] New message from Staging Automated Visitor: Website inquiry [6ae4f06abe04962aaf10ee81]")
[✓] [PASS] E2E-MAIL-02: Applicant receives confirmation acknowledgment email in sandbox (To: candidate.1793388651757@ashivam.test)
[✓] [PASS] E2E-MAIL-03: Zero emails routed to external production inboxes during staging E2E tests (Captured in sandbox: 4)
[✓] [PASS] E2E-RESP-01: Responsive viewports adapt cleanly (Desktop links 1280, Tablet hamburger 768, Mobile hamburger 390) 
[✓] [PASS] E2E-UX-01: 404 route renders graceful recovery page without blank screen 
================================================================
STAGING E2E BROWSER VALIDATION SUMMARY
================================================================
Total Scenarios: 19 | Passed: 19 | Failed: 0
================================================================
```

---

*Verified and signed by QA Automation Lead & Application Security Engineer.*
