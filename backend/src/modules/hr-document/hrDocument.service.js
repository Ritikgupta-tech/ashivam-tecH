import fs from "fs/promises";
import path from "path";

import HRDocument from "./hrDocument.model.js";
import Employee from "../employee/employee.model.js";
import { createAuditLog } from "../audit/audit.service.js";
import { escapeRegex } from "../../utils/query.js";

const UPLOAD_DIRECTORY = path.resolve(
  "uploads",
  "hr-documents"
);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ensureUploadDirectory = async () => {
  await fs.mkdir(UPLOAD_DIRECTORY, {
    recursive: true,
  });
};

const sanitizeFileName = (name) => {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
};

const getEmployee = async (employeeId) => {
  const employee = await Employee.findOne({
    _id: employeeId,
    isDeleted: { $ne: true },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  return employee;
};

const validateFile = (file) => {
  if (!file) {
    const error = new Error("Document file is required");
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error(
      "Only PDF, JPEG, PNG and WEBP files are allowed"
    );
    error.statusCode = 400;
    throw error;
  }

  if (file.size > MAX_FILE_SIZE) {
    const error = new Error(
      "Document file cannot exceed 10 MB"
    );
    error.statusCode = 400;
    throw error;
  }
};

export const createDocument = async ({
  body,
  file,
  adminId,
  req,
}) => {
  validateFile(file);

  await getEmployee(body.employee);
  await ensureUploadDirectory();

  const safeName = sanitizeFileName(file.originalname);

  const uniqueName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}-${safeName}`;

  const destination = path.join(
    UPLOAD_DIRECTORY,
    uniqueName
  );

  await fs.writeFile(destination, file.buffer);

  const document = await HRDocument.create({
    employee: body.employee,
    documentType: body.documentType,
    title: body.title.trim(),
    description: body.description?.trim() || "",
    originalName: file.originalname,
    storedName: uniqueName,
    filePath: destination,
    mimeType: file.mimetype,
    fileSize: file.size,
    documentNumber:
      body.documentNumber?.trim() || null,
    issueDate: body.issueDate
      ? new Date(body.issueDate)
      : null,
    expiryDate: body.expiryDate
      ? new Date(body.expiryDate)
      : null,
    uploadedBy: adminId,
  });

  await createAuditLog({
    req,
    action: "CREATE",
    module: "HR_DOCUMENT",
    entityType: "HRDocument",
    entityId: document._id,
    description: `HR document created: ${document.title}`,
    metadata: {
      employeeId: body.employee,
      documentType: body.documentType,
    },
  });

  return getDocumentById(document._id);
};

export const listDocuments = async ({
  page = 1,
  limit = 20,
  employee,
  documentType,
  status,
  search,
  expiringWithinDays,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {
    isDeleted: false,
  };

  if (employee) {
    filter.employee = employee;
  }

  if (documentType) {
    filter.documentType = documentType;
  }

  if (status) {
    filter.status = status;
  }

  if (search?.trim()) {
    const safeRegex = escapeRegex(search.trim());
    filter.$or = [
      {
        title: {
          $regex: safeRegex,
          $options: "i",
        },
      },
      {
        originalName: {
          $regex: safeRegex,
          $options: "i",
        },
      },
      {
        documentNumber: {
          $regex: safeRegex,
          $options: "i",
        },
      },
    ];
  }

  if (expiringWithinDays !== undefined) {
    const days = Math.max(
      Number(expiringWithinDays) || 30,
      1
    );

    const now = new Date();

    const future = new Date();
    future.setDate(future.getDate() + days);

    filter.expiryDate = {
      $gte: now,
      $lte: future,
    };
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    HRDocument.find(filter)
      .populate(
        "employee",
        "_id employeeId firstName lastName email designation department"
      )
      .populate(
        "uploadedBy",
        "_id username name role"
      )
      .populate(
        "verifiedBy",
        "_id username name role"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    HRDocument.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit
      ),
    },
  };
};

export const getDocumentById = async (
  documentId
) => {
  return HRDocument.findOne({
    _id: documentId,
    isDeleted: false,
  })
    .populate(
      "employee",
      "_id employeeId firstName lastName email designation department"
    )
    .populate(
      "uploadedBy",
      "_id username name role"
    )
    .populate(
      "verifiedBy",
      "_id username name role"
    )
    .lean();
};

export const updateDocumentStatus = async ({
  documentId,
  status,
  rejectionReason,
  adminId,
  req,
}) => {
  const document =
    await HRDocument.findOne({
      _id: documentId,
      isDeleted: false,
    });

  if (!document) {
    const error = new Error(
      "HR document not found"
    );
    error.statusCode = 404;
    throw error;
  }

  document.status = status;

  if (status === "Verified") {
    document.verifiedAt = new Date();
    document.verifiedBy = adminId;
    document.rejectionReason = null;
  } else if (status === "Rejected") {
    document.verifiedAt = null;
    document.verifiedBy = null;
    document.rejectionReason =
      rejectionReason.trim();
  } else {
    document.verifiedAt = null;
    document.verifiedBy = null;
    document.rejectionReason = null;
  }

  await document.save();

  await createAuditLog({
    req,
    action: "UPDATE_STATUS",
    module: "HR_DOCUMENT",
    entityType: "HRDocument",
    entityId: document._id,
    description:
      `HR document status changed to ${status}`,
    metadata: {
      status,
      employeeId: document.employee,
    },
  });

  return getDocumentById(document._id);
};

export const deleteDocument = async ({
  documentId,
  adminId,
  req,
}) => {
  const document =
    await HRDocument.findOne({
      _id: documentId,
      isDeleted: false,
    });

  if (!document) {
    const error = new Error(
      "HR document not found"
    );
    error.statusCode = 404;
    throw error;
  }

  document.isDeleted = true;
  document.deletedAt = new Date();
  document.deletedBy = adminId;

  await document.save();

  try {
    await fs.unlink(document.filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Unable to delete document file:",
        error.message
      );
    }
  }

  await createAuditLog({
    req,
    action: "DELETE",
    module: "HR_DOCUMENT",
    entityType: "HRDocument",
    entityId: document._id,
    description:
      `HR document deleted: ${document.title}`,
    metadata: {
      employeeId: document.employee,
      documentType: document.documentType,
    },
  });

  return true;
};

export const getDocumentFile = async (
  documentId
) => {
  const document =
    await HRDocument.findOne({
      _id: documentId,
      isDeleted: false,
    }).lean();

  if (!document) {
    const error = new Error(
      "HR document not found"
    );
    error.statusCode = 404;
    throw error;
  }

  try {
    await fs.access(document.filePath);
  } catch {
    const error = new Error(
      "Document file is not available"
    );
    error.statusCode = 404;
    throw error;
  }

  return document;
};

export const getEmployeeDocumentSummary =
  async (employeeId) => {
    await getEmployee(employeeId);

    const [
      total,
      pending,
      verified,
      rejected,
      expired,
    ] = await Promise.all([
      HRDocument.countDocuments({
        employee: employeeId,
        isDeleted: false,
      }),

      HRDocument.countDocuments({
        employee: employeeId,
        status: "Pending",
        isDeleted: false,
      }),

      HRDocument.countDocuments({
        employee: employeeId,
        status: "Verified",
        isDeleted: false,
      }),

      HRDocument.countDocuments({
        employee: employeeId,
        status: "Rejected",
        isDeleted: false,
      }),

      HRDocument.countDocuments({
        employee: employeeId,
        status: "Expired",
        isDeleted: false,
      }),
    ]);

    return {
      total,
      pending,
      verified,
      rejected,
      expired,
    };
  };