# ADR-001: Separation of Ashivam Digital Platform into Three Independent Applications

> **Status:** Accepted  
> **Date:** 2026-11-07  
> **Deciders:** Principal Software Architect, Senior Engineering Team  
> **Consulted:** UI/UX Director, DevSecOps Lead, Application Security Engineer  

---

## 1. Context and Problem Statement

Ashivam Technologies initially developed its public corporate website, internship management features, and internal HR management functionality within a single repository and monolithic Express/Vite codebase.

As the company scales, these three functional areas have diverged significantly in:
- **Audience & Access:** Public corporate visitors vs enrolled interns/mentors vs full-time staff and HR management.
- **Security & Compliance:** Public inquiries require minimal PII retention; HRMS requires strict compliance with Indian DPDP Act 2023, Aadhaar masking, and immutable KYC auditing.
- **Deployment Cadence & Risk:** Marketing site copy changes should not risk taking down employee payroll or internship milestone submissions.
- **Resource Scaling:** Public website traffic spikes (e.g. from press releases or marketing campaigns) should not impact HR operational database performance.

---

## 2. Decision Drivers

- **Security Isolation:** Restrict access to confidential employee records from public-facing codebases.
- **Maintainability:** Clear bounded contexts (DDD) preventing accidental coupling of internal HR models with public career listings.
- **Operational Independence:** Ability to deploy corporate marketing updates independently of core business applications.
- **Zero Disruption Rule:** Existing production monolithic functionality and active deployments (`ashivam-tec-h.vercel.app`, `ashivam-tech.onrender.com`) must remain 100% operational throughout the transition.

---

## 3. Considered Options

1. **Option 1: Complete Big-Bang Microservices Rewrite.**  
   *Discard the monolith and immediately deploy 3 separate repos and microservices.*  
   *Verdict:* **Rejected.** High risk of regression, broken endpoints, duplicate work, and downtime. Violates Non-Negotiable Project Rules.
2. **Option 2: Permanent Monolith without Boundaries.**  
   *Keep adding HRMS and internship features directly into the corporate website backend.*  
   *Verdict:* **Rejected.** Severe security vulnerability risk (accidental exposure of PII on public endpoints), monolithic sprawl, and maintenance friction.
3. **Option 3: Strangler Fig Pattern with Modular Monolith Hardening.**  
   *Harden the existing modular monolith with clear DDD boundary separation, strict RBAC, and zero cross-domain database queries. Specify standalone repository architectures (`ashivam-internship-management` and `ashivam-hr-management`) and migrate incrementally.*  
   *Verdict:* **Accepted.**

---

## 4. Decision Outcome

We will adopt **Option 3**. The current repository (`Official-Website-main` / `ashivam-tecH`) will continue to serve as the unified operational platform while establishing strict logical boundary isolation.

### Target 3-Application Ecosystem
1. **Application A (Corporate Website):** In current repository. Focused on brand, inquiries, public careers, and public legal/security pages.
2. **Application B (`ashivam-internship-management`):** Extracted application for internship admissions, tracks, tasks, evaluations, and certificate verification.
3. **Application C (`ashivam-hr-management`):** Extracted enterprise HRMS for employees, KYC document vault, policy acknowledgments, and leave tracking.

### Positive Consequences
- Immediate security hardening without breaking current live traffic.
- Clear ownership and decoupled testing paths.
- Facilitates future independent repository extractions when organization resources scale.

### Negative Consequences
- Monolithic deployment must be maintained temporarily while separate pipelines and repositories are provisioned.
- Requires strict code review discipline to prevent developers from bypassing domain boundaries.
