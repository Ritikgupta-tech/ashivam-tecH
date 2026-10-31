import {
  loginAdmin,
  getAdminById,
  changeAdminPassword,
  rotateRefreshToken,
  revokeSession,
} from "./auth.service.js";
import {
  getRefreshTokenCookieOptions,
  getClearRefreshTokenCookieOptions,
} from "../../utils/jwt.js";

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
        errors: {},
        requestId: req.id,
      });
    }

    if (!username.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
        errors: {},
        requestId: req.id,
      });
    }

    const clientMeta = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const result = await loginAdmin(username, password, clientMeta);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        errors: {},
        requestId: req.id,
      });
    }

    // Set HttpOnly, SameSite=Strict, Secure refresh token cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing from cookie or request body",
        errors: {},
        requestId: req.id,
      });
    }

    const clientMeta = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const result = await rotateRefreshToken(rawToken, clientMeta);

    // Set newly rotated refresh token in HttpOnly cookie if regenerated
    if (result.refreshToken) {
      res.cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions());
    }

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      requestId: req.id,
    });
  } catch (error) {
    // If compromised/reused, clear the cookie
    if (error.statusCode === 401) {
      res.clearCookie("refreshToken", getClearRefreshTokenCookieOptions());
    }
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (rawToken) {
      await revokeSession(rawToken);
    }

    // Clear refresh token cookie with matching cross-site attributes
    res.clearCookie("refreshToken", getClearRefreshTokenCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentAdmin = async (req, res, next) => {
  try {
    const admin = await getAdminById(req.user.id);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is no longer available",
        errors: {},
        requestId: req.id,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          email: admin.email || null,
          role: admin.role,
          permissions: admin.permissions,
          lastLoginAt: admin.lastLoginAt,
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const adminId = req.user?.id || req.user?._id;

    const clientMeta = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const result = await changeAdminPassword(
      adminId,
      currentPassword,
      newPassword,
      clientMeta
    );

    // Set new refresh token in HttpOnly cookie
    if (result.refreshToken) {
      res.cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions());
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        accessToken: result.accessToken,
        passwordChangedAt: result.passwordChangedAt,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};