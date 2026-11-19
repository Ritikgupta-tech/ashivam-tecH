# Employee Account Provisioning & Credential Lifecycle Report
**Ashivam Technologies Official Platform — Production HRMS & Attendance System**
**Date:** 2026-11-19  
**Version:** 1.0.0  

---

## 1. Executive Summary

This report documents the design, verification, and automated testing of the Employee Account Provisioning mechanism. The provisioning subsystem bridges the gap between administrative employee creation in the Admin Portal and self-service credential establishment by the employee.

---

## 2. Core Defect Remediation

### Prior Defect State
- When an administrator added an employee record via `POST /api/v1/employees`, the employee was saved with `passwordHash: null`.
- No activation credentials, tokens, or invitation emails were dispatched.
- The employee could not authenticate at `/employee-login/employee`.
- Attempting to log in resulted in generic 401 errors with no indication of pending activation.

### Remediated Architecture
- Creating an employee without an explicit password now marks the account as `accountStatus: 'INVITED'` and generates a 256-bit cryptographically random activation token.
- The token's SHA-256 digest is stored securely in `activationTokenHash` with an expiration timestamp 24 hours into the future.
- An enterprise-branded invitation email is immediately dispatched with a one-time activation link (`https://ashivam-tec-h.vercel.app/activate-account?token=...`).
- When the email is successfully dispatched, `accountStatus` advances to `PENDING_ACTIVATION`.
- If an admin clicks "Resend Invite", a new activation token is generated, the expiration window resets to 24 hours, and `activationResendCount` is incremented.

---

## 3. Account Provisioning Endpoints

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/employees` | Bearer (Admin / Superadmin) | Registers new employee; initiates credential provisioning and sends invitation email. |
| `POST` | `/api/v1/employees/:id/resend-invitation` | Bearer (Admin / Superadmin) | Generates fresh 24h activation token and resends invitation email. |
| `PATCH` | `/api/v1/employees/:id/account-status` | Bearer (Admin / Superadmin) | Transitions account state (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`). |
| `PATCH` | `/api/v1/employees/:id/employment-status` | Bearer (Admin / Superadmin) | Transitions employment standing (`ACTIVE`, `INACTIVE`, `TERMINATED`, `ON_LEAVE`). |
| `POST` | `/api/v1/employees/:id/reset-password` | Bearer (Superadmin) | Admin-initiated password reset dispatch. |

---

## 4. Invariant Verification

1. **Unique Account Existence:**
   - Every corporate employee has exactly one corresponding record in the database.
   - Dual-record divergence is structurally impossible because credentials and profile reside within `Employee`.
2. **Deterministic Identifier Generation:**
   - Sequential identifier format: `ASH-EMP-XXXX`.
   - Guaranteed atomic sequence numbers backed by MongoDB `Counter` document.
3. **Fail-Safe Transaction Handling:**
   - If the transactional email transport fails (e.g. transient network outage or SMTP credentials rotated), employee record creation does NOT abort.
   - The status remains `INVITED`, enabling administrators to re-dispatch the invitation with a single click.
