# ADR-002: Data Ownership, Isolation, and Cross-Domain Consistency

> **Status:** Accepted  
> **Date:** 2026-11-07  
> **Deciders:** Principal Software Architect, Database Architect, Senior Backend Lead  

---

## 1. Context and Problem Statement

In the existing Ashivam Technologies codebase, models for inquiries, careers, internships, interns, employees, and documents reside in the same database (`ashivam_production` / Atlas cluster). Historically, there was a risk that services or controllers could perform cross-domain joins (`$lookup` across `employees` and `inquiries`) or mutate records outside their domain boundary.

As we decouple the platform into three applications (Corporate Web, Internship Management, HRMS), clear data ownership and consistency rules must be codified.

---

## 2. Decision Drivers

- **Data Privacy & Compliance:** HR records (statutory PAN, Aadhaar, salary history) must be strictly isolated from public lead capture systems.
- **Single Source of Truth:** Every entity must have exactly one authoritative owner service.
- **Relational Integrity:** Preventing orphaned records or dual-write inconsistencies during multi-step business transactions.

---

## 3. Decision Outcome: The "One Domain, One Owner" Rule

We enforce that **each collection is owned exclusively by one domain**. Cross-domain queries and mutations must never occur directly at the database layer.

### 3.1 Domain Ownership Matrix

| Domain | Collections Exclusively Owned | Allowed Cross-Domain Access | Prohibited Operations |
| :--- | :--- | :--- | :--- |
| **Domain A: Corporate Web** | `inquiries`, `careers`, `applications` | None | Direct access to `employees` or `employeedocuments` |
| **Domain B: Internship System** | `internships`, `interns`, `certificates` | Read-only public track info to Domain A | Writing directly to `employees` collection |
| **Domain C: HRMS** | `employees`, `employeedocuments`, `hrdocuments` | Emits employee provisioning events | Accessing raw unverified inquiry leads |
| **Shared Platform** | `users`, `auditlogs`, `outbox_events` | Shared auth / audit logging across all domains | Modifying audit log history (append-only) |

---

## 4. Communication & Synchronization Mechanisms

1. **No Database `$lookup` across Domains:**
   - Any controller needing data from another domain must query through that domain's published REST API or consume an asynchronous domain event.
2. **Transactional Outbox for Event Dispatch:**
   - Dual-writing (e.g. updating an intern record while directly calling an external email or HR endpoint) is prohibited due to partial failure risks.
   - All state transitions that trigger cross-domain actions must persist an event to `outbox_events` within the same ACID transaction.
3. **Reference by Immutable UUID / ObjectId:**
   - Entities reference related entities in other domains only by their primary key identifier (`internId`, `employeeId`), never by embedding mutable snapshot structures that can become stale.

---

## 5. Consequences

### Positive
- Enforces strict compliance with data privacy mandates.
- Prepares the database tier for seamless physical separation into distinct MongoDB databases or clusters when services are independently hosted.
- Eliminates tight coupling at the persistence layer.

### Negative
- Requires developers to use the Outbox pattern or REST APIs instead of convenient MongoDB `$lookup` aggregations.
