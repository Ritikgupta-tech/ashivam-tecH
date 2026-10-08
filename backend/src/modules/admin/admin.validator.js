const ROLES = ["Superadmin", "Admin"];

const PERMISSIONS = [
  "dashboard",
  "admins",
  "users",
  "content",
  "settings",
  "inquiries",
  "careers",
  "media",
  "employees",
  "audit",
  "notifications",
];

export const validateCreateAdmin = (body = {}) => {
  const { username, name, password, role, permissions } = body;

  if (!username || typeof username !== "string") {
    return "Username is required";
  }

  if (!name || typeof name !== "string") {
    return "Name is required";
  }

  if (!password || typeof password !== "string") {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (role && !ROLES.includes(role)) {
    return "Invalid role";
  }

  if (
    permissions &&
    (!Array.isArray(permissions) ||
      permissions.some((permission) => !PERMISSIONS.includes(permission)))
  ) {
    return "Invalid permissions";
  }

  return null;
};

export const validateUpdateAdmin = (body = {}) => {
  const { name, password, role, permissions } = body;

  if (
    name !== undefined &&
    (typeof name !== "string" || !name.trim())
  ) {
    return "Name must be a valid string";
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 8) {
      return "Password must be at least 8 characters";
    }
  }

  if (role !== undefined && !ROLES.includes(role)) {
    return "Invalid role";
  }

  if (
    permissions !== undefined &&
    (!Array.isArray(permissions) ||
      permissions.some((permission) => !PERMISSIONS.includes(permission)))
  ) {
    return "Invalid permissions";
  }

  return null;
};

export { ROLES, PERMISSIONS };