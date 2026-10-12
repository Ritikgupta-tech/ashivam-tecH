import mongoose from "mongoose";
import Inquiry from "./inquiry.model.js";
import env from "../../config/env.js";
import {
  sendEmail,
  sanitizeEmailHeader,
} from "../notification/email.service.js";
import {
  inquiryConfirmationTemplate,
  inquiryAdminAlertTemplate,
} from "../notification/email.templates.js";
import { escapeRegex } from "../../utils/query.js";

const inFlightInquiries = new Map();

export const createInquiry = async (data) => {
  const normEmail = (data.email || "").trim().toLowerCase();
  const normMsg = (data.message || "").trim();
  const dedupKey = `${normEmail}:::${normMsg}`;

  // 1. In-flight race-condition protection (absorbs concurrent double-clicks)
  if (inFlightInquiries.has(dedupKey)) {
    return inFlightInquiries.get(dedupKey);
  }

  // 2. Persistent deduplication (suppresses retries within 60s for identical email + message)
  const recentDuplicate = await Inquiry.findOne({
    email: normEmail,
    message: data.message,
    createdAt: { $gte: new Date(Date.now() - 60000) },
  });

  if (recentDuplicate) {
    return recentDuplicate;
  }

  const creationTask = (async () => {
    try {
      const inquiry = await Inquiry.create(data);
      const refNum = inquiry.referenceNumber || inquiry._id.toString();
      const alertRecipient = env.alertEmail || env.notificationRecipient;
      const adminReviewUrl = env.adminUrl || (env.clientUrl ? `${env.clientUrl.replace(/\/$/, "")}/admin` : undefined);

      // Background non-blocking notification to admin (Workflow 1: Contact Inquiry Notification)
      if (alertRecipient) {
        const safeName = sanitizeEmailHeader(data.name);
        const safeSubject = sanitizeEmailHeader(data.subject || "General Inquiry");

        sendEmail({
          to: alertRecipient,
          replyTo: data.email,
          subject: `[Ashivam Inquiries] New message from ${safeName}: ${safeSubject} [${refNum}]`,
          text: `A new inquiry has been submitted on the Ashivam Technologies website.\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "N/A"}\nSubject: ${data.subject || "General Inquiry"}\nReference: ${refNum}\n\nMessage:\n${data.message}\n`,
          html: inquiryAdminAlertTemplate({
            name: data.name,
            email: data.email,
            phone: data.phone,
            subject: data.subject,
            message: data.message,
            referenceNumber: refNum,
            reviewUrl: adminReviewUrl,
          }),
        }).catch((err) => {
          console.warn("[Inquiry Alert] Background dispatch error:", err.message);
        });
      }

      // Background non-blocking confirmation to applicant
      if (data.email) {
        sendEmail({
          to: data.email,
          subject: `Inquiry Received - Ashivam Technologies [${refNum}]`,
          text: `Hello ${data.name},\n\nThank you for reaching out to Ashivam Technologies. We have received your inquiry regarding "${data.subject || "General Inquiry"}".\n\nReference: ${refNum}\n\nOur team is reviewing your message and will respond shortly.\n\nBest regards,\nAshivam Technologies Team\n${env.clientUrl || "https://ashivam-tec-h.vercel.app"}`,
          html: inquiryConfirmationTemplate({
            name: data.name,
            subject: data.subject,
            referenceNumber: refNum,
          }),
        }).catch((err) => {
          console.warn("[Inquiry Confirmation] Background dispatch error:", err.message);
        });
      }

      return inquiry;
    } finally {
      inFlightInquiries.delete(dedupKey);
    }
  })();

  inFlightInquiries.set(dedupKey, creationTask);
  return creationTask;
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