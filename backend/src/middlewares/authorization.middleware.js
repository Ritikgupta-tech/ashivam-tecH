export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        errors: {},
        requestId: req.id,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        errors: {},
        requestId: req.id,
      });
    }

    next();
  };
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        errors: {},
        requestId: req.id,
      });
    }

    if (req.user.role === "Superadmin") {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        errors: {},
        requestId: req.id,
      });
    }

    next();
  };
};