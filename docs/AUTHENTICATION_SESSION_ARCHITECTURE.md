# Ashivam Technologies — Authentication & Session Architecture

## 1. Dual-Token Architecture Design
The authentication architecture separates identity verification from long-term session persistence to maintain high security across decoupled origins:

```
+------------------------------------------------------------------------------------+
|                                CLIENT APPLICATION                                  |
|                                                                                    |
|  [ In-Memory Access Token ] <--- Copied on boot from ---> [ sessionStorage ]       |
|  * 15-minute validity                                      * Tab-isolated          |
|  * Included in Authorization header                        * Non-persistent across |
|    as "Bearer <JWT>"                                         browser closure       |
+------------------------------------------------------------------------------------+
       │                                                      ▲
       │ 1. API Request (Bearer Token)                        │ 3. New Access Token &
       ▼                                                      │    Rotated Cookie
+------------------------------------------------------------------------------------+
|                                   BACKEND API                                      |
|                                                                                    |
|  2. If Access Token expired (401):                                                 |
|     Client calls POST /api/v1/auth/refresh with HttpOnly Cookie                    |
|                                                                                    |
|  4. Refresh Token Evaluation:                                                      |
|     - SHA-256 Hash Lookup in MongoDB                                               |
|     - Check familyId & isRevoked                                                   |
|     - Check 15s concurrency grace window                                           |
|     - Check Admin.isActive                                                         |
|     - Issue new Access Token (15m) + new Refresh Token (7d)                        |
|     - Revoke old Refresh Token                                                     |
+------------------------------------------------------------------------------------+
```

---

## 2. Refresh Token Family & Concurrency Grace Period
1. **Family Lineage:** Each user login initiates a new `familyId` UUID. Every rotation adds a child token to the same family and invalidates the immediate parent.
2. **Concurrency Race Window (15s):**
   - In modern multi-tab browsing, multiple tabs might simultaneously send their refresh cookie to `/api/v1/auth/refresh`.
   - If Tab 1 rotates the token, the parent token is marked `isRevoked: true` with `updatedAt: now`.
   - When Tab 2 sends the parent token 15ms later, `rotateRefreshToken` calculates `timeSinceRevocation`. Because it is within the 15-second grace window, the server returns the active child token and a fresh access token without invalidating the family.
3. **Replay Attack Defense:**
   - If a revoked token is presented **after** the 15-second window has expired, it is classified as a genuine stolen token replay attack.
   - The server marks all tokens with that `familyId` as revoked (`isRevoked: true`) and returns HTTP 401 Unauthorized, terminating the session across all devices.

---

## 3. Cookie Security Attributes
The refresh token cookie is issued with hardened security directives:
- `HttpOnly: true` — completely inaccessible to JavaScript (`document.cookie`), neutralizing token theft via XSS.
- `Secure: true` — transmitted exclusively over encrypted HTTPS connections (in production/staging).
- `SameSite: "None"` — allows cross-site credentialed requests between Vercel and Render domains.
- `Path: "/api/v1/auth"` — restricts cookie delivery strictly to authentication endpoints, preventing transmission during static media or public endpoint requests.
