import nodemailer from "nodemailer";
import env from "../../config/env.js";

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
 * Parses a display email string like 'Ashivam <no-reply@ashivam.com>'
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
 *   2. Explicit EMAIL_PROVIDER setting if credentials present
 *   3. Auto-detected HTTPS API (Resend, Brevo) - optimal for cloud containers blocking SMTP ports
 *   4. Direct SMTP via Nodemailer (with IPv4 enforcement)
 *   5. None (simulated mode)
 */
export const getActiveProvider = () => {
  if (mockTransporter) {
    return "mock";
  }

  const explicit = (env.emailProvider || "").toLowerCase().trim();
  if (explicit === "resend" && env.resendApiKey) return "resend";
  if (explicit === "brevo" && env.brevoApiKey) return "brevo";
  if (explicit === "smtp" && env.smtpHost && env.smtpUser && env.smtpPassword) return "smtp";

  // Auto-detection: Prefer HTTPS APIs over raw SMTP on cloud containers
  if (env.resendApiKey) return "resend";
  if (env.brevoApiKey) return "brevo";
  if (env.smtpHost && env.smtpUser && env.smtpPassword) return "smtp";

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
      port: Number(env.smtpPort),
      secure: Boolean(env.smtpSecure),
      auth: {
        user: env.smtpUser,
        pass: env.smtpPassword,
      },
      family: 4, // CRITICAL: Force IPv4 to prevent ENETUNREACH 2607:f8b0:400e:c0d::6d
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
      const isTransient =
        err.name === "AbortError" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ECONNRESET" ||
        err.code === "ENETUNREACH" ||
        err.code === "EAI_AGAIN" ||
        (err.status && [429, 500, 502, 503, 504].includes(err.status));

      if (attempt > maxRetries || !isTransient) {
        throw err;
      }
      const backoff = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
};

/**
 * Dispatches an email via Resend HTTPS API (Port 443).
 * Bypasses cloud container outbound SMTP port restrictions.
 */
const sendViaResend = async ({ to, subject, html, text, replyTo }) => {
  const payload = {
    from: env.smtpFrom || env.emailFrom || "Ashivam Technologies <no-reply@ashivamtechnologies.com>",
    to: [to],
    subject,
    html: html || text || "",
    text: text || "",
  };
  if (replyTo) {
    payload.reply_to = replyTo;
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
  const fromRaw = env.smtpFrom || env.emailFrom || "no-reply@ashivamtechnologies.com";
  const parsedSender = parseSender(fromRaw);

  const payload = {
    sender: parsedSender,
    to: [{ email: to }],
    subject,
    htmlContent: html || text || "",
    textContent: text || "",
  };
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
    alertEmail: env.alertEmail || env.notificationRecipient || null,
    simulated: provider === "none",
    resendConfigured: Boolean(env.resendApiKey),
    brevoConfigured: Boolean(env.brevoApiKey),
  };
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

    return {
      accepted: true,
      delivered: true,
      simulated: false,
      messageId: result.messageId,
      response: result.response,
      provider: "smtp",
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
      code: error.code || (error.status ? `HTTP_${error.status}` : null),
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
    return {
      configured: true,
      verified: false,
      simulated: false,
      provider: "smtp",
      message: err.message,
      code: err.code || null,
    };
  }
};