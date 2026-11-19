import crypto from "crypto";
import bcrypt from "bcryptjs";
import Admin from "../../models/admin.model.js";
import Employee from "../employee/employee.model.js";
import RefreshToken from "../../models/refreshToken.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../../utils/jwt.js";

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

  if (employee && employee.isActive && employee.passwordHash) {
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

  if (!user || !user.isActive) {
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

  const admin = await Admin.findById(adminId).select("+passwordHash");
  if (!admin || !admin.isActive) {
    const error = new Error("Admin account not found or inactive");
    error.statusCode = 401;
    throw error;
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!isCurrentValid) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  admin.passwordHash = await bcrypt.hash(newPassword, salt);
  admin.passwordChangedAt = new Date();
  await admin.save();

  // Invalidate ALL existing refresh tokens for this user across all families
  await RefreshToken.updateMany(
    { userId: admin._id },
    { $set: { isRevoked: true } }
  );

  // Issue new access token and fresh refresh token family
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
    message: "Password changed successfully",
    accessToken,
    refreshToken: rawRefreshToken,
    passwordChangedAt: admin.passwordChangedAt,
  };
};