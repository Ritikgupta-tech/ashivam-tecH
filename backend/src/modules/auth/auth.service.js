import bcrypt from "bcryptjs";
import Admin from "../../models/admin.model.js";
import { generateAccessToken } from "../../utils/jwt.js";

export const loginAdmin = async (username, password) => {
  const normalizedUsername = username.trim().toLowerCase();

  const admin = await Admin.findOne({
    username: normalizedUsername,
  }).select("+passwordHash");

  if (!admin || !admin.isActive) {
    return null;
  }

  const passwordValid = await bcrypt.compare(
    password,
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
      role: admin.role,
      permissions: admin.permissions,
      lastLoginAt: admin.lastLoginAt,
    },
  };
};

export const getAdminById = async (adminId) => {
  return Admin.findById(adminId).select(
    "_id username name role permissions isActive lastLoginAt"
  );
};