const allowedTypes = [
  "system",
  "inquiry",
  "career",
  "content",
  "media",
  "security",
  "email",
];

const allowedPriorities = [
  "low",
  "normal",
  "high",
  "urgent",
];

export const validateCreateNotification = (body) => {
  const errors = [];

  if (!body.recipient) {
    errors.push("Recipient is required");
  }

  if (!body.title?.trim()) {
    errors.push("Title is required");
  }

  if (!body.message?.trim()) {
    errors.push("Message is required");
  }

  if (
    body.type &&
    !allowedTypes.includes(body.type)
  ) {
    errors.push("Invalid notification type");
  }

  if (
    body.priority &&
    !allowedPriorities.includes(body.priority)
  ) {
    errors.push("Invalid notification priority");
  }

  return errors;
};

export const validateEmail = (email) => {
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};