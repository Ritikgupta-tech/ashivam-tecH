import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

import { publicFormLimiter } from "../../middlewares/rateLimit.middleware.js";

import {
  create,
  getAll,
  getOne,
  update,
  remove,
} from "./inquiry.controller.js";

const router = Router();

/*
 * Public
 * Contact / inquiry form submission
 */
router.post("/", publicFormLimiter, create);

/*
 * Admin management
 */
router.get(
  "/",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("inquiries"),
  getAll
);

router.get(
  "/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("inquiries"),
  getOne
);

router.patch(
  "/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("inquiries"),
  update
);

router.delete(
  "/:id",
  authenticate,
  requireRole("Superadmin"),
  requirePermission("inquiries"),
  remove
);

export default router;