import { createAuditLog } from "../audit/audit.service.js";

import { isHoneypotTriggered } from "../../utils/validation.js";

import {
  createInternship,
  listInternships,
  getInternshipById,
  updateInternship,
  deleteInternship,
} from "./internship.service.js";

import {
  validateCreateInternship,
  validateInternshipUpdate,
  validateInternshipQuery,
} from "./internship.validator.js";

/*
 * Audit failures must never fail the request itself.
 */
const audit = (payload) =>
  createAuditLog(payload).catch((error) => {
    console.error("Audit log failed:", error.message);
  });

const validationFailed = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });

export const create = async (req, res, next) => {
  try {
    /*
     * Bots fill the hidden "website" field. Pretend success so they
     * get no signal, but store nothing.
     */
    if (isHoneypotTriggered(req.body)) {
      return res.status(201).json({
        success: true,
        message: "Internship application submitted successfully",
      });
    }

    const validation = validateCreateInternship(req.body);

    if (!validation.isValid) {
      return validationFailed(res, validation.errors);
    }

    const internship = await createInternship(validation.data);

    await audit({
      req,
      action: "CREATE",
      entity: "Internship",
      entityId: internship._id.toString(),
      description: "Public internship application submitted",
      metadata: { domain: internship.domain },
    });

    return res.status(201).json({
      success: true,
      message: "Internship application submitted successfully",
      data: {
        id: internship._id,
        createdAt: internship.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const validation = validateInternshipQuery(req.query);

    if (!validation.isValid) {
      return validationFailed(res, validation.errors);
    }

    const result = await listInternships(validation.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const internship = await getInternshipById(req.params.id);

    return res.status(200).json({
      success: true,
      data: { internship },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const validation = validateInternshipUpdate(req.body);

    if (!validation.isValid) {
      return validationFailed(res, validation.errors);
    }

    const internship = await updateInternship(
      req.params.id,
      validation.data
    );

    await audit({
      req,
      action: "UPDATE",
      entity: "Internship",
      entityId: req.params.id,
      description: "Internship application updated",
      metadata: { fields: Object.keys(validation.data) },
    });

    return res.status(200).json({
      success: true,
      message: "Internship application updated successfully",
      data: { internship },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await deleteInternship(req.params.id);

    await audit({
      req,
      action: "DELETE",
      entity: "Internship",
      entityId: req.params.id,
      description: "Internship application deleted",
    });

    return res.status(200).json({
      success: true,
      message: "Internship application deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
