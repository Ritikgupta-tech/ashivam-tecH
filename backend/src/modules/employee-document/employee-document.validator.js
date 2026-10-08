import mongoose from "mongoose";

const DOCUMENT_TYPES = [
  "offer-letter",
  "appointment-letter",
  "nda",
  "salary-slip",
  "experience-letter",
  "relieving-letter",
  "id-proof",
  "address-proof",
  "education",
  "other",
];

export const validateObjectId = (value, fieldName = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }
};

export const validateDocumentType = (documentType) => {
  if (!DOCUMENT_TYPES.includes(documentType)) {
    const error = new Error(
      `Invalid documentType. Allowed values: ${DOCUMENT_TYPES.join(", ")}`
    );

    error.statusCode = 400;
    throw error;
  }
};

export const validateTitle = (title) => {
  if (!title || typeof title !== "string") {
    const error = new Error("Document title is required");
    error.statusCode = 400;
    throw error;
  }

  const value = title.trim();

  if (value.length < 2) {
    const error = new Error(
      "Document title must contain at least 2 characters"
    );

    error.statusCode = 400;
    throw error;
  }

  if (value.length > 150) {
    const error = new Error(
      "Document title cannot exceed 150 characters"
    );

    error.statusCode = 400;
    throw error;
  }
};

export const validateUpload = (file) => {
  if (!file) {
    const error = new Error("Document file is required");
    error.statusCode = 400;
    throw error;
  }

  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error(
      "Unsupported document format"
    );

    error.statusCode = 400;
    throw error;
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    const error = new Error(
      "Document size cannot exceed 10 MB"
    );

    error.statusCode = 400;
    throw error;
  }
};

export const validateCreateDocument = ({
  employeeId,
  documentType,
  title,
}) => {
  validateObjectId(employeeId, "employee ID");
  validateDocumentType(documentType);
  validateTitle(title);
};