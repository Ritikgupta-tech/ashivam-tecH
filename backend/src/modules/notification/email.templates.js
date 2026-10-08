const baseTemplate = ({
  title,
  message,
  actionUrl,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>

<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="padding:24px;background:#111827;color:#ffffff;">
      <h2 style="margin:0;">Ashivam Technologies</h2>
    </div>

    <div style="padding:30px;">
      <h2 style="margin-top:0;color:#111827;">
        ${title}
      </h2>

      <p style="color:#4b5563;line-height:1.6;">
        ${message}
      </p>

      ${
        actionUrl
          ? `
            <div style="margin-top:25px;">
              <a
                href="${actionUrl}"
                style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;"
              >
                View Details
              </a>
            </div>
          `
          : ""
      }
    </div>

    <div style="padding:20px;background:#f9fafb;color:#6b7280;font-size:12px;">
      This is an automated email from Ashivam Technologies.
    </div>

  </div>
</body>
</html>
`;

export const notificationEmailTemplate = ({
  title,
  message,
  actionUrl,
}) =>
  baseTemplate({
    title,
    message,
    actionUrl,
  });

export const securityEmailTemplate = ({
  title,
  message,
}) =>
  baseTemplate({
    title,
    message,
  });