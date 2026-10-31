import env from "../config/env.js";

/**
 * Enterprise Cross-Site Request Forgery (CSRF) Defense Middleware.
 *
 * Implements Defense-in-Depth against cross-origin state-changing attacks:
 * 1. Sec-Fetch Metadata inspection: Blocks cross-site document/form navigations.
 * 2. Origin & Referer Verification: Rejects state-changing requests from untrusted origins.
 * 3. Cookie-authenticated Originless Guard: Requires custom client header if cookies are presented without origin.
 * 4. Documented Originless Policy: Non-cookie server-to-server or programmatic requests
 *    (e.g., CLI tools, background workers) requiring explicit Authorization Bearer tokens are permitted.
 */
export const csrfProtection = (req, res, next) => {
  // Safe HTTP read methods are idempotent and exempt from CSRF
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  const secFetchSite = req.headers["sec-fetch-site"];
  const secFetchMode = req.headers["sec-fetch-mode"];
  const secFetchDest = req.headers["sec-fetch-dest"];

  // 1. Fetch Metadata Check: Block cross-site form/document submissions
  if (
    secFetchSite === "cross-site" &&
    (secFetchMode === "navigate" || secFetchDest === "document")
  ) {
    return res.status(403).json({
      success: false,
      message: "Cross-site form submission blocked by CSRF defense",
      requestId: req.id,
    });
  }

  // Helper to validate whether an origin is approved
  const isAllowedOrigin = (originToTest) => {
    if (!originToTest) return false;
    if (env.allowedOrigins.includes(originToTest)) return true;
    if (!env.isProduction) {
      if (
        originToTest.includes("localhost") ||
        originToTest.includes("127.0.0.1")
      ) {
        return true;
      }
    }
    return false;
  };

  // 2. Strict Origin Header Check
  if (originHeader) {
    if (isAllowedOrigin(originHeader)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Origin ${originHeader} rejected by CSRF protection`,
      requestId: req.id,
    });
  }

  // 3. Fallback Referer Header Check
  if (refererHeader) {
    try {
      const refererOrigin = new URL(refererHeader).origin;
      if (isAllowedOrigin(refererOrigin)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: `Referer origin ${refererOrigin} rejected by CSRF protection`,
        requestId: req.id,
      });
    } catch {
      return res.status(403).json({
        success: false,
        message: "Malformed referer header rejected by CSRF protection",
        requestId: req.id,
      });
    }
  }

  // 4. Originless State-Changing Requests:
  // If cookies are attached without Origin/Referer (e.g. stripped by malicious proxy/extension):
  // Require custom client header (X-Request-Id, X-Requested-With, X-CSRF-Token)
  // because browsers cannot attach custom headers in cross-origin HTML form/image/script navigations.
  const hasCookieSession = Boolean(
    req.cookies?.refreshToken || req.headers.cookie
  );

  if (hasCookieSession) {
    const hasCustomHeader = Boolean(
      req.headers["x-request-id"] ||
        req.headers["x-requested-with"] ||
        req.headers["x-csrf-token"] ||
        req.headers["authorization"]
    );

    if (!hasCustomHeader) {
      return res.status(403).json({
        success: false,
        message:
          "CSRF: State-changing cookie requests require Origin, Referer, or custom client header",
        requestId: req.id,
      });
    }
  }

  // Intentionally permitted: Non-cookie programmatic requests (e.g. cURL, automated tests, server-to-server)
  // with explicit Authorization tokens or clean body payloads.
  return next();
};

export default csrfProtection;
