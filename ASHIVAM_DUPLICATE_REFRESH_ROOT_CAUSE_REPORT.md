# ASHIVAM TECHNOLOGIES — DUPLICATE REFRESH REQUEST & ANONYMOUS AUTHENTICATION ROOT CAUSE REPORT

**Company:** Ashivam Technologies ("Endless Innovation. Limitless Possibilities.")  
**Headquarters:** Agra, Uttar Pradesh, India  
**Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  
**Production Frontend:** `https://ashivam-tec-h.vercel.app` (Vercel)  
**Production Backend:** `https://ashivam-tech.onrender.com/api/v1` (Render)  
**Date of Audit & Fix:** October 31, 2026  
**Auditor Roles:** Senior React Authentication Architect, Backend Security Engineer, QA Automation Engineer  
**Evaluation Status:** `VERIFIED LOCALLY`  

---

## 1. Executive Summary & Observed Production Phenomenon

In the provided Chrome DevTools Network screenshot (`media_1793454827859.png`) captured on `https://ashivam-tec-h.vercel.app/solutions#contact`, two requests to `POST /api/v1/auth/refresh` appear in the Network log, both returning HTTP 401 Unauthorized (`"Refresh token is missing from cookie or request body"`).

This audit identifies the exact architectural and environmental root cause of why two requests were recorded, verifies the single-flight deduplication mechanics, and implements the permanent optimization that eliminates all unnecessary refresh requests for anonymous visitors while preserving 100% of silent session restoration guarantees.

---

## 2. Root Cause Analysis

### 2.1 Timeline & DevTools Environmental Evidence
A deep inspection of the Network waterfall and DevTools configuration in the screenshot reveals:
1. **"Keep log" Enabled:** The DevTools Network filter setting `[x] Keep log` was actively checked.
2. **Timeline Separation:** The first request occurred at approximately **150,000 ms (2.5 minutes)** on the timeline, while the second request occurred at approximately **800,000 ms (13.3 minutes)**. They were separated by over **10 minutes**.
3. **Navigation Accumulation:** In the deployed Vercel production build (commit `c26be86`), `verifySession()` in `AuthProvider` ran on every page navigation / full reload. Because `Keep log` preserves network history across page navigations and reloads, DevTools displayed both the earlier request from the initial page visit and the subsequent request from the later reload/navigation in the same table.

### 2.2 Live Production Network Verification
To independently verify whether a single page load ever issues two requests concurrently, we executed a headless browser probe using Microsoft Edge against the live production deployment `https://ashivam-tec-h.vercel.app/solutions#contact`:
* **Total refresh requests on a single cold page load:** **1**
* **Initiator:** `index-DkB4ZnrP.js:10` via `fetch('${API_BASE_URL}/auth/refresh')`
* **Conclusion:** The application does **not** double-mount `<AuthProvider>` and does **not** trigger duplicate simultaneous network requests on a single cold load. However, because `verifySession()` previously ran unconditionally on every page load, every reload or navigation by an anonymous visitor issued an unneeded 401 network roundtrip.

### 2.3 Call Chain Architecture
```mermaid
sequenceDiagram
    participant User as Visitor Browser
    participant Router as React Router (/solutions)
    participant Auth as AuthProvider (AuthContext.jsx)
    participant API as executeTokenRefresh (src/api.js)
    participant Lock as Web Locks API ('ashivam_auth_refresh_lock')
    participant Render as Backend (/api/v1/auth/refresh)

    User->>Router: Navigate to /solutions#contact
    Router->>Auth: Mount <AuthProvider>
    Auth->>Auth: useEffect -> verifySession()
    Note over Auth: In c26be86: activeToken is null
    Auth->>API: refreshSession() -> executeTokenRefresh()
    API->>Lock: Request 'ashivam_auth_refresh_lock'
    Lock->>API: runFetchRefresh()
    API->>Render: POST /api/v1/auth/refresh (credentials: include)
    Render-->>API: 401 Unauthorized (No cookie)
    API->>API: finally { refreshInFlightPromise = null; }
    API-->>Auth: Throw Error ('Session expired')
    Auth->>Auth: catch block sets user=null, isLoading=false
```

---

## 3. Engineering Fix & Centralized Session Restoration

To eliminate unneeded network calls for public visitors while strictly preserving concurrency deduplication, we implemented the following changes:

### 3.1 Non-Sensitive Session Hint (`src/api.js`)
We established a non-sensitive client flag in `localStorage` (`ashivam_auth_hint = 'active'`):
- **Set on Successful Login:** Set only after valid authentication (`loginAdmin`).
- **Zero Sensitive Data:** Strictly the string `'active'`. Never stores JWTs, access tokens, refresh tokens, passwords, or user credentials.
- **Cleared on Logout & Expiry:** Removed on explicit logout or upon receiving 401 from the server.
- **Survives Browser Restart:** Enables silent session restoration when an administrator or employee returns after closing the browser.

### 3.2 Portal Route Awareness (`src/context/AuthContext.jsx`)
In `verifySession()`, we evaluate whether a session attempt is legitimate:
```javascript
const hasHint = hasSessionHint();
const isPortalRoute =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/admin') ||
   window.location.pathname.startsWith('/employee-login'));

// If an ordinary visitor on a public route without any session hint, skip refresh
if (!hasHint && !isPortalRoute) {
  setUser(null);
  setTokenState(null);
  setIsLoading(false);
  return;
}
```
* **Public Route (`/solutions#contact`):** `hasHint` is `false`, `isPortalRoute` is `false`. The request is bypassed completely.
* **Portal Gateway (`/admin`, `/employee-login`):** Even if the user cleared `localStorage`, `isPortalRoute` is `true`, ensuring admins are never locked out of session restoration.

### 3.3 Concurrency & In-Flight Deduplication
In `src/api.js`, `executeTokenRefresh()` guarantees single-flight promise sharing:
* If multiple components trigger `refreshSession()` concurrently, they receive the identical `refreshInFlightPromise`.
* Cross-tab serialization is enforced via `navigator.locks.request('ashivam_auth_refresh_lock')`.

---

## 4. Before & After Request Metrics

| Scenario | Before Fix (c26be86) | After Fix (Verified Locally) | Outcome |
|---|---|---|---|
| **Anonymous visitor on `/solutions#contact`** | 1 request to `POST /auth/refresh` (HTTP 401, red console warning) | **0 requests** (Zero network calls, clean DevTools console) | **100% Eliminated** |
| **Anonymous visitor reloads or navigates pages** | 1 request per page view (accumulating in DevTools when "Keep log" is checked) | **0 requests** across all public page views | **100% Eliminated** |
| **4 Simultaneous Concurrent Refresh Callers** | Deduplicated via in-flight promise | Exactly **1 network fetch** shared across all 4 callers | **Deduplicated** |
| **Authenticated Admin Page Reload** | Session restored via `sessionStorage` | Session restored via `sessionStorage` | **Preserved** |
| **Authenticated Admin Browser Restart** | Session restored via persistent cookie | Session restored via persistent cookie + session hint | **Preserved** |
| **Admin Logout** | Cleared `sessionStorage` | Cleared `sessionStorage`, `localStorage` hint, and synced across tabs | **Hardened** |

---

## 5. Automated Verification & Test Results

### 5.1 Test Suite Breakdown

| Test Suite | File / Command | Passed / Total | Status |
|---|---|---|---|
| **Session Hint & Concurrency Tests** | `node --test tests/sessionHintOptimization.test.js` | **10/10 passed** (100%) | `VERIFIED LOCALLY` |
| **Frontend Test Suite** | `npm test` | **87/87 passed** (100%) | `VERIFIED LOCALLY` |
| **Backend Test Suite** | `npm test --prefix backend` | **236/236 passed** (100%) | `VERIFIED LOCALLY` |
| **Browser Staging E2E Suite** | `npm run test:e2e` | **19/19 scenarios passed** (100%) | `VERIFIED LOCALLY` |
| **Frontend Production Build** | `npm run build` | **102 modules transformed, 0 errors** (333ms) | `VERIFIED LOCALLY` |

### 5.2 Specific Concurrency Assertion Added
We added automated test scenario #10 to [`tests/sessionHintOptimization.test.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/tests/sessionHintOptimization.test.js):
```javascript
test('Concurrent Refresh Execution - Simultaneous refresh callers share a single in-flight promise without duplicates', async () => { ... });
```
Asserts that 4 simultaneous callers to `refreshSession()` trigger **exactly 1 network fetch** and all 4 receive the resolved access token.

---

## 6. Security & Architectural Risk Assessment

1. **JWT & Refresh Token Architecture:** Completely untouched. Access tokens remain 15-minute cryptographically signed JWTs; refresh tokens remain HttpOnly, SameSite, Secure cookies rotated on the server with family replay detection.
2. **CSRF & CORS:** `X-Requested-With: XMLHttpRequest` and multi-origin CORS whitelist remain active on all requests.
3. **No Credential Exposure:** `localStorage` contains zero tokens, secrets, or user data.
4. **Final Evaluation:** **`VERIFIED LOCALLY`**
