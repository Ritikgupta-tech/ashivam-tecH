import {
  listEmployees,
  listPublicEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  getEmployeeDepartments,
  getEmployeeDesignations,
} from "./employee.service.js";

import {
  validateCreateEmployee,
  validateUpdateEmployee,
} from "./employee.validator.js";

import { createAuditLog } from "../audit/audit.service.js";

const getAdminId = (req) =>
  req.user?.id ||
  req.user?._id ||
  null;

const validationError = (errors) => {
  const error = new Error(
    "Validation failed"
  );

  error.statusCode = 400;
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

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        employee,
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