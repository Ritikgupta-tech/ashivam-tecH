import env from "../config/env.js";
import logger, { sanitizeLogString, redactSensitiveData } from "../utils/logger.js";

/**
 * Scrubs filesystem paths, database URIs, and sensitive tokens
 * from client-facing error messages to prevent information leakage.
 */
export const scrubSensitivePatterns = (str = "") => {
  if (typeof str !== "string") return "";
  return str
    .replace(/(mongodb(?:\+srv)?|postgres|redis|smtp):\/\/[^\s]+/gi, "[REDACTED_URI]")
    .replace(/(?:[a-zA-Z]:\\|\/(?:Users|home|var|usr|etc|tmp|app)\/)[^\s"':;]+/gi, "[REDACTED_PATH]")
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, "[REDACTED_TOKEN]");
};

/**
 * Standard 404 handler for unmatched routes.
 * Adheres strictly to the standard envelope: { success, message, errors, requestId }.
 */
export const notFoundHandler = (req, res) => {
  const safeMethod = sanitizeLogString(req.method);
  const safeUrl = sanitizeLogString(req.originalUrl || req.url || "/");

  return res.status(404).json({
    success: false,
    message: `Route not found: ${safeMethod} ${safeUrl}`,
    errors: {},
    requestId: req.id,
  });
};

/**
 * Centralized production-safe global error handler.
 * Normalizes error responses to { success: false, message, errors, requestId }.
 * Strictly redacts internal traces and sensitive paths in production.
 */
export const errorHandler = (err, req, res, next) => {
  const requestId = req.id || "N/A";

  // Safe internal error logging with correlation ID
  try {
    if (!env.isTest) {
      logger.error(`Unhandled request error [${requestId}]`, {
        requestId,
        method: sanitizeLogString(req.method),
        url: sanitizeLogString(req.originalUrl || req.url || "/"),
        name: sanitizeLogString(err.name),
        message: sanitizeLogString(err.message),
        stack: env.isProduction ? undefined : err.stack,
      });
    }
  } catch {
    // Logging failures must never interfere with sending the client response
  }

  // 1. Malformed JSON payload (SyntaxError from express.json / body-parser)
  if (
    err instanceof SyntaxError &&
    (err.status === 400 || err.statusCode === 400) &&
    ("body" in err || err.type === "entity.parse.failed")
  ) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload in request body",
      errors: {
        body: "Invalid JSON format",
      },
      requestId,
    });
  }

  // 2. Malformed URI parameters (URIError from decodeURIComponent)
  if (err instanceof URIError) {
    return res.status(400).json({
      success: false,
      message: "Malformed URI in request path or query",
      errors: {
        uri: "Failed to decode URI parameters",
      },
      requestId,
    });
  }

  // 3. Payload Too Large (Oversized request body)
  if (
    err.type === "entity.too.large" ||
    err.status === 413 ||
    err.statusCode === 413
  ) {
    return res.status(413).json({
      success: false,
      message: "Payload too large. Request body exceeds the allowed size limit.",
      errors: {
        body: "Request body size limit exceeded",
      },
      requestId,
    });
  }

  // 4. CORS Rejection
  if (err.message && err.message.includes("not allowed by CORS")) {
    return res.status(403).json({
      success: false,
      message: "Access forbidden: origin not allowed by CORS policy",
      errors: {},
      requestId,
    });
  }

  // 5. Mongoose CastError (e.g., malformed ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid format for field: ${err.path || "identifier"}`,
      errors: {
        [err.path || "id"]: "Invalid identifier format",
      },
      requestId,
    });
  }

  // 6. Mongoose Schema Validation Error
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

  // 7. MongoDB Duplicate Key Error (E11000)
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

  // 8. Multer upload errors
  if (err.name === "MulterError") {
    let message = "File upload error";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File exceeds the allowed size limit";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected upload field received";
    } else if (err.code === "LIMIT_PART_COUNT") {
      message = "Too many form parts";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files uploaded";
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

  // 9. JWT Verification errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid access token",
      errors: {},
      requestId,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Access token expired",
      errors: {},
      requestId,
    });
  }

  // 10. General / Custom Application Errors
  const rawStatus = err.statusCode || err.status;
  const statusCode =
    Number.isInteger(Number(rawStatus)) &&
    Number(rawStatus) >= 400 &&
    Number(rawStatus) <= 599
      ? Number(rawStatus)
      : 500;

  let clientMessage;
  if (statusCode >= 500) {
    clientMessage = env.isProduction
      ? "Internal server error"
      : err.message || "An unexpected internal server error occurred";
  } else {
    clientMessage = scrubSensitivePatterns(err.message || "Request failed");
  }

  const responseBody = {
    success: false,
    message: clientMessage,
    errors:
      typeof err.errors === "object" && err.errors !== null ? err.errors : {},
    requestId,
  };

  // Stack traces are strictly hidden in production
  if (!env.isProduction && err.stack) {
    responseBody.stack = err.stack;
  }

  return res.status(statusCode).json(responseBody);
};