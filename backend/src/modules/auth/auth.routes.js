import { Router } from "express";

import {
  login,
  getCurrentAdmin,
  changePassword,
  refreshToken,
  logout,
} from "./auth.controller.js";

import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  loginLimiter,
  refreshLimiter,
  passwordChangeLimiter,
} from "../../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/login", loginLimiter, login);

router.post("/refresh", refreshLimiter, refreshToken);

router.post("/logout", logout);

router.get("/me", authenticate, getCurrentAdmin);

router.post("/change-password", authenticate, passwordChangeLimiter, changePassword);

export default router;