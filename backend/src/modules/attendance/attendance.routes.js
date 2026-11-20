import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/authorization.middleware.js";
import {
  getMyAttendance,
  getMySummary,
  getMyCalendar,
  getUpcomingMeetings,
  getMeetingById,
  submitCorrectionRequest,
  getAdminAttendanceDashboard,
  getAdminAttendanceRecords,
  updateAdminAttendanceCorrection,
  getAdminCorrectionRequests,
  resolveAdminCorrectionRequest,
  exportAttendanceReport,
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  triggerReconciliation,
  getGoogleOAuthAuthorizeUrl,
  handleGoogleOAuthCallback,
  getGoogleIntegrationStatus,
  handlePubSubWebhook,
  triggerGlobalReconciliation,
  disconnectGoogleIntegrationController,
} from "./attendance.controller.js";

const router = Router();

// ==========================================
// EMPLOYEE ROUTES (Role: Employee, Admin, Superadmin)
// ==========================================
router.get("/my", authenticate, getMyAttendance);
router.get("/my/summary", authenticate, getMySummary);
router.get("/my/calendar", authenticate, getMyCalendar);
router.get("/meetings/upcoming", authenticate, getUpcomingMeetings);
router.get("/my/upcoming-meetings", authenticate, getUpcomingMeetings);
router.get("/meetings/:id", authenticate, getMeetingById);
router.post("/corrections", authenticate, submitCorrectionRequest);

// ==========================================
// ADMIN ROUTES (Role: Superadmin, Admin)
// ==========================================
router.get(
  "/admin/dashboard",
  authenticate,
  requireRole("Superadmin", "Admin"),
  getAdminAttendanceDashboard
);
router.get(
  "/admin/records",
  authenticate,
  requireRole("Superadmin", "Admin"),
  getAdminAttendanceRecords
);
router.patch(
  "/admin/records/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  updateAdminAttendanceCorrection
);
router.get(
  "/admin/corrections",
  authenticate,
  requireRole("Superadmin", "Admin"),
  getAdminCorrectionRequests
);
router.patch(
  "/admin/corrections/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  resolveAdminCorrectionRequest
);
router.get(
  "/admin/export",
  authenticate,
  requireRole("Superadmin", "Admin"),
  exportAttendanceReport
);
router.get(
  "/admin/meetings",
  authenticate,
  requireRole("Superadmin", "Admin"),
  listMeetings
);
router.post(
  "/admin/meetings",
  authenticate,
  requireRole("Superadmin", "Admin"),
  createMeeting
);
router.patch(
  "/admin/meetings/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  updateMeeting
);
router.delete(
  "/admin/meetings/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  deleteMeeting
);
router.post(
  "/admin/meetings/:id/reconcile",
  authenticate,
  requireRole("Superadmin", "Admin"),
  triggerReconciliation
);

// ==========================================
// GOOGLE INTEGRATION & PUBSUB ROUTES
// ==========================================
router.get(
  ["/oauth/authorize", "/google/oauth/authorize"],
  authenticate,
  requireRole("Superadmin"),
  getGoogleOAuthAuthorizeUrl
);
router.get(["/oauth/callback", "/google/oauth/callback"], handleGoogleOAuthCallback);
router.get(
  ["/integration/status", "/google/integration/status"],
  authenticate,
  requireRole("Superadmin", "Admin"),
  getGoogleIntegrationStatus
);
router.post(
  ["/integration/disconnect", "/google/integration/disconnect"],
  authenticate,
  requireRole("Superadmin"),
  disconnectGoogleIntegrationController
);
router.post(["/events/pubsub", "/google/events/pubsub"], handlePubSubWebhook);
router.post(
  ["/events/reconcile", "/google/events/reconcile"],
  authenticate,
  requireRole("Superadmin", "Admin"),
  triggerGlobalReconciliation
);

export default router;
