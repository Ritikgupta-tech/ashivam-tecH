import mongoose from "mongoose";
import Inquiry from "./inquiry.model.js";
import env from "../../config/env.js";
import { sendEmail } from "../notification/email.service.js";
import { escapeRegex } from "../../utils/query.js";

export const createInquiry = async (data) => {
  const inquiry = await Inquiry.create(data);

  // Background non-blocking notification
  if (env.notificationRecipient) {
    sendEmail({
      to: env.notificationRecipient,
      subject: `[Ashivam Inquiries] New message from ${data.name}: ${data.subject || "General Inquiry"}`,
      text: `A new inquiry has been submitted on the Ashivam Technologies website.\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "N/A"}\nSubject: ${data.subject || "N/A"}\n\nMessage:\n${data.message}\n`,
    }).catch((err) => {
      console.warn("[Inquiry Alert] Background dispatch error:", err.message);
    });
  }

  return inquiry;
};

export const getInquiryById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid inquiry ID");
    error.statusCode = 400;
    throw error;
  }

  return Inquiry.findById(id)
    .populate("assignedTo", "username name role")
    .lean();
};

export const listInquiries = async ({
  status,
  search,
  page = 1,
  limit = 20,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { name: regex },
      { email: regex },
      { subject: regex },
      { message: regex },
    ];
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Inquiry.find(filter)
      .populate("assignedTo", "username name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Inquiry.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

export const updateInquiry = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid inquiry ID");
    error.statusCode = 400;
    throw error;
  }

  const update = {
    ...data,
  };

  if (data.status === "resolved" && !data.resolvedAt) {
    update.resolvedAt = new Date();
  }

  if (
    data.status &&
    data.status !== "resolved"
  ) {
    update.resolvedAt = null;
  }

  const inquiry = await Inquiry.findByIdAndUpdate(
    id,
    update,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("assignedTo", "username name role")
    .lean();

  if (!inquiry) {
    const error = new Error("Inquiry not found");
    error.statusCode = 404;
    throw error;
  }

  return inquiry;
};

export const deleteInquiry = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid inquiry ID");
    error.statusCode = 400;
    throw error;
  }

  const inquiry = await Inquiry.findByIdAndDelete(id);

  if (!inquiry) {
    const error = new Error("Inquiry not found");
    error.statusCode = 404;
    throw error;
  }

  return inquiry;
};