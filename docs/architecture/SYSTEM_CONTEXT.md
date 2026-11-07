# Ashivam Technologies — System Context (C4 Model Level 1)

**Document:** `SYSTEM_CONTEXT.md`  
**Classification:** Enterprise System Architecture  
**Date:** 2026-11-07  
**Status:** Approved  
**Author:** Principal Software Architect  

---

## 1. System Context Diagram

The C4 Level 1 diagram illustrates how external human actors and external software systems interact with the Ashivam Technologies core platform.

```mermaid
graph TD
    subgraph Actors [Human Users]
        Visitor["Corporate Visitor / Potential Client"]
        JobCandidate["Career Job Applicant"]
        StudentIntern["Internship Candidate / Intern"]
        StaffMember["Ashivam Employee"]
        AdminUser["System Administrator / HR Lead"]
    end

    subgraph CorePlatform [Ashivam Technologies Digital Platform]
        WebsiteSPA["Corporate Website SPA (Vercel)"]
        BackendAPI["Core API Gateway (Render Container)"]
        Database[("MongoDB Atlas Primary Cluster")]
        LocalVault["Private Document Storage Vault"]
    end

    subgraph ExternalSystems [External Systems & Services]
        EmailGateway["Transactional Email Service (Resend / Brevo / SMTP)"]
        EdgeCDN["Vercel Global Edge Network"]
        GitRemotes["GitHub Repositories (Personal & Company Remotes)"]
    end

    Visitor -->|Views Solutions, Submits Inquiries| WebsiteSPA
    JobCandidate -->|Browses Roles, Submits Resume| WebsiteSPA
    StudentIntern -->|Applies to Programs, Tracks Status| WebsiteSPA
    StaffMember -->|Authenticates, Accesses Documents| WebsiteSPA
    AdminUser -->|Manages Inquiries, Candidates, Employees| WebsiteSPA

    WebsiteSPA -->|Static Assets| EdgeCDN
    WebsiteSPA -->|RESTful JSON API over HTTPS| BackendAPI
    BackendAPI -->|Mongoose Queries & Transactions| Database
    BackendAPI -->|Streams & Writes Files| LocalVault
    BackendAPI -->|Asynchronous Outbox Dispatch| EmailGateway
    BackendAPI -->|Sends Admin Alert to team.ashivam@gmail.com| EmailGateway
    AdminUser -->|Pushes Code, Triggers CI/CD| GitRemotes
    GitRemotes -->|Automated Deployment Hooks| BackendAPI
    GitRemotes -->|Automated Edge Build| EdgeCDN
```

---

## 2. External Actors & Interactions

| Actor | Primary Interaction Goals | Interface Modality | Authentication Requirement |
|---|---|---|---|
| **Corporate Visitor** | Explores company profile, technology services, solutions, and submits project inquiries | Desktop / Mobile Web | Anonymous (Public) |
| **Job Candidate** | Explores job board, reviews technical requirements, and submits PDF resume | Desktop / Mobile Web | Anonymous (Public) with rate limits |
| **Internship Candidate** | Browses published tracks, submits academic details and resume | Desktop / Mobile Web | Anonymous (Public) with rate limits |
| **Enrolled Intern** | Tracks onboarding milestones, reviews mentor allocations | Future Dedicated Portal | Token Authenticated (Intern Role) |
| **Ashivam Employee** | Accesses directory, views verified documents, downloads HR policies | Employee Login Portal | Token Authenticated (Employee Role) |
| **Administrator** | Superadmin & Content Editor roles managing CMS, candidates, and RBAC | Admin Console | Token Authenticated + RBAC Permissions |

---

## 3. External Integration Points

1. **Transactional Email Gateways (Resend / Brevo / SMTP):**
   - Transports admin inquiry alerts, candidate submission acknowledgments, and broadcast notifications.
   - Mandated recipient for all company operational alerts: `team.ashivam@gmail.com`.
2. **MongoDB Atlas Managed Services:**
   - Multi-node replica set with encrypted-at-rest volumes and TLS 1.3 encrypted transit.
3. **Vercel Edge Network:**
   - Provides global DNS resolution, edge SSL termination, and static asset delivery with gzip/brotli compression.
