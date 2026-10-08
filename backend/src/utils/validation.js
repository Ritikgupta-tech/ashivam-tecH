import mongoose from "mongoose";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAGS = /<\/?[a-zA-Z!][^>]*>/g;

/*
 * Normalises user text into safe plain text:
 * strips control characters and HTML tags and collapses whitespace.
 */
export const sanitizeText = (value, { multiline = false } = {}) => {
  let text = String(value)
    .replace(CONTROL_CHARS, "")
    .replace(HTML_TAGS, "")
    .replace(/\r\n?/g, "\n");

  if (multiline) {
    text = text
      .replace(/[^\S\n]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    text = text.replace(/\s+/g, " ");
  }

  return text.trim();
};

/*
 * Reads a string field. Non-string values (objects, arrays, numbers)
 * are rejected so they can never reach the database layer.
 */
export const readText = (body, key, errors, options = {}) => {
  const { label, required = false, min = 0, max, multiline } = options;
  const raw = body[key];

  if (raw === undefined || raw === null || raw === "") {
    if (required) {
      errors[key] = `${label} is required`;
    }
    return "";
  }

  if (typeof raw !== "string") {
    errors[key] = `${label} must be a string`;
    return "";
  }

  const value = sanitizeText(raw, { multiline });

  if (!value) {
    if (required) {
      errors[key] = `${label} is required`;
    }
    return "";
  }

  if (value.length < min || value.length > max) {
    errors[key] =
      min > 0
        ? `${label} must be between ${min} and ${max} characters`
        : `${label} cannot exceed ${max} characters`;
  }

  return value;
};

export const isHoneypotTriggered = (body = {}) => {
  return typeof body.website === "string"
    ? body.website.trim() !== ""
    : body.website !== undefined && body.website !== null;
};

export const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

/*
 * Reads a single-valued query parameter. Arrays / nested objects
 * (e.g. ?status=a&status=b or ?status[$ne]=x) are rejected.
 */
export const readQueryValue = (query, key, errors) => {
  const value = query[key];

  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    errors[key] = `${key} must be a single value`;
    return undefined;
  }

  return value.trim();
};

export const readPositiveInt = (query, key, errors) => {
  const value = readQueryValue(query, key, errors);

  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(value) || Number(value) < 1) {
    errors[key] = `${key} must be a positive integer`;
    return undefined;
  }

  return Number(value);
};

const FORBIDDEN_URL_CHARS = /[\s<>"'`]/;

/*
 * Normalises a user-supplied link to a safe http(s) URL, or returns null.
 * A bare "github.com/user" is upgraded to https. Other schemes
 * (javascript:, data:, ftp: ...), hosts without a dot (localhost) and
 * values with whitespace/quotes/angle brackets are rejected.
 */
export const normalizeHttpUrl = (value, maxLength = 300) => {
  if (value.length > maxLength || FORBIDDEN_URL_CHARS.test(value)) {
    return null;
  }

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;

  try {
    const url = new URL(candidate);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (!url.hostname.includes(".")) {
      return null;
    }

    /* IP-address hosts (e.g. 127.0.0.1, http://127 -> 0.0.0.127, [::1]) */
    if (/^[\d.]+$/.test(url.hostname) || url.hostname.startsWith("[")) {
      return null;
    }

    return url.href.length <= maxLength ? url.href : null;
  } catch {
    return null;
  }
};
