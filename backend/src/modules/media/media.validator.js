const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const validateMediaFile = (file) => {
  if (!file) {
    const error = new Error("Media file is required");
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error(
      "Unsupported file type. Allowed types: JPEG, PNG, WEBP, SVG and PDF"
    );

    error.statusCode = 400;
    throw error;
  }

  if (file.size > MAX_FILE_SIZE) {
    const error = new Error(
      "File size must not exceed 10 MB"
    );

    error.statusCode = 400;
    throw error;
  }

  // Defend against Stored XSS, XXE, and active content injection in SVG uploads
  const contentSample = Buffer.isBuffer(file.buffer)
    ? file.buffer.slice(0, 512).toString("utf8").trim().toLowerCase()
    : "";
  const hasSvgSignature =
    contentSample.includes("<svg") ||
    (contentSample.startsWith("<?xml") && contentSample.includes("<svg"));

  const isSvg =
    file.mimetype === "image/svg+xml" ||
    (typeof file.originalname === "string" &&
      file.originalname.toLowerCase().endsWith(".svg")) ||
    hasSvgSignature;

  if (isSvg && Buffer.isBuffer(file.buffer)) {
    const rawContent = file.buffer.toString("utf8");

    // 1. Block null bytes
    if (rawContent.includes("\0")) {
      const error = new Error("SVG file contains invalid null byte characters");
      error.statusCode = 400;
      throw error;
    }

    // 2. Block XML External Entity (XXE), DTD injection, and xml-stylesheet processing instructions
    if (/(<!(DOCTYPE|ENTITY)[\s/>]|<\?xml-stylesheet)/i.test(rawContent)) {
      const error = new Error(
        "SVG files containing XML DTD, entity declarations, or xml-stylesheet instructions are forbidden for security reasons"
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Block dangerous executable and embedding tags (supporting optional namespace prefixes and slash delimiters)
    if (
      /<([a-zA-Z0-9_\-]+:)?(script|foreignObject|iframe|embed|object|use|set|animate|animateMotion|animateTransform|handler|listener|discard|meta|link|base|applet|form|input|button|feImage)[\s/>]/i.test(
        rawContent
      )
    ) {
      const error = new Error(
        "SVG files containing executable scripts or active event handlers are forbidden for security reasons"
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Block ANY active event handlers (supporting slash and whitespace delimiters: <svg onload= or <svg/onload=)
    if (/[\s/]on[a-zA-Z\-_]+\s*=/i.test(rawContent)) {
      const error = new Error(
        "SVG files containing executable scripts or active event handlers are forbidden for security reasons"
      );
      error.statusCode = 400;
      throw error;
    }

    // 5. Block dangerous CSS vectors: @import, expression(), behavior, -moz-binding, external url() references
    if (
      /(@import|expression\s*\(|behavior\s*:|-moz-binding\s*:|url\s*\(\s*['"]?(https?:|\/\/|javascript:|data:))/i.test(
        rawContent
      )
    ) {
      const error = new Error(
        "SVG files containing external stylesheets, CSS expressions, or remote resources are forbidden for security reasons"
      );
      error.statusCode = 400;
      throw error;
    }

    // 6. Decode numeric and hex XML entities to detect obfuscated URI schemes
    const decoded = rawContent.replace(
      /&#(x[0-9a-f]+|[0-9]+);?/gi,
      (match, code) => {
        try {
          const num =
            code.startsWith("x") || code.startsWith("X")
              ? parseInt(code.slice(1), 16)
              : parseInt(code, 10);
          return String.fromCharCode(num);
        } catch {
          return "";
        }
      }
    );

    // Strip whitespace and control characters to detect split protocols like java\nscript:
    const stripped = decoded.replace(/[\x00-\x20]/g, "");

    // 7. Block dangerous protocol schemes and executable data URIs
    if (
      /javascript:/i.test(stripped) ||
      /vbscript:/i.test(stripped) ||
      /data:(?!image\/(png|jpeg|jpg|webp);base64,)/i.test(stripped)
    ) {
      const error = new Error(
        "SVG files containing executable scripts or active event handlers are forbidden for security reasons"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return true;
};

export const getMediaCategory = (mimeType) => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf") {
    return "document";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "other";
};

export const validateMediaQuery = ({
  page = 1,
  limit = 20,
}) => {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  if (
    !Number.isInteger(parsedPage) ||
    parsedPage < 1
  ) {
    const error = new Error(
      "Page must be a positive integer"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 100
  ) {
    const error = new Error(
      "Limit must be between 1 and 100"
    );

    error.statusCode = 400;
    throw error;
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
  };
};