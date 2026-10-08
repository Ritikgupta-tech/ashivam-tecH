const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX =
  /^[0-9+\-\s()]{7,20}$/;

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Intern",
  "Freelance",
];

const WORK_LOCATIONS = [
  "Office",
  "Remote",
  "Hybrid",
];

const isValidDate = (value) => {
  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const cleanString = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
};

export const validateCreateEmployee = (body) => {
  const errors = {};

  const firstName = cleanString(body.firstName);
  const lastName = cleanString(body.lastName);
  const email = cleanString(body.email)?.toLowerCase();
  const phone = cleanString(body.phone);
  const designation = cleanString(body.designation);
  const department = cleanString(body.department);

  if (!firstName) {
    errors.firstName = "First name is required";
  }

  if (!lastName) {
    errors.lastName = "Last name is required";
  }

  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Invalid email address";
  }

  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone = "Invalid phone number";
  }

  if (!designation) {
    errors.designation = "Designation is required";
  }

  if (!department) {
    errors.department = "Department is required";
  }

  if (
    !body.employmentType ||
    !EMPLOYMENT_TYPES.includes(body.employmentType)
  ) {
    errors.employmentType =
      `Employment type must be one of: ${EMPLOYMENT_TYPES.join(", ")}`;
  }

  if (!body.joiningDate) {
    errors.joiningDate = "Joining date is required";
  } else if (!isValidDate(body.joiningDate)) {
    errors.joiningDate = "Invalid joining date";
  }

  if (
    body.workLocation &&
    !WORK_LOCATIONS.includes(body.workLocation)
  ) {
    errors.workLocation =
      `Work location must be one of: ${WORK_LOCATIONS.join(", ")}`;
  }

  if (
    body.displayOrder !== undefined &&
    (
      Number.isNaN(Number(body.displayOrder)) ||
      Number(body.displayOrder) < 0
    )
  ) {
    errors.displayOrder =
      "Display order must be a non-negative number";
  }

  if (
    body.isFeatured !== undefined &&
    typeof body.isFeatured !== "boolean"
  ) {
    errors.isFeatured = "isFeatured must be boolean";
  }

  if (
    body.isActive !== undefined &&
    typeof body.isActive !== "boolean"
  ) {
    errors.isActive = "isActive must be boolean";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateUpdateEmployee = (body) => {
  const errors = {};

  if (
    body.email !== undefined &&
    (
      typeof body.email !== "string" ||
      !EMAIL_REGEX.test(body.email.trim())
    )
  ) {
    errors.email = "Invalid email address";
  }

  if (
    body.phone !== undefined &&
    body.phone &&
    !PHONE_REGEX.test(String(body.phone).trim())
  ) {
    errors.phone = "Invalid phone number";
  }

  if (
    body.joiningDate !== undefined &&
    !isValidDate(body.joiningDate)
  ) {
    errors.joiningDate = "Invalid joining date";
  }

  if (
    body.employmentType !== undefined &&
    !EMPLOYMENT_TYPES.includes(body.employmentType)
  ) {
    errors.employmentType =
      `Employment type must be one of: ${EMPLOYMENT_TYPES.join(", ")}`;
  }

  if (
    body.workLocation !== undefined &&
    !WORK_LOCATIONS.includes(body.workLocation)
  ) {
    errors.workLocation =
      `Work location must be one of: ${WORK_LOCATIONS.join(", ")}`;
  }

  if (
    body.displayOrder !== undefined &&
    (
      Number.isNaN(Number(body.displayOrder)) ||
      Number(body.displayOrder) < 0
    )
  ) {
    errors.displayOrder =
      "Display order must be a non-negative number";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};