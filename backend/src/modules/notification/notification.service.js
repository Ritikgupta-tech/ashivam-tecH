import Notification from "./notification.model.js";
import Admin from "../../models/admin.model.js";
import {
  sendEmail,
} from "./email.service.js";
import {
  notificationEmailTemplate,
} from "./email.templates.js";

export const createNotification = async ({
  recipient,
  type = "system",
  title,
  message,
  priority = "normal",
  data = {},
}) => {
  const notification =
    await Notification.create({
      recipient,
      type,
      title,
      message,
      priority,
      data,
    });

  return notification;
};

export const createAndSendNotification = async ({
  recipient,
  type = "system",
  title,
  message,
  priority = "normal",
  data = {},
  sendEmailNotification = false,
  actionUrl = null,
}) => {
  const notification =
    await createNotification({
      recipient,
      type,
      title,
      message,
      priority,
      data,
    });

  if (sendEmailNotification) {
    const admin = await Admin.findById(recipient);

    if (admin?.email) {
      try {
        await sendEmail({
          to: admin.email,
          subject: title,
          html: notificationEmailTemplate({
            title,
            message,
            actionUrl,
          }),
          text: message,
        });

        notification.emailSent = true;
        notification.emailSentAt = new Date();

        await notification.save();
      } catch (error) {
        console.error(
          "Notification email failed:",
          error.message
        );
      }
    }
  }

  return notification;
};

export const getNotifications = async ({
  recipient,
  page = 1,
  limit = 20,
  unreadOnly = false,
}) => {
  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {
    recipient,
  };

  if (unreadOnly) {
    filter.isRead = false;
  }

  const skip =
    (safePage - 1) * safeLimit;

  const [items, total] =
    await Promise.all([
      Notification.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Notification.countDocuments(filter),
    ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit
      ),
    },
  };
};

export const getUnreadCount = async (
  recipient
) => {
  return Notification.countDocuments({
    recipient,
    isRead: false,
  });
};

export const markAsRead = async ({
  notificationId,
  recipient,
}) => {
  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient,
    },
    {
      isRead: true,
      readAt: new Date(),
    },
    {
      new: true,
    }
  );
};

export const markAllAsRead = async (
  recipient
) => {
  const result =
    await Notification.updateMany(
      {
        recipient,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

  return {
    modifiedCount: result.modifiedCount,
  };
};

export const deleteNotification = async ({
  notificationId,
  recipient,
}) => {
  return Notification.findOneAndDelete({
    _id: notificationId,
    recipient,
  });
};

export const deleteAllReadNotifications =
  async (recipient) => {
    const result =
      await Notification.deleteMany({
        recipient,
        isRead: true,
      });

    return {
      deletedCount: result.deletedCount,
    };
  };

export const getNotificationById =
  async ({
    notificationId,
    recipient,
  }) => {
    return Notification.findOne({
      _id: notificationId,
      recipient,
    }).lean();
  };