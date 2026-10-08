import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { publicFormLimiter } from "../../middlewares/rateLimit.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

import {
  create,
  getAll,
  getOne,
  update,
  remove,
} from "./internship.controller.js";

const router = Router();

/*
 * Internship applications are part of the talent pipeline, so they use
 * the existing "careers" permission rather than introducing a new one.
 */
const adminAccess = [
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
];

const superadminAccess = [
  authenticate,
  requireRole("Superadmin"),
  requirePermission("careers"),
];

/*
 * Public
 * Internship application form submission
 */
router.post("/", publicFormLimiter, create);

/*
 * Admin management
 */
router.get("/", ...adminAccess, getAll);

router.get("/:id", ...adminAccess, getOne);

router.patch("/:id", ...adminAccess, update);

router.delete("/:id", ...superadminAccess, remove);

export default router;
