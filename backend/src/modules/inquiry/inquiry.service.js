import mongoose from "mongoose";
import Inquiry from "./inquiry.model.js";
import env from "../../config/env.js";
import {
  sendEmail,
  sendCompanyNotification,
  getCompanyNotificationEmail,
  sanitizeEmailHeader,
} from "../notification/email.service.js";
import {
  enqueueOutboxEmail,
  processOutboxJob,
} from "../notification/outbox.service.js";
import {
  inquiryConfirmationTemplate,
  inquiryAdminAlertTemplate,
} from "../notification/email.templates.js";
import { escapeRegex } from "../../utils/query.js";
import { toCsv } from "../../utils/csv.js";
import { withOptionalTransaction } from "../../utils/transaction.js";

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
      const { inquiry, jobs } = await withOptionalTransaction(async (session) => {
        const createOptions = session ? { session } : {};
        const [created] = await Inquiry.create([data], createOptions);
        const refNum = created.referenceNumber || created._id.toString();
        const adminReviewUrl = env.adminUrl || (env.clientUrl ? `${env.clientUrl.replace(/\/$/, "")}/admin` : undefined);
        const safeName = sanitizeEmailHeader(data.name);
        const safeSubject = sanitizeEmailHeader(data.subject || "General Inquiry");

        const outboxJobs = [];

        // Background durable notification to company via Outbox (Workflow 1: Contact Inquiry Notification)
        const job1 = await enqueueOutboxEmail({
          eventType: "INQUIRY_COMPANY_ALERT",
          dedupKey: `outbox:inquiry:company:${refNum}`,
          session,
          autoProcess: false,
          payload: {
            isCompanyAlert: true,
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
          },
        });
        if (job1) outboxJobs.push(job1);

        // Background durable confirmation to customer via Outbox (Preserves Reply-To reaching authorized company mailbox)
        if (data.email) {
          const job2 = await enqueueOutboxEmail({
            eventType: "INQUIRY_CUSTOMER_CONFIRMATION",
            dedupKey: `outbox:inquiry:customer:${refNum}`,
            session,
            autoProcess: false,
            payload: {
              to: data.email,
              replyTo: getCompanyNotificationEmail(),
              subject: `Inquiry Received - Ashivam Technologies [${refNum}]`,
              text: `Hello ${data.name},\n\nThank you for reaching out to Ashivam Technologies. We have received your inquiry regarding "${data.subject || "General Inquiry"}".\n\nReference: ${refNum}\n\nOur team is reviewing your message and will respond shortly.\n\nBest regards,\nAshivam Technologies Team\n${env.clientUrl || "https://ashivam-tec-h.vercel.app"}`,
              html: inquiryConfirmationTemplate({
                name: data.name,
                subject: data.subject,
                referenceNumber: refNum,
              }),
            },
          });
          if (job2) outboxJobs.push(job2);
        }

        return { inquiry: created, jobs: outboxJobs };
      });

      // Post-commit dispatch of the transaction's specific outbox jobs
      for (const j of jobs) {
        processOutboxJob(j).catch(() => {});
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

export const exportInquiriesCsv = async ({ status, search } = {}) => {
  const filter = {};
  if (status && status !== "all") {
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

  const items = await Inquiry.find(filter)
    .populate("assignedTo", "username name role")
    .sort({ createdAt: -1 })
    .lean();

  const columns = [
    {
      key: "ref",
      label: "Reference",
      transform: (row) => row.referenceNumber || row._id?.toString() || "",
    },
    {
      key: "date",
      label: "Date",
      transform: (row) => (row.createdAt ? new Date(row.createdAt).toISOString() : ""),
    },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone", transform: (row) => row.phone || "N/A" },
    { key: "company", label: "Company", transform: (row) => row.company || "N/A" },
    { key: "subject", label: "Subject", transform: (row) => row.subject || "General Inquiry" },
    { key: "status", label: "Status" },
    { key: "message", label: "Message" },
    { key: "notes", label: "Admin Notes", transform: (row) => row.adminNotes || "" },
  ];

  return toCsv(items, columns);
};
