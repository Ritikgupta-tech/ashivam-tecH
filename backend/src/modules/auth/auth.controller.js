import crypto from "crypto";
import mongoose from "mongoose";
import env from "../../config/env.js";
import Employee from "../employee/employee.model.js";
import {
  loginAdmin,
  getAdminById,
  getUserById,
  changeAdminPassword,
  rotateRefreshToken,
  revokeSession,
  verifyActivationToken,
  activateEmployeeAccount,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetEmployeePassword,
} from "./auth.service.js";
import {
  getRefreshTokenCookieOptions,
  getClearRefreshTokenCookieOptions,
} from "../../utils/jwt.js";

export const login = async (req, res, next) => {
  try {
    const rawUsername = req.body?.username || req.body?.identifier;
    const password = req.body?.password;
    const username = typeof rawUsername === "string" ? rawUsername : undefined;

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
    const user = await getUserById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is no longer available",
        errors: {},
        requestId: req.id,
      });
    }

    const isEmployee = user.role === "Employee";
    const userResponse = {
      id: user._id,
      name: isEmployee
        ? user.fullName || `${user.firstName} ${user.lastName}`.trim()
        : user.name,
      email: user.email || null,
      role: user.role || (isEmployee ? "Employee" : "Admin"),
      lastLoginAt: user.lastLoginAt,
    };

    if (isEmployee) {
      userResponse.employeeId = user.employeeId || user._id.toString();
      userResponse.googleEmail = user.googleEmail || user.email;
      userResponse.department = user.department;
      userResponse.designation = user.designation;
      userResponse.permissions = [];
    } else {
      userResponse.username = user.username;
      userResponse.permissions = user.permissions;
    }

    return res.status(200).json({
      success: true,
      data: {
        user: userResponse,
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

export const verifyActivation = async (req, res, next) => {
  try {
    const { token } = req.query || {};
    const result = await verifyActivationToken(token);

    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const activate = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body || {};

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Activation token is required",
        requestId: req.id,
      });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
        requestId: req.id,
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
        requestId: req.id,
      });
    }

    const clientMeta = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const result = await activateEmployeeAccount(token, password, clientMeta);

    res.cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Employee account activated successfully",
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

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const result = await requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      message: result.message,
      requestId: req.id,
      ...(result.rawToken ? { rawToken: result.rawToken } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.query || {};
    const result = await verifyPasswordResetToken(token);

    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body || {};

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Password reset token is required",
        requestId: req.id,
      });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
        requestId: req.id,
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
        requestId: req.id,
      });
    }

    const clientMeta = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const result = await resetEmployeePassword(token, password, clientMeta);

    return res.status(200).json({
      success: true,
      message: result.message,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Secure activation link helper for Superadmins to recover employee onboarding
 * if automated email delivery is restricted or delayed.
 * Zero token logging in console or application logs.
 */
export const getDevActivationLink = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const isId = mongoose.isValidObjectId(employeeId);
    const employee = await Employee.findOne({
      $or: [
        ...(isId ? [{ _id: employeeId }] : []),
        { employeeId: String(employeeId).trim().toUpperCase() },
        { email: String(employeeId).trim().toLowerCase() },
      ],
      deletedAt: null,
    }).select("+activationTokenHash");

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found", requestId: req.id });
    }

    if (employee.accountStatus === "ACTIVE") {
      return res.status(400).json({ success: false, message: "Employee account is already active", requestId: req.id });
    }

    // Generate fresh activation token and update hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    employee.activationTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    employee.activationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    employee.accountStatus = "PENDING_ACTIVATION";
    await employee.save();

    const clientBase = (env.clientUrl || "https://ashivam-tec-h.vercel.app").split(",")[0].trim().replace(/\/+$/, "");
    const activationUrl = `${clientBase}/activate-account?token=${rawToken}`;

    return res.status(200).json({
      success: true,
      data: {
        employeeId: employee.employeeId,
        email: employee.email,
        activationUrl,
        expiresAt: employee.activationTokenExpiresAt,
      },
      message: "Activation link generated successfully.",
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};