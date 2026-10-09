import crypto from "crypto";

const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_\-.]{1,64}$/;

export const requestIdMiddleware = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  let requestId;

  if (typeof incoming === "string") {
    const trimmed = incoming.trim();
    if (SAFE_REQUEST_ID_REGEX.test(trimmed)) {
      requestId = trimmed;
    }
  }

  if (!requestId) {
    requestId = crypto.randomUUID();
  }

  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
};

export default requestIdMiddleware;
