import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

import {
  getAuditLogs,
  getAuditLog,
  removeAuditLog,
  removeAuditLogs,
} from "./audit.controller.js";

import {
  validateAuditQuery,
  validateAuditId,
  validateClearLogs,
} from "./audit.validator.js";

const router = Router();

router.use(authenticate);
router.use(requireRole("Superadmin", "Admin"));
router.use(requirePermission("audit"));

router.get(
  "/",
  validateAuditQuery,
  getAuditLogs
);

router.get(
  "/:id",
  validateAuditId,
  getAuditLog
);

router.delete(
  "/:id",
  requireRole("Superadmin"),
  validateAuditId,
  removeAuditLog
);

router.delete(
  "/",
  requireRole("Superadmin"),
  validateClearLogs,
  removeAuditLogs
);

export default router;