import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

import {
  getAdminSettings,
  updateAdminSettings,
  resetAdminSettings,
  getPublicWebsiteSettings,
} from "./settings.controller.js";

import {
  validateSettings,
} from "./settings.validator.js";

const router = Router();

/*
 * Public settings
 */
router.get(
  "/public",
  getPublicWebsiteSettings
);

/*
 * Protected admin settings
 */
router.use(authenticate);
router.use(
  requireRole("Superadmin", "Admin")
);
router.use(
  requirePermission("settings")
);

router.get(
  "/",
  getAdminSettings
);

router.put(
  "/",
  validateSettings,
  updateAdminSettings
);

router.post(
  "/reset",
  requireRole("Superadmin"),
  resetAdminSettings
);

export default router;