import crypto from "crypto";
import bcrypt from "bcryptjs";
import Admin from "../../models/admin.model.js";
import Employee from "../employee/employee.model.js";
import RefreshToken from "../../models/refreshToken.model.js";
import env from "../../config/env.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../../utils/jwt.js";
import {
  sendEmployeePasswordReset,
  sendEmployeePasswordResetConfirmation,
} from "../notification/email.service.js";

// Precomputed valid bcrypt hash for timing attack mitigation (cost factor 10)
const DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB8t6dJmD3kZcZ0nL5o2b3C4f9ye";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const loginAdmin = async (identifier, password, clientMeta = {}) => {
  const normalizedIdentifier = (identifier || "").trim().toLowerCase();

  // 1. Check Admin by username or email
  const admin = await Admin.findOne({
    $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }],
  }).select("+passwordHash");

  if (admin) {
    if (!admin.isActive) {
      await bcrypt.compare(password || "", DUMMY_HASH);
      return null;
    }

    const passwordValid = await bcrypt.compare(
      password || "",
      admin.passwordHash
    );

    if (!passwordValid) {
      return null;
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const accessToken = generateAccessToken(admin);
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await RefreshToken.create({
      userId: admin._id,
      familyId,
      tokenHash,
      isRevoked: false,
      expiresAt,
      createdByIp: clientMeta.ip || null,
      userAgent: clientMeta.userAgent || null,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      familyId,
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email || null,
        role: admin.role,
        permissions: admin.permissions,
        lastLoginAt: admin.lastLoginAt,
      },
    };
  }

  // 2. Check Employee by email, employeeId, or googleEmail
  const employee = await Employee.findOne({
    $or: [
      { email: normalizedIdentifier },
      { employeeId: normalizedIdentifier.toUpperCase() },
      { googleEmail: normalizedIdentifier },
    ],
    deletedAt: null,
  }).select("+passwordHash");

  if (employee) {
    if (employee.accountStatus === "INVITED" || employee.accountStatus === "PENDING_ACTIVATION") {
      const error = new Error(
        "Your account is pending activation. Please check your official email for the activation link."
      );
      error.statusCode = 403;
      error.code = "PENDING_ACTIVATION";
      throw error;
    }

    if (employee.accountStatus === "SUSPENDED") {
      const error = new Error(
        "Your employee account has been suspended. Please contact IT administration."
      );
      error.statusCode = 403;
      error.code = "ACCOUNT_SUSPENDED";
      throw error;
    }

    if (
      employee.accountStatus === "DEACTIVATED" ||
      employee.employmentStatus === "TERMINATED" ||
      !employee.isActive
    ) {
      await bcrypt.compare(password || "", DUMMY_HASH);
      return null;
    }

    if (!employee.passwordHash) {
      const error = new Error(
        "Account credentials are not configured. Please activate your account via your invitation email."
      );
      error.statusCode = 403;
      error.code = "NOT_ACTIVATED";
      throw error;
    }

    const passwordValid = await bcrypt.compare(
      password || "",
      employee.passwordHash
    );

    if (!passwordValid) {
      return null;
    }

    employee.lastLoginAt = new Date();
    await employee.save();

    const accessToken = generateAccessToken(employee);
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await RefreshToken.create({
      userId: employee._id,
      familyId,
      tokenHash,
      isRevoked: false,
      expiresAt,
      createdByIp: clientMeta.ip || null,
      userAgent: clientMeta.userAgent || null,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      familyId,
      user: {
        id: employee._id,
        employeeId: employee.employeeId || employee._id.toString(),
        name: employee.fullName || `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.email,
        googleEmail: employee.googleEmail || employee.email,
        role: "Employee",
        department: employee.department,
        designation: employee.designation,
        permissions: [],
        lastLoginAt: employee.lastLoginAt,
      },
    };
  }

  // 3. Fallback dummy hash comparison for timing attack defense
  await bcrypt.compare(password || "", DUMMY_HASH);
  return null;
};

export const getAdminById = async (adminId) => {
  return Admin.findById(adminId).select(
    "_id username name email role permissions isActive lastLoginAt passwordChangedAt"
  );
};

export const getUserById = async (userId) => {
  const admin = await Admin.findById(userId).select(
    "_id username name email role permissions isActive lastLoginAt passwordChangedAt"
  );
  if (admin) return admin;
  return Employee.findOne({ _id: userId, deletedAt: null }).select(
    "_id firstName lastName email employeeId googleEmail department designation role isActive lastLoginAt passwordChangedAt"
  );
};

/**
 * Rotates an active refresh token with automatic reuse/replay attack detection.
 * If a previously used/revoked token is re-submitted, ALL tokens in that family are revoked immediately.
 */
export const rotateRefreshToken = async (rawRefreshToken, clientMeta = {}) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    const error = new Error("Refresh token is required");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashToken(rawRefreshToken.trim());
  const tokenRecord = await RefreshToken.findOne({ tokenHash });

  if (!tokenRecord) {
    const error = new Error("Invalid or unverified refresh token");
    error.statusCode = 401;
    throw error;
  }

  // REPLAY / REUSE ATTACK DETECTION
  if (tokenRecord.isRevoked) {
    // Invalidate the ENTIRE token family lineage
    await RefreshToken.updateMany(
      { familyId: tokenRecord.familyId },
      { $set: { isRevoked: true } }
    );

    const error = new Error(
      "Compromised or reused refresh token detected. Entire session revoked."
    );
    error.statusCode = 401;
    throw error;
  }

  // Check expiration
  if (tokenRecord.expiresAt < new Date()) {
    tokenRecord.isRevoked = true;
    await tokenRecord.save();

    const error = new Error("Refresh token expired. Please log in again.");
    error.statusCode = 401;
    throw error;
  }

  // Validate that the underlying user (Admin or Employee) is still active
  let user = await Admin.findById(tokenRecord.userId);
  let userType = "Admin";

  if (!user) {
    user = await Employee.findOne({ _id: tokenRecord.userId, deletedAt: null });
    userType = "Employee";
  }

  if (
    !user ||
    !user.isActive ||
    (userType === "Employee" &&
      (user.accountStatus === "DEACTIVATED" || user.accountStatus === "SUSPENDED"))
  ) {
    tokenRecord.isRevoked = true;
    await tokenRecord.save();

    const error = new Error("Account is inactive or no longer exists");
    error.statusCode = 403;
    throw error;
  }

  // Invalidate the current token (single-use rotation)
  tokenRecord.isRevoked = true;
  await tokenRecord.save();

  // Issue new access token (15m) and new refresh token (7d) within the SAME family
  const newAccessToken = generateAccessToken(user);
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    userId: user._id,
    familyId: tokenRecord.familyId,
    tokenHash: newTokenHash,
    isRevoked: false,
    expiresAt: newExpiresAt,
    createdByIp: clientMeta.ip || null,
    userAgent: clientMeta.userAgent || null,
  });

  const responseUser = {
    id: user._id,
    name: userType === "Employee" ? `${user.firstName} ${user.lastName}`.trim() : user.name,
    email: user.email || null,
    role: user.role || (userType === "Employee" ? "Employee" : "Admin"),
    lastLoginAt: user.lastLoginAt,
  };

  if (userType === "Employee") {
    responseUser.employeeId = user.employeeId || user._id.toString();
    responseUser.googleEmail = user.googleEmail || user.email;
    responseUser.department = user.department;
    responseUser.designation = user.designation;
    responseUser.permissions = [];
  } else {
    responseUser.username = user.username;
    responseUser.permissions = user.permissions;
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    user: responseUser,
  };
};

/**
 * Revokes all refresh tokens belonging to the specified session.
 */
export const revokeSession = async (rawRefreshToken) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    return false;
  }

  const tokenHash = hashToken(rawRefreshToken.trim());
  const tokenRecord = await RefreshToken.findOne({ tokenHash });

  if (tokenRecord) {
    await RefreshToken.updateMany(
      { familyId: tokenRecord.familyId },
      { $set: { isRevoked: true } }
    );
    return true;
  }

  return false;
};

export const changeAdminPassword = async (
  adminId,
  currentPassword,
  newPassword,
  clientMeta = {}
) => {
  if (!currentPassword || !newPassword) {
    const error = new Error("Current password and new password are required");
    error.statusCode = 400;
    throw error;
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    const error = new Error("New password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error("New password must be different from current password");
    error.statusCode = 400;
    throw error;
  }

  let account = await Admin.findById(adminId).select("+passwordHash");
  let isEmployee = false;
  if (!account) {
    account = await Employee.findById(adminId).select("+passwordHash");
    isEmployee = Boolean(account);
  }

  if (!account || !account.isActive || (isEmployee && account.accountStatus !== "ACTIVE")) {
    const error = new Error("Account not found, inactive, or not activated");
    error.statusCode = 401;
    throw error;
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!isCurrentValid) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  account.passwordHash = await bcrypt.hash(newPassword, salt);
  account.passwordChangedAt = new Date();
  await account.save();

  // Invalidate ALL existing refresh tokens for this user across all families
  await RefreshToken.updateMany(
    { userId: account._id },
    { $set: { isRevoked: true } }
  );

  // Issue new access token and fresh refresh token family
  const accessToken = generateAccessToken(account);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    userId: account._id,
    familyId,
    tokenHash,
    isRevoked: false,
    expiresAt,
    createdByIp: clientMeta.ip || null,
    userAgent: clientMeta.userAgent || null,
  });

  return {
    message: "Password changed successfully",
    accessToken,
    refreshToken: rawRefreshToken,
    passwordChangedAt: account.passwordChangedAt,
  };
};

/**
 * Validates a single-use employee activation token and returns public invitation details.
 */
export const verifyActivationToken = async (rawToken) => {
  if (!rawToken || typeof rawToken !== "string") {
    const error = new Error("Activation token is required");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
  const employee = await Employee.findOne({
    activationTokenHash: tokenHash,
    deletedAt: null,
  }).select("+activationTokenHash");

  if (!employee) {
    const error = new Error("Invalid or unverified activation link");
    error.statusCode = 400;
    throw error;
  }

  if (employee.accountStatus === "ACTIVE") {
    const error = new Error(
      "This employee account has already been activated. Please log in directly."
    );
    error.statusCode = 400;
    error.code = "ALREADY_ACTIVE";
    throw error;
  }

  if (employee.activationTokenExpiresAt && employee.activationTokenExpiresAt < new Date()) {
    const error = new Error(
      "Activation link has expired. Please contact IT administration to request a new invitation."
    );
    error.statusCode = 400;
    error.code = "TOKEN_EXPIRED";
    throw error;
  }

  return {
    valid: true,
    employee: {
      id: employee._id,
      name: employee.fullName || `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
      employeeId: employee.employeeId,
      designation: employee.designation,
      department: employee.department,
    },
  };
};

/**
 * Activates an employee account, hashes their new password, and issues initial session tokens.
 */
export const activateEmployeeAccount = async (rawToken, password, clientMeta = {}) => {
  if (!rawToken || typeof rawToken !== "string") {
    const error = new Error("Activation token is required");
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    const error = new Error("Password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
  const employee = await Employee.findOne({
    activationTokenHash: tokenHash,
    deletedAt: null,
  }).select("+activationTokenHash");

  if (!employee) {
    const error = new Error("Invalid or unverified activation link");
    error.statusCode = 400;
    throw error;
  }

  if (employee.accountStatus === "ACTIVE") {
    const error = new Error(
      "This employee account has already been activated. Please log in directly."
    );
    error.statusCode = 400;
    error.code = "ALREADY_ACTIVE";
    throw error;
  }

  if (employee.activationTokenExpiresAt && employee.activationTokenExpiresAt < new Date()) {
    const error = new Error(
      "Activation link has expired. Please contact IT administration to request a new invitation."
    );
    error.statusCode = 400;
    error.code = "TOKEN_EXPIRED";
    throw error;
  }

  const salt = await bcrypt.genSalt(12);
  employee.passwordHash = await bcrypt.hash(password, salt);
  employee.accountStatus = "ACTIVE";
  employee.employmentStatus = "ACTIVE";
  employee.isActive = true;
  employee.isEmailVerified = true;
  employee.activationTokenHash = null;
  employee.activationTokenExpiresAt = null;
  employee.passwordChangedAt = new Date();
  employee.lastLoginAt = new Date();
  await employee.save();

  const accessToken = generateAccessToken(employee);
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    userId: employee._id,
    familyId,
    tokenHash: refreshTokenHash,
    isRevoked: false,
    expiresAt,
    createdByIp: clientMeta.ip || null,
    userAgent: clientMeta.userAgent || null,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: employee._id,
      employeeId: employee.employeeId || employee._id.toString(),
      name: employee.fullName || `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
      googleEmail: employee.googleEmail || employee.email,
      role: "Employee",
      department: employee.department,
      designation: employee.designation,
      permissions: [],
      lastLoginAt: employee.lastLoginAt,
    },
  };
};

/**
 * Initiates an email password reset request for an active employee.
 * Returns a generic success response to prevent account enumeration.
 */
export const requestPasswordReset = async (email) => {
  if (!email || typeof email !== "string") {
    return {
      success: true,
      message:
        "If an active account associated with that email exists, password reset instructions have been sent.",
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const employee = await Employee.findOne({
    email: cleanEmail,
    deletedAt: null,
  }).select("+resetPasswordTokenHash");

  if (employee && employee.accountStatus === "ACTIVE" && employee.isActive) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    employee.resetPasswordTokenHash = tokenHash;
    employee.resetPasswordExpiresAt = expiresAt;
    employee.resetPasswordSentAt = new Date();
    await employee.save();

    try {
      await sendEmployeePasswordReset({
        employee,
        rawToken,
      });
    } catch (err) {
      if (!env.isTest) {
        console.warn(`[Auth Service] Password reset email dispatch failed for ${cleanEmail}:`, err.message);
      }
    }

    return {
      success: true,
      message:
        "If an active account associated with that email exists, password reset instructions have been sent.",
      ...(env.isTest ? { rawToken } : {}),
    };
  }

  return {
    success: true,
    message:
      "If an active account associated with that email exists, password reset instructions have been sent.",
  };
};

/**
 * Verifies the validity of an unexpired password reset token.
 */
export const verifyPasswordResetToken = async (rawToken) => {
  if (!rawToken || typeof rawToken !== "string") {
    const error = new Error("Password reset token is required");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
  const employee = await Employee.findOne({
    resetPasswordTokenHash: tokenHash,
    deletedAt: null,
  }).select("+resetPasswordTokenHash");

  if (!employee) {
    const error = new Error("Invalid or expired password reset link");
    error.statusCode = 400;
    throw error;
  }

  if (employee.resetPasswordExpiresAt && employee.resetPasswordExpiresAt < new Date()) {
    const error = new Error(
      "Password reset link has expired. Please submit a new password reset request."
    );
    error.statusCode = 400;
    error.code = "TOKEN_EXPIRED";
    throw error;
  }

  return {
    valid: true,
    email: employee.email,
  };
};

/**
 * Resets an employee password using a valid single-use reset token and revokes all active sessions.
 */
export const resetEmployeePassword = async (rawToken, password, clientMeta = {}) => {
  if (!rawToken || typeof rawToken !== "string") {
    const error = new Error("Password reset token is required");
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    const error = new Error("Password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
  const employee = await Employee.findOne({
    resetPasswordTokenHash: tokenHash,
    deletedAt: null,
  }).select("+resetPasswordTokenHash");

  if (!employee) {
    const error = new Error("Invalid or expired password reset link");
    error.statusCode = 400;
    throw error;
  }

  if (employee.resetPasswordExpiresAt && employee.resetPasswordExpiresAt < new Date()) {
    const error = new Error(
      "Password reset link has expired. Please submit a new password reset request."
    );
    error.statusCode = 400;
    error.code = "TOKEN_EXPIRED";
    throw error;
  }

  const salt = await bcrypt.genSalt(12);
  employee.passwordHash = await bcrypt.hash(password, salt);
  employee.passwordChangedAt = new Date();
  employee.resetPasswordTokenHash = null;
  employee.resetPasswordExpiresAt = null;
  await employee.save();

  // Invalidate ALL existing refresh tokens for this user across all sessions
  await RefreshToken.updateMany(
    { userId: employee._id },
    { $set: { isRevoked: true } }
  );

  // Dispatch confirmation email
  try {
    await sendEmployeePasswordResetConfirmation({ employee });
  } catch (err) {
    if (!env.isTest) {
      console.warn(`[Auth Service] Password reset confirmation email failed for ${employee.email}:`, err.message);
    }
  }

  return {
    success: true,
    message: "Password reset successfully. You may now log in with your new credentials.",
  };
};