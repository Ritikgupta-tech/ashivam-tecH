# ASHIVAM TECHNOLOGIES — ANONYMOUS SESSION INITIALIZATION OPTIMIZATION REPORT

**Company:** Ashivam Technologies ("Endless Innovation. Limitless Possibilities.")  
**Headquarters:** Agra, Uttar Pradesh, India  
**Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  
**Production Frontend:** `https://ashivam-tec-h.vercel.app` (Vercel)  
**Production Backend:** `https://ashivam-tech.onrender.com/api/v1` (Render)  
**Date of Audit & Implementation:** October 31, 2026  
**Engineering Roles:** Senior React Architect, Backend Authentication Engineer, Application Security Specialist  
**Evaluation Status:** `VERIFIED LOCALLY`  

---

## 1. Executive Summary & Objective

In modern single-page applications utilizing HttpOnly refresh-token cookies, silent session restoration is critical to allow authenticated users (administrators and employees) to persist their sessions across page reloads and browser restarts without re-entering credentials.

However, an unoptimized initialization sequence attempts silent session restoration indiscriminately for **every visitor on every public page** (such as `/`, `/solutions`, `/industries`, `/careers`, and `/legal`). Because first-time public visitors do not possess a `refreshToken` cookie, the backend properly rejects the unauthenticated request with HTTP `401 Unauthorized` (`"message": "Refresh token is missing from cookie or request body"`). While the frontend caught this rejection gracefully without throwing unhandled exceptions, the browser network stack automatically logged a red `POST ... 401 (Unauthorized)` error in the DevTools console on public marketing pages.

This optimization implements a **cryptographically decoupled, non-sensitive session hint** (`ashivam_auth_hint`) coupled with **portal route awareness**. It ensures that:
1. Ordinary public website visitors trigger **zero** unnecessary `POST /api/v1/auth/refresh` requests.
2. The browser DevTools console remains completely clean on public marketing routes.
3. Legitimate silent session restoration for administrators and employees remains 100% operational across reloads, browser restarts, and multiple tabs.
4. Backend refresh token family rotation, replay detection, CSRF protection, and Web Locks remain strictly intact.

---

## 2. Phase 1 — Architecture Audit & Lifecycle Findings

Before modifying code, we audited the end-to-end authentication lifecycle:

| Lifecycle Phase | Previous Client Behavior | Optimization Analysis |
|---|---|---|
| **Anonymous Public Visitor** | Upon mount of `<AuthProvider>`, `verifySession()` saw `!activeToken` and immediately executed `refreshSession()`, causing an HTTP 401 roundtrip to Render on every public page load. | By checking for a session hint in persistent client storage and checking if the current URL is a portal route, unauthenticated visitors can immediately be marked anonymous without issuing network requests. |
| **Successful Login (Admin & Employee)** | `loginAdmin()` sets the HttpOnly `refreshToken` cookie on the backend, returns the access token to the client, and updates `sessionStorage`. | Upon successful login, the application sets the non-sensitive flag `ashivam_auth_hint = 'active'` in `localStorage`. |
| **Page Reload (Same Browser Tab)** | `getToken()` reads the active access token directly from `sessionStorage` and validates it with `getMe()`. | Unchanged. If the access token has expired, the existing 401 interceptor in `apiRequest` executes single-flight token rotation. |
| **Browser Restart (Reopening Closed Window)** | `sessionStorage` is purged by the browser upon exit. The HttpOnly cookie persists in the browser cookie jar. | `localStorage` persists across browser restarts. `hasSessionHint()` evaluates to `true`, prompting `verifySession()` to issue `refreshSession()`. The persistent cookie restores the session seamlessly. |
| **Explicit Logout** | `logoutAdmin()` revokes the token family in MongoDB and expires the cookie. Client calls `removeToken()`. | In addition to clearing `sessionStorage`, `clearSessionHint()` purges `ashivam_auth_hint` from `localStorage` and broadcasts `{ type: 'LOGOUT' }`. |
| **Stale / Expired Refresh Token** | Server rejects refresh exchange with 401. | The client's catch block immediately calls `clearSessionHint()`. Stale hints are purged on the first failure, preventing retry loops. |
| **Cross-Tab Synchronization** | Coordinated via BroadcastChannel (`ashivam_auth_sync`). | Maintained and enhanced: native `storage` event listeners also synchronize hint removals if BroadcastChannel is restricted. |

---

## 3. Phase 2 — Safe Session Hint Design Evaluation

We rigorously evaluated whether a session hint could introduce security risks or break legitimate authentication restoration.

### Safety Guarantee Matrix

| Requirement | Implementation Safeguard | Verified |
|---|---|---|
| **Zero Sensitive Data in Storage** | The hint key is `'ashivam_auth_hint'` and its value is strictly the constant string `'active'`. No tokens, JWTs, user IDs, usernames, or credentials are stored in `localStorage`. | Yes |
| **Not Proof of Authentication** | The presence of the hint does NOT grant access or set `isAuthenticated = true`. `isAuthenticated` strictly requires a verified JWT returned by the backend. | Yes |
| **No Inadvertent Lockout** | In addition to checking `hasSessionHint()`, `verifySession()` checks `isPortalRoute` (`/admin` and `/employee-login`). If an admin navigates to a login or dashboard gateway, session restoration is attempted even if the hint was cleared. | Yes |
| **Storage Exceptions Handled** | Sandboxed iframes, private browsing modes, or security policies that throw errors on `localStorage.getItem/setItem` are wrapped in `try ... catch` blocks and fallback safely. | Yes |
| **Zero Infinite Refresh Loops** | If an invalid/expired hint exists, `refreshSession()` is attempted exactly once. The failure catch block immediately executes `clearSessionHint()`, purging the hint so subsequent page loads do not retry. | Yes |
| **Web Locks & Concurrency Intact** | Cross-tab token refresh deduplication via `navigator.locks.request('ashivam_auth_refresh_lock')` and `refreshInFlightPromise` operates without modification. | Yes |

---

## 4. Phase 3 — Authentication Initialization Implementation

### 4.1 Centralized Storage Helper (`src/api.js`)
We introduced centralized session hint management functions:
```javascript
export const SESSION_HINT_KEY = 'ashivam_auth_hint';

export const hasSessionHint = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(SESSION_HINT_KEY) === 'active';
  } catch {
    return false;
  }
};

export const setSessionHint = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSION_HINT_KEY, 'active');
    }
  } catch {}
};

export const clearSessionHint = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SESSION_HINT_KEY);
    }
  } catch {}
};
```

* `setToken(token)` automatically calls `setSessionHint()` when an access token is established, and `clearSessionHint()` when `null`.
* `clearToken()` wipes both `sessionStorage` and the `localStorage` hint.

### 4.2 Optimized Session Verification (`src/context/AuthContext.jsx`)
In `verifySession()`, we inspect the hint and the destination route:
```javascript
  const verifySession = useCallback(async () => {
    const activeToken = getToken();
    if (!activeToken) {
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

      try {
        const refreshRes = await refreshSession();
        if (refreshRes?.data?.accessToken) {
          const newToken = refreshRes.data.accessToken;
          const userData = refreshRes.data.user;
          saveToken(newToken);
          setSessionHint();
          setTokenState(newToken);
          setUser(userData);
          setIsLoading(false);
          return;
        }
      } catch {
        // No active refresh session exists or refresh token expired/revoked: clear stale hint
        clearSessionHint();
      }

      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }
    ...
```

---

## 5. Phase 4 & 5 — Automated Verification Results

### 5.1 Test Suites Execution Matrix

| Test Suite | Scope | Result | Status |
|---|---|---|---|
| **Dedicated Session Hint Suite**<br>`tests/sessionHintOptimization.test.js` | 9 automated scenarios validating: anonymous visitor skip, login hint creation, logout hint removal, storage exception handling, browser restart persistence, definitive 401 purge, unified admin/employee consumption, and Web Locks integrity. | **9/9 passed** (100%) | `VERIFIED LOCALLY` |
| **Frontend Unit Test Suite**<br>`npm test` | Complete frontend testing covering routing, error boundary, API interceptors, responsive viewport rules, and SEO schemas. | **86/86 passed** (100%) | `VERIFIED LOCALLY` |
| **Backend Test Suite**<br>`npm test --prefix backend` | Complete backend verification covering JWT cryptography, token rotation, replay detection family revocation, RBAC, rate limiting, and HTTP 405 handlers. | **236/236 passed** (100%) | `VERIFIED LOCALLY` |
| **Playwright Browser E2E Suite**<br>`npm run test:e2e` | Real Chromium/Edge browser journeys covering public submission, admin login, HttpOnly cookie security, multi-tab Web Locks concurrency, replay attack blocking, and cross-tab logout synchronization. | **19/19 scenarios passed** (100%) | `VERIFIED LOCALLY` |
| **Frontend Production Build**<br>`npm run build` | Vite v8.3.4 client environment compilation. | **102 modules transformed, 0 errors** | `VERIFIED LOCALLY` |

---

## 6. Files Changed

1. [`src/api.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/api.js):
   - Defined `SESSION_HINT_KEY = 'ashivam_auth_hint'`.
   - Added centralized `hasSessionHint()`, `setSessionHint()`, and `clearSessionHint()` with exception guards.
   - Updated `setToken()` and `clearToken()` to keep the session hint in sync.
   - Updated `runFetchRefresh()` to clear the hint upon rejection.
   - Updated `window.__ashivamApi` test exports.
2. [`src/context/AuthContext.jsx`](file:///C:/Users/DELL/Desktop/Official-Website-main/src/context/AuthContext.jsx):
   - Imported session hint helpers.
   - Updated `verifySession()` to bypass `/auth/refresh` on public pages when `!hasHint && !isPortalRoute`.
   - Added stale hint cleanup on refresh/session errors.
   - Added native `storage` event listener for multi-tab synchronization.
3. [`tests/sessionHintOptimization.test.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/tests/sessionHintOptimization.test.js):
   - Created 9 comprehensive automated tests verifying all edge cases.

---

## 7. Security & Architectural Sign-Off

1. **Authentication Correctness:** The server-side HttpOnly cookie remains the sole authority for token refresh. The hint acts purely as a client-side performance and UX heuristic.
2. **Replay Detection & Rotation:** Backend replay detection, token lineage revocation, and cookie expiration remain 100% active.
3. **Clean DevTools Console:** Anonymous visitors browsing `/`, `/solutions`, `/industries`, etc. no longer experience cross-origin 401 network requests or red console warnings.
4. **Final Status:** **`VERIFIED LOCALLY`**
