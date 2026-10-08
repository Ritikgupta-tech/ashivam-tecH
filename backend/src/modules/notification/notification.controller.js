import {
  createAndSendNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  getNotificationById,
} from "./notification.service.js";

import {
  validateCreateNotification,
} from "./notification.validator.js";

export const listNotifications =
  async (req, res, next) => {
    try {
      const result =
        await getNotifications({
          recipient: req.user.id,
          page: req.query.page,
          limit: req.query.limit,
          unreadOnly:
            req.query.unreadOnly === "true",
        });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

export const unreadCount =
  async (req, res, next) => {
    try {
      const count =
        await getUnreadCount(
          req.user.id
        );

      res.status(200).json({
        success: true,
        data: {
          count,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const getOneNotification =
  async (req, res, next) => {
    try {
      const notification =
        await getNotificationById({
          notificationId:
            req.params.id,
          recipient: req.user.id,
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          notification,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const readNotification =
  async (req, res, next) => {
    try {
      const notification =
        await markAsRead({
          notificationId:
            req.params.id,
          recipient: req.user.id,
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Notification marked as read",
        data: {
          notification,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const readAllNotifications =
  async (req, res, next) => {
    try {
      const result =
        await markAllAsRead(
          req.user.id
        );

      res.status(200).json({
        success: true,
        message:
          "All notifications marked as read",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

export const removeNotification =
  async (req, res, next) => {
    try {
      const notification =
        await deleteNotification({
          notificationId:
            req.params.id,
          recipient: req.user.id,
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Notification deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

export const removeReadNotifications =
  async (req, res, next) => {
    try {
      const result =
        await deleteAllReadNotifications(
          req.user.id
        );

      res.status(200).json({
        success: true,
        message:
          "Read notifications deleted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

export const createNotification =
  async (req, res, next) => {
    try {
      const errors =
        validateCreateNotification(
          req.body
        );

      if (errors.length) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      const notification =
        await createAndSendNotification({
          recipient:
            req.body.recipient,
          type: req.body.type,
          title: req.body.title,
          message: req.body.message,
          priority:
            req.body.priority,
          data: req.body.data,
          sendEmailNotification:
            req.body.sendEmail === true,
          actionUrl:
            req.body.actionUrl || null,
        });

      res.status(201).json({
        success: true,
        message:
          "Notification created successfully",
        data: {
          notification,
        },
      });
    } catch (error) {
      next(error);
    }
  };