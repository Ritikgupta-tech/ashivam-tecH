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
      });
    }

    if (!username.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const result = await loginAdmin(username, password);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
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
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          role: admin.role,
          permissions: admin.permissions,
          lastLoginAt: admin.lastLoginAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};