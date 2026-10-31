import mongoose from "mongoose";

import Job from "./job.model.js";
import Application from "./application.model.js";
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
  careerConfirmationTemplate,
  careerAdminAlertTemplate,
} from "../notification/email.templates.js";
import { escapeRegex } from "../../utils/query.js";
import { toCsv } from "../../utils/csv.js";
import { withOptionalTransaction } from "../../utils/transaction.js";
import {
  uploadFile,
  getFileStream,
  deleteFile,
} from "../../services/storage.service.js";

const validateObjectId = (id, message) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Sanitizes application responses to prevent leaking internal storage paths,
 * object keys, or hosting infrastructure details.
 */
export const formatApplicationResponse = (application) => {
  if (!application) return null;
  const appObj =
    typeof application.toObject === "function"
      ? application.toObject()
      : { ...application };
  const appId = (appObj._id || application._id)?.toString();

  if (appObj.resume) {
    appObj.resume = {
      originalName: appObj.resume.originalName,
      mimeType: appObj.resume.mimeType,
      size: appObj.resume.size,
      downloadUrl: `/api/v1/career/admin/applications/${appId}/resume`,
    };
  }

  return appObj;
};

export const createJob = async (data, adminId) => {
  let uniqueSlug = data.slug;
  const existingJob = await Job.findOne({ slug: uniqueSlug });
  if (existingJob) {
    uniqueSlug = `${data.slug}-${Date.now().toString(36)}`;
  }

  return Job.create({
    ...data,
    slug: uniqueSlug,
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

  if (data.slug) {
    const existingWithSlug = await Job.findOne({
      slug: data.slug,
      _id: { $ne: id },
    });
    if (existingWithSlug) {
      data.slug = `${data.slug}-${Date.now().toString(36)}`;
    }
  }

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

const inFlightApplications = new Set();

export const createApplication = async (
  jobId,
  data,
  fileOrResume
) => {
  validateObjectId(jobId, "Invalid job ID");

  const appKey = `${jobId.toString()}:::${(data.email || "").trim().toLowerCase()}`;
  if (inFlightApplications.has(appKey)) {
    const error = new Error("You have already applied for this position");
    error.statusCode = 409;
    throw error;
  }
  inFlightApplications.add(appKey);

  try {
    let job = await Job.findOne({
      _id: jobId,
      isActive: true,
    });

    if (!job) {
      job = await Job.findOne({ isActive: true });
    }

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

  let resumeData;
  if (fileOrResume && fileOrResume.buffer) {
    const uploadResult = await uploadFile({
      buffer: fileOrResume.buffer,
      originalName: fileOrResume.originalname,
      mimeType: fileOrResume.mimetype,
      folder: "resumes",
    });

    resumeData = {
      originalName: fileOrResume.originalname,
      fileName: uploadResult.fileName,
      storageProvider: uploadResult.storageProvider,
      storageKey: uploadResult.storageKey,
      path: uploadResult.path || null,
      mimeType: fileOrResume.mimetype,
      size: fileOrResume.size,
    };
  } else if (fileOrResume && typeof fileOrResume === "object") {
    resumeData = {
      originalName:
        fileOrResume.originalName ||
        fileOrResume.originalname ||
        "resume.pdf",
      fileName:
        fileOrResume.fileName ||
        fileOrResume.filename ||
        `${Date.now()}-resume.pdf`,
      storageProvider:
        fileOrResume.storageProvider || "local",
      storageKey:
        fileOrResume.storageKey ||
        `resumes/${fileOrResume.fileName || fileOrResume.filename || "resume.pdf"}`,
      path: fileOrResume.path || null,
      mimeType:
        fileOrResume.mimeType ||
        fileOrResume.mimetype ||
        "application/pdf",
      size: fileOrResume.size || 0,
    };
  } else {
    const error = new Error("Resume file is required");
    error.statusCode = 400;
    throw error;
  }

  let application;
  try {
    const { doc, jobs } = await withOptionalTransaction(async (session) => {
      const createOptions = session ? { session } : {};
      const [createdDoc] = await Application.create(
        [
          {
            ...data,
            job: jobId,
            resume: resumeData,
          },
        ],
        createOptions
      );

      const appRef = createdDoc._id.toString();
      const adminReviewUrl = env.adminUrl || (env.clientUrl ? `${env.clientUrl.replace(/\/$/, "")}/admin` : undefined);

      const outboxJobs = [];

      // Workflow 2: Career Application Notification (Company Alert - strictly team.ashivam@gmail.com)
      const safeJobTitle = sanitizeEmailHeader(job.title);
      const safeCandidateName = `${sanitizeEmailHeader(data.firstName)} ${sanitizeEmailHeader(data.lastName)}`.trim();

      const job1 = await enqueueOutboxEmail({
        eventType: "CAREER_COMPANY_ALERT",
        dedupKey: `outbox:career:company:${appRef}`,
        session,
        autoProcess: false,
        payload: {
          isCompanyAlert: true,
          replyTo: data.email,
          subject: `[Ashivam Careers] New application for ${safeJobTitle}: ${safeCandidateName} [${appRef}]`,
          text: `A new job application has been submitted on the Ashivam Technologies website.\n\nPosition: ${job.title}\nCandidate: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nPhone: ${data.phone}\nApplication Reference: ${appRef}\nResume File: ${resumeData.originalName || "Uploaded"} (Saved in secure storage; review via admin portal)\n\nAdmin Review: ${adminReviewUrl || "Admin Portal"}\n`,
          html: careerAdminAlertTemplate({
            candidateName: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            jobTitle: job.title,
            resumeFileName: resumeData.originalName || "Uploaded",
            applicationReference: appRef,
            reviewUrl: adminReviewUrl,
          }),
        },
      });
      if (job1) outboxJobs.push(job1);

      // Workflow 3: Candidate Application Confirmation (Preserves Reply-To reaching authorized company mailbox)
      if (data.email) {
        const job2 = await enqueueOutboxEmail({
          eventType: "CAREER_CANDIDATE_CONFIRMATION",
          dedupKey: `outbox:career:candidate:${appRef}`,
          session,
          autoProcess: false,
          payload: {
            to: data.email,
            replyTo: getCompanyNotificationEmail(),
            subject: `Application Received - Ashivam Technologies [${safeJobTitle}] [${appRef}]`,
            text: `Hello ${data.firstName},\n\nThank you for applying for the position of ${job.title} at Ashivam Technologies. We have successfully received your application.\n\nApplication Reference: ${appRef}\n\nOur hiring team will review your qualifications and reach out if your profile aligns with our open positions.\n\nBest regards,\nAshivam Technologies Talent Acquisition\n${env.clientUrl || "https://ashivam-tec-h.vercel.app"}`,
            html: careerConfirmationTemplate({
              firstName: data.firstName,
              jobTitle: job.title,
              applicationReference: appRef,
            }),
          },
        });
        if (job2) outboxJobs.push(job2);
      }

      return { doc: createdDoc, jobs: outboxJobs };
    });

    application = doc;

    // Post-commit dispatch of the transaction's specific outbox jobs
    for (const j of jobs) {
      processOutboxJob(j).catch(() => {});
    }
  } catch (dbError) {
    if (resumeData) {
      await deleteFile({
        storageProvider: resumeData.storageProvider,
        storageKey: resumeData.storageKey,
        legacyPath: resumeData.path,
        fileName: resumeData.fileName,
        folder: "resumes",
      }).catch(() => {});
    }
    throw dbError;
  }

  return formatApplicationResponse(application);
} finally {
  inFlightApplications.delete(appKey);
}
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
      .select("-resume.path -resume.storageKey")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Application.countDocuments(filter),
  ]);

  return {
    items: items.map(formatApplicationResponse),
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

  const application = await Application.findById(id)
    .populate("job", "title department location")
    .populate("reviewedBy", "username name role")
    .select("-resume.path -resume.storageKey")
    .lean();

  if (!application) {
    return null;
  }

  return formatApplicationResponse(application);
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
      .select("-resume.path -resume.storageKey")
      .lean();

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  return formatApplicationResponse(application);
};

export const deleteApplication = async (id) => {
  validateObjectId(id, "Invalid application ID");

  const application = await Application.findById(id);

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  if (application.resume) {
    await deleteFile({
      storageProvider: application.resume.storageProvider,
      storageKey: application.resume.storageKey,
      legacyPath: application.resume.path,
      fileName: application.resume.fileName,
      folder: "resumes",
    }).catch((err) => {
      console.warn("[Career] Storage cleanup error on delete:", err.message);
    });
  }

  await Application.deleteOne({ _id: id });

  return formatApplicationResponse(application);
};

export const getApplicationResumeFile = async (id) => {
  validateObjectId(id, "Invalid application ID");

  const application = await Application.findById(id).lean();

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  if (!application.resume) {
    const error = new Error("Resume not found for this application");
    error.statusCode = 404;
    throw error;
  }

  const { stream, contentLength, contentType } = await getFileStream({
    storageProvider: application.resume.storageProvider,
    storageKey: application.resume.storageKey,
    legacyPath: application.resume.path,
    fileName: application.resume.fileName,
    folder: "resumes",
  });

  return {
    stream,
    contentLength: contentLength || application.resume.size,
    mimeType: contentType || application.resume.mimeType || "application/pdf",
    originalName: application.resume.originalName || "resume.pdf",
  };
};

export const exportApplicationsCsv = async ({ status, job, search } = {}) => {
  const filter = {};
  if (status && status !== "all") {
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

  const items = await Application.find(filter)
    .populate("job", "title department location")
    .sort({ createdAt: -1 })
    .lean();

  const columns = [
    {
      key: "ref",
      label: "Reference",
      transform: (row) => row.applicationReference || row._id?.toString() || "",
    },
    {
      key: "date",
      label: "Date",
      transform: (row) => (row.createdAt ? new Date(row.createdAt).toISOString() : ""),
    },
    {
      key: "candidate",
      label: "Candidate Name",
      transform: (row) => `${row.firstName || ""} ${row.lastName || ""}`.trim(),
    },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone", transform: (row) => row.phone || "N/A" },
    { key: "job", label: "Applied Position", transform: (row) => row.job?.title || "N/A" },
    { key: "dept", label: "Department", transform: (row) => row.job?.department || "N/A" },
    { key: "status", label: "Status" },
    {
      key: "experience",
      label: "Experience",
      transform: (row) =>
        row.experienceYears !== undefined
          ? `${row.experienceYears} yrs`
          : row.experience || "N/A",
    },
    { key: "resume", label: "Resume File", transform: (row) => row.resume?.originalName || "N/A" },
  ];

  return toCsv(items, columns);
};
