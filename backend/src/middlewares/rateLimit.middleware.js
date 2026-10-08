import rateLimit from "express-rate-limit";
import env from "../config/env.js";

/*
 * Global rate limiter across all endpoints.
 */
export const globalLimiter = rateLimit({
  windowMs: env.globalRateWindowMs || 15 * 60 * 1000,
  limit: env.isTest ? 10000 : (env.globalRateLimit || 100),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP. Please try again later.",
    });
  },
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
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again later.",
    });
  },
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
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many submissions. Please try again later.",
    });
  },
});
