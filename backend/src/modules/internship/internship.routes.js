import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { publicFormLimiter } from "../../middlewares/rateLimit.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

import {
  create,
  getAll,
  getOne,
  update,
  remove,
  convertCandidate,
  createInternHandler,
  getAllInterns,
  getOneIntern,
  updateInternHandler,
  updateInternStatusHandler,
  updateInternOnboardingHandler,
  deleteInternHandler,
  getAllPrograms,
  createProgramHandler,
  updateProgramHandler,
  deleteProgramHandler,
  exportApplicationsCsv,
  exportInternsCsvHandler,
} from "./internship.controller.js";

const router = Router();

const adminAccess = [
  authenticate,
  requireRole("Superadmin", "Admin"),
  requirePermission("careers"),
];

const superadminAccess = [
  authenticate,
  requireRole("Superadmin"),
  requirePermission("careers"),
];

/* -------------------------------------------------------------
 * Public Endpoints
 * ----------------------------------------------------------- */
router.post("/", publicFormLimiter, create);
router.get("/programs/public", getAllPrograms);

/* -------------------------------------------------------------
 * Specific CSV Exports (Registered BEFORE parameterized :id routes)
 * ----------------------------------------------------------- */
router.get("/export", ...adminAccess, exportApplicationsCsv);
router.get("/interns/export", ...adminAccess, exportInternsCsvHandler);

/* -------------------------------------------------------------
 * Internship Programs / Opportunities Management
 * ----------------------------------------------------------- */
router.get("/programs", ...adminAccess, getAllPrograms);
router.post("/programs", ...adminAccess, createProgramHandler);
router.patch("/programs/:id", ...adminAccess, updateProgramHandler);
router.delete("/programs/:id", ...superadminAccess, deleteProgramHandler);

/* -------------------------------------------------------------
 * Onboarded Interns Directory & Lifecycle
 * ----------------------------------------------------------- */
router.get("/interns", ...adminAccess, getAllInterns);
router.post("/interns", ...adminAccess, createInternHandler);
router.get("/interns/:id", ...adminAccess, getOneIntern);
router.patch("/interns/:id", ...adminAccess, updateInternHandler);
router.patch("/interns/:id/status", ...adminAccess, updateInternStatusHandler);
router.patch("/interns/:id/onboarding", ...adminAccess, updateInternOnboardingHandler);
router.delete("/interns/:id", ...superadminAccess, deleteInternHandler);

/* -------------------------------------------------------------
 * Candidate Application Conversion
 * ----------------------------------------------------------- */
router.post("/applications/:id/convert", ...adminAccess, convertCandidate);

/* -------------------------------------------------------------
 * General Internship Applications Management
 * ----------------------------------------------------------- */
router.get("/", ...adminAccess, getAll);
router.get("/:id", ...adminAccess, getOne);
router.patch("/:id", ...adminAccess, update);
router.delete("/:id", ...superadminAccess, remove);

export default router;
