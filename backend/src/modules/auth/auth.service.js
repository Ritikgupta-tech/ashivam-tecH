import bcrypt from "bcryptjs";
import Admin from "../../models/admin.model.js";
import { generateAccessToken } from "../../utils/jwt.js";

// Precomputed valid bcrypt hash for timing attack mitigation (cost factor 10)
const DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB8t6dJmD3kZcZ0nL5o2b3C4f9ye";

export const loginAdmin = async (username, password) => {
  const normalizedUsername = (username || "").trim().toLowerCase();

  const admin = await Admin.findOne({
    username: normalizedUsername,
  }).select("+passwordHash");

  if (!admin || !admin.isActive) {
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

  return {
    accessToken,
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
};

export const getAdminById = async (adminId) => {
  return Admin.findById(adminId).select(
    "_id username name email role permissions isActive lastLoginAt passwordChangedAt"
  );
};