import Internship from "./internship.model.js";
import Admin from "../../models/admin.model.js";
import env from "../../config/env.js";
import { sendEmail } from "../notification/email.service.js";
import {
  internshipConfirmationTemplate,
  internshipAdminAlertTemplate,
} from "../notification/email.templates.js";

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

  const created = await Internship.create(data);

  // Background non-blocking notifications
  if (env.notificationRecipient) {
    sendEmail({
      to: env.notificationRecipient,
      subject: `[Ashivam Internship] New application for ${data.domain} from ${data.name}`,
      text: `A new student internship application has been submitted on the Ashivam Technologies website.\n\nDomain: ${data.domain}\nStudent Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nCollege: ${data.college || "N/A"}\nCourse: ${data.course || "N/A"}\nDuration: ${data.duration || "N/A"}\n`,
      html: internshipAdminAlertTemplate({
        name: data.name,
        email: data.email,
        phone: data.phone,
        college: data.college,
        domain: data.domain,
      }),
    }).catch((err) => {
      console.warn("[Internship Alert] Background dispatch error:", err.message);
    });
  }

  if (data.email) {
    sendEmail({
      to: data.email,
      subject: `Internship Application Received - Ashivam Technologies [${data.domain}]`,
      text: `Hello ${data.name},\n\nThank you for applying for the ${data.domain} internship at Ashivam Technologies. We have successfully received your application.\n\nOur academic programs team will review your qualifications and reach out if your profile aligns with our needs.\n\nBest regards,\nAshivam Technologies Academic Programs\nhttps://ashivamtechnologies.com`,
      html: internshipConfirmationTemplate({
        name: data.name,
        domain: data.domain,
      }),
    }).catch((err) => {
      console.warn("[Internship Confirmation] Background dispatch error:", err.message);
    });
  }

  return created;
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
    new: true,
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
