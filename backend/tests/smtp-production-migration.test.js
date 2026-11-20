import test, { after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import crypto from "crypto";

import env from "../src/config/env.js";
import {
  sendEmail,
  verifyEmailTransport,
  validateSmtpEnvironment,
  getSafeSmtpStatus,
  setTransporter,
  resetTransporter,
  sendEmployeeInvitation,
} from "../src/modules/notification/email.service.js";
import {
  createEmployee,
  resendEmployeeInvitation,
  getEmployeeById,
} from "../src/modules/employee/employee.service.js";
import Employee from "../src/modules/employee/employee.model.js";
import {
  activateEmployeeAccount,
  loginAdmin,
} from "../src/modules/auth/auth.service.js";

const TEST_TIMESTAMP = Date.now();
const MANDATED_RECIPIENT = "ritik95061@gmail.com";

// ==============================================================================
// SECTION 4: REAL SMTP VERIFICATION CHECKS
// ==============================================================================

test("SMTP Check 1: Environment validation with missing SMTP credentials correctly flags missing variables", () => {
  // Test completely empty environment
  const emptyCheck = validateSmtpEnvironment({
    smtpHost: "",
    smtpPort: null,
    smtpUser: "",
    smtpPassword: "",
  });
  assert.equal(emptyCheck.valid, false);
  assert.ok(emptyCheck.missing.includes("SMTP_HOST"));
  assert.ok(emptyCheck.missing.includes("SMTP_PORT"));
  assert.ok(emptyCheck.missing.includes("SMTP_USER"));
  assert.ok(emptyCheck.missing.includes("SMTP_PASS / SMTP_PASSWORD"));
  assert.equal(emptyCheck.errors.length, 4);

  // Test fully configured environment
  const validCheck = validateSmtpEnvironment({
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpUser: "ritik95061@gmail.com",
    smtpPassword: "app-password-sample",
  });
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.errors.length, 0);
  assert.equal(validCheck.missing.length, 0);
});

test("SMTP Check 2: Live SMTP transport verification against configured credentials reports accurate handshake result", async () => {
  resetTransporter();

  // Test live verification using credentials from current .env
  const verification = await verifyEmailTransport();
  assert.equal(verification.provider, "smtp");
  assert.equal(typeof verification.configured, "boolean");
  assert.equal(typeof verification.verified, "boolean");
  assert.ok(verification.message, "Must include human-readable status message");

  // Since Google App Password in .env is rejected by Gmail SMTP (535 BadCredentials):
  if (!verification.verified) {
    assert.equal(verification.configured, true);
    assert.equal(verification.simulated, false);
    assert.ok(
      verification.code === "EAUTH" || verification.code === "SMTP_535" || verification.message.includes("535"),
      `Expected EAUTH/535 code, got: ${verification.code} (${verification.message})`
    );
  }
});

test("SMTP Check 3: Real test email dispatch attempt to authorized recipient records real SMTP response without false success", async () => {
  resetTransporter();

  const dispatch = await sendEmail({
    to: MANDATED_RECIPIENT,
    subject: `[SMTP Audit Check 3] Diagnostic — ${TEST_TIMESTAMP}`,
    text: "Live SMTP verification content.",
  });

  assert.equal(dispatch.provider, "smtp");
  assert.equal(dispatch.simulated, false);

  // If live credentials are rejected with 535 BadCredentials:
  if (!dispatch.delivered) {
    assert.equal(dispatch.accepted, false);
    assert.equal(dispatch.messageId, null);
    assert.ok(dispatch.error, "Must contain error message");
    // Ensure no secrets leaked in error
    assert.ok(!dispatch.error.includes("password: [REDACTED]") && !dispatch.error.includes(env.smtpPassword));
    assert.ok(
      dispatch.code === "EAUTH" || dispatch.code === "SMTP_535" || dispatch.error.includes("535") || dispatch.error.includes("Username and Password not accepted"),
      `Expected EAUTH/535 error, got: ${dispatch.code}`
    );
  } else {
    // If credentials are valid:
    assert.equal(dispatch.accepted, true);
    assert.ok(dispatch.messageId);
    assert.ok(dispatch.response.includes("250"));
  }
});

test("SMTP Check 4 & 6: Real employee creation with SMTP invitation records accurate lifecycle status", async (t) => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 3000 });
  }

  const testEmail = `smtp.emp.${TEST_TIMESTAMP}@ashivam.test`;
  const adminId = new mongoose.Types.ObjectId();

  try {
    resetTransporter();

    const created = await createEmployee(
      {
        firstName: "TestSmtp",
        lastName: "Candidate",
        email: testEmail,
        designation: "Systems Engineer",
        department: "Infrastructure",
        employmentType: "Full-time",
        joiningDate: new Date(),
      },
      adminId
    );

    assert.ok(created._id, "Employee must be created in DB");
    assert.equal(created.email, testEmail);

    // If SMTP credentials fail (535):
    if (created.invitationStatus === "FAILED") {
      assert.equal(created.accountStatus, "PENDING_ACTIVATION");
      assert.ok(created.invitationError, "Must record non-empty failure error");
      assert.equal(created.invitationProvider, "smtp");
      // Verify raw activation token is generated for recovery
      assert.ok(created.rawActivationToken);
    } else {
      assert.equal(created.invitationStatus, "SENT");
      assert.equal(created.accountStatus, "PENDING_ACTIVATION");
      assert.equal(created.invitationProvider, "smtp");
    }

    // Check 6: Test Resend invitation flow with controlled successful transport
    setTransporter({
      sendMail: async () => ({
        messageId: `<mock-smtp-accepted-${TEST_TIMESTAMP}@ashivam.com>`,
        response: "250 2.0.0 OK (Accepted)",
        accepted: [testEmail],
      }),
      verify: async () => true,
    });

    const resendResult = await resendEmployeeInvitation(created._id, adminId);
    assert.equal(resendResult.invitationStatus, "SENT");
    assert.equal(resendResult.employee.accountStatus, "PENDING_ACTIVATION");
    assert.equal(resendResult.employee.invitationProvider, "smtp");
    assert.equal(resendResult.employee.activationResendCount, 1);
    assert.ok(resendResult.employee.activationSentAt);
  } finally {
    resetTransporter();
    await Employee.deleteMany({ email: testEmail });
  }
});

test("SMTP Check 5: Controlled SMTP delivery captures verified recipient, sender, subject, timestamp and response", async () => {
  const captured = [];
  const mockTimestamp = new Date().toISOString();

  setTransporter({
    sendMail: async (opts) => {
      captured.push({
        ...opts,
        dispatchedAt: mockTimestamp,
      });
      return {
        messageId: `<smtp-verified-${TEST_TIMESTAMP}@ashivam.com>`,
        response: "250 2.0.0 OK d2e1a72fcca58 - gsmtp",
        accepted: [MANDATED_RECIPIENT],
      };
    },
    verify: async () => true,
  });

  try {
    const result = await sendEmail({
      to: MANDATED_RECIPIENT,
      subject: "Controlled SMTP Delivery Audit",
      html: "<p>Verification Body</p>",
      replyTo: "submitter@example.com",
    });

    assert.equal(result.accepted, true);
    assert.equal(result.delivered, true);
    assert.equal(result.provider, "smtp");
    assert.equal(result.response, "250 2.0.0 OK d2e1a72fcca58 - gsmtp");
    assert.equal(result.messageId, `<smtp-verified-${TEST_TIMESTAMP}@ashivam.com>`);

    assert.equal(captured.length, 1);
    assert.equal(captured[0].to, MANDATED_RECIPIENT);
    assert.equal(captured[0].replyTo, "submitter@example.com");
    assert.equal(captured[0].subject, "Controlled SMTP Delivery Audit");
    assert.equal(captured[0].from, env.smtpFrom || env.emailFrom);
    assert.equal(captured[0].dispatchedAt, mockTimestamp);
  } finally {
    resetTransporter();
  }
});

test("SMTP Check 7: Controlled invalid SMTP configuration returns graceful failure without process crash", async () => {
  // Mock failing transport with network timeout
  setTransporter({
    sendMail: async () => {
      const err = new Error("connect ETIMEDOUT 192.0.2.1:465");
      err.code = "ETIMEDOUT";
      throw err;
    },
    verify: async () => {
      const err = new Error("connect ETIMEDOUT 192.0.2.1:465");
      err.code = "ETIMEDOUT";
      throw err;
    },
  });

  try {
    const verification = await verifyEmailTransport();
    assert.equal(verification.verified, false);
    assert.equal(verification.code, "ETIMEDOUT");
    assert.ok(verification.message.includes("ETIMEDOUT"));

    const dispatch = await sendEmail({
      to: MANDATED_RECIPIENT,
      subject: "Failing Transport Test",
      text: "Content",
    });
    assert.equal(dispatch.accepted, false);
    assert.equal(dispatch.delivered, false);
    assert.equal(dispatch.code, "ETIMEDOUT");
    assert.equal(dispatch.provider, "smtp");
  } finally {
    resetTransporter();
  }
});

// ==============================================================================
// SECTION 5: EMPLOYEE ONBOARDING VERIFICATION (END-TO-END)
// ==============================================================================

test("Onboarding E2E: Admin creates employee -> SMTP invitation -> token activation -> password set -> canonical login", async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 3000 });
  }

  const canonicalEmail = `canonical.hire.${TEST_TIMESTAMP}@ashivam.com`;
  const adminId = new mongoose.Types.ObjectId();
  const testPassword = "Ashivam@2026SecurePass!";

  // 1. Set up simulated SMTP transporter that records invitation dispatch
  let invitationMailDispatched = null;
  setTransporter({
    sendMail: async (mailOpts) => {
      invitationMailDispatched = mailOpts;
      return {
        messageId: `<onboard-invite-${TEST_TIMESTAMP}@ashivam.com>`,
        response: "250 2.0.0 OK (Invitation Accepted)",
        accepted: [canonicalEmail],
      };
    },
    verify: async () => true,
  });

  try {
    // 2. Admin creates employee record
    const createdEmployee = await createEmployee(
      {
        firstName: "Ananya",
        lastName: "Sharma",
        email: canonicalEmail,
        designation: "Senior Backend Developer",
        department: "Engineering",
        employmentType: "Full-time",
        joiningDate: new Date(),
      },
      adminId
    );

    assert.ok(createdEmployee._id, "Employee must be created");
    assert.equal(createdEmployee.email, canonicalEmail);
    assert.equal(createdEmployee.accountStatus, "PENDING_ACTIVATION");
    assert.equal(createdEmployee.invitationStatus, "SENT");
    assert.equal(createdEmployee.invitationProvider, "smtp");

    // 3. Verify SMTP invitation email contents
    assert.ok(invitationMailDispatched, "Invitation email must be dispatched via SMTP");
    assert.equal(invitationMailDispatched.to, canonicalEmail);
    assert.ok(invitationMailDispatched.subject.includes("Welcome to Ashivam Technologies"));
    assert.ok(invitationMailDispatched.html.includes("activate-account?token="));

    // Extract the raw token from the HTML link
    const tokenMatch = invitationMailDispatched.html.match(/token=([a-f0-9]{64})/i);
    assert.ok(tokenMatch && tokenMatch[1], "Must find 64-char hex activation token in email link");
    const rawActivationToken = tokenMatch[1];

    // 4. Employee opens activation link and sets password
    const activationResult = await activateEmployeeAccount(rawActivationToken, testPassword);
    assert.ok(activationResult, "Activation result must be returned");
    assert.ok(activationResult.accessToken, "Must issue JWT access token upon activation");
    assert.ok(activationResult.refreshToken, "Must issue JWT refresh token");
    assert.equal(activationResult.user.email, canonicalEmail, "Canonical email must match");

    // 5. Verify database document state post-activation
    const updatedEmployee = await Employee.findById(createdEmployee._id).select(
      "+activationTokenHash +passwordHash"
    );
    assert.equal(updatedEmployee.accountStatus, "ACTIVE");
    assert.equal(updatedEmployee.invitationStatus, "ACCEPTED");
    assert.ok(updatedEmployee.activationCompletedAt);
    assert.equal(updatedEmployee.activationTokenHash, null, "Activation token must be nulled after use");

    // 6. Verify single-use token replay is rejected
    await assert.rejects(
      async () => {
        await activateEmployeeAccount(rawActivationToken, "AnotherPassword123!");
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("Invalid or unverified"));
        return true;
      }
    );

    // 7. Employee logs in with canonical email and new password
    const loginResult = await loginAdmin(canonicalEmail, testPassword);
    assert.ok(loginResult, "Login must succeed with correct credentials");
    assert.ok(loginResult.accessToken, "Must return valid JWT access token on login");
    assert.ok(loginResult.refreshToken, "Must return valid refresh token");
    assert.equal(loginResult.user.email, canonicalEmail, "Canonical email must be identical");
    assert.equal(loginResult.user.role, "Employee");
  } finally {
    resetTransporter();
    await Employee.deleteMany({ email: canonicalEmail });
  }
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
