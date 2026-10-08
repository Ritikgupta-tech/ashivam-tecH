import fs from "fs/promises";
import path from "path";

import EmployeeDocument from "./employee-document.model.js";
import Employee from "../employee/employee.model.js";

import {
  validateCreateDocument,
  validateObjectId,
} from "./employee-document.validator.js";
import { escapeRegex } from "../../utils/query.js";

const UPLOAD_DIRECTORY = path.resolve(
  process.cwd(),
  "uploads",
  "employee-documents"
);

const DOCUMENT_PROJECTION =
  "_id employee documentType title description file status uploadedBy archivedAt createdAt updatedAt";

const ensureUploadDirectory = async () => {
  await fs.mkdir(UPLOAD_DIRECTORY, {
    recursive: true,
  });
};

const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
};

const getEmployee = async (employeeId) => {
  const employee = await Employee.findById(employeeId)
    .select("_id firstName lastName fullName email employeeCode")
    .lean();

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  return employee;
};

export const createEmployeeDocument = async ({
  employeeId,
  documentType,
  title,
  description = "",
  file,
  user,
}) => {
  validateCreateDocument({
    employeeId,
    documentType,
    title,
  });

  const employee = await getEmployee(employeeId);

  if (!file) {
    const error = new Error("Document file is required");
    error.statusCode = 400;
    throw error;
  }

  await ensureUploadDirectory();

  const safeName = sanitizeFileName(file.originalname);

  const uniqueName = `${Date.now()}-${Math.round(
    Math.random() * 1e9
  )}-${safeName}`;

  const finalPath = path.join(
    UPLOAD_DIRECTORY,
    uniqueName
  );

  await fs.writeFile(finalPath, file.buffer);

  const relativePath = path
    .relative(process.cwd(), finalPath)
    .replace(/\\/g, "/");

  const document = await EmployeeDocument.create({
    employee: employee._id,
    documentType,
    title: title.trim(),
    description: description?.trim() || "",
    file: {
      originalName: file.originalname,
      fileName: uniqueName,
      path: relativePath,
      mimeType: file.mimetype,
      size: file.size,
    },
    status: "active",
    uploadedBy: {
      userId: user?.id || user?._id || null,
      username: user?.username || null,
    },
  });

  return EmployeeDocument.findById(document._id)
    .select(DOCUMENT_PROJECTION)
    .populate(
      "employee",
      "_id firstName lastName fullName email employeeCode"
    )
    .lean();
};

export const listEmployeeDocuments = async ({
  employeeId,
  page = 1,
  limit = 20,
  documentType = "",
  status = "",
  search = "",
}) => {
  validateObjectId(employeeId, "employee ID");

  await getEmployee(employeeId);

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {
    employee: employeeId,
  };

  if (documentType) {
    filter.documentType = documentType;
  }

  if (status) {
    filter.status = status;
  }

  if (search) {
    const safeRegex = escapeRegex(search.trim());
    filter.$or = [
      {
        title: {
          $regex: safeRegex,
          $options: "i",
        },
      },
      {
        description: {
          $regex: safeRegex,
          $options: "i",
        },
      },
      {
        "file.originalName": {
          $regex: safeRegex,
          $options: "i",
        },
      },
    ];
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    EmployeeDocument.find(filter)
      .select(DOCUMENT_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    EmployeeDocument.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage:
        safePage * safeLimit < total,
      hasPreviousPage:
        safePage > 1,
    },
  };
};

export const getEmployeeDocument = async (
  documentId
) => {
  validateObjectId(documentId, "document ID");

  const document = await EmployeeDocument.findById(
    documentId
  )
    .select(DOCUMENT_PROJECTION)
    .populate(
      "employee",
      "_id firstName lastName fullName email employeeCode"
    )
    .lean();

  if (!document) {
    const error = new Error(
      "Employee document not found"
    );

    error.statusCode = 404;
    throw error;
  }

  return document;
};

export const updateEmployeeDocument = async (
  documentId,
  {
    title,
    description,
    documentType,
  }
) => {
  validateObjectId(documentId, "document ID");

  const document =
    await EmployeeDocument.findById(documentId);

  if (!document) {
    const error = new Error(
      "Employee document not found"
    );

    error.statusCode = 404;
    throw error;
  }

  if (title !== undefined) {
    if (!title.trim()) {
      const error = new Error(
        "Document title cannot be empty"
      );

      error.statusCode = 400;
      throw error;
    }

    document.title = title.trim();
  }

  if (description !== undefined) {
    document.description = description.trim();
  }

  if (documentType !== undefined) {
    const {
      validateDocumentType,
    } = await import(
      "./employee-document.validator.js"
    );

    validateDocumentType(documentType);

    document.documentType = documentType;
  }

  await document.save();

  return getEmployeeDocument(document._id);
};

export const archiveEmployeeDocument = async (
  documentId
) => {
  validateObjectId(documentId, "document ID");

  const document =
    await EmployeeDocument.findById(documentId);

  if (!document) {
    const error = new Error(
      "Employee document not found"
    );

    error.statusCode = 404;
    throw error;
  }

  document.status = "archived";
  document.archivedAt = new Date();

  await document.save();

  return getEmployeeDocument(document._id);
};

export const restoreEmployeeDocument = async (
  documentId
) => {
  validateObjectId(documentId, "document ID");

  const document =
    await EmployeeDocument.findById(documentId);

  if (!document) {
    const error = new Error(
      "Employee document not found"
    );

    error.statusCode = 404;
    throw error;
  }

  document.status = "active";
  document.archivedAt = null;

  await document.save();

  return getEmployeeDocument(document._id);
};

export const deleteEmployeeDocument = async (
  documentId
) => {
  validateObjectId(documentId, "document ID");

  const document =
    await EmployeeDocument.findById(documentId);

  if (!document) {
    const error = new Error(
      "Employee document not found"
    );

    error.statusCode = 404;
    throw error;
  }

  const absolutePath = path.resolve(
    process.cwd(),
    document.file.path
  );

  await EmployeeDocument.deleteOne({
    _id: documentId,
  });

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  return true;
};

export const getEmployeeDocumentFile = async (
  documentId
) => {
  validateObjectId(documentId, "document ID");

  const document =
    await EmployeeDocument.findById(documentId).lean();

  if (!document) {
    const error = new Error(
      "Employee document not found"
    );

    error.statusCode = 404;
    throw error;
  }

  if (document.status === "archived") {
    const error = new Error(
      "Archived documents cannot be downloaded"
    );

    error.statusCode = 400;
    throw error;
  }

  const absolutePath = path.resolve(
    process.cwd(),
    document.file.path
  );

  try {
    await fs.access(absolutePath);
  } catch {
    const error = new Error(
      "Document file is missing from storage"
    );

    error.statusCode = 404;
    throw error;
  }

  return {
    document,
    absolutePath,
  };
};