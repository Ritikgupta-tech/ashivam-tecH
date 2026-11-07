# Ashivam Technologies — Production Emergency Rollback Procedure

> **Document Version:** 1.0.0  
> **Classification:** DevSecOps Emergency Standard Operating Procedure  
> **Target Audience:** Incident Commanders, On-Call Engineers, DevSecOps Leads  

---

## 1. Rollback Decision Framework

A production rollback must be initiated immediately if any of the following criteria are met within 15 minutes of a new release:

1. **Availability Drop:** `/api/v1/health` returns non-200 responses or error rates exceed $0.5\%$.
2. **Critical Journey Failure:** Public inquiry submissions or candidate resume uploads fail consistently.
3. **Severe Security Flaw:** Unauthenticated access or bypass of RBAC on KYC/Employee endpoints discovered.
4. **Data Corruption:** Uncaught database validation errors causing unrecoverable data loss.

---

## 2. Fast-Track Rollback Execution

```mermaid
sequenceDiagram
    autonumber
    actor IC as Incident Commander
    participant Vercel as Vercel Edge (Frontend)
    participant Render as Render Cloud (Backend)
    participant Atlas as MongoDB Atlas
    actor Team as Ashivam Engineering

    IC->>Team: Declare SEV-1: Initiating Emergency Rollback
    
    par Frontend Rollback
        IC->>Vercel: Instant Rollback to Last Known Good Deployment
        Note over Vercel: Instant zero-downtime traffic cutover (30 seconds)
        Vercel-->>IC: Frontend traffic restored to stable build
    and Backend Rollback
        IC->>Render: Rollback Service to Previous Deployment Commit
        Note over Render: Deploys previous verified container (2 minutes)
        Render-->>IC: Backend traffic restored to stable container
    end

    opt Database Schema Rollback Required
        IC->>Atlas: Run targeted rollback script (rollback-xyz.js) or restore PITR
    end

    IC->>Render: Execute Smoke Verification Tests
    Render-->>IC: /api/v1/health returns 200 OK
    IC->>Team: Rollback Complete; System Stabilized. War-room transition to root cause analysis.
```

---

## 3. Platform-Specific Rollback Steps

### 3.1 Frontend Rollback (Vercel)
1. Open the [Vercel Dashboard](https://vercel.com/) $\to$ **Ashivam Corporate Project** $\to$ **Deployments**.
2. Identify the previous deployment marked `Ready` that was active prior to the current release.
3. Click the three dots menu `...` on that deployment $\to$ Select **Promote to Production**.
4. Cutover takes effect at edge nodes globally in $\le 30$ seconds.

### 3.2 Backend Rollback (Render)
1. Open the [Render Dashboard](https://dashboard.render.com/) $\to$ **ashivam-tech Web Service**.
2. Click **Events** tab.
3. Locate the previous successful deploy event and select **Rollback to this deploy**.
4. Render provisions and switches incoming traffic to the previous healthy Docker container.

### 3.3 Database Rollback
If a schema migration failed mid-way:
1. Execute the corresponding rollback script from `backend/migrations/`:
   ```bash
   node backend/migrations/rollback-20261107-employee-indexes.js
   ```
2. Verify index state:
   ```javascript
   db.employees.getIndexes();
   ```

---

## 4. Post-Rollback Actions

1. Notify executive stakeholders and operational contacts via `team.ashivam@gmail.com`.
2. Lock deployment pipeline (`git checkout main`) until root-cause analysis (RCA) is finalized.
3. Author post-mortem document adhering to blameless engineering culture within 24 hours.
