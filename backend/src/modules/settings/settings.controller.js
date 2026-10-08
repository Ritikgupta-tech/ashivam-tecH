import {
  getSettings,
  updateSettings,
  resetSettings,
  getPublicSettings,
} from "./settings.service.js";

import { createAuditLog } from "../audit/audit.service.js";

export const getAdminSettings = async (
  req,
  res,
  next
) => {
  try {
    const settings = await getSettings();

    return res.status(200).json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminSettings = async (
  req,
  res,
  next
) => {
  try {
    const adminId =
      req.user?.id ||
      req.user?._id ||
      null;

    const settings = await updateSettings(
      req.body,
      adminId
    );

    await createAuditLog({
      req,
      action: "UPDATE",
      entity: "Settings",
      entityId: settings._id.toString(),
      description: "Website settings updated",
      metadata: {
        key: settings.key,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Website settings updated successfully",
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetAdminSettings = async (
  req,
  res,
  next
) => {
  try {
    const adminId =
      req.user?.id ||
      req.user?._id ||
      null;

    const settings = await resetSettings(
      adminId
    );

    await createAuditLog({
      req,
      action: "RESET",
      entity: "Settings",
      entityId: settings._id.toString(),
      description: "Website settings reset",
    });

    return res.status(200).json({
      success: true,
      message: "Website settings reset successfully",
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicWebsiteSettings = async (
  req,
  res,
  next
) => {
  try {
    const settings = await getPublicSettings();

    return res.status(200).json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};