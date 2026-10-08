import path from "path";

import {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocumentStatus,
  deleteDocument,
  getDocumentFile,
  getEmployeeDocumentSummary,
} from "./hrDocument.service.js";

export const uploadDocument = async (
  req,
  res,
  next
) => {
  try {
    const document = await createDocument({
      body: req.body,
      file: req.file,
      adminId: req.user.id,
      req,
    });

    return res.status(201).json({
      success: true,
      message: "HR document uploaded successfully",
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (
  req,
  res,
  next
) => {
  try {
    const data = await listDocuments({
      page: req.query.page,
      limit: req.query.limit,
      employee: req.query.employee,
      documentType: req.query.documentType,
      status: req.query.status,
      search: req.query.search,
      expiringWithinDays:
        req.query.expiringWithinDays,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocument = async (
  req,
  res,
  next
) => {
  try {
    const document = await getDocumentById(
      req.params.id
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "HR document not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        document,
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
    const document =
      await updateDocumentStatus({
        documentId: req.params.id,
        status: req.body.status,
        rejectionReason:
          req.body.rejectionReason,
        adminId: req.user.id,
        req,
      });

    return res.status(200).json({
      success: true,
      message:
        "HR document status updated successfully",
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeDocument = async (
  req,
  res,
  next
) => {
  try {
    await deleteDocument({
      documentId: req.params.id,
      adminId: req.user.id,
      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "HR document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const downloadDocument = async (
  req,
  res,
  next
) => {
  try {
    const document =
      await getDocumentFile(req.params.id);

    return res.download(
      document.filePath,
      document.originalName,
      (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      }
    );
  } catch (error) {
    next(error);
  }
};

export const viewDocument = async (
  req,
  res,
  next
) => {
  try {
    const document =
      await getDocumentFile(req.params.id);

    res.setHeader(
      "Content-Type",
      document.mimeType
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(
        document.originalName
      )}"`
    );

    return res.sendFile(
      document.filePath
    );
  } catch (error) {
    next(error);
  }
};

export const getEmployeeSummary = async (
  req,
  res,
  next
) => {
  try {
    const summary =
      await getEmployeeDocumentSummary(
        req.params.employeeId
      );

    return res.status(200).json({
      success: true,
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};