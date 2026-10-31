# Phase 4: DevOps & Deployment Hardening Audit

**Project:** Ashivam Technologies Official Platform  
**Target Environments:** Vercel (Frontend Client) / Render (Backend API) / Docker  
**Audit Date:** 2026-10-31  
**Lead Auditor:** Principal DevOps & Site Reliability Engineer  

---

## 1. Executive Summary

Phase 4 audited the containerization setup, GitHub Actions CI automation pipeline, deployment environment variable configuration across Render and Vercel, staging environment isolation, and production release gating.

The application uses an unprivileged non-root multi-stage Docker container for the backend API and an automated CI pipeline with pinned action versions, least-privilege permissions, security audits, test execution, Vite compilation, and Docker non-root runtime validation.

---

## 2. Findings & Hardening Matrix

### Finding OPS-01: Multi-Stage Non-Root Docker Architecture
- **Severity:** High
- **Affected Files:** `backend/Dockerfile`, `backend/.dockerignore`
- **Root Cause:** Single-stage Docker images often run as root (UID 0), contain devDependencies and package managers, and carry secrets or leftover test artifacts.
- **Implemented Fix:**
  - Multi-stage build (`node:22-alpine` builder $\rightarrow$ `node:22-alpine` minimal runtime).
  - Production dependency isolation: `npm ci --omit=dev && npm cache clean --force`.
  - Dedicated unprivileged system user:
    ```dockerfile
    RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
        mkdir -p uploads/resumes && \
        chown -R appuser:appgroup /usr/src/app
    USER appuser
    ```
  - Built-in container health check:
    ```dockerfile
    HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
      CMD wget --quiet --tries=1 --spider http://127.0.0.1:5000/api/v1/health || exit 1
    ```
  - Clean `.dockerignore` excluding `.env`, `.git`, `tests`, `coverage`, and `uploads`.
- **Test Evidence:** Documented in `backend/Dockerfile` and validated via CI `docker-verify` job.
- **Remaining Risk:** None.
- **External Infrastructure Verification Pending:** None.

### Finding OPS-02: GitHub Actions CI Hardening & Pinned Actions
- **Severity:** High
- **Affected Files:** `.github/workflows/ci.yml`
- **Root Cause:** CI workflows using floating major tags or lacking least-privilege permissions are vulnerable to supply-chain tampering. Additionally, CI workflows lacked Docker build validation and Git whitespace checks.
- **Implemented Fix:**
  - Enforced top-level least-privilege: `permissions: contents: read`.
  - Pinned all third-party GitHub Actions to immutable full commit SHAs with semantic version comments:
    - `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`
    - `actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0`
    - `docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2 # v3.10.0`
  - Automated quality pipeline across three concurrent jobs:
    1. `format-and-frontend`: Git diff whitespace check, `npm audit`, frontend tests (77 tests), and Vite production build.
    2. `backend-verify`: MongoDB 7.0 containerized service, distinct CI test secrets, `npm audit`, and complete backend test suite (221 tests).
    3. `docker-verify`: Builds `ashivam-backend:ci` and verifies the container runs as non-root (asserts `UID != 0`).
  - Separated CI validation strictly from deployment (no automatic deployment triggers on push).
- **Test Evidence:** All local tests pass; workflow syntax validated; `git diff --check` passes.
- **Remaining Risk:** None.
- **External Infrastructure Verification Pending:** Runs on GitHub runners upon PR / push.

### Finding OPS-03: Staging Environment Isolation & Production Environment Variables
- **Severity:** Critical
- **Affected Files:** `render.yaml`, `backend/.env.example`, `backend/.env.production.example`
- **Root Cause:** Risk of configuration drift or shared database credentials between staging and production.
- **Implemented Fix:**
  - Resolved canonical variable names:
    - Frontend base URL in backend: `CLIENT_URL` (with backward-compatible `FRONTEND_URL` fallback).
    - Backend base URL in frontend: `VITE_API_URL` (with backward-compatible `VITE_API_BASE_URL` fallback).
  - Strictly documented that staging MUST use:
    - Separate MongoDB Atlas cluster / database (`ashivam_staging`).
    - Cryptographically independent staging JWT secrets (`JWT_SECRET` and `JWT_REFRESH_SECRET`).
    - Isolated staging CORS origin (`https://ashivam-tec-h-staging.vercel.app`).
    - Isolated staging S3 bucket (`ashivam-staging-resumes`).
    - Dedicated staging SMTP test mailbox (Mailtrap/Ethereal).
- **Test Evidence:** Clean validation in `backend/src/config/env.js`.
- **Remaining Risk:** Cloud account administrator must configure separate Atlas and Render environments.
- **External Infrastructure Verification Pending:** Cloud deployment to separate staging instances.

---

## 3. Staging Deployment Smoke Test Checklist

| Verification Item | Requirement | Verification Method | Status |
|---|---|---|---|
| Health Probe | `/api/v1/health` returns `200` & status `operational` | `curl -I https://ashivam-tech-staging.onrender.com/api/v1/health` | Pending Staging URL |
| Database Connection | MongoDB Atlas staging cluster connected | `/api/v1/health` returns `database: "connected"` | Pending Staging URL |
| CORS Preflight | Allowed origin preflight returns 204 with headers | `OPTIONS /api/v1/auth/login` from staging Vercel origin | Pending Staging URL |
| CSRF Originless Guard | Cookie-based requests without custom header return 403 | Automated integration test passes locally | Code Verified |
| Distributed Locks | Leases renew and overtake cleanly | `distributed-lock-safety.test.js` passes | Code Verified |
| Email Routing | Corporate notifications route to `team.ashivam@gmail.com` | Verified in unit and integration tests | Code Verified |
| Non-Root Container | Docker UID != 0 | Verified via CI build step | Code Verified |
