import { createAuditLog } from "../audit/audit.service.js";

import { isHoneypotTriggered } from "../../utils/validation.js";

import {
  createInternship,
  listInternships,
  getInternshipById,
  updateInternship,
  deleteInternship,
  convertApplicationToIntern,
  createInternDirectly,
  listInterns,
  getInternById,
  updateIntern,
  updateInternStatus,
  updateInternOnboarding,
  deleteIntern,
  listInternshipPrograms,
  createInternshipProgram,
  updateInternshipProgram,
  deleteInternshipProgram,
  exportInternshipsCsv,
  exportInternsCsv,
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
    errors: errors || {},
    requestId: res.req?.id,
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

/* -------------------------------------------------------------
 * Convert Candidate Application to Active Intern
 * ----------------------------------------------------------- */
export const convertCandidate = async (req, res, next) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const result = await convertApplicationToIntern({
      applicationId: req.params.id,
      adminId,
      internData: req.body,
    });

    await audit({
      req,
      action: "CONVERT_INTERN",
      entity: "Intern",
      entityId: result.intern._id.toString(),
      description: `Candidate ${result.intern.name} converted to intern (${result.intern.internId})`,
      metadata: { internId: result.intern.internId, domain: result.intern.domain },
    });

    return res.status(201).json({
      success: true,
      message: "Candidate successfully converted to active intern",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------
 * Direct Intern Management Handlers
 * ----------------------------------------------------------- */
export const createInternHandler = async (req, res, next) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const intern = await createInternDirectly(req.body, adminId);

    await audit({
      req,
      action: "CREATE_INTERN",
      entity: "Intern",
      entityId: intern._id.toString(),
      description: `Intern ${intern.name} directly registered (${intern.internId})`,
    });

    return res.status(201).json({
      success: true,
      message: "Intern registered successfully",
      data: intern,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllInterns = async (req, res, next) => {
  try {
    const result = await listInterns(req.query);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOneIntern = async (req, res, next) => {
  try {
    const intern = await getInternById(req.params.id);
    return res.status(200).json({
      success: true,
      data: intern,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInternHandler = async (req, res, next) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const intern = await updateIntern(req.params.id, req.body, adminId);

    await audit({
      req,
      action: "UPDATE_INTERN",
      entity: "Intern",
      entityId: req.params.id,
      description: `Intern ${intern.name} details updated`,
    });

    return res.status(200).json({
      success: true,
      message: "Intern updated successfully",
      data: intern,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInternStatusHandler = async (req, res, next) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const intern = await updateInternStatus(req.params.id, req.body, adminId);

    await audit({
      req,
      action: "UPDATE_INTERN_STATUS",
      entity: "Intern",
      entityId: req.params.id,
      description: `Intern ${intern.name} status updated to ${intern.status}`,
    });

    return res.status(200).json({
      success: true,
      message: `Intern status updated to ${intern.status}`,
      data: intern,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInternOnboardingHandler = async (req, res, next) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const intern = await updateInternOnboarding(req.params.id, req.body, adminId);

    await audit({
      req,
      action: "UPDATE_INTERN_ONBOARDING",
      entity: "Intern",
      entityId: req.params.id,
      description: `Intern ${intern.name} onboarding updated to ${intern.onboarding?.status}`,
    });

    return res.status(200).json({
      success: true,
      message: "Intern onboarding checklist updated",
      data: intern,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInternHandler = async (req, res, next) => {
  try {
    await deleteIntern(req.params.id);

    await audit({
      req,
      action: "DELETE_INTERN",
      entity: "Intern",
      entityId: req.params.id,
      description: "Intern record archived/deleted",
    });

    return res.status(200).json({
      success: true,
      message: "Intern record removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------
 * Internship Programme Handlers
 * ----------------------------------------------------------- */
export const getAllPrograms = async (req, res, next) => {
  try {
    const programs = await listInternshipPrograms(req.query);
    return res.status(200).json({
      success: true,
      data: {
        items: programs,
        programs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProgramHandler = async (req, res, next) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const program = await createInternshipProgram(req.body, adminId);

    return res.status(201).json({
      success: true,
      message: "Internship program created successfully",
      data: program,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProgramHandler = async (req, res, next) => {
  try {
    const program = await updateInternshipProgram(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Internship program updated successfully",
      data: program,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProgramHandler = async (req, res, next) => {
  try {
    await deleteInternshipProgram(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Internship program removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------
 * CSV Exports
 * ----------------------------------------------------------- */
export const exportApplicationsCsv = async (req, res, next) => {
  try {
    const csv = await exportInternshipsCsv(req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="internship_applications_export.csv"'
    );
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const exportInternsCsvHandler = async (req, res, next) => {
  try {
    const csv = await exportInternsCsv(req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="onboarded_interns_export.csv"'
    );
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
