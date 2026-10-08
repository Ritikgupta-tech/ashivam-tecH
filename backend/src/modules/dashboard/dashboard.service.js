import Admin from "../../models/admin.model.js";

import Inquiry from "../inquiry/inquiry.model.js";

import Job from "../career/job.model.js";
import Application from "../career/application.model.js";

import Content from "../content/content.model.js";

import Media from "../media/media.model.js";

import Notification from "../notification/notification.model.js";

import AuditLog from "../audit/audit.model.js";

const countDocuments = async (Model, filter = {}) => {
  if (!Model) {
    return 0;
  }

  return Model.countDocuments(filter);
};

/*
 * Get dashboard overview
 */
export const getOverview = async () => {
  const [
    admins,
    inquiries,
    jobs,
    applications,
    content,
    media,
    notifications,
    auditLogs,
  ] = await Promise.all([
    countDocuments(Admin),
    countDocuments(Inquiry),
    countDocuments(Job),
    countDocuments(Application),
    countDocuments(Content),
    countDocuments(Media),
    countDocuments(Notification),
    countDocuments(AuditLog),
  ]);

  return {
    admins,
    inquiries,
    jobs,
    applications,
    content,
    media,
    notifications,
    auditLogs,
  };
};

/*
 * Get dashboard summary for current admin
 */
export const getDashboardSummary = async (adminId) => {
  if (!adminId) {
    const error = new Error("Authenticated admin not found");
    error.statusCode = 401;
    throw error;
  }

  const admin = await Admin.findById(adminId)
    .select(
      "_id username name role permissions isActive lastLoginAt createdAt"
    )
    .lean();

  if (!admin) {
    const error = new Error("Admin not found");
    error.statusCode = 404;
    throw error;
  }

  const overview = await getOverview();

  return {
    summary: overview,
    user: admin,
  };
};

/*
 * Get recent activity
 */
export const getRecentActivity = async ({
  limit = 10,
} = {}) => {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    50
  );

  const items = await AuditLog.find()
    .sort({
      createdAt: -1,
    })
    .limit(safeLimit)
    .lean();

  return {
    items,
    count: items.length,
  };
};

/*
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  const overview = await getOverview();

  return {
    ...overview,
    generatedAt: new Date(),
  };
};