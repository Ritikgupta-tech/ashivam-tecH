import {
  INTERNSHIP_STATUSES,
  INTERNSHIP_DOMAINS,
  INTERNSHIP_DURATIONS,
  INTERNSHIP_SORT_FIELDS,
} from "./internship.constants.js";

import {
  EMAIL_REGEX,
  PHONE_REGEX,
  sanitizeText,
  readText,
  isValidObjectId,
  readQueryValue,
  readPositiveInt,
  normalizeHttpUrl,
} from "../../utils/validation.js";

const notAnObject = (body) =>
  !body || typeof body !== "object" || Array.isArray(body);

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_START_AHEAD_DAYS = 366;

/*
 * Parses a strict YYYY-MM-DD calendar date (what <input type="date">
 * submits). Returns a Date at UTC midnight, or null.
 */
export const parseDateOnly = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealDate ? date : null;
};

const readChoice = (body, key, label, allowed, errors, required = false) => {
  const value = readText(body, key, errors, {
    label,
    required,
    max: 100,
  });

  if (value && !errors[key] && !allowed.includes(value)) {
    errors[key] = `Invalid ${label.toLowerCase()}`;
  }

  return value;
};

export const validateCreateInternship = (body, now = new Date()) => {
  const errors = {};

  if (notAnObject(body)) {
    return {
      isValid: false,
      errors: { body: "Request body must be a JSON object" },
      data: {},
    };
  }

  const name = readText(body, "name", errors, {
    label: "Name",
    required: true,
    min: 2,
    max: 100,
  });

  const email = readText(body, "email", errors, {
    label: "Email",
    required: true,
    max: 150,
  }).toLowerCase();

  if (email && !errors.email && !EMAIL_REGEX.test(email)) {
    errors.email = "Please provide a valid email address";
  }

  const phone = readText(body, "phone", errors, {
    label: "Phone",
    required: true,
    max: 20,
  });

  if (phone && !errors.phone && !PHONE_REGEX.test(phone)) {
    errors.phone = "Please provide a valid phone number";
  }

  const college = readText(body, "college", errors, {
    label: "College",
    required: true,
    min: 2,
    max: 200,
  });

  const course = readText(body, "course", errors, {
    label: "Course",
    max: 100,
  });

  const year = readText(body, "year", errors, {
    label: "Year",
    max: 50,
  });

  const domain = readChoice(body, "domain", "Domain", INTERNSHIP_DOMAINS, errors, true);
  const duration = readChoice(body, "duration", "Duration", INTERNSHIP_DURATIONS, errors);

  let startDate = null;
  const startDateText = readText(body, "startDate", errors, {
    label: "Start date",
    max: 10,
  });

  if (startDateText && !errors.startDate) {
    const parsed = parseDateOnly(startDateText);

    if (!parsed) {
      errors.startDate = "Start date must be a valid date (YYYY-MM-DD)";
    } else {
      const today = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );

      /* one day of slack covers timezone differences with the browser */
      if (parsed.getTime() < today - DAY_MS) {
        errors.startDate = "Start date cannot be in the past";
      } else if (parsed.getTime() > today + MAX_START_AHEAD_DAYS * DAY_MS) {
        errors.startDate = "Start date is too far in the future";
      } else {
        startDate = parsed;
      }
    }
  }

  let portfolio = null;
  const portfolioText = readText(body, "portfolio", errors, {
    label: "Portfolio",
    max: 300,
  });

  if (portfolioText && !errors.portfolio) {
    portfolio = normalizeHttpUrl(portfolioText);

    if (!portfolio) {
      errors.portfolio = "Portfolio must be a valid http(s) link";
    }
  }

  const message = readText(body, "message", errors, {
    label: "Message",
    max: 3000,
    multiline: true,
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      name,
      email,
      phone,
      college,
      course: course || null,
      year: year || null,
      domain,
      duration: duration || null,
      startDate,
      portfolio,
      message: message || null,
    },
  };
};

export const validateInternshipUpdate = (body) => {
  const errors = {};
  const data = {};

  if (notAnObject(body)) {
    return {
      isValid: false,
      errors: { body: "Request body must be a JSON object" },
      data,
    };
  }

  if (body.status !== undefined) {
    if (!INTERNSHIP_STATUSES.includes(body.status)) {
      errors.status = `Invalid internship status. Allowed values: ${INTERNSHIP_STATUSES.join(", ")}`;
    } else {
      data.status = body.status;
    }
  }

  if (body.adminNote !== undefined) {
    if (body.adminNote !== null && typeof body.adminNote !== "string") {
      errors.adminNote = "Admin note must be a string";
    } else {
      const adminNote = sanitizeText(body.adminNote ?? "", {
        multiline: true,
      });

      if (adminNote.length > 2000) {
        errors.adminNote = "Admin note cannot exceed 2000 characters";
      } else {
        data.adminNote = adminNote || null;
      }
    }
  }

  if (body.assignedTo !== undefined) {
    if (body.assignedTo === null || body.assignedTo === "") {
      data.assignedTo = null;
    } else if (!isValidObjectId(body.assignedTo)) {
      errors.assignedTo = "Invalid assignedTo admin ID";
    } else {
      data.assignedTo = body.assignedTo;
    }
  }

  if (Object.keys(errors).length === 0 && Object.keys(data).length === 0) {
    errors.body = "Provide at least one of: status, adminNote, assignedTo";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data,
  };
};

export const validateInternshipQuery = (query = {}) => {
  if (query === null || typeof query !== "object") {
    query = {};
  }

  const errors = {};
  const data = {};

  const choice = (key, allowed) => {
    const value = readQueryValue(query, key, errors);

    if (value === undefined) {
      return;
    }

    if (!allowed.includes(value)) {
      errors[key] = `Invalid ${key} filter`;
    } else {
      data[key] = value;
    }
  };

  choice("status", INTERNSHIP_STATUSES);
  choice("domain", INTERNSHIP_DOMAINS);
  choice("duration", INTERNSHIP_DURATIONS);
  choice("sortBy", INTERNSHIP_SORT_FIELDS);

  const order = readQueryValue(query, "order", errors);
  if (order !== undefined) {
    if (!["asc", "desc"].includes(order)) {
      errors.order = "order must be asc or desc";
    } else {
      data.order = order;
    }
  }

  const search = readQueryValue(query, "search", errors);
  if (search !== undefined) {
    if (search.length > 100) {
      errors.search = "Search cannot exceed 100 characters";
    } else {
      data.search = search;
    }
  }

  for (const key of ["page", "limit"]) {
    const value = readPositiveInt(query, key, errors);

    if (value !== undefined) {
      data[key] = value;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data,
  };
};
