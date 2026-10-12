import rateLimit from "express-rate-limit";
import env from "../config/env.js";

/**
 * Identifies infrastructure health probes and discovery paths.
 * These endpoints have isolated rate limits so that continuous platform health checks
 * (Render, Kubernetes, ping monitors) do not exhaust general client API budgets.
 */
export const isHealthOrDiscoveryPath = (path = "") => {
  return (
    path.startsWith("/api/v1/health") ||
    path === "/health" ||
    path === "/" ||
    path === "/api/v1" ||
    path === "/api/v1/"
  );
};

/**
 * Factory for structured, predictable 429 JSON responses compliant with API envelope contract.
 */
export const createRateLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    message,
    errors: {},
    requestId: req.id,
  });
};

/*
 * Dedicated, permissive rate limiter for infrastructure health checks & monitoring probes.
 * Prevents continuous platform polling (e.g. Render, uptime monitors) from exhausting
 * general API budgets, while maintaining DoS defenses.
 */
export const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: env.isTest ? 10000 : 300, // 300 requests/minute (5 requests/sec is ample for multi-region health checks)
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Health check rate limit exceeded."),
});

/*
 * Global rate limiter across all endpoints.
 * Skips infrastructure health probes and discovery roots so they have their own dedicated budget.
 */
export const globalLimiter = rateLimit({
  windowMs: env.globalRateWindowMs || 15 * 60 * 1000,
  limit: env.isTest ? 10000 : (env.globalRateLimit || 100),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isHealthOrDiscoveryPath(req.path),
  handler: createRateLimitHandler("Too many requests from this IP. Please try again later."),
});

/*
 * Brute-force protection for the admin login. Only failed attempts
 * count, so legitimate admins are not locked out by successful logins.
 */
export const loginLimiter = rateLimit({
  windowMs: env.loginRateWindowMs || 15 * 60 * 1000,
  limit: env.isTest ? 50 : (env.loginRateLimit || 5),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many login attempts. Please try again later."),
});

/*
 * Abuse protection for public (unauthenticated) form endpoints
 * (inquiries, job applications, internship registrations).
 */
export const publicFormLimiter = rateLimit({
  windowMs: env.publicFormRateWindowMs || 15 * 60 * 1000,
  limit: env.isTest ? 100 : (env.publicFormRateLimit || 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many submissions. Please try again later."),
});
