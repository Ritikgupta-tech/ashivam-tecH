import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  sanitizeUrl,
  notificationEmailTemplate,
  securityEmailTemplate,
  inquiryConfirmationTemplate,
  inquiryAdminAlertTemplate,
  careerConfirmationTemplate,
  careerAdminAlertTemplate,
  internshipConfirmationTemplate,
  internshipAdminAlertTemplate,
} from "../src/modules/notification/email.templates.js";
import {
  sanitizeEmailHeader,
  sendEmail,
  sendCompanyNotification,
  getCompanyNotificationEmail,
  MANDATED_COMPANY_NOTIFICATION_EMAIL,
  verifyEmailTransport,
  setTransporter,
  resetTransporter,
} from "../src/modules/notification/email.service.js";

test("Email Templates - escapeHtml neutralizes HTML/XSS injection", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(
    escapeHtml("<script>alert('xss')</script>"),
    "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
  );
  assert.equal(
    escapeHtml('"><img src=x onerror=alert(1)>'),
    "&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"
  );
  assert.equal(
    escapeHtml("Tom & Jerry 'special'"),
    "Tom &amp; Jerry &#039;special&#039;"
  );
});

test("Email Templates - sanitizeUrl blocks dangerous schemes", () => {
  assert.equal(sanitizeUrl(null), "");
  assert.equal(sanitizeUrl(""), "");
  assert.equal(sanitizeUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeUrl("data:text/html,<script>alert(1)</script>"), "");
  assert.equal(sanitizeUrl("vbscript:msgbox(1)"), "");
  assert.equal(
    sanitizeUrl("https://ashivamtechnologies.com/careers"),
    "https://ashivamtechnologies.com/careers"
  );
  assert.equal(
    sanitizeUrl("http://example.com"),
    "http://example.com"
  );
});

test("Email Templates - inquiry templates properly escape untrusted user input", () => {
  const confirmation = inquiryConfirmationTemplate({
    name: "John <script>alert(1)</script>",
    subject: "Project & Inquiry",
    referenceNumber: "REF-12345",
  });
  assert.ok(confirmation.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!confirmation.includes("<script>alert(1)</script>"));
  assert.ok(confirmation.includes("Project &amp; Inquiry"));
  assert.ok(confirmation.includes("REF-12345"));

  const alert = inquiryAdminAlertTemplate({
    name: "Attacker <svg onload=alert(1)>",
    email: "test@example.com",
    phone: "123-456-7890",
    subject: "Evil Subject",
    message: "Line 1\n<script>hack()</script>",
    referenceNumber: "REF-99999",
  });
  assert.ok(alert.includes("&lt;svg onload=alert(1)&gt;"));
  assert.ok(!alert.includes("<svg onload=alert(1)>"));
  assert.ok(alert.includes("&lt;script&gt;hack()&lt;/script&gt;"));
});

test("Email Templates - career templates properly escape candidate data", () => {
  const confirmation = careerConfirmationTemplate({
    firstName: "Jane <img src=x>",
    jobTitle: "Senior Architect & Lead",
  });
  assert.ok(confirmation.includes("&lt;img src=x&gt;"));
  assert.ok(confirmation.includes("Senior Architect &amp; Lead"));

  const alert = careerAdminAlertTemplate({
    candidateName: "Jane Doe <test>",
    email: "jane@example.com",
    phone: "+1234567890",
    jobTitle: "Backend Dev",
    resumeFileName: "resume<hack>.pdf",
  });
  assert.ok(alert.includes("Jane Doe &lt;test&gt;"));
  assert.ok(alert.includes("resume&lt;hack&gt;.pdf"));
});

test("Email Templates - internship templates properly escape student input", () => {
  const confirmation = internshipConfirmationTemplate({
    name: "Bob <script>",
    domain: "Full Stack & AI",
  });
  assert.ok(confirmation.includes("Bob &lt;script&gt;"));
  assert.ok(confirmation.includes("Full Stack &amp; AI"));

  const alert = internshipAdminAlertTemplate({
    name: "Bob Student",
    email: "bob@univ.edu",
    phone: "9876543210",
    college: "Tech University <i>Best</i>",
    domain: "Web Development",
  });
  assert.ok(alert.includes("Tech University &lt;i&gt;Best&lt;/i&gt;"));
});

test("Email Service - sanitizeEmailHeader neutralizes CRLF injection", () => {
  assert.equal(
    sanitizeEmailHeader("victim@example.com\r\nBcc: evil@attacker.com"),
    "victim@example.com Bcc: evil@attacker.com"
  );
  assert.equal(
    sanitizeEmailHeader("Important\r\nSubject\tWith\nNewlines"),
    "Important Subject With Newlines"
  );
  assert.equal(sanitizeEmailHeader(null), "");
  assert.equal(sanitizeEmailHeader(undefined), "");
});

test("Email Service - sendEmail rejects invalid parameters", async () => {
  await assert.rejects(
    async () => {
      await sendEmail({ to: "not-an-email", subject: "Test" });
    },
    { message: "Valid recipient email is required" }
  );

  await assert.rejects(
    async () => {
      await sendEmail({ to: "valid@example.com", subject: "" });
    },
    { message: "Email subject is required" }
  );

  await assert.rejects(
    async () => {
      await sendEmail({
        to: "valid@example.com",
        subject: "Subject",
        replyTo: "invalid-reply-to-email",
      });
    },
    { message: "Invalid Reply-To email address" }
  );
});

test("Email Service - sendEmail handles unconfigured SMTP in simulated mode", async () => {
  const env = (await import("../src/config/env.js")).default;
  const originalKey = env.resendApiKey;
  const originalBrevo = env.brevoApiKey;
  const originalSmtp = env.smtpHost;

  env.resendApiKey = "";
  env.brevoApiKey = "";
  env.smtpHost = "";

  try {
    const result = await sendEmail({
      to: "client@example.com",
      subject: "Simulated Test",
      text: "Testing simulation fallback",
    });

    assert.ok(result);
    assert.equal(typeof result.delivered, "boolean");
    assert.equal(result.reason, "smtp_not_configured");
    assert.equal(result.simulated, true);
    assert.equal(result.accepted, false);
    assert.ok(result.messageId.startsWith("simulated-"));
  } finally {
    env.resendApiKey = originalKey;
    env.brevoApiKey = originalBrevo;
    env.smtpHost = originalSmtp;
  }
});

test("Email Service - sendEmail with mocked transporter dispatches real message", async () => {
  const sentMailLog = [];
  const mockTransporter = {
    sendMail: async (mailOptions) => {
      sentMailLog.push(mailOptions);
      return {
        messageId: "<mock-msg-12345@ashivam.com>",
        response: "250 2.0.0 OK: message queued",
      };
    },
  };

  import("../src/modules/notification/email.service.js").then((mod) => {
    mod.setTransporter(mockTransporter);
  });
  const { setTransporter, resetTransporter } = await import(
    "../src/modules/notification/email.service.js"
  );

  setTransporter(mockTransporter);

  try {
    const result = await sendEmail({
      to: "recipient@example.com",
      replyTo: "user@example.com",
      subject: "Mocked Delivery Test",
      text: "Plain text content",
      html: "<p>HTML content</p>",
    });

    assert.equal(result.delivered, true);
    assert.equal(result.simulated, false);
    assert.equal(result.accepted, true);
    assert.equal(result.messageId, "<mock-msg-12345@ashivam.com>");
    assert.equal(sentMailLog.length, 1);
    assert.equal(sentMailLog[0].to, "recipient@example.com");
    assert.equal(sentMailLog[0].replyTo, "user@example.com");
    assert.equal(sentMailLog[0].subject, "Mocked Delivery Test");
  } finally {
    resetTransporter();
  }
});

test("Email Service - sendEmail gracefully handles transporter failure without throwing", async () => {
  const mockFailingTransporter = {
    sendMail: async () => {
      const err = new Error("535 5.7.8 Authentication credentials invalid");
      err.code = "EAUTH";
      throw err;
    },
  };

  const { setTransporter, resetTransporter } = await import(
    "../src/modules/notification/email.service.js"
  );

  setTransporter(mockFailingTransporter);

  try {
    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "Failing Delivery Test",
      text: "Content",
    });

    assert.equal(result.delivered, false);
    assert.equal(result.simulated, false);
    assert.equal(result.accepted, false);
    assert.equal(result.messageId, null);
    assert.equal(result.code, "EAUTH");
    assert.ok(result.error.includes("Authentication credentials invalid"));
  } finally {
    resetTransporter();
  }
});

test("Email Service - verifyEmailTransport checks mocked transport verification", async () => {
  const { setTransporter, resetTransporter } = await import(
    "../src/modules/notification/email.service.js"
  );

  // Success case
  const mockPassingTransporter = {
    verify: async () => true,
  };
  setTransporter(mockPassingTransporter);
  try {
    const passingCheck = await verifyEmailTransport();
    assert.equal(passingCheck.configured, true);
    assert.equal(passingCheck.verified, true);
    assert.equal(passingCheck.simulated, false);
  } finally {
    resetTransporter();
  }

  // Failure case
  const mockFailingTransporter = {
    verify: async () => {
      const err = new Error("Connection timed out");
      err.code = "ETIMEDOUT";
      throw err;
    },
  };
  setTransporter(mockFailingTransporter);
  try {
    const failingCheck = await verifyEmailTransport();
    assert.equal(failingCheck.configured, true);
    assert.equal(failingCheck.verified, false);
    assert.equal(failingCheck.simulated, false);
    assert.equal(failingCheck.code, "ETIMEDOUT");
  } finally {
    resetTransporter();
  }
});

test("Email Service - verifyEmailTransport responds safely when SMTP is unconfigured", async () => {
  const env = (await import("../src/config/env.js")).default;
  const originalKey = env.resendApiKey;
  const originalBrevo = env.brevoApiKey;
  const originalSmtp = env.smtpHost;

  env.resendApiKey = "";
  env.brevoApiKey = "";
  env.smtpHost = "";

  try {
    const check = await verifyEmailTransport();
    assert.ok(check);
    assert.equal(typeof check.verified, "boolean");
    assert.equal(typeof check.message, "string");
    assert.equal(check.simulated, true);
  } finally {
    env.resendApiKey = originalKey;
    env.brevoApiKey = originalBrevo;
    env.smtpHost = originalSmtp;
  }
});

test("Email Service - sendEmail dispatches via Resend HTTPS API when configured", async () => {
  const env = (await import("../src/config/env.js")).default;
  const originalFetch = globalThis.fetch;
  const originalKey = env.resendApiKey;
  const originalProvider = env.emailProvider;

  env.resendApiKey = "re_test_mock_secret_key";
  env.emailProvider = "resend";

  let capturedUrl = null;
  let capturedOptions = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "resend-mock-id-abc123xyz" }),
    };
  };

  try {
    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "Resend HTTPS Test",
      text: "Content via Resend HTTPS API",
      replyTo: "support@example.com",
    });

    assert.equal(result.delivered, true);
    assert.equal(result.simulated, false);
    assert.equal(result.accepted, true);
    assert.equal(result.provider, "resend");
    assert.equal(result.messageId, "resend-mock-id-abc123xyz");
    assert.equal(capturedUrl, "https://api.resend.com/emails");

    const sentBody = JSON.parse(capturedOptions.body);
    assert.deepEqual(sentBody.to, ["recipient@example.com"]);
    assert.equal(sentBody.reply_to, "support@example.com");
    assert.equal(sentBody.subject, "Resend HTTPS Test");
    assert.equal(capturedOptions.headers["Authorization"], "Bearer re_test_mock_secret_key");
  } finally {
    globalThis.fetch = originalFetch;
    env.resendApiKey = originalKey;
    env.emailProvider = originalProvider;
  }
});

test("Email Service - sendEmail handles Resend HTTP error gracefully without throwing", async () => {
  const env = (await import("../src/config/env.js")).default;
  const originalFetch = globalThis.fetch;
  const originalKey = env.resendApiKey;
  const originalProvider = env.emailProvider;

  env.resendApiKey = "re_test_invalid_key";
  env.emailProvider = "resend";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    json: async () => ({ message: "API key is invalid", name: "validation_error" }),
  });

  try {
    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "Failing Resend Test",
      text: "Content",
    });

    assert.equal(result.delivered, false);
    assert.equal(result.simulated, false);
    assert.equal(result.accepted, false);
    assert.equal(result.provider, "resend");
    assert.ok(result.error.includes("API key is invalid"));
  } finally {
    globalThis.fetch = originalFetch;
    env.resendApiKey = originalKey;
    env.emailProvider = originalProvider;
  }
});

test("Email Service - sendEmail dispatches via Brevo HTTPS API when configured", async () => {
  const env = (await import("../src/config/env.js")).default;
  const originalFetch = globalThis.fetch;
  const originalKey = env.brevoApiKey;
  const originalProvider = env.emailProvider;

  env.brevoApiKey = "xkeysib-mock-12345";
  env.emailProvider = "brevo";

  let capturedUrl = null;
  let capturedOptions = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 201,
      json: async () => ({ messageId: "<brevo-test-msg-id@smtp-relay.brevo.com>" }),
    };
  };

  try {
    const result = await sendEmail({
      to: "client@example.com",
      subject: "Brevo Test",
      html: "<p>Brevo body</p>",
      replyTo: "help@example.com",
    });

    assert.equal(result.delivered, true);
    assert.equal(result.provider, "brevo");
    assert.equal(result.messageId, "<brevo-test-msg-id@smtp-relay.brevo.com>");
    assert.equal(capturedUrl, "https://api.brevo.com/v3/smtp/email");

    const sentBody = JSON.parse(capturedOptions.body);
    assert.deepEqual(sentBody.to, [{ email: "client@example.com" }]);
    assert.deepEqual(sentBody.replyTo, { email: "help@example.com" });
    assert.equal(capturedOptions.headers["api-key"], "xkeysib-mock-12345");
  } finally {
    globalThis.fetch = originalFetch;
    env.brevoApiKey = originalKey;
    env.emailProvider = originalProvider;
  }
});

test("Email Service - verifyEmailTransport validates Resend credentials via HTTPS probe", async () => {
  const env = (await import("../src/config/env.js")).default;
  const originalFetch = globalThis.fetch;
  const originalKey = env.resendApiKey;
  const originalProvider = env.emailProvider;

  env.resendApiKey = "re_valid_key_123";
  env.emailProvider = "resend";

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
  });

  try {
    const check = await verifyEmailTransport();
    assert.equal(check.configured, true);
    assert.equal(check.verified, true);
    assert.equal(check.provider, "resend");
    assert.ok(check.message.includes("Resend HTTPS API authenticated"));
  } finally {
    globalThis.fetch = originalFetch;
    env.resendApiKey = originalKey;
    env.emailProvider = originalProvider;
  }
});

test("Email Templates - all templates render bulletproof action buttons with valid HTTPS URLs", async () => {
  const env = (await import("../src/config/env.js")).default;
  const clientBase = env.clientUrl || "https://ashivam-tec-h.vercel.app";
  const adminBase = env.adminUrl || `${clientBase}/admin`;

  // 1. Inquiry Confirmation
  const inqConfirm = inquiryConfirmationTemplate({
    name: "Aarav",
    subject: "Web Development",
    referenceNumber: "INQ-100",
  });
  assert.ok(inqConfirm.includes(`<table border="0" cellspacing="0" cellpadding="0"`));
  assert.ok(inqConfirm.includes(`href="${clientBase}"`));
  assert.ok(inqConfirm.includes("Visit Our Website"));

  // 2. Inquiry Admin Alert
  const inqAlert = inquiryAdminAlertTemplate({
    name: "Aarav",
    email: "aarav@example.com",
    subject: "Consulting",
    message: "Need help",
    referenceNumber: "INQ-100",
  });
  assert.ok(inqAlert.includes(`<table border="0" cellspacing="0" cellpadding="0"`));
  assert.ok(inqAlert.includes(`href="${adminBase}"`));
  assert.ok(inqAlert.includes("Review in Admin Portal"));

  // 3. Career Confirmation
  const carConfirm = careerConfirmationTemplate({
    firstName: "Priya",
    jobTitle: "Senior Architect",
    applicationReference: "APP-200",
  });
  assert.ok(carConfirm.includes(`<table border="0" cellspacing="0" cellpadding="0"`));
  assert.ok(carConfirm.includes(`href="${clientBase.replace(/\/+$/, "")}/careers"`));
  assert.ok(carConfirm.includes("Explore More Careers"));

  // 4. Career Admin Alert
  const carAlert = careerAdminAlertTemplate({
    candidateName: "Priya Sharma",
    email: "priya@example.com",
    phone: "9876543210",
    jobTitle: "Senior Architect",
    resumeFileName: "priya_resume.pdf",
    applicationReference: "APP-200",
  });
  assert.ok(carAlert.includes(`<table border="0" cellspacing="0" cellpadding="0"`));
  assert.ok(carAlert.includes(`href="${adminBase}"`));
  assert.ok(carAlert.includes("Review in Admin Portal"));

  // 5. Internship Confirmation
  const intConfirm = internshipConfirmationTemplate({
    name: "Rohan",
    domain: "Cloud Computing",
  });
  assert.ok(intConfirm.includes(`<table border="0" cellspacing="0" cellpadding="0"`));
  assert.ok(intConfirm.includes(`href="${clientBase.replace(/\/+$/, "")}/careers"`));
  assert.ok(intConfirm.includes("View Internship Programs"));

  // 6. Internship Admin Alert
  const intAlert = internshipAdminAlertTemplate({
    name: "Rohan",
    email: "rohan@example.com",
    phone: "9876543210",
    college: "Tech University",
    domain: "Cloud Computing",
  });
  assert.ok(intAlert.includes(`<table border="0" cellspacing="0" cellpadding="0"`));
  assert.ok(intAlert.includes(`href="${adminBase}"`));
  assert.ok(intAlert.includes("Review in Admin Portal"));

  // 7. Generic Notification & Security Templates
  const notif = notificationEmailTemplate({
    title: "System Notification",
    message: "Notice body",
  });
  assert.ok(notif.includes(`href="${adminBase}"`));

  const secAlert = securityEmailTemplate({
    title: "Security Event",
    message: "An anomaly was detected.",
  });
  assert.ok(secAlert.includes(`href="${adminBase}"`));
});

test("Company Notification: getCompanyNotificationEmail strictly returns team.ashivam@gmail.com", () => {
  assert.equal(MANDATED_COMPANY_NOTIFICATION_EMAIL, "team.ashivam@gmail.com");
  assert.equal(getCompanyNotificationEmail(), "team.ashivam@gmail.com");
});

test("Company Notification: sendCompanyNotification routes strictly to team.ashivam@gmail.com and strips overrides", async () => {
  const sent = [];
  setTransporter({
    sendMail: async (opts) => {
      sent.push(opts);
      return { messageId: "<test-company-notif-1@ashivam>", response: "250 OK" };
    },
    verify: async () => true,
  });

  try {
    const result = await sendCompanyNotification({
      to: "malicious.override@evil.com",
      cc: "unauthorized.cc@evil.com",
      bcc: "sneaky.bcc@evil.com",
      subject: "Test Company Notification",
      text: "Hello Team",
      html: "<p>Hello Team</p>",
      replyTo: "applicant@example.com",
    });

    assert.equal(result.accepted, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "team.ashivam@gmail.com", "to must be team.ashivam@gmail.com");
    assert.equal(sent[0].replyTo, "applicant@example.com", "replyTo must be preserved");
    assert.equal(sent[0].cc, undefined, "cc must be stripped");
    assert.equal(sent[0].bcc, undefined, "bcc must be stripped");
  } finally {
    resetTransporter();
  }
});

