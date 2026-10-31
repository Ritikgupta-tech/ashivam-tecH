import crypto from "crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

export const generateAccessToken = (admin) => {
  return jwt.sign(
    {
      sub: admin._id.toString(),
      username: admin.username,
      role: admin.role,
    },
    env.jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: env.jwtExpiresIn || "15m",
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
};

/**
 * Generates a high-entropy cryptographically random refresh token.
 */
export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

/**
 * Creates a deterministic HMAC-SHA-256 hash of a refresh token using the dedicated JWT_REFRESH_SECRET.
 */
export const hashToken = (token) => {
  const secret = env.jwtRefreshSecret || env.jwtSecret || "default-refresh-secret-seed";
  return crypto.createHmac("sha256", secret).update(String(token)).digest("hex");
};

/**
 * Returns security-hardened options for the HttpOnly refresh token cookie.
 * In cross-site production (Vercel frontend on vercel.app + Render backend on onrender.com),
 * sameSite MUST be "none" with secure: true to allow browser transmission over cross-site fetch.
 */
export const getRefreshTokenCookieOptions = () => {
  const isProd = env.isProduction;
  const sameSite = env.cookieSameSite || (isProd ? "none" : "lax");
  const secure = sameSite === "none" ? true : (env.cookieSecure !== undefined ? env.cookieSecure : isProd);

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };
};

/**
 * Returns identical cookie attributes for res.clearCookie to guarantee browser deletion.
 */
export const getClearRefreshTokenCookieOptions = () => {
  const options = getRefreshTokenCookieOptions();
  delete options.maxAge;
  return options;
};