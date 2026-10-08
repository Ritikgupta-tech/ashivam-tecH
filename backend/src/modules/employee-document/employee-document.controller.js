import {
  createEmployeeDocument,
  listEmployeeDocuments,
  getEmployeeDocument,
  updateEmployeeDocument,
  archiveEmployeeDocument,
  restoreEmployeeDocument,
  deleteEmployeeDocument,
  getEmployeeDocumentFile,
} from "./employee-document.service.js";

import { createAuditLog } from "../audit/audit.service.js";

const handleError = (error, next) => {
  return next(error);
};

export const uploadDocument = async (
  req,
  res,
  next
) => {
  try {
    const document =
      await createEmployeeDocument({
        employeeId: req.params.employeeId,
        documentType: req.body.documentType,
        title: req.body.title,
        description: req.body.description,
        file: req.file,
        user: req.user,
      });

    await createAuditLog({
      req,
      action: "CREATE",
      entity: "EmployeeDocument",
      entityId: document._id,
      description:
        "Employee document uploaded",
      metadata: {
        employeeId: req.params.employeeId,
        documentType:
          req.body.documentType,
        title: req.body.title,
      },
    });

    return res.status(201).json({
      success: true,
      message:
        "Employee document uploaded successfully",
      data: {
        document,
      },
    });
  } catch (error) {
    return handleError(error, next);
  }
};

export const getDocuments = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await listEmployeeDocuments({
        employeeId: req.params.employeeId,
        page: req.query.page,
        limit: req.query.limit,
        documentType:
          req.query.documentType,
        status: req.query.status,
        search: req.query.search,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(error, next);
  }
};

export const getDocument = async (
  req,
  res,
  next
) => {
  try {
    const document =
      await getEmployeeDocument(
        req.params.documentId
      );

    return res.status(200).json({
      success: true,
      data: {
        document,
      },
    });
  } catch (error) {
    return handleError(error, next);
  }
};

export const updateDocument = async (
  req,
  res,
  next
) => {
  try {
    const document =
      await updateEmployeeDocument(
        req.params.documentId,
        {
          title: req.body.title,
          description:
            req.body.description,
          documentType:
            req.body.documentType,
        }
      );

    await createAuditLog({
      req,
      action: "UPDATE",
      entity: "EmployeeDocument",
      entityId: document._id,
      description:
        "Employee document updated",
      metadata: {
        title: document.title,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Employee document updated successfully",
      data: {
        document,
      },
    });
  } catch (error) {
    return handleError(error, next);
  }
};

export const archiveDocument = async (
  req,
  res,
  next
) => {
  try {
    const document =
      await archiveEmployeeDocument(
        req.params.documentId
      );

    await createAuditLog({
      req,
      action: "ARCHIVE",
      entity: "EmployeeDocument",
      entityId: document._id,
      description:
        "Employee document archived",
    });

    return res.status(200).json({
      success: true,
      message:
        "Employee document archived successfully",
      data: {
        document,
      },
    });
  } catch (error) {
    return handleError(error, next);
  }
};

export const restoreDocument = async (
  req,
  res,
  next
) => {
  try {
    const document =
      await restoreEmployeeDocument(
        req.params.documentId
      );

    await createAuditLog({
      req,
      action: "RESTORE",
      entity: "EmployeeDocument",
      entityId: document._id,
      description:
        "Employee document restored",
    });

    return res.status(200).json({
      success: true,
      message:
        "Employee document restored successfully",
      data: {
        document,
      },
    });
  } catch (error) {
    return handleError(error, next);
  }
};

export const removeDocument = async (
  req,
  res,
  next
) => {
  try {
    await deleteEmployeeDocument(
      req.params.documentId
    );

    await createAuditLog({
      req,
      action: "DELETE",
      entity: "EmployeeDocument",
      entityId: req.params.documentId,
      description:
        "Employee document permanently deleted",
    });

    return res.status(200).json({
      success: true,
      message:
        "Employee document deleted successfully",
    });
  } catch (error) {
    return handleError(error, next);
  }
};

export const downloadDocument = async (
  req,
  res,
  next
) => {
  try {
    const {
      document,
      absolutePath,
    } = await getEmployeeDocumentFile(
      req.params.documentId
    );

    await createAuditLog({
      req,
      action: "DOWNLOAD",
      entity: "EmployeeDocument",
      entityId: document._id,
      description:
        "Employee document downloaded",
    });

    return res.download(
      absolutePath,
      document.file.originalName
    );
  } catch (error) {
    return handleError(error, next);
  }
};