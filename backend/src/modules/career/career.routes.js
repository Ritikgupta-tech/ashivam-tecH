import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { authenticate } from "../../middlewares/auth.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";
import { publicFormLimiter } from "../../middlewares/rateLimit.middleware.js";

import {
  getPublicJobs,
  getPublicJobById,
  createJobHandler,
  getAdminJobs,
  updateJobHandler,
  deleteJobHandler,
  applyForJob,
  getApplications,
  getApplication,
  updateApplicationHandler,
  deleteApplicationHandler,
  downloadApplicationResumeHandler,
} from "./career.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedExts = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedExts.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error("Only PDF, DOC and DOCX resumes are allowed");
      error.statusCode = 400;
      return cb(error);
    }

    cb(null, true);
  },
});

/*
 * Public career APIs
 */

router.get("/jobs", getPublicJobs);

router.get("/jobs/:id", getPublicJobById);

router.post(
  "/jobs/:jobId/apply",
  publicFormLimiter,
  upload.single("resume"),
  applyForJob
);

/*
 * Protected job management
 */

router.post(
  "/admin/jobs",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
  createJobHandler
);

router.get(
  "/admin/jobs",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
  getAdminJobs
);

router.patch(
  "/admin/jobs/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
  updateJobHandler
);

router.delete(
  "/admin/jobs/:id",
  authenticate,
  requireRole("Superadmin"),
  requirePermission("careers"),
  deleteJobHandler
);

/*
 * Protected application management
 */

router.get(
  "/admin/applications",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
  getApplications
);

router.get(
  "/admin/applications/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
  getApplication
);

router.get(
  "/admin/applications/:id/resume",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
  downloadApplicationResumeHandler
);

router.get(
  "/admin/applications/:id/download",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
  downloadApplicationResumeHandler
);

router.patch(
  "/admin/applications/:id",
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
  updateApplicationHandler
);

router.delete(
  "/admin/applications/:id",
  authenticate,
  requireRole("Superadmin"),
  requirePermission("careers"),
  deleteApplicationHandler
);

export default router;