
import { Router } from "express";
import multer from "multer";

import {
  uploadDocument,
  getDocuments,
  getDocument,
  updateStatus,
  removeDocument,
  downloadDocument,
  viewDocument,
  getEmployeeSummary,
} from "./hrDocument.controller.js";

import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

const router = Router();

/*
 * Multer configuration
 *
 * Files are kept in memory and the service is responsible
 * for validating and writing them to the final location.
 */
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error(
        "Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, DOC and DOCX"
      );

      error.statusCode = 400;

      return cb(error);
    }

    return cb(null, true);
  },
});

/*
 * All HR document APIs require authentication and employee permission
 */
router.use(authenticate);
router.use(requireRole("Superadmin", "Admin"));
router.use(requirePermission("employees"));

/*
 * Upload HR document
 *
 * POST /api/v1/hr-documents
 *
 * multipart/form-data
 * file field: document
 */
router.post(
  "/",
  upload.single("document"),
  uploadDocument
);

/*
 * List HR documents
 *
 * GET /api/v1/hr-documents
 *
 * Query:
 * page
 * limit
 * employee
 * documentType
 * status
 * search
 * expiringWithinDays
 */
router.get(
  "/",
  getDocuments
);

/*
 * Employee document summary
 *
 * GET /api/v1/hr-documents/employee/:employeeId/summary
 *
 * Keep this route BEFORE /:id.
 */
router.get(
  "/employee/:employeeId/summary",
  getEmployeeSummary
);

/*
 * Download document
 *
 * GET /api/v1/hr-documents/:id/download
 */
router.get(
  "/:id/download",
  downloadDocument
);

/*
 * View document inline
 *
 * GET /api/v1/hr-documents/:id/view
 */
router.get(
  "/:id/view",
  viewDocument
);

/*
 * Update document status
 *
 * PATCH /api/v1/hr-documents/:id/status
 */
router.patch(
  "/:id/status",
  updateStatus
);

/*
 * Get single document
 *
 * GET /api/v1/hr-documents/:id
 */
router.get(
  "/:id",
  getDocument
);

/*
 * Delete document
 *
 * DELETE /api/v1/hr-documents/:id
 */
router.delete(
  "/:id",
  requireRole("Superadmin"),
  removeDocument
);

export default router;

