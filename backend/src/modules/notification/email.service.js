import nodemailer from "nodemailer";
import env from "../../config/env.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let transporter = null;

/**
 * Sanitizes header values to defend against CRLF (Carriage Return / Line Feed)
 * email header injection vulnerabilities.
 */
export const sanitizeEmailHeader = (headerValue = "") => {
  if (headerValue === null || headerValue === undefined) return "";
  return String(headerValue)
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Creates or retrieves the singleton Nodemailer transport instance.
 */
const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!env.isSmtpConfigured) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: Number(env.smtpPort),
    secure: Boolean(env.smtpSecure),
    auth: {
      user: env.smtpUser,
      pass: env.smtpPassword,
    },
    tls: {
      rejectUnauthorized: env.isProduction,
    },
  });

  return transporter;
};

/**
 * Dispatches an email with CRLF injection defense, fixed controlled sender,
 * and graceful fallback when SMTP is unconfigured.
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}) => {
  const cleanTo = sanitizeEmailHeader(to).toLowerCase();
  const cleanSubject = sanitizeEmailHeader(subject);

  if (!cleanTo || !EMAIL_REGEX.test(cleanTo)) {
    const error = new Error("Valid recipient email is required");
    error.statusCode = 400;
    throw error;
  }

  if (!cleanSubject) {
    const error = new Error("Email subject is required");
    error.statusCode = 400;
    throw error;
  }

  const mailer = getTransporter();

  if (!mailer) {
    if (!env.isTest) {
      console.info(
        `[Email Service] SMTP unconfigured. Simulated email dispatch to: ${cleanTo} | Subject: "${cleanSubject}"`
      );
    }
    return {
      messageId: `simulated-${Date.now()}`,
      delivered: false,
      reason: "smtp_not_configured",
    };
  }

  try {
    const result = await mailer.sendMail({
      from: env.emailFrom,
      to: cleanTo,
      subject: cleanSubject,
      text: text || "",
      html: html || text || "",
    });

    return {
      messageId: result.messageId,
      delivered: true,
    };
  } catch (error) {
    console.error(
      `[Email Service] Dispatch failure to ${cleanTo}:`,
      error.message
    );
    return {
      messageId: null,
      delivered: false,
      error: error.message,
    };
  }
};

/**
 * Verifies SMTP transport connectivity and credentials without leaking secrets.
 */
export const verifyEmailTransport = async () => {
  const mailer = getTransporter();

  if (!mailer) {
    return {
      configured: false,
      verified: false,
      message: "SMTP is not configured in environment.",
    };
  }

  try {
    await mailer.verify();
    return {
      configured: true,
      verified: true,
      message: "SMTP connection and authentication verified successfully.",
    };
  } catch (err) {
    return {
      configured: true,
      verified: false,
      message: err.message,
    };
  }
};