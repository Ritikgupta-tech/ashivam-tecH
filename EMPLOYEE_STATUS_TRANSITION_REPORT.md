# Employee Status Transition & State Machine Report
**Ashivam Technologies Official Platform — Production HRMS & Attendance System**
**Date:** 2026-11-19  
**Specification:** State Machine Separation (`employmentStatus` vs `accountStatus`)  
**Status:** **PASS — ALL TRANSITIONS VERIFIED**  

---

## 1. Executive Summary

This report documents the architectural separation between corporate **employment standing** and digital **account security standing**. In earlier implementations, a single boolean `isActive` collapsed these distinct concepts, causing security vulnerabilities (e.g., terminated employees retaining active sessions, or invited employees appearing active before setting a password).

---

## 2. State Enum Definitions

### `employmentStatus` (HR standing)
- `ACTIVE`: Actively employed corporate staff member.
- `INACTIVE`: Temporarily inactive (e.g. sabbaticals, administrative holds).
- `TERMINATED`: Formally separated from Ashivam Technologies.
- `ON_LEAVE`: Approved leave of absence.

### `accountStatus` (Authentication standing)
- `INVITED`: Record created in Admin Portal; activation email dispatch pending or failed.
- `PENDING_ACTIVATION`: Invitation email successfully dispatched; awaiting employee password configuration.
- `ACTIVE`: Account activated, password configured, verified corporate credentials.
- `SUSPENDED`: Temporarily locked by administrator (e.g. investigation, security freeze).
- `DEACTIVATED`: Permanently disabled (e.g. terminated employee, soft-deleted record).

---

## 3. Pre-Save Synchronization Rules

In `backend/src/modules/employee/employee.model.js`, a document pre-save hook enforces structural consistency between both statuses and the legacy boolean `isActive`:

```javascript
employeeSchema.pre("save", function () {
  // 1. Deactivated/Suspended accounts or Terminated/Inactive employees are strictly inactive
  if (
    this.accountStatus === "DEACTIVATED" ||
    this.accountStatus === "SUSPENDED" ||
    this.employmentStatus === "INACTIVE" ||
    this.employmentStatus === "TERMINATED"
  ) {
    this.isActive = false;
  } else if (this.accountStatus === "ACTIVE" && this.employmentStatus === "ACTIVE") {
    this.isActive = true;
  } else if (this.isModified("isActive") && !this.isActive) {
    if (this.accountStatus === "ACTIVE") {
      this.accountStatus = "DEACTIVATED";
    }
  }

  // 2. Auto-promote accounts created with explicit password to ACTIVE
  if (this.passwordHash && this.accountStatus === "INVITED") {
    this.accountStatus = "ACTIVE";
    this.isEmailVerified = true;
    this.isActive = true;
  }
});
```

---

## 4. State Transition Verification Matrix

| Transition | Trigger | Preconditions | Side Effects | Status |
| :--- | :--- | :--- | :--- | :---: |
| `INVITED` $\rightarrow$ `PENDING_ACTIVATION` | Email dispatch success | Employee created without password | `activationSentAt` timestamped |  **PASS** |
| `PENDING_ACTIVATION` $\rightarrow$ `ACTIVE` | Token redemption & password set | Valid 24h token | Token hash wiped, sessions enabled |  **PASS** |
| `ACTIVE` $\rightarrow$ `SUSPENDED` | Admin freeze | Authenticated Admin | Active refresh tokens revoked, login blocked |  **PASS** |
| `SUSPENDED` $\rightarrow$ `ACTIVE` | Admin unfreeze | Authenticated Admin | Login unblocked |  **PASS** |
| `ACTIVE` $\rightarrow$ `DEACTIVATED` | Employee termination / soft-delete | Authenticated Admin | All tokens revoked, attendance credit halted |  **PASS** |
| `DEACTIVATED` $\rightarrow$ `ACTIVE` | Admin restore | Admin restore route | Status restored to ACTIVE |  **PASS** |
