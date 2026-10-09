import { loginAdmin, getAdminById } from "./auth.service.js";

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string"
    ) {
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

    const result = await loginAdmin(username, password);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        errors: {},
        requestId: req.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
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