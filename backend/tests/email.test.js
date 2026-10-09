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
  verifyEmailTransport,
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
});

test("Email Service - sendEmail handles unconfigured SMTP in simulated mode", async () => {
  const result = await sendEmail({
    to: "client@example.com",
    subject: "Simulated Test",
    text: "Testing simulation fallback",
  });

  assert.ok(result);
  assert.equal(typeof result.delivered, "boolean");
  if (!result.delivered) {
    assert.equal(result.reason, "smtp_not_configured");
    assert.ok(result.messageId.startsWith("simulated-"));
  }
});

test("Email Service - verifyEmailTransport responds safely when SMTP is unconfigured", async () => {
  const check = await verifyEmailTransport();
  assert.ok(check);
  assert.equal(typeof check.verified, "boolean");
  assert.equal(typeof check.message, "string");
});
