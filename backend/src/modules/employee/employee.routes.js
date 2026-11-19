import { Router } from "express";

import {
  list,
  publicList,
  getById,
  create,
  update,
  updateStatus,
  remove,
  restore,
  departments,
  designations,
  exportCsv,
  resendInvitation,
  updateAccountStatus,
  updateEmploymentStatus,
  adminResetPassword,
} from "./employee.controller.js";

import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

const router = Router();

/*
 * Public team endpoint
 */
router.get("/public", publicList);

/*
 * Admin employee management
 */
const adminAccess = [
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("employees"),
];

const superadminAccess = [
  authenticate,
  requireRole("Superadmin"),
  requirePermission("employees"),
];

router.get("/departments", ...adminAccess, departments);

router.get("/designations", ...adminAccess, designations);

router.get("/export", ...adminAccess, exportCsv);

router.get("/", ...adminAccess, list);

router.get("/:employeeId", ...adminAccess, getById);

router.post("/", ...adminAccess, create);

router.patch("/:employeeId", ...adminAccess, update);

router.patch("/:employeeId/status", ...adminAccess, updateStatus);

router.post("/:employeeId/resend-invitation", ...adminAccess, resendInvitation);

router.patch("/:employeeId/account-status", ...adminAccess, updateAccountStatus);

router.patch("/:employeeId/employment-status", ...adminAccess, updateEmploymentStatus);

router.post("/:employeeId/reset-password", ...adminAccess, adminResetPassword);

router.delete("/:employeeId", ...superadminAccess, remove);

router.patch("/:employeeId/restore", ...superadminAccess, restore);

export default router;