import logger, { sanitizeLogString } from "../utils/logger.js";
import env from "../config/env.js";

/**
 * Request observability middleware.
 * Records request method, path, status, duration, and correlation ID.
 * Sanitizes URLs, prevents log injection, and redacts sensitive query parameters.
 * Completely isolates logging so that failures never crash request handling.
 */
export const requestLoggerMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime.bigint();

  res.on("finish", () => {
    try {
      if (env.isTest) return;

      const durationMs = (
        Number(process.hrtime.bigint() - startHrTime) / 1e6
      ).toFixed(2);
      const statusCode = res.statusCode;
      const cleanMethod = sanitizeLogString(req.method);

      // Redact sensitive query parameters from URLs
      const rawUrl = req.originalUrl || req.url || "/";
      const cleanUrl = sanitizeLogString(
        rawUrl.replace(
          /([?&](?:token|password|secret|key|apiKey)=)[^&]+/gi,
          "$1[REDACTED]"
        )
      );
      const requestId = req.id || "N/A";

      const logPayload = {
        requestId,
        method: cleanMethod,
        path: cleanUrl,
        status: statusCode,
        duration: `${durationMs}ms`,
        ip: sanitizeLogString(req.ip || req.socket?.remoteAddress || "unknown"),
      };

      const summary = `${cleanMethod} ${cleanUrl} -> ${statusCode} (${durationMs}ms) [${requestId}]`;

      if (statusCode >= 500) {
        logger.error(summary, logPayload);
      } else if (statusCode >= 400) {
        logger.warn(summary, logPayload);
      } else {
        logger.http(summary, logPayload);
      }
    } catch {
      // Safe fallback - logging failures must never crash request handling
    }
  });

  next();
};

export default requestLoggerMiddleware;
