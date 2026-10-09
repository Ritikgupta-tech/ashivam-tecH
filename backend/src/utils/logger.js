import env from "../config/env.js";

/**
 * Sanitizes untrusted strings to prevent CRLF injection (CWE-117)
 * and control character attacks in logs.
 */
export const sanitizeLogString = (value = "") => {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  return str
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
};

const SENSITIVE_KEY_REGEX = /password|secret|token|authorization|cookie|pass|credential|key/i;

const SENSITIVE_VALUE_REGEXES = [
  /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi,
  /(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@[^\s]+)/gi,
  /(smtp:\/\/[^:]+:)[^@]+(@[^\s]+)/gi,
];

/**
 * Recursively redacts sensitive patterns and keys from data objects before logging.
 */
export const redactSensitiveData = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    let sanitized = sanitizeLogString(data);
    for (const rx of SENSITIVE_VALUE_REGEXES) {
      sanitized = sanitized.replace(rx, "$1[REDACTED]$2");
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === "object") {
    const cleanObj = {};
    for (const [key, val] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        cleanObj[key] = "[REDACTED]";
      } else {
        cleanObj[key] = redactSensitiveData(val);
      }
    }
    return cleanObj;
  }

  return data;
};

/**
 * Centralized, production-safe structured logger.
 * Resilient against log injection, never crashes on logging errors.
 */
export const logger = {
  info: (message, meta) => {
    if (env.isTest) return;
    try {
      const cleanMsg = sanitizeLogString(message);
      if (meta) {
        console.log(`[INFO] ${cleanMsg}`, redactSensitiveData(meta));
      } else {
        console.log(`[INFO] ${cleanMsg}`);
      }
    } catch {
      // Safe fallback - logging failures must never crash request handling
    }
  },

  warn: (message, meta) => {
    if (env.isTest) return;
    try {
      const cleanMsg = sanitizeLogString(message);
      if (meta) {
        console.warn(`[WARN] ${cleanMsg}`, redactSensitiveData(meta));
      } else {
        console.warn(`[WARN] ${cleanMsg}`);
      }
    } catch {
      // Safe fallback
    }
  },

  error: (message, meta) => {
    if (env.isTest) return;
    try {
      const cleanMsg = sanitizeLogString(message);
      if (meta) {
        console.error(`[ERROR] ${cleanMsg}`, redactSensitiveData(meta));
      } else {
        console.error(`[ERROR] ${cleanMsg}`);
      }
    } catch {
      // Safe fallback
    }
  },

  http: (message, meta) => {
    if (env.isTest) return;
    try {
      const cleanMsg = sanitizeLogString(message);
      if (meta) {
        console.log(`[HTTP] ${cleanMsg}`, redactSensitiveData(meta));
      } else {
        console.log(`[HTTP] ${cleanMsg}`);
      }
    } catch {
      // Safe fallback
    }
  },
};

export default logger;
