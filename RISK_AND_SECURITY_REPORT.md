# RISK AND SECURITY REPORT — ASHIVAM TECHNOLOGIES
## Threat Modeling, Vulnerability Assessment & Mitigation Strategy

**Document ID:** ASHIVAM-SEC-RISK-001  
**Project:** Google Meet Attendance Management System  
**Classification:** Internal Confidential / DevSecOps Security Baseline  
**Date:** November 19, 2026  
**Auditor:** Principal DevSecOps & Security Architect  

---

## 1. Threat Matrix & Risk Register

| Risk ID | Threat Scenario | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Fraudulent Frontend Attendance Claim**<br>Employee clicks "Join Meeting" button or executes fake script to simulate attendance. | Critical | High | **Zero reliance on frontend events.** Button click merely redirects to Meet URL. Attendance is strictly generated from Google Meet participant sessions. |
| **SEC-02** | **Google OAuth Token Leakage**<br>Refresh tokens stored in plaintext in the database or exposed in logs. | Critical | Medium | **AES-256-GCM Token Encryption** using `GOOGLE_TOKEN_ENCRYPTION_KEY`. Tokens never sent to frontend; redacted in logs. |
| **SEC-03** | **Pub/Sub Webhook Spoofing**<br>Attacker sends forged HTTP POST requests to `/api/v1/google/events/pubsub`. | Critical | Medium | **Webhook Authentication** via Google Pub/Sub OIDC JWT token verification or dedicated high-entropy secret token. |
| **SEC-04** | **Replay & Out-of-Order Events**<br>Network jitter causes older 'left' event to arrive after a newer 'joined' event, or duplicate event processing. | High | High | **Idempotent Inbox & State Machine.** Events deduplicated by `messageId`. Session duration calculated using monotonic timestamps. |
| **SEC-05** | **Display Name Impersonation**<br>Unverified guest joins Google Meet with an employee's display name. | High | High | **Identity Matching on Google Account ID/Email only.** Display names are disregarded for automated attendance approval. |
| **SEC-06** | **Premature Absence Injustice**<br>Employee marked absent while meeting is still active or during an API outage. | High | High | **Provisional States & Grace Period.** Status stays `PENDING_VERIFICATION` until meeting closes and reconciliation executes. |
| **SEC-07** | **Insecure Direct Object Reference (IDOR)**<br>Employee accesses or modifies another employee's attendance records. | High | Medium | **Strict Object-Level Authorization.** Employee queries scoped to `req.user.employeeId`. Attendance modifications restricted to Admins. |
| **SEC-08** | **Formula Injection in CSV Exports**<br>Meeting title or employee note begins with `=`, `+`, `-`, or `@`. | Medium | Low | **CSV Sanitization Utility** prefixing single quote (`'`) to any formula trigger character. |

---

## 2. DevSecOps Standards & Controls

### 2.1 Cryptographic Controls
1. **AES-256-GCM Encryption**:
   - Secret key: 32-byte key derived from `GOOGLE_TOKEN_ENCRYPTION_KEY`.
   - Initialization Vector (IV): 12-byte cryptographically secure random bytes per encryption.
   - Authentication Tag: 16-byte GCM authentication tag verifying ciphertext integrity.
2. **Double-Submit CSRF Defense**:
   - State-changing HTTP requests require nonces matching between memory/cookie and header.
3. **Session Hardening**:
   - HttpOnly, SameSite=None (in cross-origin production), Secure cookies for refresh tokens.

### 2.2 Role-Based Access Control (RBAC) Matrix
| Route Group | Superadmin | Admin | Employee | Public Visitor |
| :--- | :---: | :---: | :---: | :---: |
| `/api/v1/admin/*` | Full Access | Configured Perms | Denied (403) | Denied (401) |
| `/api/v1/attendance/my/*` | Full Access | Full Access | Own Records Only | Denied (401) |
| `/api/v1/attendance/corrections` (Submit) | Full Access | Full Access | Own Request Only | Denied (401) |
| `/api/v1/admin/attendance/*` (Resolve/Edit) | Full Access | Allowed if assigned | Denied (403) | Denied (401) |
| `/api/v1/google/oauth/*` | Full Access | Denied (403) | Denied (403) | Denied (401) |
| `/api/v1/google/events/pubsub` | System Only | System Only | System Only | Validated Secret Only |

---

## 3. Security Audit Approval

The architecture and mitigations documented above satisfy enterprise governance standards. Proceed with Phase 1 database schema implementation.
