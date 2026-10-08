import env from "../config/env.js";

export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.id,
  });
};

export const errorHandler = (err, req, res, next) => {
  const requestId = req.id;

  // Log error with correlation ID for server observability
  if (!env.isTest) {
    console.error(`[Error] [RequestID: ${requestId || "N/A"}]`, {
      method: req.method,
      url: req.originalUrl,
      name: err.name,
      message: err.message,
      stack: env.isProduction ? undefined : err.stack,
    });
  }

  // Handle Mongoose CastError (e.g., malformed ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid format for field: ${err.path}`,
      errors: {
        [err.path]: "Invalid identifier format",
      },
      requestId,
    });
  }

  // Handle Mongoose Schema Validation Error
  if (err.name === "ValidationError") {
    const formattedErrors = {};
    if (err.errors) {
      Object.keys(err.errors).forEach((key) => {
        formattedErrors[key] = err.errors[key].message;
      });
    }

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors,
      requestId,
    });
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    const duplicateField = fields[0] || "field";

    return res.status(409).json({
      success: false,
      message: `A record with this ${duplicateField} already exists`,
      errors: {
        [duplicateField]: `This ${duplicateField} is already registered`,
      },
      requestId,
    });
  }

  // Handle Multer upload errors
  if (err.name === "MulterError") {
    let message = "File upload error";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File exceeds the allowed size limit";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected upload field received";
    }

    return res.status(400).json({
      success: false,
      message,
      errors: {
        file: message,
      },
      requestId,
    });
  }

  // Handle JWT Verification errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid access token",
      requestId,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Access token expired",
      requestId,
    });
  }

  // Explicit status codes attached to custom application errors
  const statusCode = Number(err.statusCode) || 500;
  const clientMessage =
    statusCode === 500 && env.isProduction
      ? "Internal server error"
      : err.message || "An unexpected error occurred";

  const responseBody = {
    success: false,
    message: clientMessage,
    errors: err.errors || {},
    requestId,
  };

  if (!env.isProduction && err.stack) {
    responseBody.stack = err.stack;
  }

  return res.status(statusCode).json(responseBody);
};