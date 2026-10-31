# ADR-006: Observability, Correlation Tracking, and Structured Logging

## Status
Accepted

## Context
Operating a production enterprise web platform requires real-time observability into request latencies, system errors, database query performance, and external service health.

Prior systems frequently suffered from log injection vulnerabilities (CRLF injection in headers or query parameters) and risk of secret leakage (printing passwords, session tokens, or API keys in standard error outputs). Additionally, correlating frontend API errors with backend logs was difficult without unique request identifiers.

## Decision
1. **Correlation IDs (`X-Request-Id`):**
   Every incoming HTTP request is assigned a unique UUID correlation identifier (`req.id`). If an incoming request provides an `X-Request-Id` header (from the frontend client or reverse proxy), it is validated, sanitized, and adopted. The correlation ID is included in all response headers and attached to every log record.
2. **Structured Logging with Sensitive Data Masking:**
   - Structured JSON logging in production environments, formatted with timestamp, correlation ID, HTTP method, route, duration, and status code.
   - **Sensitive Field Redaction:** Passwords, tokens, authorization headers, refresh cookies, and credit card numbers are automatically masked (`***REDACTED***`).
   - **CRLF Sanitization:** All log inputs are stripped of carriage returns (`\r`) and line feeds (`\n`) to prevent log forging and splitting attacks.
3. **Multi-Tier Health & Liveness Probes:**
   - `GET /health` and `GET /api/v1/health`: Returns 200 OK with server uptime, environment, and system status.
   - `GET /api/v1/health/liveness`: Lightweight Kubernetes / Render liveness probe.
   - `GET /api/v1/health/readiness`: Deep readiness check validating MongoDB connection status and external transport configuration before accepting traffic.

## Consequences
### Positive
- End-to-end request tracing across client and server logs via correlation IDs.
- Zero risk of secret exposure or credential leakage in cloud logging dashboards (Datadog, Render Logs).
- Production-grade health checks for zero-downtime rolling deploys.

### Negative / Trade-offs
- Slight formatting overhead on log generation (sub-millisecond JSON serialization).
