import { Router } from "express";

import {
  authenticate,
} from "../../middlewares/auth.middleware.js";

import {
  requireRole,
} from "../../middlewares/authorization.middleware.js";

import {
  listNotifications,
  unreadCount,
  getOneNotification,
  readNotification,
  readAllNotifications,
  removeNotification,
  removeReadNotifications,
  createNotification,
} from "./notification.controller.js";

const router = Router();

/*
 * User notification APIs
 */

router.get(
  "/",
  authenticate,
  listNotifications
);

router.get(
  "/unread-count",
  authenticate,
  unreadCount
);

router.get(
  "/:id",
  authenticate,
  getOneNotification
);

router.patch(
  "/:id/read",
  authenticate,
  readNotification
);

router.patch(
  "/read-all",
  authenticate,
  readAllNotifications
);

router.delete(
  "/:id",
  authenticate,
  removeNotification
);

router.delete(
  "/read",
  authenticate,
  removeReadNotifications
);

/*
 * Admin notification creation
 */

router.post(
  "/",
  authenticate,
  requireRole(
    "Superadmin",
    "Admin"
  ),
  createNotification
);

export default router;