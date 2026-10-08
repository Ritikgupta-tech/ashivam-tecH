import mongoose from "mongoose";

import Job from "./job.model.js";
import Application from "./application.model.js";
import env from "../../config/env.js";
import { sendEmail } from "../notification/email.service.js";
import { escapeRegex } from "../../utils/query.js";

const validateObjectId = (id, message) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

export const createJob = async (data, adminId) => {
  return Job.create({
    ...data,
    createdBy: adminId,
  });
};

export const listPublicJobs = async () => {
  return Job.find({
    isActive: true,
  })
    .select("-createdBy")
    .sort({ createdAt: -1 })
    .lean();
};

export const getPublicJob = async (id) => {
  validateObjectId(id, "Invalid job ID");

  return Job.findOne({
    _id: id,
    isActive: true,
  })
    .select("-createdBy")
    .lean();
};

export const listAdminJobs = async ({
  page = 1,
  limit = 20,
  search,
  isActive,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {};

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { title: regex },
      { department: regex },
      { location: regex },
    ];
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Job.find(filter)
      .populate("createdBy", "username name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Job.countDocuments(filter),
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

export const updateJob = async (id, data) => {
  validateObjectId(id, "Invalid job ID");

  const job = await Job.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("createdBy", "username name role")
    .lean();

  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  return job;
};

export const deleteJob = async (id) => {
  validateObjectId(id, "Invalid job ID");

  const job = await Job.findByIdAndDelete(id);

  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  await Application.deleteMany({
    job: id,
  });

  return job;
};

export const createApplication = async (
  jobId,
  data,
  resume
) => {
  validateObjectId(jobId, "Invalid job ID");

  const job = await Job.findOne({
    _id: jobId,
    isActive: true,
  });

  if (!job) {
    const error = new Error("Job is not available");
    error.statusCode = 404;
    throw error;
  }

  if (
    job.applicationDeadline &&
    new Date() > job.applicationDeadline
  ) {
    const error = new Error(
      "Application deadline has passed"
    );
    error.statusCode = 400;
    throw error;
  }

  const existingApplication =
    await Application.findOne({
      job: jobId,
      email: data.email,
    });

  if (existingApplication) {
    const error = new Error(
      "You have already applied for this position"
    );
    error.statusCode = 409;
    throw error;
  }

  const application = await Application.create({
    ...data,
    job: jobId,
    resume,
  });

  // Background non-blocking notifications
  if (env.notificationRecipient) {
    sendEmail({
      to: env.notificationRecipient,
      subject: `[Ashivam Careers] New application for ${job.title} from ${data.firstName} ${data.lastName}`,
      text: `A new job application has been submitted on the Ashivam Technologies website.\n\nPosition: ${job.title}\nCandidate: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nPhone: ${data.phone}\nResume File: ${resume.originalName || "Uploaded"}\n`,
    }).catch((err) => {
      console.warn("[Career Alert] Background dispatch error:", err.message);
    });
  }

  if (data.email) {
    sendEmail({
      to: data.email,
      subject: `Application Received - Ashivam Technologies [${job.title}]`,
      text: `Hello ${data.firstName},\n\nThank you for applying for the position of ${job.title} at Ashivam Technologies. We have successfully received your application.\n\nOur hiring team will review your qualifications and reach out if your profile aligns with our needs.\n\nBest regards,\nAshivam Technologies Talent Acquisition\nhttps://ashivamtechnologies.com`,
    }).catch((err) => {
      console.warn("[Career Confirmation] Background dispatch error:", err.message);
    });
  }

  return application;
};

export const listApplications = async ({
  page = 1,
  limit = 20,
  status,
  job,
  search,
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

  if (job) {
    validateObjectId(job, "Invalid job ID");
    filter.job = job;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Application.find(filter)
      .populate("job", "title department location")
      .populate("reviewedBy", "username name role")
      .select("-resume.path")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Application.countDocuments(filter),
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

export const getApplicationById = async (id) => {
  validateObjectId(id, "Invalid application ID");

  return Application.findById(id)
    .populate("job", "title department location")
    .populate("reviewedBy", "username name role")
    .lean();
};

export const updateApplication = async (
  id,
  data,
  adminId
) => {
  validateObjectId(id, "Invalid application ID");

  const update = {
    ...data,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  };

  const application =
    await Application.findByIdAndUpdate(
      id,
      update,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("job", "title department location")
      .populate("reviewedBy", "username name role")
      .lean();

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  return application;
};

export const deleteApplication = async (id) => {
  validateObjectId(id, "Invalid application ID");

  const application =
    await Application.findByIdAndDelete(id);

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  return application;
};