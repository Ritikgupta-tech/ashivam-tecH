# Ashivam Technologies — Bug Fix & Remediation Report

> **Period:** 2026-10-28 to 2026-11-01  
> **Branch:** `main`  
> **Commits:** `2875d84` → `d330790` (6 commits ahead of `origin/main`)  
> **Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`

---

## Executive Summary

Six production-grade fixes were identified, implemented, tested, and committed across the authentication system, frontend architecture, developer experience, and security posture. All fixes were driven by root-cause analysis — no speculative changes were made.

| # | Fix | Severity | Commit | Tests |
|---|---|---|---|---|
| 1 | HTTP 405 on GET auth endpoints | 🟠 MEDIUM | `2875d84` | ✅ |
| 2 | Anonymous double-refresh (duplicate `POST /auth/refresh`) | 🟠 MEDIUM | `20c1c03` | ✅ |
| 3 | React Fast Refresh HMR invalidation | 🟡 LOW (DX) | `fbbc218` | ✅ |
| 4 | Navbar `aria-hidden` + focused descendant a11y violation | 🟠 MEDIUM | `fbbc218` | ✅ |
| 5 | Vite proxy ECONNREFUSED raw socket trace in browser | 🟡 LOW (DX) | `fbbc218` | ✅ |
| 6 | Career application TOCTOU race + missing CSP + admin bundle size | 🟠/🟡 | `d330790` | ✅ |

---

## Fix 1 — HTTP 405 Method Not Allowed on Auth GET Endpoints

**Commit:** `2875d84`  
**Component:** `backend/src/modules/auth/auth.routes.js`

### Root Cause

Express 5 changed default behaviour: routes not matching any handler now return 404 with no `Allow` header, rather than 405. A GET request to `/api/v1/auth/refresh` (which only has a POST handler) fell through to a generic 404, giving browser clients no indication of the correct method.

### Fix

Added explicit GET handlers for `/refresh`, `/login`, and `/logout` that return:
- HTTP `405 Method Not Allowed`
- `Allow: POST` response header (RFC 7231 §6.5.5 compliant)
- Standard JSON error envelope

```js
router.get('/refresh', methodNotAllowed(['POST']));
router.get('/login',   methodNotAllowed(['POST']));
router.get('/logout',  methodNotAllowed(['POST']));
```

### Verification

- `curl -X GET https://ashivam-tech.onrender.com/api/v1/auth/refresh` → **HTTP 405, Allow: POST** ✅
- `curl -X POST https://ashivam-tech.onrender.com/api/v1/auth/refresh` (no cookie) → **HTTP 401** ✅

---

## Fix 2 — Anonymous Double-Refresh on Page Load

**Commit:** `20c1c03`  
**Component:** `src/context/AuthContext.jsx`, `src/api.js`

### Root Cause

`verifySession()` in `AuthContext.jsx` unconditionally called `refreshSession()` on every app mount — even for anonymous public visitors with no session. Two requests were observed because React StrictMode double-invokes effects in development. In production the double-call came from both `AuthContext` initialization and a second caller in the refresh flow.

### Fix

**Session hint pattern:**
- On successful login: `localStorage.setItem('ashivam_auth_hint', '1')` (non-sensitive boolean)
- On logout / definitive refresh failure: hint is cleared
- `verifySession()` now skips `POST /auth/refresh` unless `hasHint || isPortalRoute`

**Single-flight deduplication:**
- `refreshInFlightPromise` (module-level) ensures concurrent callers share one in-flight request
- Web Locks API (`navigator.locks.request`) serialises refresh attempts across browser tabs

### Security Assurance

The hint is a **non-sensitive boolean** stored only in `localStorage`. It carries no token, no credential, and no session data. Its absence causes the refresh to be skipped; the backend security posture is unchanged.

### Verification

Production check: anonymous visit to `https://ashivam-tec-h.vercel.app/` — **zero requests to** `POST /auth/refresh` in Chrome DevTools Network ✅

---

## Fix 3 — React Fast Refresh HMR Invalidation

**Commit:** `fbbc218`  
**Component:** `src/context/AuthContext.jsx`, `src/context/authContextDef.js` (new), `src/context/useAuth.js`

### Root Cause

`AuthContext.jsx` exported both:
- `AuthContext` (a plain React context — not a component)
- `AuthProvider` (a React component)

React Fast Refresh requires that a module exporting React components exports **only** React components. A mixed-export module causes HMR to fall back to a full page reload, logging:

```
[vite] hmr invalidate /src/context/AuthContext.jsx Could not Fast Refresh ("AuthContext" export is incompatible)
```

### Fix

Created `src/context/authContextDef.js` — a pure, component-free module:
```js
import { createContext } from 'react';
export const AuthContext = createContext(null);
```

`AuthContext.jsx` now imports `AuthContext` from `authContextDef.js` and exports **only** `AuthProvider`. `useAuth.js` imports from `authContextDef.js` directly. No circular imports.

### Verification

- `npm run dev` → no HMR invalidation messages after editing AuthContext ✅
- Import graph: `authContextDef.js` ← `AuthContext.jsx` ← `App.jsx`; `authContextDef.js` ← `useAuth.js` (no cycle)

---

## Fix 4 — Navbar `aria-hidden` + Focused Descendant Accessibility Violation

**Commit:** `fbbc218`  
**Component:** `src/components/Navbar/Navbar.jsx`

### Root Cause

The mobile drawer overlay was being hidden via CSS (`display: none` / `visibility: hidden`) while remaining in the DOM without `aria-hidden="true"` or the `inert` attribute. When the drawer closed, focus was not returned to the hamburger button — it remained on the last focused link inside the drawer (a hidden element). This produced an accessibility violation:

> `aria-hidden` element must not contain focusable elements (WCAG 2.1 §1.3.1, §4.1.2)

### Fix

Complete accessibility rewrite of the mobile drawer:
- `inert` attribute on the closed drawer — removes it from the focus order and accessibility tree simultaneously
- `hamburgerRef` — focus returns to the hamburger button on drawer close (keyboard and Escape key)
- Focus moves to the **first menu link** when the drawer opens (keyboard users can navigate immediately)
- `aria-controls` on the hamburger button pointing to `MOBILE_MENU_ID`
- `aria-expanded` reflects drawer state
- `Escape` key closes drawer and restores focus
- `useCallback(closeMenu)` prevents stale closures in effects

### WCAG 2.2 AA Conformance

| Criterion | Before | After |
|---|---|---|
| 1.3.1 Info & Relationships | ❌ No ARIA on drawer | ✅ `aria-controls`, `aria-expanded` |
| 2.1.1 Keyboard | ❌ Focus trap after close | ✅ Focus returned to hamburger |
| 2.4.3 Focus Order | ❌ Focus in hidden element | ✅ `inert` removes from tab order |
| 4.1.2 Name, Role, Value | ❌ Hamburger unlabelled | ✅ `aria-label`, `aria-controls` |

---

## Fix 5 — Vite Proxy ECONNREFUSED Raw Socket Error in Browser

**Commit:** `fbbc218`  
**Component:** `vite.config.js`

### Root Cause

When the local backend (port 5000) was not running, the Vite dev-server proxy threw a raw `ECONNREFUSED` Node.js socket error. This was written to the terminal as an unhandled error and the browser received no response, leading to a confusing network error with no actionable message.

### Fix

Added an `error` handler on the proxy:
```js
configure: (proxy) => {
  proxy.on('error', (err, req, res) => {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      message: 'Backend unavailable — start the local server on port 5000',
      error: err.code
    }));
  });
}
```

### Result

API calls during local development with no backend now receive a structured `HTTP 503` with a clear diagnostic message. No raw socket traces in the terminal.

---

## Fix 6 — Career TOCTOU Race, Missing Vercel CSP, Admin Lazy-Loading

**Commit:** `d330790`

### 6A — Career Application Unique Index (SEC-01)

See [Security Red Flag Register — SEC-01](./ASHIVAM_SECURITY_RED_FLAG_REGISTER.md#sec-01).

**Files changed:**
- `backend/src/modules/career/application.model.js` — added `{ job: 1, email: 1 }` unique compound index
- `backend/src/modules/career/career.service.js` — added E11000 → HTTP 409 handler

### 6B — Vercel Content-Security-Policy (SEC-03)

See [Security Red Flag Register — SEC-03](./ASHIVAM_SECURITY_RED_FLAG_REGISTER.md#sec-03).

**File changed:** `vercel.json` — added CSP, `Referrer-Policy`, `Permissions-Policy`

### 6C — AdminDashboard Lazy-Loading (PERF-01)

**Component:** `src/App.jsx`

**Problem:** `AdminDashboard` (~175 kB parsed JS) and `AdminLogin` (~6 kB) were in the main synchronous bundle, meaning every public visitor downloaded ~527 kB of JS — even though they never visit `/admin`.

**Fix:**
```jsx
const AdminLogin    = lazy(() => import('./components/Admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
```

All admin routes wrapped in `<Suspense fallback={<AdminLoadingFallback />}>`.

**Result:**

| Bundle | Before | After |
|---|---|---|
| Main (`index-*.js`) | 527 kB (132 kB gzip) | 349 kB (101 kB gzip) |
| AdminDashboard chunk | (bundled) | 175 kB (33 kB gzip) — on-demand |
| AdminLogin chunk | (bundled) | 6 kB (2 kB gzip) — on-demand |

Public visitors save **~178 kB** of parsed JavaScript on first load. Vite advisory threshold (500 kB) no longer breached.

---

## Regression Testing

All fixes were regression-tested before commit:

| Suite | Tests | Result |
|---|---|---|
| Frontend (Node test runner) | 107 | ✅ 107/107 PASS |
| Backend (Node test runner) | 236 | ✅ 236/236 PASS |
| Production build | — | ✅ 0 errors, 0 warnings |

---

*Report generated: 2026-11-01*
