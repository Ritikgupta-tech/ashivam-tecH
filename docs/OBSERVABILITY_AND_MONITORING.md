# Ashivam Technologies — Observability, Monitoring & Health Probes

## 1. Request Correlation & Distributed Tracing
1. **Correlation Header (`X-Request-Id`):**
   - Automatically generated as a UUID v4 if absent on incoming requests.
   - Echoed back on all HTTP responses via `X-Request-Id`.
   - Propagated through all application logs and error responses.
2. **Standardized Error Envelope:**
   ```json
   {
     "success": false,
     "message": "Human readable explanation",
     "statusCode": 400,
     "requestId": "c37f05bb-c28e-470e-9add-422ee75369ec"
   }
   ```

---

## 2. Health & Readiness Probes
The backend exposes dedicated probe endpoints configured for container schedulers (Render / Kubernetes):
- `GET /health` and `GET /api/v1/health`:
  Returns 200 OK with runtime status, environment, version, and uptime duration.
- `GET /api/v1/health/liveness`:
  Ultra-fast liveness check confirming the Node event loop is responsive.
- `GET /api/v1/health/readiness`:
  Deep readiness probe confirming active MongoDB database connection and operational storage transport before allowing traffic routing.

---

## 3. Structured Logging & Sensitive Data Masking
- **CRLF Defense:** Strips `\r` and `\n` to prevent log injection or log splitting.
- **Credential Masking:** Automatically sanitizes passwords, bearer tokens, refresh cookies, and authorization headers (`***REDACTED***`).
- **Timing Metrics:** Automatically records execution duration in milliseconds for every API transaction (`duration: "14.86ms"`).
