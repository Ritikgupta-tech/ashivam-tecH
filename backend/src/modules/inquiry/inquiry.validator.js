const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

export const validateCreateInquiry = (body = {}) => {
  const errors = {};

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : "";
  const subject = body.subject ? String(body.subject).trim() : "";
  const message = String(body.message ?? "").trim();

  if (!name) {
    errors.name = "Name is required";
  } else if (name.length < 2 || name.length > 100) {
    errors.name = "Name must be between 2 and 100 characters";
  }

  if (!email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(email)) {
    errors.email = "Please provide a valid email address";
  }

  if (phone && !phoneRegex.test(phone)) {
    errors.phone = "Please provide a valid phone number";
  }

  if (subject.length > 200) {
    errors.subject = "Subject cannot exceed 200 characters";
  }

  if (!message) {
    errors.message = "Message is required";
  } else if (message.length < 10 || message.length > 5000) {
    errors.message = "Message must be between 10 and 5000 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      name,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
    },
  };
};

export const validateInquiryUpdate = (body = {}) => {
  const errors = {};
  const data = {};

  if (body.status !== undefined) {
    const allowedStatuses = [
      "new",
      "in_progress",
      "resolved",
      "closed",
    ];

    if (!allowedStatuses.includes(body.status)) {
      errors.status = "Invalid inquiry status";
    } else {
      data.status = body.status;
    }
  }

  if (body.adminNote !== undefined) {
    const adminNote = String(body.adminNote).trim();

    if (adminNote.length > 2000) {
      errors.adminNote = "Admin note cannot exceed 2000 characters";
    } else {
      data.adminNote = adminNote || null;
    }
  }

  if (body.assignedTo !== undefined) {
    data.assignedTo = body.assignedTo || null;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data,
  };
};