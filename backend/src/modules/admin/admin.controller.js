import {
  listAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  updateAdminStatus,
  updateAdminRole,
  updateAdminPermissions,
  deleteAdmin,
} from "./admin.service.js";

import {
  validateCreateAdmin,
  validateUpdateAdmin,
  ROLES,
  PERMISSIONS,
} from "./admin.validator.js";

const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const getAdmins = async (req, res, next) => {
  try {
    const result = await listAdmins(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminById = async (req, res, next) => {
  try {
    const admin = await getAdmin(req.params.id);

    if (!admin) {
      return sendError(res, "Admin not found", 404);
    }

    res.status(200).json({
      success: true,
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

export const createAdminAccount = async (req, res, next) => {
  try {
    const validationError = validateCreateAdmin(req.body);

    if (validationError) {
      return sendError(res, validationError);
    }

    const admin = await createAdmin(req.body);

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminAccount = async (req, res, next) => {
  try {
    const validationError = validateUpdateAdmin(req.body);

    if (validationError) {
      return sendError(res, validationError);
    }

    const admin = await updateAdmin(
      req.params.id,
      req.body
    );

    if (!admin) {
      return sendError(res, "Admin not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

export const changeAdminStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return sendError(
        res,
        "isActive must be a boolean"
      );
    }

    const admin = await updateAdminStatus(
      req.params.id,
      isActive,
      req.user.id
    );

    if (!admin) {
      return sendError(res, "Admin not found", 404);
    }

    res.status(200).json({
      success: true,
      message: `Admin ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

export const changeAdminRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!ROLES.includes(role)) {
      return sendError(res, "Invalid role");
    }

    const admin = await updateAdminRole(
      req.params.id,
      role,
      req.user.id
    );

    if (!admin) {
      return sendError(res, "Admin not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Admin role updated successfully",
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

export const changeAdminPermissions = async (
  req,
  res,
  next
) => {
  try {
    const { permissions } = req.body;

    if (
      !Array.isArray(permissions) ||
      permissions.some(
        (permission) => !PERMISSIONS.includes(permission)
      )
    ) {
      return sendError(res, "Invalid permissions");
    }

    const admin = await updateAdminPermissions(
      req.params.id,
      permissions
    );

    if (!admin) {
      return sendError(res, "Admin not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Admin permissions updated successfully",
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

export const removeAdmin = async (req, res, next) => {
  try {
    const deleted = await deleteAdmin(
      req.params.id,
      req.user.id
    );

    if (!deleted) {
      return sendError(res, "Admin not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};