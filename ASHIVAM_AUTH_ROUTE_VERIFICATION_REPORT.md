# ASHIVAM TECHNOLOGIES — AUTHENTICATION ROUTE & HTTP METHOD VERIFICATION REPORT

**Company:** Ashivam Technologies ("Endless Innovation. Limitless Possibilities.")  
**Headquarters:** Agra, Uttar Pradesh, India  
**Workspace:** `C:\Users\DELL\Desktop\Official-Website-main`  
**Production Frontend:** `https://ashivam-tec-h.vercel.app` (Vercel)  
**Production Backend:** `https://ashivam-tech.onrender.com/api/v1` (Render)  
**Verified Commit:** `c26be86` (`feat(auth): return HTTP 405 Method Not Allowed with Allow header for GET requests on auth actions`)  
**Evaluation Date:** October 31, 2026  
**Auditor Roles:** Principal Software Architect, Senior Backend Engineer, Application Security Engineer, QA Automation Engineer  

---

## 1. Executive Summary

This independent audit verifies the HTTP 405 Method Not Allowed route implementation deployed in commit `c26be86` across both local staging and live production environments. 

Previously, when clients or browser navigation bars issued an HTTP `GET` request directly to `/api/v1/auth/refresh`, Express fell through to the catch-all `notFoundHandler`, returning `404 Not Found` with message `Route not found: GET /api/v1/auth/refresh`.

In commit `c26be86`, explicit route handlers were introduced in `backend/src/modules/auth/auth.routes.js` for `GET /login`, `GET /refresh`, and `GET /logout`. These handlers return HTTP `405 Method Not Allowed`, set the required RFC 9110 compliant `Allow: POST` HTTP header, provide clear guidance in the JSON envelope, and preserve the correlation `requestId`.

This verification rigorously confirms:
1. Router mounting in `backend/src/app.js` is correct, solitary, and conflict-free.
2. The HTTP 405 handlers correctly reject GET attempts while preserving POST functionality and rate limiting.
3. Express CORS preflight (`OPTIONS`) handling precedes route registration and is completely unintercepted by the 405 handlers.
4. The frontend (`src/api.js` and `src/context/AuthContext.jsx`) exclusively issues POST requests for authentication actions with credentials and prevents infinite refresh loops.
5. Live production on Render is operational, healthy, and serving the verified `c26be86` behavior.

---

## 2. Router Registration & Mounting Audit

| Architectural Check | File & Line Reference | Verification Detail | Status |
|---|---|---|---|
| Active Router Module | [`backend/src/modules/auth/auth.routes.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/modules/auth/auth.routes.js#L1-L57) | Contains explicit `router.post` and `router.get` definitions for `/login`, `/refresh`, and `/logout`. | `VERIFIED LOCALLY` |
| Application Router Mount | [`backend/src/app.js:254`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/app.js#L254) | `app.use("/api/v1/auth", authRoutes);` | `VERIFIED LOCALLY` |
| Conflicting/Duplicate Routers | Entire codebase search across `backend/src` | No duplicate `/auth` routers, duplicate path prefixes, or conflicting catch-alls exist. | `VERIFIED LOCALLY` |
| POST Handler Integrity | `auth.routes.js:20,31,42` | `router.post("/login", loginLimiter, login)`, `router.post("/refresh", refreshLimiter, refreshToken)`, `router.post("/logout", logout)` retain their exact controller and rate-limiter middleware. | `VERIFIED LOCALLY` |
| Authenticated Sub-routes | `auth.routes.js:53,55` | `GET /me` (with `authenticate`) and `POST /change-password` (with `authenticate`, `passwordChangeLimiter`) remain active and guarded. | `VERIFIED LOCALLY` |

---

## 3. HTTP Method & Endpoint Verification Matrix

Each test scenario was evaluated both locally via Supertest against the running Express application and against the live Render production backend (`https://ashivam-tech.onrender.com/api/v1`).

| Endpoint | Method | Expected Status & Headers | Local Execution Result | Production Execution Result | Final Status |
|---|---|---|---|---|---|
| `/api/v1/auth/refresh` | `GET` | **405 Method Not Allowed**<br>`Allow: POST`<br>`success: false`<br>`requestId` present | HTTP 405<br>`Allow: POST`<br>`requestId: aae0baf2-...`<br>Message: *"HTTP GET is not supported on /api/v1/auth/refresh. Token refresh requires an HTTP POST request with credentials."* | HTTP 405<br>`Allow: POST`<br>`requestId: 941f0186-...`<br>Message: *"HTTP GET is not supported on /api/v1/auth/refresh. Token refresh requires an HTTP POST request with credentials."* | `VERIFIED IN PRODUCTION` |
| `/api/v1/auth/refresh` | `POST` (no cookie) | **401 Unauthorized**<br>`success: false` | HTTP 401<br>`requestId: 220b2486-...`<br>Message: *"Refresh token is missing from cookie or request body"* | HTTP 401<br>`requestId: 0ef6d729-...`<br>Message: *"Refresh token is missing from cookie or request body"* | `VERIFIED IN PRODUCTION` |
| `/api/v1/auth/login` | `GET` | **405 Method Not Allowed**<br>`Allow: POST`<br>`success: false`<br>`requestId` present | HTTP 405<br>`Allow: POST`<br>`requestId: b192faf3-...`<br>Message: *"HTTP GET is not supported on /api/v1/auth/login. Authentication requires an HTTP POST request with credentials."* | HTTP 405<br>`Allow: POST`<br>`requestId: bddbe31d-...`<br>Message: *"HTTP GET is not supported on /api/v1/auth/login. Authentication requires an HTTP POST request with credentials."* | `VERIFIED IN PRODUCTION` |
| `/api/v1/auth/login` | `POST` (invalid creds) | **401 Unauthorized**<br>`success: false` | HTTP 401<br>`requestId: 01fd09a1-...`<br>Message: *"Invalid credentials"* | HTTP 401<br>`requestId: cd5ae0f6-...`<br>Message: *"Invalid credentials"* | `VERIFIED IN PRODUCTION` |
| `/api/v1/auth/me` | `GET` (unauthenticated) | **401 Unauthorized**<br>`success: false` | HTTP 401<br>`requestId: 042fa3ba-...`<br>Message: *"Authentication required"* | HTTP 401<br>`requestId: e008ff30-...`<br>Message: *"Authentication required"* | `VERIFIED IN PRODUCTION` |
| `/api/v1/auth/refresh` | `OPTIONS` (CORS Preflight) | **204 No Content**<br>`Access-Control-Allow-Origin`<br>`Access-Control-Allow-Methods`<br>Not 405 | HTTP 204<br>`access-control-allow-origin: https://ashivam-tec-h.vercel.app`<br>`access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS` | HTTP 204<br>`access-control-allow-origin: https://ashivam-tec-h.vercel.app`<br>`access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS` | `VERIFIED IN PRODUCTION` |
| `/api/v1/auth/logout` | `GET` | **405 Method Not Allowed**<br>`Allow: POST`<br>`success: false`<br>`requestId` present | HTTP 405<br>`Allow: POST`<br>`requestId: 11015df7-...`<br>Message: *"HTTP GET is not supported on /api/v1/auth/logout. Session termination requires an HTTP POST request."* | HTTP 405<br>`Allow: POST`<br>`requestId: cad1e31c-...`<br>Message: *"HTTP GET is not supported on /api/v1/auth/logout. Session termination requires an HTTP POST request."* | `VERIFIED IN PRODUCTION` |

---

## 4. CORS Preflight & Route Ordering Analysis

A critical question addressed during verification is whether adding `router.get("/refresh", ...)` interferes with browser CORS preflight requests (`OPTIONS /api/v1/auth/refresh`).

### Architectural Evidence
In [`backend/src/app.js`](file:///C:/Users/DELL/Desktop/Official-Website-main/backend/src/app.js):
1. **Line 98–133:** `cors(corsOptions)` is mounted globally:
   ```javascript
   app.use(cors(corsOptions));
   ```
2. **Line 254:** The auth router is mounted later in the middleware pipeline:
   ```javascript
   app.use("/api/v1/auth", authRoutes);
   ```
3. **Execution Mechanics:** When the browser issues an `OPTIONS` preflight request, the `cors` middleware processes the request immediately at line 133, emits the `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` response headers, and terminates the response with HTTP `204 No Content`. The pipeline does not invoke `next()`, so the request never reaches `authRoutes`.
4. **Live Verification:** 
   ```bash
   OPTIONS https://ashivam-tech.onrender.com/api/v1/auth/refresh
   Origin: https://ashivam-tec-h.vercel.app
   Access-Control-Request-Method: POST
   ```
   Yields:
   - **Status:** `204 No Content`
   - **Access-Control-Allow-Origin:** `https://ashivam-tec-h.vercel.app`
   - **Access-Control-Allow-Credentials:** `true`
   - **Access-Control-Allow-Methods:** `GET,POST,PUT,PATCH,DELETE,OPTIONS`
   - **Allow Header:** `null` (Confirms 405 handler was not invoked)

**Status:** `VERIFIED IN PRODUCTION`

---

## 5. Frontend Integration & Refresh Safety Audit

We audited frontend token refresh execution and error handling to ensure no regressions, phantom requests, or infinite retry loops exist.

### 5.1 HTTP Method & Cookie Ingestion (`src/api.js`)
- **Inspection of lines 49–70:**
  ```javascript
  const runFetchRefresh = async () => {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });
      ...
  ```
  - **HTTP Method:** Strictly `POST`.
  - **Credentials:** Strictly `'include'`, ensuring the HttpOnly `refreshToken` cookie is transmitted in cross-origin requests to Render.
  - **Header:** Contains `X-Requested-With: XMLHttpRequest` satisfying CSRF defense.
  - **Status:** `VERIFIED LOCALLY`

### 5.2 Infinite Refresh Loop Defense (`src/api.js`)
- **Inspection of lines 182–214:**
  ```javascript
  if (!response.ok) {
    if (
      response.status === 401 &&
      token &&
      path !== '/auth/login' &&
      path !== '/auth/refresh'
    ) {
      try {
        const refreshJson = await executeTokenRefresh();
        ...
  ```
  - **Guard:** Explicit condition `path !== '/auth/refresh'` prevents the refresh handler from recursively calling itself when `/auth/refresh` itself returns `401 Unauthorized`.
  - **Single-Flight Concurrency:** Deduplicated by `refreshInFlightPromise` and synchronized across browser tabs via Web Locks (`navigator.locks.request('ashivam_auth_refresh_lock')`).
  - **Status:** `VERIFIED LOCALLY`

### 5.3 Silent Session Restoration (`src/context/AuthContext.jsx`)
- **Inspection of lines 21–44:**
  ```javascript
  const verifySession = useCallback(async () => {
    const activeToken = getToken();
    if (!activeToken) {
      try {
        const refreshRes = await refreshSession();
        if (refreshRes?.data?.accessToken) {
          ...
        }
      } catch {
        // No active refresh session exists
      }
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }
  ```
  - **Behavior:** When an unauthenticated visitor loads the site, `refreshSession()` issues `POST /api/v1/auth/refresh` without a cookie. The server returns `401 Unauthorized`.
  - **Error Trapping:** The `catch` block cleanly absorbs the 401 exception without logging unhandled promise rejections or displaying disruptive error toasts to visitors.
  - **Status:** `VERIFIED LOCALLY`

---

## 6. Automated Test Suite Results

| Test Suite | Commands Executed | Result | Details | Status |
|---|---|---|---|---|
| Backend Test Suite | `npm test --prefix backend` | **236/236 passed** (100%) | Includes 4 new automated tests covering `GET /refresh`, `GET /login`, `GET /logout` 405 validation and OPTIONS preflight. | `VERIFIED LOCALLY` |
| Frontend Unit Suite | `npm test` | **77/77 passed** (100%) | Routing, ErrorBoundary, API interceptors, responsive viewport rules, and SEO schemas verified. | `VERIFIED LOCALLY` |
| Browser E2E Suite | `npm run test:e2e` | **19/19 passed** (100%) | Playwright browser scenarios covering auth, multi-tab Web Locks, replay attack detection, CSRF, and CORS isolation. | `VERIFIED LOCALLY` |
| Frontend Production Build | `npm run build` | **102 modules transformed, 0 errors** | Vite v8.3.4 compiled cleanly to `dist/`. | `VERIFIED LOCALLY` |

---

## 7. Production Infrastructure Verification

| Service | Hostname | Component | Probe Result | Status |
|---|---|---|---|---|
| Frontend CDN | `https://ashivam-tec-h.vercel.app` | Vercel Edge CDN | HTTP 200 OK | `VERIFIED IN PRODUCTION` |
| Backend API | `https://ashivam-tech.onrender.com/api/v1` | Render Web Service | HTTP 200 OK (Database connected, healthy) | `VERIFIED IN PRODUCTION` |
| Auth 405 Handlers | `https://ashivam-tech.onrender.com/api/v1/auth/refresh` | Express Container | HTTP 405 Method Not Allowed (`Allow: POST`) | `VERIFIED IN PRODUCTION` |
| CORS Preflight | `https://ashivam-tech.onrender.com/api/v1/auth/refresh` | Express CORS Engine | HTTP 204 No Content (`Access-Control-Allow-Origin: https://ashivam-tec-h.vercel.app`) | `VERIFIED IN PRODUCTION` |

---

## 8. Conclusion & Sign-Off

All objectives defined in the prompt have been verified:
1. The Express route fix returning HTTP 405 Method Not Allowed with an `Allow: POST` header is active, operational, and verified both locally and in live production.
2. The route fix has introduced **zero regressions** into authentication, CORS preflights, or token lifecycle mechanics.
3. Automated unit and integration test coverage has been expanded and verified (236 backend tests, 77 frontend tests, 19 Playwright scenarios passing).
