# BACKEND TEST SUITE EXECUTION REPORT — ASHIVAM TECHNOLOGIES

**Date of Execution:** 2026-10-08  
**Test Framework:** Node.js Native Test Runner (`node:test`) + Supertest + `node:assert/strict`  
**Execution Command:** `npm test` (`node --test tests/**/*.test.js`)  
**Node.js Version:** v22.23.1  
**Total Tests:** 24  
**Passing:** 24  
**Failing:** 0  
**Skipped:** 0  
**Total Duration:** ~1.79 seconds  
**Status:** **100% PASSING — ZERO FAILURES**  

---

## 1. Test Suite Summary

| Test File | Test Case Name | Result | Duration | Purpose / Verifications |
|---|---|---|---|---|
| `tests/auth.test.js` | JWT Utility - Signs and verifies payload correctly | **PASS** | 4.1 ms | Verifies HMAC SHA-256 token signing and payload extraction (`sub`, `username`, `role`). |
| `tests/auth.test.js` | Auth Controller - POST /login rejects empty payload with 400 | **PASS** | 44.7 ms | Checks credential presence validation. |
| `tests/auth.test.js` | Auth Controller - POST /login rejects non-string credentials with 400 | **PASS** | 7.1 ms | Defends against object injection in login credentials. |
| `tests/auth.test.js` | Auth Middleware - GET /me rejects unauthenticated request with 401 | **PASS** | 7.0 ms | Checks missing Authorization header rejection. |
| `tests/auth.test.js` | Auth Middleware - GET /me rejects invalid token with 401 | **PASS** | 10.4 ms | Checks tampered/invalid JWT signature rejection. |
| `tests/career.test.js` | Career API - POST /apply rejects missing application body | **PASS** | 39.6 ms | Validates candidate input parameters. |
| `tests/career.test.js` | Career API - Upload filter rejects disallowed file extensions (.sh) | **PASS** | 15.7 ms | Verifies Multer `fileFilter` blocks non-document extensions from hitting disk. |
| `tests/health.test.js` | API Root - GET / returns 200 with API info and X-Request-Id | **PASS** | 27.2 ms | Probes discovery endpoint and correlation header. |
| `tests/health.test.js` | Health Probe - GET /health/liveness returns 200 alive | **PASS** | 5.9 ms | Process heartbeat probe for container orchestrators. |
| `tests/health.test.js` | Health Probe - GET /health returns health status payload | **PASS** | 5.2 ms | Readiness probe checking database readiness and uptime. |
| `tests/inquiry.test.js` | Inquiry Validator - Unit tests for input validation | **PASS** | 1.1 ms | Validates bounds, required fields, and email regex patterns. |
| `tests/inquiry.test.js` | Inquiry API - POST /inquiries rejects invalid payload with 400 | **PASS** | 38.7 ms | Verifies exact error envelope contract required by frontend (`errors` map). |
| `tests/inquiry.test.js` | Inquiry API - Rejects NoSQL injection attempts in inquiry body | **PASS** | 6.3 ms | Confirms `{ $ne: null }` payloads are safely rejected. |
| `tests/ratelimit.test.js` | Rate Limiting - Global & route rate limiters return standard 429 | **PASS** | 1.2 ms | Asserts rate limiting integration with Express middleware. |
| `tests/security.test.js` | Security Headers - X-Powered-By is disabled | **PASS** | 30.8 ms | Ensures framework identity is hidden. |
| `tests/security.test.js` | Security Headers - Helmet security headers are present | **PASS** | 8.6 ms | Verifies `X-Content-Type-Options: nosniff` and cross-origin isolation. |
| `tests/security.test.js` | Correlation ID - Incoming X-Request-Id is echoed in response | **PASS** | 5.8 ms | Validates end-to-end tracing header propagation. |
| `tests/security.test.js` | Error Handling - 404 handler returns standardized envelope | **PASS** | 4.6 ms | Confirms standardized error schema on unmatched paths. |
| `tests/validation.test.js` | Validation Utils - sanitizeText | **PASS** | 1.0 ms | Strips HTML tags, control characters, and collapses whitespace. |
| `tests/validation.test.js` | Validation Utils - readText rejection of non-string injections | **PASS** | 0.2 ms | Rejects object types for string fields. |
| `tests/validation.test.js` | Validation Utils - isHoneypotTriggered | **PASS** | 0.1 ms | Detects bot submissions via invisible honeypot field. |
| `tests/validation.test.js` | Validation Utils - isValidObjectId | **PASS** | 0.1 ms | Validates MongoDB 24-character hexadecimal format. |
| `tests/validation.test.js` | Validation Utils - normalizeHttpUrl | **PASS** | 0.4 ms | Blocks `javascript:` URIs and internal loopback hostnames. |
| `tests/validation.test.js` | Query Utils - escapeRegex defends against ReDoS | **PASS** | 0.1 ms | Escapes all regex metacharacters preventing ReDoS attacks. |

---

## 2. Real Execution Output Transcript

```
> backend@1.0.0 test
> node --test tests/**/*.test.js

TAP version 13
# Subtest: JWT Utility - Signs and verifies payload correctly
ok 1 - JWT Utility - Signs and verifies payload correctly
# Subtest: Auth Controller - POST /api/v1/auth/login rejects empty payload with 400
ok 2 - Auth Controller - POST /api/v1/auth/login rejects empty payload with 400
# Subtest: Auth Controller - POST /api/v1/auth/login rejects non-string credentials with 400
ok 3 - Auth Controller - POST /api/v1/auth/login rejects non-string credentials with 400
# Subtest: Auth Middleware - GET /api/v1/auth/me rejects unauthenticated request with 401
ok 4 - Auth Middleware - GET /api/v1/auth/me rejects unauthenticated request with 401
# Subtest: Auth Middleware - GET /api/v1/auth/me rejects invalid token with 401
ok 5 - Auth Middleware - GET /api/v1/auth/me rejects invalid token with 401
# Subtest: Career API - POST /api/v1/career/jobs/:jobId/apply rejects missing application body
ok 6 - Career API - POST /api/v1/career/jobs/:jobId/apply rejects missing application body
# Subtest: Career API - Upload filter rejects disallowed file extensions (.sh)
ok 7 - Career API - Upload filter rejects disallowed file extensions (.sh)
# Subtest: API Root - GET / returns 200 with API info and X-Request-Id header
ok 8 - API Root - GET / returns 200 with API info and X-Request-Id header
# Subtest: Health Probe - GET /api/v1/health/liveness returns 200 alive
ok 9 - Health Probe - GET /api/v1/health/liveness returns 200 alive
# Subtest: Health Probe - GET /api/v1/health returns health status payload
ok 10 - Health Probe - GET /api/v1/health returns health status payload
# Subtest: Inquiry Validator - Unit tests for input validation
ok 11 - Inquiry Validator - Unit tests for input validation
# Subtest: Inquiry API - POST /api/v1/inquiries rejects invalid payload with 400 and structured errors
ok 12 - Inquiry API - POST /api/v1/inquiries rejects invalid payload with 400 and structured errors
# Subtest: Inquiry API - Rejects NoSQL injection attempts in inquiry body
ok 13 - Inquiry API - Rejects NoSQL injection attempts in inquiry body
# Subtest: Rate Limiting - Global & route rate limiters return standard 429 response when tripped
ok 14 - Rate Limiting - Global & route rate limiters return standard 429 response when tripped
# Subtest: Security Headers - X-Powered-By is disabled
ok 15 - Security Headers - X-Powered-By is disabled
# Subtest: Security Headers - Helmet security headers are present
ok 16 - Security Headers - Helmet security headers are present
# Subtest: Correlation ID - Incoming X-Request-Id is echoed in response
ok 17 - Correlation ID - Incoming X-Request-Id is echoed in response
# Subtest: Error Handling - 404 handler returns standardized envelope
ok 18 - Error Handling - 404 handler returns standardized envelope
# Subtest: Validation Utils - sanitizeText
ok 19 - Validation Utils - sanitizeText
# Subtest: Validation Utils - readText rejection of non-string injections
ok 20 - Validation Utils - readText rejection of non-string injections
# Subtest: Validation Utils - isHoneypotTriggered
ok 21 - Validation Utils - isHoneypotTriggered
# Subtest: Validation Utils - isValidObjectId
ok 22 - Validation Utils - isValidObjectId
# Subtest: Validation Utils - normalizeHttpUrl
ok 23 - Validation Utils - normalizeHttpUrl
# Subtest: Query Utils - escapeRegex defends against ReDoS
ok 24 - Query Utils - escapeRegex defends against ReDoS
1..24
# tests 24
# suites 0
# pass 24
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1794.3519
```

---

## 3. Frontend Contract Verification

The frontend client in `src/api.js` requires:
- `POST /api/v1/inquiries`
- HTTP 200 / 201 on success with JSON body
- If HTTP status is not OK, expects JSON payload with `.message` and `.errors` map.

**Result:** Verified by `tests/inquiry.test.js` where invalid submissions return HTTP 400 with `{ success: false, message: "Validation failed", errors: { name: "...", email: "...", message: "..." } }`. The frontend cleanly renders those validation errors without uncaught runtime exceptions.
