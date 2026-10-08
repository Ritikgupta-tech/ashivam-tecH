import mongoose from "mongoose";

const DOCUMENT_TYPES = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Driving License",
  "Resume",
  "Offer Letter",
  "Joining Letter",
  "NDA",
  "Salary Slip",
  "Experience Letter",
  "Relieving Letter",
  "Performance Review",
  "Bank Details",
  "Education Certificate",
  "Other",
];

const STATUSES = [
  "Pending",
  "Verified",
  "Rejected",
  "Expired",
];

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const validateCreateDocument = (req, res, next) => {
  const {
    employee,
    documentType,
    title,
    description,
    documentNumber,
    issueDate,
    expiryDate,
  } = req.body;

  if (!employee || !isValidObjectId(employee)) {
    return res.status(400).json({
      success: false,
      message: "Valid employee ID is required",
    });
  }

  if (
    !documentType ||
    !DOCUMENT_TYPES.includes(documentType)
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid document type is required",
    });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Document title is required",
    });
  }

  if (title.trim().length > 200) {
    return res.status(400).json({
      success: false,
      message: "Document title cannot exceed 200 characters",
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    String(description).length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message: "Description cannot exceed 1000 characters",
    });
  }

  if (
    issueDate &&
    Number.isNaN(new Date(issueDate).getTime())
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid issue date",
    });
  }

  if (
    expiryDate &&
    Number.isNaN(new Date(expiryDate).getTime())
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid expiry date",
    });
  }

  if (issueDate && expiryDate) {
    if (
      new Date(expiryDate) < new Date(issueDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Expiry date cannot be before issue date",
      });
    }
  }

  if (
    documentNumber &&
    String(documentNumber).length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Document number cannot exceed 100 characters",
    });
  }

  next();
};

const validateDocumentId = (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID",
    });
  }

  next();
};

const validateStatusUpdate = (req, res, next) => {
  const { status, rejectionReason } = req.body;

  if (!status || !STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Valid document status is required",
    });
  }

  if (
    status === "Rejected" &&
    (!rejectionReason ||
      !String(rejectionReason).trim())
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Rejection reason is required when rejecting a document",
    });
  }

  if (
    rejectionReason &&
    String(rejectionReason).length > 500
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Rejection reason cannot exceed 500 characters",
    });
  }

  next();
};

export {
  DOCUMENT_TYPES,
  STATUSES,
  validateCreateDocument,
  validateDocumentId,
  validateStatusUpdate,
};