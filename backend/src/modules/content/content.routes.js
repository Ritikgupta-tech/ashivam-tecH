import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";

import {
  requireRole,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";

import {
  create,
  list,
  getById,
  update,
  remove,
  publish,
  unpublish,
  publicByKey,
  publicBySection,
} from "./content.controller.js";

const router = Router();

/*
 * Public content APIs
 */

router.get("/public/key/:key", publicByKey);

router.get("/public/section/:section", publicBySection);

/*
 * Protected admin content APIs
 */

router.use(authenticate);
router.use(requireRole("Superadmin", "Admin"));
router.use(requirePermission("content"));

router.post("/", create);

router.get("/", list);

router.get("/:id", getById);

router.put("/:id", update);

router.delete("/:id", requireRole("Superadmin"), remove);

router.patch("/:id/publish", publish);

router.patch("/:id/unpublish", unpublish);

export default router;