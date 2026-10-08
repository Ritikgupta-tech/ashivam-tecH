import { Router } from "express";
import multer from "multer";

import {
  uploadDocument,
  getDocuments,
  getDocument,
  updateDocument,
  archiveDocument,
  restoreDocument,
  removeDocument,
  downloadDocument,
} from "./employee-document.controller.js";

import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

const router = Router();

/*
 * Multer configuration
 */
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
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
        "Only PDF, JPG, PNG, WEBP, DOC and DOCX files are allowed"
      );

      error.statusCode = 400;

      return cb(error);
    }

    cb(null, true);
  },
});

/*
 * Authentication & RBAC required for all employee-document APIs
 */
router.use(authenticate);
router.use(requireRole("Superadmin", "Admin"));
router.use(requirePermission("employees"));

/*
 * Download document
 */
router.get("/file/:documentId", downloadDocument);

/*
 * Get single document
 */
router.get("/document/:documentId", getDocument);

/*
 * Update document metadata
 */
router.patch("/document/:documentId", updateDocument);

/*
 * Archive document
 */
router.patch("/document/:documentId/archive", archiveDocument);

/*
 * Restore document
 */
router.patch("/document/:documentId/restore", restoreDocument);

/*
 * Permanently delete document (Superadmin only)
 */
router.delete("/document/:documentId", requireRole("Superadmin"), removeDocument);

/*
 * Upload document
 */
router.post(
  "/:employeeId",
  upload.single("document"),
  uploadDocument
);

/*
 * List documents of employee
 */
router.get("/:employeeId", getDocuments);

export default router;