# ADR-003: Unified Identity, Authentication and Session Strategy

> **Status:** Accepted  
> **Date:** 2026-11-07  
> **Deciders:** Principal Software Architect, Application Security Engineer  

---

## 1. Context and Problem Statement

With the platform evolving into three distinct systems (Corporate Website, Internship Management, HRMS), the organization faced a critical identity decision:
- Should each application maintain its own isolated user database and login mechanism?
- Or should the platform adopt a unified identity and access management (IAM) architecture?

A fragmented approach would force staff and mentors to manage multiple passwords, create administrative synchronization overhead, and introduce security vulnerabilities when offboarding employees.

---

## 2. Decision Drivers

- **Zero Credential Duplication:** Single source of truth for user credentials, password hashing, and MFA secrets.
- **Immediate Global Revocation:** Offboarding an employee must immediately terminate their access across all three systems.
- **XSS & CSRF Resilience:** Tokens must be shielded against browser-based extraction while preventing CSRF replay.
- **Standards Compliance:** Conformance to OAuth 2.1 / OIDC best practices and OWASP ASVS 5.0 Level 2.

---

## 3. Decision Outcome

We adopt a **Unified Identity and Authentication Service** acting as the central Identity Provider (IdP) for all Ashivam digital applications.

### 3.1 Key Architectural Commitments
1. **Central `users` Model:**
   - Centralized authentication credentials (bcrypt hashed passwords, salt rounds: 12).
   - Unified role claims: `ADMIN`, `SUPERADMIN`, `HR_MANAGER`, `MENTOR`, `INTERN`, `EMPLOYEE`.
2. **Stateless JWT Access Tokens (15 Minutes):**
   - Cryptographically signed with `JWT_SECRET`.
   - Maintained in client memory only (never written to `localStorage` or `sessionStorage`).
3. **Rotating Refresh Tokens (7 Days):**
   - Issued in secure `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
   - Rotated on every single refresh call with token family replay detection.
4. **Multi-Tab Web Locks Synchronization:**
   - Client applications use W3C Web Locks API (`navigator.locks`) to coordinate silent token refreshes across multiple tabs without triggering race condition revocations.
5. **Global Offboarding Revocation:**
   - A single administrative call to `/api/v1/auth/revoke-user-sessions/:id` immediately invalidates all active token families in Redis/MongoDB, expelling the user from all three applications in real time.

---

## 4. Migration to Independent SSO (Phase 3)

When the Internship Management and HR Management systems are deployed on separate subdomains (`interns.ashivam.com`, `hrms.ashivam.com`):
- The central auth endpoints will serve as an OAuth 2.1 / OIDC Identity Provider with Authorization Code Flow + PKCE.
- Cookie domains will be scoped appropriately or tokens will be exchanged via secure PKCE redirects.

---

## 5. Consequences

### Positive
- Unified security perimeter and centralized audit trails.
- Seamless single-sign-on (SSO) experience for Ashivam employees and mentors.
- Instant kill-switch for compromised accounts or employee terminations.

### Negative
- High availability requirement for the Central Auth Service (single point of failure mitigated via multi-region replication).
