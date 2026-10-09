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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateCreateAdmin = (body = {}) => {
  const { username, name, email, password, role, permissions } = body;

  if (!username || typeof username !== "string" || !username.trim()) {
    return "Username is required";
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 50) {
    return "Username must be between 3 and 50 characters";
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
    return "Username may only contain letters, numbers, dots, underscores, and dashes";
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    return "Name is required";
  }

  if (email !== undefined && email !== null && email !== "") {
    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return "Please provide a valid email address";
    }
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
  const { name, email, password, role, permissions } = body;

  if (
    name !== undefined &&
    (typeof name !== "string" || !name.trim())
  ) {
    return "Name must be a valid string";
  }

  if (email !== undefined && email !== null && email !== "") {
    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return "Please provide a valid email address";
    }
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