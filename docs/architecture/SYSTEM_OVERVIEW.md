# Ashivam Technologies — System Overview

**Document:** `SYSTEM_OVERVIEW.md`  
**Classification:** Enterprise System Architecture  
**Date:** 2026-11-07  
**Status:** Approved  
**Author:** Principal Software Architect  

---

## 1. High-Level Architecture

The Ashivam Technologies technical estate is an enterprise-grade digital platform designed to provide corporate digital presence, recruitment pipelines, student internship management, and internal human resource operations.

The platform employs a two-tier decoupled client-server architecture:
- **Client Tier:** React 18 Single-Page Application (SPA) deployed across Vercel's global Edge Network.
- **Server Tier:** Express 5 REST API gateway packaged in a non-root Docker container on Render, backed by a managed MongoDB Atlas replica set.

```mermaid
graph TD
    Client["Visitor / Applicant / Employee / Admin Browser"] -->|HTTPS (TLS 1.3)| VercelEdge["Vercel Edge Network (Static Assets & SPA Shell)"]
    Client -->|API Calls (HTTPS / Strict CORS)| ExpressGateway["Render Container (Express 5 API Gateway)"]
    
    subgraph ExpressGateway [Application Modules]
        AuthSvc["Authentication & Token Manager"]
        InquirySvc["Corporate Inquiries & Contact"]
        CareerSvc["Career Postings & Applications"]
        InternshipSvc["Internship Management & Onboarding"]
        EmployeeSvc["Employee Directory & Records"]
        DocVault["Private Document Storage Vault"]
        OutboxWorker["Outbox Email Processor"]
    end
    
    ExpressGateway -->|Mongoose Connection Pool| MongoAtlas[("MongoDB Atlas Managed Replica Set")]
    OutboxWorker -->|SMTP / API| EmailRelay["Transactional Email Provider"]
```

---

## 2. Technology Stack Standards

| Layer | Component | Version | Rationale |
|---|---|---|---|
| **Frontend Framework** | React | 18.3.1 | Mature component model, stable virtual DOM, broad ecosystem support. |
| **Routing** | React Router DOM | 7.1.4 | Client-side routing with nested routes and scroll restoration. |
| **Bundler & Tooling** | Vite | 8.3.4 | Rollup-based tree-shaking, sub-300ms builds, zero CSS runtime overhead. |
| **Design System** | Pure CSS (Custom Tokens) | CSS3 / W3C | Zero bundle bloat (no MUI or Tailwind overhead), native CSS custom properties. |
| **Backend Runtime** | Node.js | v22.x LTS | Active LTS with native crypto, high throughput, and ESM support. |
| **Web Framework** | Express | 5.1.0 | Stable async error propagation, robust middleware chain, native routing. |
| **Database ODM** | Mongoose | 8.9.5 | Schema-enforced document modeling, strict validation, index automation. |
| **Database Engine** | MongoDB Atlas | 7.0+ | Document model flexibility, ACID multi-document transactions, managed backups. |
| **Security Suite** | Helmet, CORS, Argon2/Bcrypt | Latest | Defense-in-depth header enforcement, origin segregation, high-entropy hashing. |

---

## 3. Deployment & Hosting Topology

1. **Frontend Hosting (Vercel Edge):**
   - CDN distributed across 300+ global edge locations.
   - Client-side catch-all rewrite rules (`vercel.json`) route all paths to `index.html`.
   - Edge headers enforce Content Security Policy, HSTS, frameguard, and permissions restrictions.
2. **Backend Hosting (Render Web Service):**
   - Deployed as a containerized Docker service running on a non-root Alpine Linux image.
   - Automated zero-downtime rolling deployments triggered by pushes to `main`.
   - Integrated health check probe at `/api/v1/health` verifying database connectivity.
3. **Database Hosting (MongoDB Atlas):**
   - Multi-zone replica set cluster with automated failover and continuous backups.
   - IP access control allowlist restricted to Render outbound egress nodes and authorized CIDRs.
