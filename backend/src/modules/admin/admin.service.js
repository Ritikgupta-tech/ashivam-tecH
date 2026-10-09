import bcrypt from "bcryptjs";
import Admin from "../../models/admin.model.js";

const ADMIN_PROJECTION =
  "_id username name email role permissions isActive lastLoginAt createdAt updatedAt";

const normalizeUsername = (username) =>
  username.trim().toLowerCase();

export const listAdmins = async ({ page = 1, limit = 20 }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (safePage - 1) * safeLimit;

  const [admins, total] = await Promise.all([
    Admin.find()
      .select(ADMIN_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Admin.countDocuments(),
  ]);

  return {
    admins,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const getAdmin = async (adminId) => {
  return Admin.findById(adminId)
    .select(ADMIN_PROJECTION)
    .lean();
};

export const createAdmin = async ({
  username,
  name,
  email,
  password,
  role = "Admin",
  permissions = [],
}) => {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = email && typeof email === "string" ? email.trim().toLowerCase() : null;

  const duplicateCheck = [{ username: normalizedUsername }];
  if (normalizedEmail) {
    duplicateCheck.push({ email: normalizedEmail });
  }

  const existingAdmin = await Admin.findOne({ $or: duplicateCheck });

  if (existingAdmin) {
    const isUsernameMatch = existingAdmin.username === normalizedUsername;
    const error = new Error(
      isUsernameMatch ? "Username already exists" : "Email already exists"
    );
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await Admin.create({
    username: normalizedUsername,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    permissions,
    isActive: true,
  });

  return getAdmin(admin._id);
};

export const updateAdmin = async (adminId, updates) => {
  const admin = await Admin.findById(adminId);

  if (!admin) {
    return null;
  }

  if (updates.name !== undefined) {
    admin.name = updates.name.trim();
  }

  if (updates.email !== undefined) {
    const normalizedEmail = updates.email && typeof updates.email === "string" ? updates.email.trim().toLowerCase() : null;
    if (normalizedEmail) {
      const existingWithEmail = await Admin.findOne({
        email: normalizedEmail,
        _id: { $ne: adminId },
      });
      if (existingWithEmail) {
        const error = new Error("Email already in use by another administrator");
        error.statusCode = 409;
        throw error;
      }
    }
    admin.email = normalizedEmail;
  }

  if (updates.password !== undefined) {
    admin.passwordHash = await bcrypt.hash(updates.password, 12);
  }

  if (updates.role !== undefined) {
    admin.role = updates.role;
  }

  if (updates.permissions !== undefined) {
    admin.permissions = updates.permissions;
  }

  await admin.save();

  return getAdmin(admin._id);
};

export const updateAdminStatus = async (
  adminId,
  isActive,
  currentAdminId
) => {
  if (adminId === currentAdminId && !isActive) {
    const error = new Error(
      "You cannot deactivate your own account"
    );
    error.statusCode = 400;
    throw error;
  }

  const admin = await Admin.findById(adminId);

  if (!admin) {
    return null;
  }

  if (
    admin.role === "Superadmin" &&
    admin.isActive &&
    !isActive
  ) {
    const activeSuperadmins = await Admin.countDocuments({
      role: "Superadmin",
      isActive: true,
    });

    if (activeSuperadmins <= 1) {
      const error = new Error(
        "At least one active Superadmin is required"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  admin.isActive = isActive;
  await admin.save();

  return getAdmin(admin._id);
};

export const updateAdminRole = async (
  adminId,
  role,
  currentAdminId
) => {
  if (adminId === currentAdminId && role !== "Superadmin") {
    const error = new Error(
      "You cannot remove your own Superadmin role"
    );
    error.statusCode = 400;
    throw error;
  }

  const admin = await Admin.findById(adminId);

  if (!admin) {
    return null;
  }

  if (
    admin.role === "Superadmin" &&
    role !== "Superadmin" &&
    admin.isActive
  ) {
    const activeSuperadmins = await Admin.countDocuments({
      role: "Superadmin",
      isActive: true,
    });

    if (activeSuperadmins <= 1) {
      const error = new Error(
        "At least one active Superadmin is required"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  admin.role = role;
  await admin.save();

  return getAdmin(admin._id);
};

export const updateAdminPermissions = async (
  adminId,
  permissions
) => {
  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { permissions },
    { new: true }
  ).select(ADMIN_PROJECTION);

  return admin;
};

export const deleteAdmin = async (
  adminId,
  currentAdminId
) => {
  if (adminId === currentAdminId) {
    const error = new Error(
      "You cannot delete your own account"
    );
    error.statusCode = 400;
    throw error;
  }

  const admin = await Admin.findById(adminId);

  if (!admin) {
    return null;
  }

  if (admin.role === "Superadmin" && admin.isActive) {
    const activeSuperadmins = await Admin.countDocuments({
      role: "Superadmin",
      isActive: true,
    });

    if (activeSuperadmins <= 1) {
      const error = new Error(
        "At least one active Superadmin is required"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  await Admin.deleteOne({ _id: adminId });

  return true;
};