import { Router } from "express";

import {
  getAdmins,
  getAdminById,
  createAdminAccount,
  updateAdminAccount,
  changeAdminStatus,
  changeAdminRole,
  changeAdminPermissions,
  removeAdmin,
} from "./admin.controller.js";

import { authenticate } from "../../middlewares/auth.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

const router = Router();

/*
 * Admin dashboard
 * Accessible by Superadmin and Admin.
 */
router.get(
  "/dashboard",
  authenticate,
  requireRole("Superadmin", "Admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin dashboard access granted",
      data: {
        user: req.user,
      },
    });
  }
);

/*
 * Admin settings
 * Requires settings permission.
 */
router.get(
  "/settings",
  authenticate,
  requirePermission("settings"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Settings access granted",
    });
  }
);

/*
 * Admin Management
 * CRUD operations are Superadmin-only.
 */
router.use(authenticate);
router.use(requireRole("Superadmin"));

router.get("/", getAdmins);

router.get("/:id", getAdminById);

router.post("/", createAdminAccount);

router.patch("/:id", updateAdminAccount);

router.patch(
  "/:id/status",
  changeAdminStatus
);

router.patch(
  "/:id/role",
  changeAdminRole
);

router.patch(
  "/:id/permissions",
  changeAdminPermissions
);

router.delete("/:id", removeAdmin);

export default router;