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