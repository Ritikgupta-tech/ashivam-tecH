import nodemailer from "nodemailer";
import env from "../../config/env.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let transporter = null;

/**
 * Allows automated tests to inject a mocked transporter instance.
 */
export const setTransporter = (customTransporter) => {
  transporter = customTransporter;
};

/**
 * Resets the cached transporter instance.
 */
export const resetTransporter = () => {
  transporter = null;
};

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
export const getTransporter = () => {
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
    connectionTimeout: env.smtpConnectionTimeoutMs || 10000,
    greetingTimeout: env.smtpGreetingTimeoutMs || 10000,
    socketTimeout: env.smtpSocketTimeoutMs || 15000,
    tls: {
      rejectUnauthorized: env.isProduction,
      minVersion: "TLSv1.2",
    },
  });

  return transporter;
};

/**
 * Returns safe, non-sensitive diagnostic status of current SMTP configuration.
 */
export const getSafeSmtpStatus = () => {
  return {
    configured: Boolean(env.isSmtpConfigured),
    host: env.smtpHost || null,
    port: env.smtpPort || null,
    secure: Boolean(env.smtpSecure),
    user: env.smtpUser ? `${env.smtpUser.substring(0, 3)}***` : null,
    from: env.smtpFrom || env.emailFrom || null,
    alertEmail: env.alertEmail || env.notificationRecipient || null,
    simulated: !env.isSmtpConfigured,
  };
};

/**
 * Dispatches an email with CRLF injection defense, fixed controlled sender,
 * Reply-To support, and graceful fallback when SMTP is unconfigured.
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
}) => {
  const cleanTo = sanitizeEmailHeader(to).toLowerCase();
  const cleanSubject = sanitizeEmailHeader(subject);
  const cleanReplyTo = replyTo ? sanitizeEmailHeader(replyTo).toLowerCase() : undefined;

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

  if (cleanReplyTo && !EMAIL_REGEX.test(cleanReplyTo)) {
    const error = new Error("Invalid Reply-To email address");
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
      accepted: false,
      delivered: false,
      simulated: true,
      messageId: `simulated-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      reason: "smtp_not_configured",
    };
  }

  try {
    const mailOptions = {
      from: env.smtpFrom || env.emailFrom,
      to: cleanTo,
      subject: cleanSubject,
      text: text || "",
      html: html || text || "",
    };

    if (cleanReplyTo) {
      mailOptions.replyTo = cleanReplyTo;
    }

    const result = await mailer.sendMail(mailOptions);

    return {
      accepted: true,
      delivered: true,
      simulated: false,
      messageId: result.messageId,
      response: result.response,
    };
  } catch (error) {
    console.error(
      `[Email Service] Dispatch failure to ${cleanTo}:`,
      error.message
    );
    return {
      accepted: false,
      delivered: false,
      simulated: false,
      messageId: null,
      error: error.message,
      code: error.code || null,
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
      simulated: true,
      message: "SMTP is not configured in environment.",
    };
  }

  try {
    await mailer.verify();
    return {
      configured: true,
      verified: true,
      simulated: false,
      message: "SMTP connection and authentication verified successfully.",
    };
  } catch (err) {
    return {
      configured: true,
      verified: false,
      simulated: false,
      message: err.message,
      code: err.code || null,
    };
  }
};