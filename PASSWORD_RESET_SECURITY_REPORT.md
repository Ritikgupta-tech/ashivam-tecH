# Password Reset & Account Recovery Security Report
**Ashivam Technologies Official Platform — Production HRMS & Attendance System**
**Date:** 2026-11-19  
**Security Classification:** Highly Confidential / DevSecOps  

---

## 1. Executive Summary

This report assesses the security posture and implementation architecture of the self-service and administrative password recovery mechanisms in the Ashivam Technologies platform.

---

## 2. Threat Modeling & Defenses

### Threat 1: User Account Enumeration
- **Attack Vector:** An attacker submits various corporate email addresses to `POST /api/v1/auth/forgot-password` to determine whether an employee exists based on HTTP status codes or error messages.
- **Defense Implemented:** Strict constant-time, identical response behavior. Whether the email exists, does not exist, is suspended, or is deactivated, the endpoint **always** returns:
  ```json
  {
    "success": true,
    "message": "If an active account exists for that email, password reset instructions have been sent.",
    "requestId": "..."
  }
  ```
  Zero information leakage is permitted.

### Threat 2: Token Brute-Force & Guessing
- **Attack Vector:** An attacker attempts to guess password reset tokens.
- **Defense Implemented:** Tokens are generated with 256 bits of cryptographically secure pseudorandomness (`crypto.randomBytes(32).toString('hex')`). The total keyspace is $2^{256} \approx 1.15 \times 10^{77}$, rendering online or offline guessing computationally impossible.

### Threat 3: Token Interception & Replay
- **Attack Vector:** An attacker intercepts an old email link or replays a previously redeemed token.
- **Defense Implemented:** Single-use enforcement. Upon password reset completion in `resetEmployeePassword`:
  ```javascript
  employee.resetPasswordTokenHash = null;
  employee.resetPasswordExpiresAt = null;
  await employee.save();
  ```
  Any repeated attempt to verify or submit with the same token is rejected immediately with `400 Bad Request`.

### Threat 4: Token Expiration Window Abuse
- **Attack Vector:** An attacker attempts to use a stale token found in mailbox archives.
- **Defense Implemented:** Tight 1-hour expiration window (`resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000)`). Expired tokens are rejected with `400 Bad Request` (`"Password reset token has expired"`).

### Threat 5: Session Hijacking Persistence
- **Attack Vector:** An employee resets a compromised password, but an attacker maintains an existing authenticated browser session with a previously issued JWT refresh token.
- **Defense Implemented:** Complete session termination. During password reset, all active refresh tokens in the `RefreshToken` collection for the employee are immediately revoked:
  ```javascript
  await RefreshToken.updateMany(
    { userId: employee._id },
    { $set: { isRevoked: true } }
  );
  employee.passwordChangedAt = new Date();
  ```
  Furthermore, `auth.middleware.js` inspects `user.passwordChangedAt` against the token's `iat` (issued-at) claim, invalidating any in-flight access tokens issued prior to the reset.

---

## 3. Rate Limiting Protection

All authentication endpoints (`/forgot-password`, `/reset-password`, `/activate`) are shielded by `authActionLimiter`:
- Window: 15 minutes.
- Maximum requests: 15 per IP address.
- Response on breach: `429 Too Many Requests`.
