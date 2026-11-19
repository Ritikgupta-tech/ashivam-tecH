# Unified Authentication & Session Architecture Specification
**Ashivam Technologies Official Platform — Production HRMS & Attendance System**
**Date:** 2026-11-19  
**Security Classification:** Highly Confidential / Internal  

---

## 1. Architectural Philosophy: The Single Source of Truth

A foundational architectural requirement of the Ashivam Technologies HRMS is that **an employee's profile and authentication identity reside in a single canonical MongoDB model (`Employee`)**.

### Why Separate Account Models Were Explicitly Rejected
Earlier proposals considered introducing a separate `User` or `Account` collection referencing `employeeId`. Through comprehensive engineering analysis, this was deemed anti-pattern for this architecture:
1. **Distributed State Synchronization:** Maintaining status flags across two collections (`Employee.isActive` vs `Account.status`) introduces partial-write inconsistencies during network partitions or database timeouts.
2. **Duplicate Identity Indexes:** Multiple collections attempting to enforce uniqueness on `email` or `googleEmail` create synchronization hazards where an email updated in HR records fails to reflect in auth accounts.
3. **Foreign Key Overhead & Transaction Lock Contention:** Requiring multi-document MongoDB transactions for routine operations (e.g. employee creation, status suspension, deactivation) increases latency and lock contention under high concurrency.
4. **Architectural Cohesion:** Unifying corporate credentials and profile attributes into `Employee` ensures that when an employee is suspended or terminated, their authentication access and attendance eligibility are terminated atomically in a single atomic update.

---

## 2. Authentication Flow & Dual-Token Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Employee Browser
    participant API as /api/v1/auth Gateway
    participant DB as MongoDB (Employee & RefreshToken)
    participant Redis as In-Memory / Audit System

    Staff->>API: POST /api/v1/auth/login { username, password }
    API->>DB: Employee.findOne({ email: username.toLowerCase() }).select("+passwordHash")
    alt Employee Not Found
        API-->>Staff: 401 Unauthorized (Generic Invalid Credentials)
    else Account Status != "ACTIVE"
        API-->>Staff: 403 Forbidden (Specific Account Status Guidance)
    else Password Mismatch
        API-->>Staff: 401 Unauthorized (Generic Invalid Credentials)
    else Credentials & Status Verified
        API->>DB: Atomically persist Refresh Token in RefreshToken collection
        API-->>Staff: 200 OK + Set-Cookie (refreshToken, HttpOnly) + Access Token (JWT, 15m)
    end

    loop Authenticated Operations (/employee/*)
        Staff->>API: GET /api/v1/attendance/my (Bearer <JWT>)
        API->>API: Verify JWT signature & expiration (HS256)
        API->>DB: Verify Employee.accountStatus == "ACTIVE"
        API-->>Staff: 200 OK (Attendance Summary)
    end

    opt Token Expiration & Rotation
        Staff->>API: POST /api/v1/auth/refresh-token (HttpOnly Cookie)
        API->>DB: Verify token family & rotate
        API-->>Staff: 200 OK + New Access Token + Rotated Refresh Token
    end
```

---

## 3. Account Status State Machine

The authentication state machine is governed by two complementary enums:
1. `accountStatus`: Dictates authentication permissions.
2. `employmentStatus`: Dictates employment eligibility and payroll/attendance standing.

```mermaid
stateDiagram-v2
    [*] --> INVITED: Admin registers employee (No password)
    INVITED --> PENDING_ACTIVATION: Invitation email successfully dispatched
    INVITED --> INVITED: Email dispatch fails (safe retry)
    PENDING_ACTIVATION --> ACTIVE: Employee verifies token & sets password
    ACTIVE --> SUSPENDED: Admin temporarily freezes account
    SUSPENDED --> ACTIVE: Admin lifts suspension
    ACTIVE --> DEACTIVATED: Admin terminates or soft-deletes employee
    SUSPENDED --> DEACTIVATED: Admin terminates employee
    DEACTIVATED --> ACTIVE: Admin restores employee (deletedAt cleared)
    DEACTIVATED --> [*]: Hard purged (GDPR/Compliance)
```

### State Matrix & Access Permissions

| `accountStatus` | `employmentStatus` | Can Log In? | Attendance Eligible? | Refresh Token Valid? | UI Display Badge |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `INVITED` | `ACTIVE` | ❌ No (403) | ❌ No | ❌ None | Yellow (`Invited`) |
| `PENDING_ACTIVATION` | `ACTIVE` | ❌ No (403) | ❌ No | ❌ None | Blue (`Pending Activation`) |
| `ACTIVE` | `ACTIVE` |  Yes (200) |  Yes |  Valid | Green (`Active`) |
| `SUSPENDED` | Any | ❌ No (403) | ❌ No | ❌ Revoked | Orange (`Suspended`) |
| `DEACTIVATED` | Any | ❌ No (403) | ❌ No | ❌ Revoked | Red (`Deactivated`) |

---

## 4. Cryptographic Security Standards

1. **Password Hashing:**
   - Algorithm: `bcryptjs`
   - Work Factor (Cost): 12 salt rounds
   - Projection: `{ select: false }` on Mongoose schema to prevent accidental serialization in API responses or logs.
2. **Activation & Password Reset Tokens:**
   - Entropy: 256 bits (`crypto.randomBytes(32).toString('hex')`)
   - Persistence: Cryptographic SHA-256 hash stored in `activationTokenHash` and `resetPasswordTokenHash`.
   - Expiration:
     - Activation tokens: Strictly 24 hours.
     - Password reset tokens: Strictly 1 hour.
   - Replay Prevention: Token hashes are set to `null` on first successful redemption.
3. **JWT Access Tokens:**
   - Algorithm: Strictly `HS256`.
   - Expiration: 15 minutes.
   - Claims: `id`, `name`, `email`, `role`, `permissions`, `employeeId`, `googleEmail`, `department`, `designation`.
4. **Session Invalidation on Password Change / Status Deactivation:**
   - When an employee changes passwords or is deactivated, all outstanding `RefreshToken` records for their `userId` are marked `isRevoked: true`.
   - Any access tokens issued prior to `passwordChangedAt` are rejected with `401 Unauthorized`.
