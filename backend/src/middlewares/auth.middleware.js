import { verifyAccessToken } from "../utils/jwt.js";
import { getAdminById } from "../modules/auth/auth.service.js";

export const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        errors: {},
        requestId: req.id,
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        errors: {},
        requestId: req.id,
      });
    }

    const payload = verifyAccessToken(token);

    const admin = await getAdminById(payload.sub);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Account not found",
        errors: {},
        requestId: req.id,
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
        errors: {},
        requestId: req.id,
      });
    }

    req.user = {
      id: admin._id.toString(),
      username: admin.username,
      name: admin.name,
      email: admin.email || null,
      role: admin.role,
      permissions: admin.permissions,
      lastLoginAt: admin.lastLoginAt,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired",
        errors: {},
        requestId: req.id,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
        errors: {},
        requestId: req.id,
      });
    }

    next(error);
  }
};