import nodemailer from "nodemailer";
import env from "../../config/env.js";

let transporter = null;

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

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const mailer = getTransporter();

  if (!mailer) {
    console.info(`[Email Service] SMTP unconfigured. Simulated email dispatch to: ${to} | Subject: "${subject}"`);
    return {
      messageId: `simulated-${Date.now()}`,
      delivered: false,
      reason: "smtp_not_configured",
    };
  }

  try {
    const result = await mailer.sendMail({
      from: env.emailFrom,
      to,
      subject,
      text: text || "",
      html: html || text || "",
    });

    return {
      messageId: result.messageId,
      delivered: true,
    };
  } catch (error) {
    console.error(`[Email Service] Dispatch failure to ${to}:`, error.message);
    return {
      messageId: null,
      delivered: false,
      error: error.message,
    };
  }
};

export const verifyEmailTransport = async () => {
  const mailer = getTransporter();

  if (!mailer) {
    return false;
  }

  await mailer.verify();
  return true;
};