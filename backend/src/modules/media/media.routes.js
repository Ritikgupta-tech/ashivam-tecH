import { Router } from "express";
import multer from "multer";

import {
  authenticate,
} from "../../middlewares/auth.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

import {
  upload,
  list,
  getById,
  remove,
} from "./media.controller.js";

const router = Router();

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

const adminAccess = [
  authenticate,
  requireRole("Superadmin", "Admin"),
];

router.post(
  "/",
  ...adminAccess,
  requirePermission("media"),
  uploadMiddleware.single("file"),
  upload
);

router.get(
  "/",
  ...adminAccess,
  requirePermission("media"),
  list
);

router.get(
  "/:id",
  ...adminAccess,
  requirePermission("media"),
  getById
);

router.delete(
  "/:id",
  ...adminAccess,
  requirePermission("media"),
  remove
);

export default router;
