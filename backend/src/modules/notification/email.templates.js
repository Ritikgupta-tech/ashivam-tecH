/**
 * Escapes HTML entities to prevent Cross-Site Scripting (XSS) and HTML injection in emails.
 */
export const escapeHtml = (unsafe = "") => {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Sanitizes URLs to prevent javascript:, data:, and other dangerous protocol schemes.
 */
export const sanitizeUrl = (url = "") => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return "";
};

/**
 * Common HTML wrapper for all Ashivam Technologies transactional emails.
 */
const baseTemplate = ({
  title,
  contentHtml,
  actionUrl,
  actionText = "View Details",
}) => {
  const safeTitle = escapeHtml(title);
  const safeActionUrl = sanitizeUrl(actionUrl);
  const safeActionText = escapeHtml(actionText);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="padding:22px 28px;background:#0f172a;color:#ffffff;border-bottom:3px solid #3b82f6;">
      <h2 style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">Ashivam Technologies</h2>
      <p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;">Endless Innovation. Limitless Possibilities.</p>
    </div>

    <div style="padding:28px;">
      <h3 style="margin-top:0;margin-bottom:16px;color:#0f172a;font-size:18px;font-weight:600;">
        ${safeTitle}
      </h3>

      <div style="color:#334155;line-height:1.65;font-size:14px;">
        ${contentHtml}
      </div>

      ${
        safeActionUrl
          ? `
            <div style="margin-top:28px;margin-bottom:8px;">
              <a
                href="${safeActionUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="display:inline-block;padding:11px 22px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;"
              >
                ${safeActionText}
              </a>
            </div>
          `
          : ""
      }
    </div>

    <div style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;line-height:1.5;">
      <p style="margin:0;">This is an automated transmission from Ashivam Technologies. Please do not reply directly to this email unless directed otherwise.</p>
      <p style="margin:6px 0 0 0;color:#94a3b8;">Agra, Uttar Pradesh, India | <a href="https://ashivam.com" style="color:#3b82f6;text-decoration:none;">ashivam.com</a></p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Generic admin notification email template.
 */
export const notificationEmailTemplate = ({
  title,
  message,
  actionUrl,
  actionText,
}) =>
  baseTemplate({
    title,
    contentHtml: `<p style="margin:0;">${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`,
    actionUrl,
    actionText,
  });

/**
 * Security alert email template.
 */
export const securityEmailTemplate = ({
  title,
  message,
  actionUrl,
}) =>
  baseTemplate({
    title,
    contentHtml: `
      <div style="padding:14px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;color:#991b1b;margin-bottom:16px;">
        <strong>Security Notice:</strong>
      </div>
      <p style="margin:0;">${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
    `,
    actionUrl,
    actionText: "Review Security Event",
  });

/**
 * Public Inquiry user confirmation email template.
 */
export const inquiryConfirmationTemplate = ({
  name,
  subject,
  referenceNumber,
}) =>
  baseTemplate({
    title: "We Received Your Inquiry",
    contentHtml: `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Thank you for reaching out to Ashivam Technologies. We have received your message regarding <em>${escapeHtml(subject || "General Inquiry")}</em>.</p>
      <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
        <span style="font-size:12px;color:#64748b;display:block;text-transform:uppercase;font-weight:600;">Reference Identifier</span>
        <code style="font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(referenceNumber)}</code>
      </div>
      <p>Our client solutions team is reviewing your requirements and will get back to you shortly.</p>
      <p>Best regards,<br/><strong>Ashivam Technologies Client Relations</strong></p>
    `,
    actionUrl: "https://ashivam.com",
    actionText: "Visit Our Website",
  });

/**
 * Public Inquiry admin alert email template.
 */
export const inquiryAdminAlertTemplate = ({
  name,
  email,
  phone,
  subject,
  message,
  referenceNumber,
}) =>
  baseTemplate({
    title: `New Inquiry: ${escapeHtml(subject || "General Inquiry")}`,
    contentHtml: `
      <p style="margin-top:0;">A new client inquiry was submitted on the website:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        <tr><td style="padding:8px 0;color:#64748b;width:120px;"><strong>Client Name:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Email:</strong></td><td style="padding:8px 0;color:#0f172a;"><a href="mailto:${escapeHtml(email)}" style="color:#2563eb;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Phone:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(phone || "Not provided")}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Subject:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(subject || "General Inquiry")}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Reference:</strong></td><td style="padding:8px 0;color:#0f172a;"><code>${escapeHtml(referenceNumber)}</code></td></tr>
      </table>
      <div style="margin-top:12px;padding:14px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
        <span style="font-size:12px;color:#64748b;display:block;margin-bottom:6px;font-weight:600;">Message Content:</span>
        <p style="margin:0;white-space:pre-wrap;color:#334155;">${escapeHtml(message)}</p>
      </div>
    `,
  });

/**
 * Career application confirmation email template.
 */
export const careerConfirmationTemplate = ({
  firstName,
  jobTitle,
}) =>
  baseTemplate({
    title: `Application Received — ${escapeHtml(jobTitle)}`,
    contentHtml: `
      <p>Hello <strong>${escapeHtml(firstName)}</strong>,</p>
      <p>Thank you for your interest in joining Ashivam Technologies! We have successfully received your application for the <strong>${escapeHtml(jobTitle)}</strong> position.</p>
      <p>Our talent acquisition team will review your qualifications and reach out if your background aligns with our open positions.</p>
      <p>Best regards,<br/><strong>Ashivam Technologies Talent Acquisition</strong></p>
    `,
  });

/**
 * Career application admin alert email template.
 */
export const careerAdminAlertTemplate = ({
  candidateName,
  email,
  phone,
  jobTitle,
  resumeFileName,
}) =>
  baseTemplate({
    title: `New Job Application: ${escapeHtml(jobTitle)}`,
    contentHtml: `
      <p style="margin-top:0;">A new candidate applied for an open role:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        <tr><td style="padding:8px 0;color:#64748b;width:120px;"><strong>Position:</strong></td><td style="padding:8px 0;color:#0f172a;"><strong>${escapeHtml(jobTitle)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Candidate:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(candidateName)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Email:</strong></td><td style="padding:8px 0;color:#0f172a;"><a href="mailto:${escapeHtml(email)}" style="color:#2563eb;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Phone:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Resume File:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(resumeFileName || "Uploaded")}</td></tr>
      </table>
    `,
  });

/**
 * Internship application confirmation email template.
 */
export const internshipConfirmationTemplate = ({
  name,
  domain,
}) =>
  baseTemplate({
    title: `Internship Application Received — ${escapeHtml(domain)}`,
    contentHtml: `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Thank you for applying for the <strong>${escapeHtml(domain)}</strong> internship at Ashivam Technologies.</p>
      <p>We are reviewing your submission and academic profile. If selected for the interview round, our team will contact you via email or phone.</p>
      <p>Best regards,<br/><strong>Ashivam Technologies Academic Programs</strong></p>
    `,
  });

/**
 * Internship application admin alert email template.
 */
export const internshipAdminAlertTemplate = ({
  name,
  email,
  phone,
  college,
  domain,
}) =>
  baseTemplate({
    title: `New Internship Application: ${escapeHtml(domain)}`,
    contentHtml: `
      <p style="margin-top:0;">A new internship application was received:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        <tr><td style="padding:8px 0;color:#64748b;width:120px;"><strong>Domain:</strong></td><td style="padding:8px 0;color:#0f172a;"><strong>${escapeHtml(domain)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Student Name:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Email:</strong></td><td style="padding:8px 0;color:#0f172a;"><a href="mailto:${escapeHtml(email)}" style="color:#2563eb;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>Phone:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;"><strong>College:</strong></td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(college)}</td></tr>
      </table>
    `,
  });