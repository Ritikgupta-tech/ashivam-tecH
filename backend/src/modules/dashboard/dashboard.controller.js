import {
  getOverview,
  getDashboardSummary,
  getRecentActivity,
  getDashboardStats,
} from "./dashboard.service.js";

/*
 * Dashboard overview
 */
export const overview = async (req, res, next) => {
  try {
    const data = await getOverview();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * Dashboard summary
 */
export const summary = async (req, res, next) => {
  try {
    const adminId =
      req.user?.id ||
      req.user?._id ||
      req.user?.sub;

    const data = await getDashboardSummary(adminId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * Recent activity
 */
export const recentActivity = async (req, res, next) => {
  try {
    const data = await getRecentActivity({
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * Dashboard statistics
 */
export const stats = async (req, res, next) => {
  try {
    const data = await getDashboardStats();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};