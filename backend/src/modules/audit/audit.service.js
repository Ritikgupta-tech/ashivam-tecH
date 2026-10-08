import AuditLog from "./audit.model.js";
import { escapeRegex } from "../../utils/query.js";

export const createAuditLog = async ({
  req = null,
  action,
  entity,
  entityId = null,
  description = "",
  metadata = {},
  status = "success",
  actor = null,
}) => {
  const user = actor || req?.user || null;

  return AuditLog.create({
    actor: {
      userId: user?.id || user?._id || null,
      username: user?.username || null,
      role: user?.role || null,
    },

    action,
    entity,
    entityId,
    description,
    metadata,
    status,

    request: {
      method: req?.method || null,
      path: req?.originalUrl || req?.path || null,
      ip:
        req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req?.ip ||
        req?.socket?.remoteAddress ||
        null,
      userAgent: req?.headers?.["user-agent"] || null,
    },
  });
};

export const listAuditLogs = async ({
  page = 1,
  limit = 20,
  search = "",
  action = "",
  entity = "",
  status = "",
  actorId = "",
  from = "",
  to = "",
  sort = "createdAt",
  order = "desc",
}) => {
  const currentPage = Math.max(Number(page), 1);
  const currentLimit = Math.min(Math.max(Number(limit), 1), 100);

  const filter = {};

  if (search) {
    const escaped = escapeRegex(search.trim());
    filter.$or = [
      { action: { $regex: escaped, $options: "i" } },
      { entity: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
      { "actor.username": { $regex: escaped, $options: "i" } },
    ];
  }

  if (action) {
    filter.action = action;
  }

  if (entity) {
    filter.entity = entity;
  }

  if (status) {
    filter.status = status;
  }

  if (actorId) {
    filter["actor.userId"] = actorId;
  }

  if (from || to) {
    filter.createdAt = {};

    if (from) {
      filter.createdAt.$gte = new Date(from);
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const allowedSortFields = [
    "createdAt",
    "action",
    "entity",
    "status",
  ];

  const safeSort = allowedSortFields.includes(sort)
    ? sort
    : "createdAt";

  const safeOrder = order === "asc" ? 1 : -1;

  const skip = (currentPage - 1) * currentLimit;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ [safeSort]: safeOrder })
      .skip(skip)
      .limit(currentLimit)
      .lean(),

    AuditLog.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages: Math.ceil(total / currentLimit),
      hasNextPage: currentPage * currentLimit < total,
      hasPreviousPage: currentPage > 1,
    },
  };
};

export const getAuditLogById = async (id) => {
  return AuditLog.findById(id).lean();
};

export const deleteAuditLog = async (id) => {
  return AuditLog.findByIdAndDelete(id);
};

export const clearAuditLogs = async ({ before } = {}) => {
  const filter = {};

  if (before) {
    filter.createdAt = {
      $lt: new Date(before),
    };
  }

  return AuditLog.deleteMany(filter);
};