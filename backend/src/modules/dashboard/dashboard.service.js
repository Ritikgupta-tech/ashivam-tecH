import Admin from "../../models/admin.model.js";

import Inquiry from "../inquiry/inquiry.model.js";

import Job from "../career/job.model.js";
import Application from "../career/application.model.js";
import Internship from "../internship/internship.model.js";
import Employee from "../employee/employee.model.js";
import HRDocument from "../hr-document/hrDocument.model.js";

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
    internships,
    employees,
    hrDocuments,
    content,
    media,
    notifications,
    auditLogs,
    // Status breakdowns
    inquiriesNew,
    inquiriesInProgress,
    inquiriesResolved,
    inquiriesClosed,
    jobsActive,
    jobsClosed,
    appsApplied,
    appsUnderReview,
    appsShortlisted,
    appsRejected,
    appsHired,
    internsApplied,
    internsUnderReview,
    internsSelected,
    internsInProgress,
    internsCompleted,
    internsRejected,
    employeesActive,
    employeesInactive,
    docsPending,
    docsVerified,
    docsRejected,
    contentPublished,
    contentDraft,
  ] = await Promise.all([
    countDocuments(Admin),
    countDocuments(Inquiry),
    countDocuments(Job),
    countDocuments(Application),
    countDocuments(Internship),
    countDocuments(Employee),
    countDocuments(HRDocument),
    countDocuments(Content),
    countDocuments(Media),
    countDocuments(Notification),
    countDocuments(AuditLog),
    // Status breakdowns
    countDocuments(Inquiry, { status: "new" }),
    countDocuments(Inquiry, { status: "in_progress" }),
    countDocuments(Inquiry, { status: "resolved" }),
    countDocuments(Inquiry, { status: "closed" }),
    countDocuments(Job, { isActive: true }),
    countDocuments(Job, { isActive: false }),
    countDocuments(Application, { status: "applied" }),
    countDocuments(Application, { status: "under_review" }),
    countDocuments(Application, { status: "shortlisted" }),
    countDocuments(Application, { status: "rejected" }),
    countDocuments(Application, { status: "hired" }),
    countDocuments(Internship, { status: "applied" }),
    countDocuments(Internship, { status: "under_review" }),
    countDocuments(Internship, { status: "selected" }),
    countDocuments(Internship, { status: "in_progress" }),
    countDocuments(Internship, { status: "completed" }),
    countDocuments(Internship, { status: "rejected" }),
    countDocuments(Employee, { isActive: true }),
    countDocuments(Employee, { isActive: false }),
    countDocuments(HRDocument, { status: "Pending" }),
    countDocuments(HRDocument, { status: "Verified" }),
    countDocuments(HRDocument, { status: "Rejected" }),
    countDocuments(Content, { status: "published" }),
    countDocuments(Content, { status: "draft" }),
  ]);

  return {
    admins,
    inquiries,
    jobs,
    applications,
    internships,
    employees,
    hrDocuments,
    content,
    media,
    notifications,
    auditLogs,
    breakdown: {
      inquiries: {
        new: inquiriesNew,
        in_progress: inquiriesInProgress,
        resolved: inquiriesResolved,
        closed: inquiriesClosed,
      },
      jobs: {
        active: jobsActive,
        closed: jobsClosed,
      },
      applications: {
        applied: appsApplied,
        under_review: appsUnderReview,
        shortlisted: appsShortlisted,
        rejected: appsRejected,
        hired: appsHired,
      },
      internships: {
        applied: internsApplied,
        under_review: internsUnderReview,
        selected: internsSelected,
        in_progress: internsInProgress,
        completed: internsCompleted,
        rejected: internsRejected,
      },
      employees: {
        active: employeesActive,
        inactive: employeesInactive,
      },
      hrDocuments: {
        pending: docsPending,
        verified: docsVerified,
        rejected: docsRejected,
      },
      content: {
        published: contentPublished,
        draft: contentDraft,
      },
    },
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