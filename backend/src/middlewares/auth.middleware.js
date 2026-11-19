import { verifyAccessToken } from "../utils/jwt.js";
import { getUserById } from "../modules/auth/auth.service.js";

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

    const user = await getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found",
        errors: {},
        requestId: req.id,
      });
    }

    const isEmployee = user.role === "Employee";

    if (
      !user.isActive ||
      (isEmployee &&
        (user.accountStatus === "DEACTIVATED" || user.accountStatus === "SUSPENDED"))
    ) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
        errors: {},
        requestId: req.id,
      });
    }

    if (user.passwordChangedAt) {
      const changedTimestamp = Math.floor(
        user.passwordChangedAt.getTime() / 1000
      );
      if (payload.iat && payload.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: "Password was changed recently. Please log in again.",
          errors: {},
          requestId: req.id,
        });
      }
    }

    req.user = {
      id: user._id.toString(),
      name: isEmployee
        ? user.fullName || `${user.firstName} ${user.lastName}`.trim()
        : user.name,
      email: user.email || null,
      role: user.role || (isEmployee ? "Employee" : "Admin"),
      permissions: user.permissions || [],
      lastLoginAt: user.lastLoginAt,
    };

    if (isEmployee) {
      req.user.employeeId = user.employeeId || user._id.toString();
      req.user.googleEmail = user.googleEmail || user.email;
      req.user.department = user.department;
      req.user.designation = user.designation;
    } else {
      req.user.username = user.username;
    }

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