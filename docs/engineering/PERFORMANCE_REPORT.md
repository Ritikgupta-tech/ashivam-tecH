# ASHIVAM TECHNOLOGIES — PERFORMANCE & RESPONSIVENESS REPORT
**Document Reference:** `docs/engineering/PERFORMANCE_REPORT.md`  
**Classification:** Engineering Performance Benchmarks & Quality Assessment  
**Date of Testing:** 2026-11-10  

---

## 1. FRONTEND BUNDLE BENCHMARKS & BUILD METRICS

All three applications were built using Vite with modern JavaScript tree-shaking, code-splitting, and minification:

| Metric | Corporate Website | Internship Management | HRMS Core | Target Threshold | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vite Build Duration** | **1.25s** | **221ms** | **210ms** | $< 5.0\text{s}$ | **PASS** |
| **Main JS Bundle** | **350.7 kB** (101.9 kB gzip) | **255.0 kB** (74.8 kB gzip) | **323.5 kB** (85.5 kB gzip) | $< 500\text{ kB}$ | **PASS** |
| **Main CSS Bundle** | **124.9 kB** (20.6 kB gzip) | **16.7 kB** (4.4 kB gzip) | **4.1 kB** (1.4 kB gzip) | $< 150\text{ kB}$ | **PASS** |
| **Admin Code-Splitting**| **175.6 kB** (32.8 kB gzip) | N/A (Integrated) | N/A (Integrated) | Split on demand | **PASS** |
| **Admin Login Chunk**   | **5.8 kB** (2.1 kB gzip)    | N/A | N/A | Split on demand | **PASS** |

### Code Splitting Architecture:
- In the Corporate Website, admin components (`AdminLogin`, `AdminDashboard`) are loaded via `React.lazy()` and `Suspense`. Public visitors never download the 175 kB Admin bundle, ensuring optimal First Contentful Paint (FCP).

---

## 2. BACKEND API EFFICIENCY & DATABASE PROFILES

### Response Times (Local Node.js Test Environment):
- **Health Check Probe (`/api/v1/health`):** $3.8\text{ ms} - 4.3\text{ ms}$
- **Authentication Login (`POST /api/v1/auth/login`):** $35\text{ ms} - 65\text{ ms}$ (includes bcrypt computation cost)
- **Token Refresh (`POST /api/v1/auth/refresh`):** $8\text{ ms} - 15\text{ ms}$
- **Dashboard Metrics Summary:** $18\text{ ms} - 32\text{ ms}$ (aggregated pipeline queries)
- **Application Submission (`POST /api/v1/applications`):** $23\text{ ms} - 48\text{ ms}$

### Database Query Optimization & Indexing:
- **Unique Indexes:**
  - `User.email` (unique, lowercase, sparse)
  - `Application.applicationNumber` (unique, indexed)
  - `Employee.employeeId` (unique, collision-safe)
  - `Certificate.certificateId` (unique, indexed)
- **Compound & Query Indexes:**
  - `Application: { status: 1, createdAt: -1 }` (for pagination and review queue filtering)
  - `Attendance: { employeeId: 1, date: -1 }` (for single-day check-in idempotency)
  - `AuditLog: { timestamp: -1, action: 1 }` (for security audit trails)

---

## 3. USER EXPERIENCE & INTERACTION PERFORMANCE

- **Shimmer Skeletons:** Implemented in HRMS `StatCards.jsx` and Dashboard. Eliminates layout shift (CLS: 0) while waiting for asynchronous MongoDB aggregations.
- **Button Feedback:** Instant state transitions on submit (`disabled={loading}`) preventing accidental double-submissions.
- **Scroll Optimization:** Website Hero particle animation uses `IntersectionObserver` to pause canvas render loops when scrolled out of view, preserving mobile CPU/GPU cycles.
- **Reduced Motion:** CSS respects `@media (prefers-reduced-motion: reduce)`, disabling intensive parallax effects and transform transitions for sensitive users.

---

## 4. RESPONSIVE LAYOUT VERIFICATION ACROSS VIEWPORT TIERS

All three frontends were audited across 8 standardized viewport profiles:

| Profile | Dimensions | Device Category | Layout Behavior | Overflow / Issues | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ultra-compact Mobile** | $360 \times 640\text{ px}$ | Compact Android | 1-column stack, collapsed drawer, full-width cards | None ($0\text{ px}$ horizontal) | **PASS** |
| **Standard Mobile** | $390 \times 844\text{ px}$ | iPhone 12/13/14 | Fluid padding, touch targets $\ge 44\text{ px}$ | None ($0\text{ px}$ horizontal) | **PASS** |
| **Large Mobile** | $430 \times 932\text{ px}$ | iPhone Pro Max | Fluid grid, responsive font clamps | None ($0\text{ px}$ horizontal) | **PASS** |
| **Tablet Portrait** | $768 \times 1024\text{ px}$ | iPad Mini / Air | 2-column card grid, sidebar toggleable drawer | None ($0\text{ px}$ horizontal) | **PASS** |
| **Tablet Landscape** | $1024 \times 768\text{ px}$ | iPad Pro / Small Laptop | Permanent sidebar, 3-column stats grid | Clean viewport fit | **PASS** |
| **Standard Laptop** | $1280 \times 800\text{ px}$ | MacBook Air / ThinkPad | Full navigation bar, 4-column metrics | Clean viewport fit | **PASS** |
| **Desktop High-Res** | $1440 \times 900\text{ px}$ | Standard Desktop | Maximum container width clamp ($1280\text{ px}$), centered | Clean margins | **PASS** |
| **Ultra-Wide Monitor** | $1920 \times 1080\text{ px}$ | FHD / 4K Scaled | Max-width constraint prevents horizontal stretching | Perfectly centered | **PASS** |
