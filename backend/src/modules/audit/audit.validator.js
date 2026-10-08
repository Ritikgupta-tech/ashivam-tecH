import mongoose from "mongoose";

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

export const validateAuditQuery = (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    actorId,
    from,
    to,
  } = req.query;

  if (!Number.isInteger(Number(page)) || Number(page) < 1) {
    return res.status(400).json({
      success: false,
      message: "Page must be a positive integer",
    });
  }

  if (
    !Number.isInteger(Number(limit)) ||
    Number(limit) < 1 ||
    Number(limit) > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Limit must be between 1 and 100",
    });
  }

  if (actorId && !isValidObjectId(actorId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid actorId",
    });
  }

  if (from && Number.isNaN(new Date(from).getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid from date",
    });
  }

  if (to && Number.isNaN(new Date(to).getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid to date",
    });
  }

  next();
};

export const validateAuditId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid audit log ID",
    });
  }

  next();
};

export const validateClearLogs = (req, res, next) => {
  const { before } = req.body;

  if (before && Number.isNaN(new Date(before).getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid before date",
    });
  }

  next();
};