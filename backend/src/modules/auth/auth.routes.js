import { Router } from "express";

import {
  login,
  getCurrentAdmin,
} from "./auth.controller.js";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { loginLimiter } from "../../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/login", loginLimiter, login);

router.get("/me", authenticate, getCurrentAdmin);

export default router;