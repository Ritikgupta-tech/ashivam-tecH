import { Router } from "express";

import {
  overview,
  summary,
  recentActivity,
  stats,
} from "./dashboard.controller.js";

import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

const router = Router();

const dashboardAccess = [
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("dashboard"),
];

/*
 * Dashboard overview
 */
router.get("/overview", ...dashboardAccess, overview);

/*
 * Dashboard summary
 */
router.get("/summary", ...dashboardAccess, summary);

/*
 * Recent activity
 */
router.get("/recent-activity", ...dashboardAccess, recentActivity);

/*
 * Dashboard statistics
 */
router.get("/stats", ...dashboardAccess, stats);

export default router;