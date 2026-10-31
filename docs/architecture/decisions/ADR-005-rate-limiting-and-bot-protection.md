# ADR-005: Multi-Tier Rate Limiting, Proxy Trust, and Bot Defense

## Status
Accepted

## Context
As a public corporate website and administrative platform, Ashivam Technologies faces threats from credential stuffing, brute-force attacks, submission spam, and DoS attempts on expensive endpoints.

Furthermore, deploying behind cloud reverse proxies (Render, Cloudflare, Vercel) requires careful IP resolution. Without proper reverse proxy configuration, all incoming requests appear to originate from the proxy's internal IP address, which could either cause global rate-limit lockouts for all legitimate users or allow attackers to bypass IP-based limits.

## Decision
1. **Express Proxy Trust Configuration:**
   Explicitly configure `app.set("trust proxy", env.isProd ? 1 : 1)` to trust only the immediate upstream reverse proxy hop, accurately extracting the genuine client IP from `X-Forwarded-For` without being susceptible to client header spoofing.
2. **Multi-Tier Rate Limiting Architecture:**
   - **Global Baseline Limiter (`apiLimiter`):** 100 requests per 15 minutes per IP across all general `/api/v1/` routes.
   - **Auth Brute-Force Limiter (`authLimiter`):** 10 requests per 15 minutes per IP on `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, and password reset endpoints.
   - **Inquiry Submission Limiter (`inquiryLimiter`):** 5 requests per 15 minutes per IP on `/api/v1/inquiries`.
   - **Application Submission Limiter (`applicationLimiter`):** 5 submissions per 15 minutes per IP on career and internship application endpoints.
   - **Health Probe & Discovery Bypass:** Infrastructure probes (`/health`, `/api/v1/health`, `/api/v1/health/liveness`, `/robots.txt`, `/sitemap.xml`) are strictly exempt from rate limiting to prevent uptime monitoring false-positives.
3. **Multi-Layer Anti-Bot Defenses:**
   - **Honeypot Fields:** Invisible form fields (`website`, `company_url`) trap automated scrapers and bots that fill all inputs. If populated, requests are silently absorbed or rejected.
   - **Input Sanitization & Injection Defense:** All strings are stripped of CRLF characters, HTML tags, and null bytes before processing.
   - **In-Flight & Persistent Deduplication:** Concurrent identical double-clicks are absorbed via in-memory lock maps and 60-second database lookups.

## Consequences
### Positive
- Robust defense against automated credential stuffing, brute force, and form spam.
- Accurate client IP tracking behind Render and Vercel reverse proxies.
- Zero impact on uptime monitoring or container health probes.

### Negative / Trade-offs
- In-memory rate limiting counters reset when the server restarts or scales horizontally (sufficient for single-node container deployment; scalable to distributed Redis storage if multi-instance cluster is introduced).
