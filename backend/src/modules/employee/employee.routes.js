import { Router } from "express";

import {
  list,
  publicList,
  getById,
  create,
  update,
  updateStatus,
  remove,
  departments,
  designations,
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

router.get("/", ...adminAccess, list);

router.get("/:employeeId", ...adminAccess, getById);

router.post("/", ...adminAccess, create);

router.patch("/:employeeId", ...adminAccess, update);

router.patch("/:employeeId/status", ...adminAccess, updateStatus);

router.delete("/:employeeId", ...superadminAccess, remove);

export default router;