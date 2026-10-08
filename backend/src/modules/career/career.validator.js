const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

const allowedEmploymentTypes = [
  "Full-time",
  "Part-time",
  "Internship",
  "Contract",
];

const allowedApplicationStatuses = [
  "applied",
  "under_review",
  "shortlisted",
  "rejected",
  "hired",
];

export const validateJob = (body = {}) => {
  const errors = {};

  const title = String(body.title ?? "").trim();
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const department = String(body.department ?? "").trim();
  const location = String(body.location ?? "").trim();
  const employmentType = String(
    body.employmentType ?? ""
  ).trim();
  const description = String(body.description ?? "").trim();

  if (!title || title.length < 2 || title.length > 150) {
    errors.title = "Title must be between 2 and 150 characters";
  }

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = "Slug must contain lowercase letters, numbers and hyphens";
  }

  if (!department) {
    errors.department = "Department is required";
  }

  if (!location) {
    errors.location = "Location is required";
  }

  if (!allowedEmploymentTypes.includes(employmentType)) {
    errors.employmentType = "Invalid employment type";
  }

  if (!description || description.length > 10000) {
    errors.description =
      "Description is required and cannot exceed 10000 characters";
  }

  const requirements = Array.isArray(body.requirements)
    ? body.requirements.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const responsibilities = Array.isArray(body.responsibilities)
    ? body.responsibilities
        .map((item) => String(item).trim())
        .filter(Boolean)
    : [];

  const skills = Array.isArray(body.skills)
    ? body.skills.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      title,
      slug,
      department,
      location,
      employmentType,
      experience: body.experience
        ? String(body.experience).trim()
        : null,
      description,
      requirements,
      responsibilities,
      skills,
      salary: body.salary
        ? String(body.salary).trim()
        : null,
      applicationDeadline: body.applicationDeadline || null,
      isActive:
        body.isActive === undefined
          ? true
          : Boolean(body.isActive),
    },
  };
};

export const validateApplication = (body = {}) => {
  const errors = {};

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();

  if (!firstName) {
    errors.firstName = "First name is required";
  }

  if (!lastName) {
    errors.lastName = "Last name is required";
  }

  if (!email || !emailRegex.test(email)) {
    errors.email = "Valid email is required";
  }

  if (!phone || !phoneRegex.test(phone)) {
    errors.phone = "Valid phone number is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      firstName,
      lastName,
      email,
      phone,
      currentLocation: body.currentLocation
        ? String(body.currentLocation).trim()
        : null,
      experience: body.experience
        ? String(body.experience).trim()
        : null,
      coverLetter: body.coverLetter
        ? String(body.coverLetter).trim()
        : null,
    },
  };
};

export const validateApplicationUpdate = (body = {}) => {
  const errors = {};
  const data = {};

  if (body.status !== undefined) {
    if (!allowedApplicationStatuses.includes(body.status)) {
      errors.status = "Invalid application status";
    } else {
      data.status = body.status;
    }
  }

  if (body.adminNote !== undefined) {
    const note = String(body.adminNote).trim();

    if (note.length > 2000) {
      errors.adminNote =
        "Admin note cannot exceed 2000 characters";
    } else {
      data.adminNote = note || null;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data,
  };
};