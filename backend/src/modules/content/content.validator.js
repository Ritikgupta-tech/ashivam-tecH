const allowedStatuses = ["draft", "published"];

const isValidObjectId = (value) => {
  return /^[a-f\d]{24}$/i.test(value);
};

export const validateCreateContent = (body = {}) => {
  const errors = {};

  if (!body.key || typeof body.key !== "string") {
    errors.key = "Content key is required";
  } else if (body.key.trim().length < 2) {
    errors.key = "Content key must be at least 2 characters";
  }

  if (!body.section || typeof body.section !== "string") {
    errors.section = "Section is required";
  }

  if (!body.title || typeof body.title !== "string") {
    errors.title = "Title is required";
  }

  if (
    body.content === undefined ||
    body.content === null ||
    typeof body.content !== "object"
  ) {
    errors.content = "Content must be an object or array";
  }

  if (
    body.status !== undefined &&
    !allowedStatuses.includes(body.status)
  ) {
    errors.status = "Status must be draft or published";
  }

  if (
    body.sortOrder !== undefined &&
    (!Number.isInteger(body.sortOrder) || body.sortOrder < 0)
  ) {
    errors.sortOrder = "Sort order must be a non-negative integer";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateUpdateContent = (body = {}) => {
  const errors = {};

  if (
    body.key !== undefined &&
    (typeof body.key !== "string" || body.key.trim().length < 2)
  ) {
    errors.key = "Invalid content key";
  }

  if (
    body.section !== undefined &&
    (typeof body.section !== "string" ||
      body.section.trim().length < 2)
  ) {
    errors.section = "Invalid section";
  }

  if (
    body.title !== undefined &&
    (typeof body.title !== "string" ||
      body.title.trim().length < 1)
  ) {
    errors.title = "Invalid title";
  }

  if (
    body.content !== undefined &&
    (typeof body.content !== "object" || body.content === null)
  ) {
    errors.content = "Content must be an object or array";
  }

  if (
    body.status !== undefined &&
    !allowedStatuses.includes(body.status)
  ) {
    errors.status = "Status must be draft or published";
  }

  if (
    body.sortOrder !== undefined &&
    (!Number.isInteger(body.sortOrder) || body.sortOrder < 0)
  ) {
    errors.sortOrder = "Sort order must be a non-negative integer";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateContentId = (id) => {
  return isValidObjectId(id);
};