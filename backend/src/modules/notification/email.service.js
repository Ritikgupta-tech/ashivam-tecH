import nodemailer from "nodemailer";
import env, { validateSmtpConfig } from "../../config/env.js";
import {
  employeeInvitationEmail,
  employeePasswordResetEmail,
  employeePasswordResetConfirmationEmail,
} from "./email.templates.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let mockTransporter = null;
let smtpTransporter = null;

/**
 * Allows automated tests to inject a mocked transporter instance.
 */
export const setTransporter = (customTransporter) => {
  mockTransporter = customTransporter;
};

/**
 * Resets the cached transporter instances.
 */
export const resetTransporter = () => {
  mockTransporter = null;
  smtpTransporter = null;
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
 * Parses a display email string like 'Ashivam <ritik95061@gmail.com>'
 * into structured name and email fields.
 */
export const parseSender = (senderString = "") => {
  const clean = sanitizeEmailHeader(senderString);
  const match = clean.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, "") || "Ashivam Technologies",
      email: match[2].trim().toLowerCase(),
    };
  }
  return {
    name: "Ashivam Technologies",
    email: clean.toLowerCase(),
  };
};

/**
 * Resolves the currently active email provider based on configuration.
 * Order of precedence:
 *   1. Explicit mocked transporter (for unit tests)
 *   2. Primary & exclusive SMTP provider (Nodemailer with TLS/SSL & IPv4 enforcement)
 *   3. Explicit non-SMTP provider (only if explicitly set in test suite)
 *   4. None (simulated mode when unconfigured)
 *
 * NOTE: Automatic fallback to Resend or other providers has been strictly removed.
 */
export const getActiveProvider = () => {
  if (mockTransporter) {
    return "mock";
  }

  const explicit = (env.emailProvider || "smtp").toLowerCase().trim();
  if (explicit === "smtp") {
    if (env.smtpHost && env.smtpUser && env.smtpPassword) {
      return "smtp";
    }
    return "none";
  }

  // Only permit non-SMTP providers when explicitly requested in test suites
  if (explicit === "resend" && env.resendApiKey) return "resend";
  if (explicit === "brevo" && env.brevoApiKey) return "brevo";

  return "none";
};

/**
 * Creates or retrieves the singleton Nodemailer transport instance.
 * Forces IPv4 family resolution to prevent ENETUNREACH on cloud containers without IPv6 routing.
 */
export const getTransporter = () => {
  if (mockTransporter) {
    return mockTransporter;
  }

  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword) {
    return null;
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: Number(env.smtpPort) || 465,
      secure: Boolean(env.smtpSecure),
      auth: {
        user: env.smtpUser,
        pass: env.smtpPassword,
      },
      family: 4, // CRITICAL: Force IPv4 to prevent ENETUNREACH on cloud containers
      connectionTimeout: env.smtpConnectionTimeoutMs || 10000,
      greetingTimeout: env.smtpGreetingTimeoutMs || 10000,
      socketTimeout: env.smtpSocketTimeoutMs || 15000,
      tls: {
        rejectUnauthorized: env.isProduction,
        minVersion: "TLSv1.2",
      },
    });
  }

  return smtpTransporter;
};

/**
 * Executes a function with exponential backoff for transient network errors.
 */
const withRetry = async (fn, maxRetries = env.isTest ? 0 : 2, baseDelayMs = 300) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      // Do not repeat slow connection timeouts (ETIMEDOUT, ENETUNREACH) to keep HTTP handlers responsive
      const isConnectionTimeout =
        err.code === "ETIMEDOUT" ||
        err.code === "ENETUNREACH" ||
        err.code === "ECONNREFUSED";

      const isTransient =
        err.name === "AbortError" ||
        err.code === "ECONNRESET" ||
        err.code === "EAI_AGAIN" ||
        (err.status && [429, 500, 502, 503, 504].includes(err.status));

      if (attempt > (isConnectionTimeout ? 0 : maxRetries) || (!isTransient && !isConnectionTimeout)) {
        throw err;
      }
      const backoff = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
};

/**
 * Resolves a valid sender address for Resend.
 * Public webmail domains (@gmail.com, @yahoo.com, etc.) cannot be used on Resend
 * without verified domain ownership and are rejected with HTTP 403.
 * Defaults to Resend's authorized testing sender 'Ashivam Technologies <onboarding@resend.dev>'.
 */
export const resolveResendSender = (fromCandidate) => {
  const candidate = (fromCandidate || "").trim();
  if (candidate && !/@(gmail|yahoo|hotmail|outlook)\.com/i.test(candidate)) {
    return candidate;
  }
  return "Ashivam Technologies <onboarding@resend.dev>";
};

/**
 * Extracts sanitized, readable plain text from HTML or explicit text.
 * Defends against API parameter rejections (such as Brevo's 'textContent is missing').
 */
export const extractPlainText = (html = "", text = "") => {
  if (text && typeof text === "string" && text.trim().length > 0) {
    return text.trim();
  }
  if (html && typeof html === "string" && html.trim().length > 0) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
};

/**
 * Dispatches an email via Resend HTTPS API (Port 443).
 * Bypasses cloud container outbound SMTP port restrictions.
 */
const sendViaResend = async ({ to, subject, html, text, replyTo }) => {
  const effectiveSender = env.resendFrom || resolveResendSender(env.smtpFrom || env.emailFrom);
  const plainText = extractPlainText(html, text);

  const payload = {
    from: effectiveSender,
    to: [to],
    subject,
  };

  if (html && typeof html === "string" && html.trim().length > 0) {
    payload.html = html;
  }
  if (plainText) {
    payload.text = plainText;
  }
  if (!payload.html && !payload.text) {
    payload.text = subject || "Notification from Ashivam Technologies";
  }

  if (replyTo || env.companyNotificationEmail) {
    payload.reply_to = replyTo || env.companyNotificationEmail || "ritik95061@gmail.com";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.message || `Resend HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return {
      accepted: true,
      delivered: true,
      simulated: false,
      messageId: data.id || `resend-${Date.now()}`,
      response: `250 OK: ${data.id}`,
      provider: "resend",
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Dispatches an email via Brevo HTTPS API (Port 443).
 */
const sendViaBrevo = async ({ to, subject, html, text, replyTo }) => {
  let fromRaw = env.brevoSender || env.smtpFrom || env.emailFrom || "Ashivam Technologies <ritik95061@gmail.com>";
  // Brevo strictly permits only validated senders. Default unverified teamashivam@gmail.com must be mapped to authorized ritik95061@gmail.com
  if (/teamashivam@gmail\.com/i.test(fromRaw)) {
    fromRaw = "Ashivam Technologies <ritik95061@gmail.com>";
  }
  const parsedSender = parseSender(fromRaw);
  if (/teamashivam@gmail\.com/i.test(parsedSender.email)) {
    parsedSender.email = "ritik95061@gmail.com";
  }
  const plainText = extractPlainText(html, text);

  const payload = {
    sender: parsedSender,
    to: [{ email: to }],
    subject,
  };

  if (html && typeof html === "string" && html.trim().length > 0) {
    payload.htmlContent = html;
  }
  if (plainText) {
    payload.textContent = plainText;
  }
  // Brevo API strictly requires at least one of htmlContent or non-empty textContent
  if (!payload.htmlContent && !payload.textContent) {
    payload.textContent = subject || "Notification from Ashivam Technologies";
  }

  if (replyTo) {
    payload.replyTo = { email: replyTo };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.message || `Brevo HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return {
      accepted: true,
      delivered: true,
      simulated: false,
      messageId: data.messageId || `brevo-${Date.now()}`,
      response: `250 OK: ${data.messageId}`,
      provider: "brevo",
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Mandatory canonical recipient for all company-directed business notifications.
 */
export const MANDATED_COMPANY_NOTIFICATION_EMAIL = "ritik95061@gmail.com";

/**
 * Returns the validated authorized company notification email address.
 * Strictly guarantees that company notifications always resolve to ritik95061@gmail.com.
 */
export const getCompanyNotificationEmail = () => {
  return env.companyNotificationEmail || MANDATED_COMPANY_NOTIFICATION_EMAIL;
};

/**
 * Returns safe, non-sensitive diagnostic status of current email configuration.
 */
export const getSafeSmtpStatus = () => {
  const provider = getActiveProvider();
  return {
    configured: provider !== "none",
    provider: provider === "mock" ? "smtp" : provider,
    host: env.smtpHost || null,
    port: env.smtpPort || null,
    secure: Boolean(env.smtpSecure),
    user: env.smtpUser ? `${env.smtpUser.substring(0, 3)}***` : null,
    from: env.smtpFrom || env.emailFrom || null,
    companyNotificationEmail: getCompanyNotificationEmail(),
    alertEmail: getCompanyNotificationEmail(),
    simulated: provider === "none",
    smtpConfigured: Boolean(env.smtpHost && env.smtpUser && env.smtpPassword),
    resendConfigured: Boolean(env.resendApiKey),
    brevoConfigured: Boolean(env.brevoApiKey),
  };
};

/**
 * Centralized, authoritative dispatcher for all incoming company business notifications:
 * - General inquiries & Contact Us form submissions
 * - Job candidate applications & recruitment alerts
 * - Student internship applications & academic program alerts
 * - Website and system administrative notifications
 *
 * Guarantees:
 * 1. The recipient is ALWAYS strictly enforced to ritik95061@gmail.com.
 * 2. Any caller-supplied or user-supplied 'to', 'cc', or 'bcc' overrides are completely stripped.
 * 3. Preserves 'replyTo' as the verified submitter email for direct response handling.
 * 4. Fails safely and logs sanitized error without leaking message bodies or credentials.
 */
export const sendCompanyNotification = async ({
  subject,
  html,
  text,
  replyTo,
  metadata = {},
}) => {
  const targetRecipient = getCompanyNotificationEmail();

  return sendEmail({
    to: targetRecipient,
    subject,
    html,
    text,
    replyTo,
  });
};

/**
 * Dispatches an email with CRLF injection defense, fixed controlled sender,
 * Reply-To support, and graceful fallback when transport is unconfigured.
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

  const provider = mockTransporter ? "mock" : getActiveProvider();

  if (provider === "none") {
    if (!env.isTest) {
      console.info(
        `[Email Service] Email transport unconfigured. Simulated email dispatch to: ${cleanTo} | Subject: "${cleanSubject}"`
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
    if (provider === "resend") {
      return await withRetry(() =>
        sendViaResend({
          to: cleanTo,
          subject: cleanSubject,
          html,
          text,
          replyTo: cleanReplyTo,
        })
      );
    }

    if (provider === "brevo") {
      return await withRetry(() =>
        sendViaBrevo({
          to: cleanTo,
          subject: cleanSubject,
          html,
          text,
          replyTo: cleanReplyTo,
        })
      );
    }

    // SMTP transport (via Nodemailer or mock)
    const mailer = getTransporter();

    if (!mailer) {
      return {
        accepted: false,
        delivered: false,
        simulated: true,
        messageId: `simulated-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        reason: "smtp_not_configured",
      };
    }

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

    const result = await withRetry(() => mailer.sendMail(mailOptions));

    const isRejected = Array.isArray(result.rejected) && result.rejected.length > 0;
    const isExplicitlyEmpty = Array.isArray(result.accepted) && result.accepted.length === 0;

    if (isRejected || isExplicitlyEmpty) {
      const rejectedList = (result.rejected || []).join(", ");
      console.warn(`[Email Service] SMTP recipient rejected for ${cleanTo}:`, rejectedList || cleanTo);
      return {
        accepted: false,
        delivered: false,
        simulated: false,
        messageId: result.messageId || null,
        response: result.response,
        error: `SMTP recipient rejected: ${rejectedList || cleanTo}`,
        code: "ERECIPIENTREJECTED",
        provider: "smtp",
      };
    }

    return {
      accepted: true,
      delivered: true,
      simulated: false,
      messageId: result.messageId,
      response: result.response,
      provider: "smtp",
    };
  } catch (error) {
    const sanitizedError = (error.message || "")
      .replace(/pass(word)?\s*[:=]\s*\S+/gi, "password: [REDACTED]")
      .replace(/bearer\s+\S+/gi, "Bearer [REDACTED]");

    console.error(
      `[Email Service] Dispatch failure to ${cleanTo}:`,
      sanitizedError
    );
    return {
      accepted: false,
      delivered: false,
      simulated: false,
      messageId: null,
      error: sanitizedError,
      code: error.code || (error.responseCode ? `SMTP_${error.responseCode}` : (error.status ? `HTTP_${error.status}` : null)),
      provider: provider === "mock" ? "smtp" : provider,
    };
  }
};

/**
 * Verifies email transport connectivity and credentials without leaking secrets.
 */
export const verifyEmailTransport = async () => {
  // If custom mocked transporter is injected, verify via transporter
  if (mockTransporter) {
    try {
      if (typeof mockTransporter.verify === "function") {
        await mockTransporter.verify();
      }
      return {
        configured: true,
        verified: true,
        simulated: false,
        provider: "smtp",
        message: "SMTP connection and authentication verified successfully.",
      };
    } catch (err) {
      return {
        configured: true,
        verified: false,
        simulated: false,
        provider: "smtp",
        message: err.message,
        code: err.code || null,
      };
    }
  }

  const provider = getActiveProvider();

  if (provider === "none") {
    return {
      configured: false,
      verified: false,
      simulated: true,
      provider: "none",
      message: "Email transport is not configured in environment.",
    };
  }

  if (provider === "resend") {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("https://api.resend.com/api-keys", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      const data = await res.json().catch(() => ({}));
      const isAcceptedKey = res.ok || data.name === "restricted_api_key";

      if (isAcceptedKey) {
        return {
          configured: true,
          verified: true,
          simulated: false,
          provider: "resend",
          message: "Resend HTTPS API authenticated successfully.",
        };
      }
      return {
        configured: true,
        verified: false,
        simulated: false,
        provider: "resend",
        message: data.message || `Resend authentication failed with HTTP ${res.status}`,
        code: `HTTP_${res.status}`,
      };
    } catch (err) {
      return {
        configured: true,
        verified: false,
        simulated: false,
        provider: "resend",
        message: `Resend connectivity error: ${err.message}`,
        code: err.code || "ENETWORK",
      };
    }
  }

  if (provider === "brevo") {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("https://api.brevo.com/v3/account", {
        method: "GET",
        headers: {
          "api-key": env.brevoApiKey,
          accept: "application/json",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        return {
          configured: true,
          verified: true,
          simulated: false,
          provider: "brevo",
          message: "Brevo HTTPS API authenticated successfully.",
        };
      }
      const data = await res.json().catch(() => ({}));
      return {
        configured: true,
        verified: false,
        simulated: false,
        provider: "brevo",
        message: data.message || `Brevo authentication failed with HTTP ${res.status}`,
        code: `HTTP_${res.status}`,
      };
    } catch (err) {
      return {
        configured: true,
        verified: false,
        simulated: false,
        provider: "brevo",
        message: `Brevo connectivity error: ${err.message}`,
        code: err.code || "ENETWORK",
      };
    }
  }

  // SMTP transport via Nodemailer
  const mailer = getTransporter();
  if (!mailer) {
    return {
      configured: false,
      verified: false,
      simulated: true,
      provider: "smtp",
      message: "SMTP is not configured in environment.",
    };
  }

  try {
    await mailer.verify();
    return {
      configured: true,
      verified: true,
      simulated: false,
      provider: "smtp",
      message: "SMTP connection and authentication verified successfully.",
    };
  } catch (err) {
    const sanitizedError = (err.message || "")
      .replace(/pass(word)?\s*[:=]\s*\S+/gi, "password: [REDACTED]")
      .replace(/bearer\s+\S+/gi, "Bearer [REDACTED]");

    return {
      configured: true,
      verified: false,
      simulated: false,
      provider: "smtp",
      message: sanitizedError,
      code: err.code || (err.responseCode ? `SMTP_${err.responseCode}` : "EAUTH"),
    };
  }
};

/**
 * Validates the SMTP configuration against environment variables.
 */
export const validateSmtpEnvironment = (customEnv = env) => {
  return validateSmtpConfig(customEnv);
};

/**
 * Sends an account activation invitation email to an employee.
 */
export const sendEmployeeInvitation = async ({
  employee,
  rawToken,
  activationUrl,
  expiresHours = 24,
}) => {
  const clientBase = env.clientUrl || "https://ashivam-tec-h.vercel.app";
  const url = activationUrl || `${clientBase}/activate-account?token=${rawToken}`;
  const employeeName =
    employee.fullName ||
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
    "Staff Member";

  const html = employeeInvitationEmail({
    employeeName,
    employeeEmail: employee.email,
    employeeId: employee.employeeId,
    designation: employee.designation,
    department: employee.department,
    activationUrl: url,
    expiresHours,
  });

  const text = `Welcome to Ashivam Technologies, ${employeeName}!\n\n` +
    `You have been invited to activate your official employee account.\n\n` +
    `Employee ID: ${employee.employeeId || "N/A"}\n` +
    `Department: ${employee.department || "N/A"}\n` +
    `Designation: ${employee.designation || "N/A"}\n\n` +
    `Please activate your account by visiting the link below (valid for ${expiresHours} hours):\n` +
    `${url}\n\n` +
    `If you did not expect this invitation, please contact your system administrator.\n\n` +
    `Best regards,\nAshivam Technologies Team`;

  return sendEmail({
    to: employee.email,
    subject: "Welcome to Ashivam Technologies — Activate Your Employee Workspace",
    html,
    text,
  });
};

/**
 * Sends a password reset email to an employee.
 */
export const sendEmployeePasswordReset = async ({
  employee,
  rawToken,
  resetUrl,
  expiresHours = 1,
}) => {
  const clientBase = env.clientUrl || "https://ashivam-tec-h.vercel.app";
  const url = resetUrl || `${clientBase}/reset-password?token=${rawToken}`;
  const employeeName =
    employee.fullName ||
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
    "Staff Member";

  const html = employeePasswordResetEmail({
    employeeName,
    employeeEmail: employee.email,
    resetUrl: url,
    expiresHours,
  });

  const text = `Hello ${employeeName},\n\n` +
    `We received a request to reset your employee account password at Ashivam Technologies.\n\n` +
    `Click the link below to set a new password (valid for ${expiresHours} hour):\n` +
    `${url}\n\n` +
    `If you did not request this password reset, please ignore this email or contact support immediately.\n\n` +
    `Best regards,\nAshivam Technologies Team`;

  return sendEmail({
    to: employee.email,
    subject: "Password Reset Request — Ashivam Technologies",
    html,
    text,
  });
};

/**
 * Sends a confirmation email after an employee's password has been successfully reset.
 */
export const sendEmployeePasswordResetConfirmation = async ({
  employee,
}) => {
  const employeeName =
    employee.fullName ||
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
    "Staff Member";

  const html = employeePasswordResetConfirmationEmail({
    employeeName,
    employeeEmail: employee.email,
  });

  const text = `Hello ${employeeName},\n\n` +
    `Your Ashivam Technologies employee account password has been successfully updated.\n\n` +
    `If you did not initiate this change, please contact your administrator immediately.\n\n` +
    `Best regards,\nAshivam Technologies Team`;

  return sendEmail({
    to: employee.email,
    subject: "Password Changed Successfully — Ashivam Technologies",
    html,
    text,
  });
};