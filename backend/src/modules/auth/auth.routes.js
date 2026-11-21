import { Router } from "express";

import {
  login,
  getCurrentAdmin,
  changePassword,
  refreshToken,
  logout,
  verifyActivation,
  activate,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  getDevActivationLink,
} from "./auth.controller.js";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/authorization.middleware.js";
import env from "../../config/env.js";
import {
  loginLimiter,
  refreshLimiter,
  passwordChangeLimiter,
  authActionLimiter,
} from "../../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.get("/login", (req, res) => {
  res.setHeader("Allow", "POST");
  return res.status(405).json({
    success: false,
    message: "HTTP GET is not supported on /api/v1/auth/login. Authentication requires an HTTP POST request with credentials.",
    errors: {},
    requestId: req.id,
  });
});

router.post("/refresh", refreshLimiter, refreshToken);
router.get("/refresh", (req, res) => {
  res.setHeader("Allow", "POST");
  return res.status(405).json({
    success: false,
    message: "HTTP GET is not supported on /api/v1/auth/refresh. Token refresh requires an HTTP POST request with credentials.",
    errors: {},
    requestId: req.id,
  });
});

router.post("/logout", logout);
router.get("/logout", (req, res) => {
  res.setHeader("Allow", "POST");
  return res.status(405).json({
    success: false,
    message: "HTTP GET is not supported on /api/v1/auth/logout. Session termination requires an HTTP POST request.",
    errors: {},
    requestId: req.id,
  });
});

router.get("/me", authenticate, getCurrentAdmin);

router.post("/change-password", authenticate, passwordChangeLimiter, changePassword);

/*
 * Employee Account Activation & Password Recovery Endpoints
 */
router.get("/verify-activation-token", authActionLimiter, verifyActivation);
router.post("/activate", authActionLimiter, activate);
router.post("/forgot-password", authActionLimiter, forgotPassword);
router.get("/verify-reset-token", authActionLimiter, verifyResetToken);
router.post("/reset-password", authActionLimiter, resetPassword);

// Secure activation link recovery helper (Strictly Superadmin authenticated)
router.get("/dev/activation-link/:employeeId", authenticate, requireRole("Superadmin"), getDevActivationLink);

export default router;