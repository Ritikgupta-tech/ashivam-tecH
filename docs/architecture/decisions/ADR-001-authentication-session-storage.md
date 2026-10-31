# ADR-001: Authentication, Session Lifecycle, and Refresh Token Rotation

## Status
Accepted

## Context
The Ashivam Technologies platform operates a cross-origin decoupled architecture:
- Frontend Client: Hosted on Vercel (`https://ashivam-tec-h.vercel.app`)
- Backend API: Hosted on Render (`https://ashivam-tech.onrender.com/api/v1`)

Claims were raised suggesting JWT access tokens should strictly be stored in memory and that `localStorage` was in use. Source code auditing revealed that `sessionStorage` with in-memory fallbacks was used for short-lived access tokens (15-minute TTL), while long-lived refresh tokens (7-day TTL) are stored exclusively in partitioned `HttpOnly`, `Secure`, `SameSite=None` cookies.

A critical concurrency challenge arose with strict single-use refresh token rotation: when multiple browser tabs or concurrent API requests attempt token renewal simultaneously, the second request presents a token that was just rotated, triggering replay-attack defenses and terminating valid user sessions prematurely.

## Decision
1. **Short-Lived Access Tokens (15m):** Retain access tokens in `sessionStorage` with automatic in-memory fallback. `sessionStorage` isolates tokens strictly to the current browser tab, preventing cross-tab token contamination and automatic persistence across browser restarts, while surviving in-tab page reloads.
2. **HttpOnly Refresh Cookies (7d):** Refresh tokens remain strictly non-accessible via JavaScript (`HttpOnly: true`), encrypted in transit (`Secure: true`), and cross-origin compliant (`SameSite=None`).
3. **Rotation Grace Period (15s):** Implement a 15-second concurrency grace window in `rotateRefreshToken`. If a refresh token was revoked within the last 15 seconds, the service returns the active child token and a fresh access token without invalidating the token family. If a token is presented after the 15-second grace window, it is classified as a genuine token replay attack, and the entire token lineage is revoked.
4. **Account Invalidation Pre-Hooks:** When an administrator or employee account is deactivated (`isActive: false`) or deleted, all associated refresh tokens in MongoDB are immediately invalidated (`isRevoked: true`).

## Consequences
### Positive
- Zero XSS exposure for refresh tokens (inaccessible via JavaScript).
- Multi-tab browser sessions coordinate seamlessly without premature session termination.
- Genuine replay attacks trigger instant family revocation.
- Single-tab isolation prevents accidental session leakage across shared computers.

### Negative / Trade-offs
- Requires MongoDB document lookup on each token rotation (mitigated by indexed `{ tokenHash: 1 }` and `{ familyId: 1, isRevoked: 1 }`).
- Short 15-second replay window theoretically allows an attacker who intercepted the raw cookie to exchange it within 15 seconds of the legitimate user's rotation.
