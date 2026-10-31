import Internship from "./internship.model.js";
import Intern from "./intern.model.js";
import InternshipProgram from "./internshipProgram.model.js";
import { toCsv } from "../../utils/csv.js";
import Admin from "../../models/admin.model.js";
import Counter from "../../models/counter.model.js";
import { withDistributedLock } from "../../utils/distributedLock.js";
import env from "../../config/env.js";
import {
  sendEmail,
  sendCompanyNotification,
  getCompanyNotificationEmail,
} from "../notification/email.service.js";
import {
  enqueueOutboxEmail,
  processOutboxJob,
} from "../notification/outbox.service.js";
import {
  internshipConfirmationTemplate,
  internshipAdminAlertTemplate,
} from "../notification/email.templates.js";
import { withOptionalTransaction } from "../../utils/transaction.js";

import { ACTIVE_INTERNSHIP_STATUSES } from "./internship.constants.js";

import {
  escapeRegex,
  buildPagination,
  buildPaginationMeta,
} from "../../utils/query.js";

import { isValidObjectId } from "../../utils/validation.js";

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertValidId = (id) => {
  if (!isValidObjectId(id)) {
    throw httpError(400, "Invalid internship application ID");
  }
};

export const createInternship = async (data) => {
  /*
   * One open application per email and domain.
   */
  const open = await Internship.exists({
    email: data.email,
    domain: data.domain,
    status: { $in: ACTIVE_INTERNSHIP_STATUSES },
  });

  if (open) {
    throw httpError(
      409,
      "You have already applied for this internship domain"
    );
  }

  const { doc, jobs } = await withOptionalTransaction(async (session) => {
    const createOptions = session ? { session } : {};
    const [createdDoc] = await Internship.create([data], createOptions);

    const outboxJobs = [];

    // Background non-blocking notifications via durable Outbox
    const adminReviewUrl = env.adminUrl || (env.clientUrl ? `${env.clientUrl.replace(/\/$/, "")}/admin` : undefined);
    const internRef = createdDoc._id.toString();

    // Workflow 5: Internship Application Notification (Company Alert - strictly team.ashivam@gmail.com)
    const job1 = await enqueueOutboxEmail({
      eventType: "INTERNSHIP_COMPANY_ALERT",
      dedupKey: `outbox:internship:company:${internRef}`,
      session,
      autoProcess: false,
      payload: {
        isCompanyAlert: true,
        replyTo: data.email,
        subject: `[Ashivam Internship] New application for ${data.domain} from ${data.name}`,
        text: `A new student internship application has been submitted on the Ashivam Technologies website.\n\nDomain: ${data.domain}\nStudent Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nCollege: ${data.college || "N/A"}\nCourse: ${data.course || "N/A"}\nDuration: ${data.duration || "N/A"}\n\nAdmin Review: ${adminReviewUrl || "Admin Portal"}\n`,
        html: internshipAdminAlertTemplate({
          name: data.name,
          email: data.email,
          phone: data.phone,
          college: data.college,
          domain: data.domain,
          reviewUrl: adminReviewUrl,
        }),
      },
    });
    if (job1) outboxJobs.push(job1);

    // Workflow 6: Student Internship Application Confirmation (Preserves Reply-To reaching authorized company mailbox)
    if (data.email) {
      const job2 = await enqueueOutboxEmail({
        eventType: "INTERNSHIP_STUDENT_CONFIRMATION",
        dedupKey: `outbox:internship:student:${internRef}`,
        session,
        autoProcess: false,
        payload: {
          to: data.email,
          replyTo: getCompanyNotificationEmail(),
          subject: `Internship Application Received - Ashivam Technologies [${data.domain}]`,
          text: `Hello ${data.name},\n\nThank you for applying for the ${data.domain} internship at Ashivam Technologies. We have successfully received your application.\n\nOur academic programs team will review your qualifications and reach out if your profile aligns with our needs.\n\nBest regards,\nAshivam Technologies Academic Programs\n${env.clientUrl || "https://ashivam-tec-h.vercel.app"}`,
          html: internshipConfirmationTemplate({
            name: data.name,
            domain: data.domain,
          }),
        },
      });
      if (job2) outboxJobs.push(job2);
    }

    return { doc: createdDoc, jobs: outboxJobs };
  });

  // Post-commit dispatch of the transaction's specific outbox jobs
  for (const j of jobs) {
    processOutboxJob(j).catch(() => {});
  }

  return doc;
};

export const listInternships = async ({
  status,
  domain,
  duration,
  search,
  sortBy = "createdAt",
  order = "desc",
  page,
  limit,
}) => {
  const pagination = buildPagination({ page, limit });

  const filter = {};

  if (status) filter.status = status;
  if (domain) filter.domain = domain;
  if (duration) filter.duration = duration;

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");

    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { college: regex },
      { course: regex },
    ];
  }

  const [items, total] = await Promise.all([
    Internship.find(filter)
      .populate("assignedTo", "username name role")
      .sort({ [sortBy]: order === "asc" ? 1 : -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),

    Internship.countDocuments(filter),
  ]);

  return {
    items,
    pagination: buildPaginationMeta(pagination, total),
  };
};

export const getInternshipById = async (id) => {
  assertValidId(id);

  const internship = await Internship.findById(id)
    .populate("assignedTo", "username name role")
    .lean();

  if (!internship) {
    throw httpError(404, "Internship application not found");
  }

  return internship;
};

export const updateInternship = async (id, data) => {
  assertValidId(id);

  if (data.assignedTo) {
    const adminExists = await Admin.exists({ _id: data.assignedTo });

    if (!adminExists) {
      throw httpError(404, "Assigned admin not found");
    }
  }

  const internship = await Internship.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  })
    .populate("assignedTo", "username name role")
    .lean();

  if (!internship) {
    throw httpError(404, "Internship application not found");
  }

  return internship;
};

export const deleteInternship = async (id) => {
  assertValidId(id);

  const internship = await Internship.findByIdAndDelete(id);

  if (!internship) {
    throw httpError(404, "Internship application not found");
  }

  return internship;
};

/* -------------------------------------------------------------
 * Collision-Safe Intern ID Generation & Onboarding Workflow
 * ----------------------------------------------------------- */
export const withInternAllocationLock = async (fn) => {
  return withDistributedLock("intern_allocation", fn, {
    ttlMs: 20000,
    timeoutMs: 45000,
  });
};

export const getNextInternSequence = async (year) => {
  const seqKey = `intern_id_${year}`;

  const counterExists = await Counter.exists({ _id: seqKey });
  if (!counterExists) {
    const prefix = `ASH-INT-${year}-`;
    const existing = await Intern.find({ internId: new RegExp(`^${prefix}`) })
      .select("internId")
      .lean();

    let maxNum = 0;
    for (const item of existing) {
      if (item.internId) {
        const parts = item.internId.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    try {
      await Counter.create({
        _id: seqKey,
        seq: maxNum,
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  const updated = await Counter.findOneAndUpdate(
    { _id: seqKey },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  return updated.seq;
};

export const generateNextInternId = async () => {
  const year = new Date().getFullYear();
  const prefix = `ASH-INT-${year}-`;

  let seq = await getNextInternSequence(year);
  let candidateId = `${prefix}${String(seq).padStart(3, "0")}`;

  while (await Intern.exists({ internId: candidateId })) {
    seq = await getNextInternSequence(year);
    candidateId = `${prefix}${String(seq).padStart(3, "0")}`;
  }

  return candidateId;
};

export const convertApplicationToIntern = async ({
  applicationId,
  adminId = null,
  internData = {},
}) => {
  return withInternAllocationLock(async () => {
    assertValidId(applicationId);

    // Atomically claim conversion on the application document to prevent duplicate active allocations
    const application = await Internship.findOneAndUpdate(
      {
        _id: applicationId,
        convertedToIntern: { $ne: true },
      },
      {
        $set: {
          convertedToIntern: true,
          status: "selected",
        },
      },
      { returnDocument: "after" }
    );

    if (!application) {
      const existing = await Internship.findById(applicationId);
      if (!existing) {
        throw httpError(404, "Internship application not found");
      }
      throw httpError(409, "Candidate has already been converted to an active intern");
    }

    try {
      const generatedId = await generateNextInternId();
      const joiningDate = internData.joiningDate ? new Date(internData.joiningDate) : new Date();
      let expectedEndDate = null;
      if (internData.expectedEndDate) {
        expectedEndDate = new Date(internData.expectedEndDate);
      } else {
        expectedEndDate = new Date(joiningDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      }

      const newIntern = await Intern.create({
        internId: generatedId,
        applicationId: application._id,
        name: internData.name || application.name,
        email: internData.email || application.email,
        phone: internData.phone || application.phone,
        college: internData.college || application.college,
        course: internData.course || application.course || "",
        domain: internData.domain || application.domain,
        department: internData.department || "Software Engineering",
        designation: internData.designation || `${internData.domain || application.domain} Intern`,
        mentorName: internData.mentorName || "",
        joiningDate,
        expectedEndDate,
        duration: internData.duration || application.duration || "3 Months",
        workLocation: internData.workLocation || "Remote",
        stipend: Number(internData.stipend) || 0,
        isUnpaid: Boolean(internData.isUnpaid),
        onboarding: {
          status: internData.onboardingStatus || "pending",
          idProofVerified: Boolean(internData.idProofVerified),
          collegeNocVerified: Boolean(internData.collegeNocVerified),
          agreementSigned: Boolean(internData.agreementSigned),
          ndaSigned: Boolean(internData.ndaSigned),
        },
        status: "active",
        performanceNotes: internData.performanceNotes || "",
        createdBy: adminId,
      });

      application.internId = generatedId;
      await application.save();

      return {
        intern: newIntern,
        application,
      };
    } catch (createErr) {
      // Revert the atomic claim if intern creation failed
      await Internship.findByIdAndUpdate(applicationId, {
        $set: {
          convertedToIntern: false,
          status: "pending",
        },
      });
      throw createErr;
    }
  });
};

export const createInternDirectly = async (data, adminId = null) => {
  return withInternAllocationLock(async () => {
    if (!data.name || !data.email || !data.phone || !data.college || !data.domain) {
      throw httpError(400, "Name, email, phone, college, and domain are required");
    }

    const existingActive = await Intern.findOne({
      email: data.email.toLowerCase().trim(),
      status: { $in: ["active", "on_hold", "extended"] },
      deletedAt: null,
    });

    if (existingActive) {
      throw httpError(409, `An active intern record already exists for ${data.email}`);
    }

    const internId = await generateNextInternId();
    const joiningDate = data.joiningDate ? new Date(data.joiningDate) : new Date();
    let expectedEndDate = null;
    if (data.expectedEndDate) {
      expectedEndDate = new Date(data.expectedEndDate);
    } else {
      expectedEndDate = new Date(joiningDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    }

    const intern = await Intern.create({
      internId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      college: data.college.trim(),
      course: data.course ? data.course.trim() : "",
      domain: data.domain.trim(),
      department: data.department || "Software Engineering",
      designation: data.designation || `${data.domain} Intern`,
      mentorName: data.mentorName || "",
      joiningDate,
      expectedEndDate,
      duration: data.duration || "3 Months",
      workLocation: data.workLocation || "Remote",
      stipend: Number(data.stipend) || 0,
      isUnpaid: Boolean(data.isUnpaid),
      onboarding: {
        status: data.onboardingStatus || "pending",
        idProofVerified: Boolean(data.idProofVerified),
        collegeNocVerified: Boolean(data.collegeNocVerified),
        agreementSigned: Boolean(data.agreementSigned),
        ndaSigned: Boolean(data.ndaSigned),
      },
      status: data.status || "active",
      performanceNotes: data.performanceNotes || "",
      createdBy: adminId,
    });

    return intern;
  });
};

export const listInterns = async ({
  status,
  domain,
  department,
  search,
  sortBy = "createdAt",
  order = "desc",
  page = 1,
  limit = 20,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const filter = { deletedAt: null };
  if (status && status !== "all") filter.status = status;
  if (domain && domain !== "all") filter.domain = domain;
  if (department && department !== "all") filter.department = department;

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { college: regex },
      { internId: regex },
      { mentorName: regex },
    ];
  }

  const skip = (safePage - 1) * safeLimit;
  const [items, total] = await Promise.all([
    Intern.find(filter)
      .populate("createdBy", "username name")
      .populate("applicationId")
      .sort({ [sortBy]: order === "asc" ? 1 : -1, _id: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Intern.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

export const getInternById = async (id) => {
  assertValidId(id);
  const intern = await Intern.findById(id)
    .populate("createdBy", "username name")
    .populate("applicationId")
    .lean();
  if (!intern || intern.deletedAt) {
    throw httpError(404, "Intern record not found");
  }
  return intern;
};

export const updateIntern = async (id, data, adminId = null) => {
  assertValidId(id);
  const intern = await Intern.findByIdAndUpdate(
    id,
    { ...data, updatedBy: adminId },
    { returnDocument: "after", runValidators: true }
  ).lean();
  if (!intern || intern.deletedAt) {
    throw httpError(404, "Intern record not found");
  }
  return intern;
};

export const updateInternStatus = async (
  id,
  { status, notes, extensionReason, actualEndDate },
  adminId = null
) => {
  assertValidId(id);
  const validStatuses = [
    "active",
    "on_hold",
    "completed",
    "extended",
    "withdrawn",
    "terminated",
  ];
  if (!validStatuses.includes(status)) {
    throw httpError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const update = { status };
  if (notes !== undefined) update.performanceNotes = notes;
  if (extensionReason !== undefined) update.extensionReason = extensionReason;
  if (status === "completed" || status === "terminated" || status === "withdrawn") {
    update.actualEndDate = actualEndDate ? new Date(actualEndDate) : new Date();
  }

  const intern = await Intern.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  if (!intern || intern.deletedAt) {
    throw httpError(404, "Intern record not found");
  }
  return intern;
};

export const updateInternOnboarding = async (id, onboardingData, adminId = null) => {
  assertValidId(id);
  const intern = await Intern.findById(id);
  if (!intern || intern.deletedAt) {
    throw httpError(404, "Intern record not found");
  }

  const onboarding = { ...intern.onboarding.toObject(), ...onboardingData };
  const allVerified =
    onboarding.idProofVerified &&
    onboarding.collegeNocVerified &&
    onboarding.agreementSigned &&
    onboarding.ndaSigned;

  if (allVerified && onboarding.status !== "completed") {
    onboarding.status = "completed";
    onboarding.completedAt = new Date();
  }

  intern.onboarding = onboarding;
  await intern.save();
  return intern.toObject();
};

export const deleteIntern = async (id) => {
  assertValidId(id);
  const intern = await Intern.findByIdAndUpdate(
    id,
    { deletedAt: new Date() },
    { returnDocument: "after" }
  );
  if (!intern) {
    throw httpError(404, "Intern record not found");
  }
  return intern;
};

/* -------------------------------------------------------------
 * Internship Programme / Tracks Management
 * ----------------------------------------------------------- */
export const listInternshipPrograms = async ({ status, domain } = {}) => {
  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (domain && domain !== "all") filter.domain = domain;
  return InternshipProgram.find(filter).sort({ createdAt: -1 }).lean();
};

export const createInternshipProgram = async (data, adminId = null) => {
  if (!data.title || !data.domain || !data.description) {
    throw httpError(400, "Title, domain, and description are required");
  }
  let slug = (data.slug || data.title || data.domain || "internship")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const existing = await InternshipProgram.findOne({ slug });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  return InternshipProgram.create({ ...data, slug, createdBy: adminId });
};

export const updateInternshipProgram = async (id, data) => {
  assertValidId(id);
  const program = await InternshipProgram.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  if (!program) throw httpError(404, "Internship program not found");
  return program;
};

export const deleteInternshipProgram = async (id) => {
  assertValidId(id);
  const program = await InternshipProgram.findByIdAndDelete(id);
  if (!program) throw httpError(404, "Internship program not found");
  return program;
};

/* -------------------------------------------------------------
 * CSV Exports with Formula Injection Mitigation
 * ----------------------------------------------------------- */
export const exportInternshipsCsv = async ({ domain, status, search } = {}) => {
  const filter = {};
  if (domain && domain !== "all") filter.domain = domain;
  if (status && status !== "all") filter.status = status;
  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { college: regex },
      { course: regex },
    ];
  }
  const items = await Internship.find(filter).sort({ createdAt: -1 }).lean();
  const columns = [
    { key: "id", label: "Application ID", transform: (r) => r._id?.toString() || "" },
    {
      key: "date",
      label: "Applied On",
      transform: (r) => (r.createdAt ? new Date(r.createdAt).toISOString() : ""),
    },
    { key: "name", label: "Candidate Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "college", label: "College / University" },
    { key: "course", label: "Course / Degree", transform: (r) => r.course || "N/A" },
    { key: "domain", label: "Internship Domain" },
    { key: "duration", label: "Duration", transform: (r) => r.duration || "N/A" },
    { key: "status", label: "Application Status" },
    {
      key: "converted",
      label: "Converted to Intern",
      transform: (r) => (r.convertedToIntern ? `Yes (${r.internId || ""})` : "No"),
    },
  ];
  return toCsv(items, columns);
};

export const exportInternsCsv = async ({ status, domain, search } = {}) => {
  const filter = { deletedAt: null };
  if (status && status !== "all") filter.status = status;
  if (domain && domain !== "all") filter.domain = domain;
  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { internId: regex },
      { college: regex },
    ];
  }
  const items = await Intern.find(filter).sort({ createdAt: -1 }).lean();
  const columns = [
    { key: "internId", label: "Intern ID" },
    { key: "name", label: "Intern Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "college", label: "College" },
    { key: "domain", label: "Domain" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "mentor", label: "Mentor", transform: (r) => r.mentorName || "Unassigned" },
    {
      key: "joiningDate",
      label: "Joining Date",
      transform: (r) =>
        r.joiningDate ? new Date(r.joiningDate).toISOString().split("T")[0] : "",
    },
    {
      key: "expectedEnd",
      label: "Expected End Date",
      transform: (r) =>
        r.expectedEndDate ? new Date(r.expectedEndDate).toISOString().split("T")[0] : "",
    },
    {
      key: "stipend",
      label: "Stipend",
      transform: (r) => (r.isUnpaid ? "Unpaid" : `Rs. ${r.stipend || 0}`),
    },
    { key: "status", label: "Status" },
    {
      key: "onboarding",
      label: "Onboarding Status",
      transform: (r) => r.onboarding?.status || "pending",
    },
  ];
  return toCsv(items, columns);
};
