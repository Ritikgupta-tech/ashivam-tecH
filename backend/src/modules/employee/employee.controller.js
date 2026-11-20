import {
  listEmployees,
  listPublicEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  restoreEmployee,
  getEmployeeDepartments,
  getEmployeeDesignations,
  exportEmployeesCsv,
  resendEmployeeInvitation,
  updateEmployeeAccountStatus,
  updateEmployeeEmploymentStatus,
  initiateAdminPasswordReset,
} from "./employee.service.js";

import {
  validateCreateEmployee,
  validateUpdateEmployee,
} from "./employee.validator.js";

import { createAuditLog } from "../audit/audit.service.js";
import env from "../../config/env.js";

const getAdminId = (req) =>
  req.user?.id ||
  req.user?._id ||
  null;

const validationError = (errors) => {
  const error = new Error(
    "Validation failed"
  );

  error.statusCode = 400;
  error.errors = errors;
  error.details = errors;

  return error;
};

export const list = async (req, res, next) => {
  try {
    const data =
      await listEmployees(req.query);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const publicList = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await listPublicEmployees(
        req.query
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req,
  res,
  next
) => {
  try {
    const employee =
      await getEmployeeById(
        req.params.employeeId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateCreateEmployee(
        req.body
      );

    if (!validation.valid) {
      throw validationError(
        validation.errors
      );
    }

    const adminId =
      getAdminId(req);

    const employee =
      await createEmployee(
        req.body,
        adminId
      );

    await createAuditLog({
      req,
      action: "CREATE",
      module: "employee",
      entity: "Employee",
      entityId: employee._id,
      description:
        `Created employee ${employee.fullName}`,
      metadata: {
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
      },
    });

    const { rawActivationToken: testToken, ...safeEmployee } = employee;

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        employee: safeEmployee,
        invitationStatus: employee.invitationStatus,
        invitationError: employee.invitationError,
        activationUrl: employee.activationUrl,
        ...(env.isTest && testToken ? { rawActivationToken: testToken } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateUpdateEmployee(
        req.body
      );

    if (!validation.valid) {
      throw validationError(
        validation.errors
      );
    }

    const adminId =
      getAdminId(req);

    const employee =
      await updateEmployee(
        req.params.employeeId,
        req.body,
        adminId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await createAuditLog({
      req,
      action: "UPDATE",
      module: "employee",
      entity: "Employee",
      entityId: employee._id,
      description:
        `Updated employee ${employee.fullName}`,
      metadata: {
        email: employee.email,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (
  req,
  res,
  next
) => {
  try {
    if (
      typeof req.body.isActive !==
      "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "isActive must be a boolean",
      });
    }

    const adminId =
      getAdminId(req);

    const employee =
      await updateEmployeeStatus(
        req.params.employeeId,
        req.body.isActive,
        adminId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await createAuditLog({
      req,
      action: "STATUS_CHANGE",
      module: "employee",
      entity: "Employee",
      entityId: employee._id,
      description:
        `Changed employee status to ${
          employee.isActive
            ? "active"
            : "inactive"
        }`,
      metadata: {
        isActive: employee.isActive,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Employee status updated successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req,
  res,
  next
) => {
  try {
    const adminId =
      getAdminId(req);

    const deleted =
      await deleteEmployee(
        req.params.employeeId,
        adminId
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await createAuditLog({
      req,
      action: "DELETE",
      module: "employee",
      entity: "Employee",
      entityId: req.params.employeeId,
      description:
        "Employee deleted",
    });

    return res.status(200).json({
      success: true,
      message:
        "Employee deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const restore = async (req, res, next) => {
  try {
    const adminId = getAdminId(req);

    const employee =
      await restoreEmployee(
        req.params.employeeId,
        adminId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or not deleted",
      });
    }

    await createAuditLog({
      adminId,
      action: "RESTORE",
      module: "employee",
      entity: "Employee",
      entityId: req.params.employeeId,
      description:
        "Employee restored",
    });

    return res.status(200).json({
      success: true,
      message:
        "Employee restored successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const departments = async (
  req,
  res,
  next
) => {
  try {
    const items =
      await getEmployeeDepartments();

    return res.status(200).json({
      success: true,
      data: {
        items,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const designations = async (
  req,
  res,
  next
) => {
  try {
    const items =
      await getEmployeeDesignations();

    return res.status(200).json({
      success: true,
      data: {
        items,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportCsv = async (req, res, next) => {
  try {
    const csv = await exportEmployeesCsv(req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ashivam_employees_export.csv"'
    );
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const resendInvitation = async (req, res, next) => {
  try {
    const adminId = getAdminId(req);
    const result = await resendEmployeeInvitation(req.params.employeeId, adminId);

    await createAuditLog({
      req,
      action: "INVITATION_RESEND",
      module: "employee",
      entity: "Employee",
      entityId: req.params.employeeId,
      description: `Resent activation invitation for employee ${result.employee?.fullName || req.params.employeeId}`,
      metadata: {
        email: result.employee?.email,
        invitationStatus: result.invitationStatus,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Activation invitation email resent successfully",
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccountStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status || typeof status !== "string") {
      return res.status(400).json({
        success: false,
        message: "Status is required and must be a string",
        requestId: req.id,
      });
    }

    const adminId = getAdminId(req);
    const employee = await updateEmployeeAccountStatus(req.params.employeeId, status.toUpperCase().trim(), adminId);

    await createAuditLog({
      req,
      action: "ACCOUNT_STATUS_CHANGE",
      module: "employee",
      entity: "Employee",
      entityId: req.params.employeeId,
      description: `Changed employee account status to ${status}`,
      metadata: {
        accountStatus: employee.accountStatus,
        isActive: employee.isActive,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Employee account status updated to ${employee.accountStatus}`,
      data: { employee },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmploymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status || typeof status !== "string") {
      return res.status(400).json({
        success: false,
        message: "Status is required and must be a string",
        requestId: req.id,
      });
    }

    const adminId = getAdminId(req);
    const employee = await updateEmployeeEmploymentStatus(req.params.employeeId, status.toUpperCase().trim(), adminId);

    await createAuditLog({
      req,
      action: "EMPLOYMENT_STATUS_CHANGE",
      module: "employee",
      entity: "Employee",
      entityId: req.params.employeeId,
      description: `Changed employee employment status to ${status}`,
      metadata: {
        employmentStatus: employee.employmentStatus,
        accountStatus: employee.accountStatus,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Employee employment status updated to ${employee.employmentStatus}`,
      data: { employee },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const adminResetPassword = async (req, res, next) => {
  try {
    const adminId = getAdminId(req);
    const result = await initiateAdminPasswordReset(req.params.employeeId, adminId);

    await createAuditLog({
      req,
      action: "ADMIN_RESET_PASSWORD",
      module: "employee",
      entity: "Employee",
      entityId: req.params.employeeId,
      description: "Admin initiated employee password reset",
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};