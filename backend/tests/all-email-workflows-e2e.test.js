import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import Employee from "../src/modules/employee/employee.model.js";
import Job from "../src/modules/career/job.model.js";
import Application from "../src/modules/career/application.model.js";
import Inquiry from "../src/modules/inquiry/inquiry.model.js";
import OutboxJob from "../src/models/outbox.model.js";
import { resetTransporter, setTransporter } from "../src/modules/notification/email.service.js";
import { processPendingOutbox } from "../src/modules/notification/outbox.service.js";

import bcrypt from "bcryptjs";

const TEST_TIMESTAMP = Date.now();
const TARGET_EMAIL = "ritik95061@gmail.com";

let superadminToken = "";
let superadminId = "";
let testJobId = "";

before(async () => {
  resetTransporter();
  setTransporter({
    sendMail: async (options) => ({
      messageId: `<mock-e2e-${TEST_TIMESTAMP}-${Math.random().toString(36).slice(2)}@ashivam.test>`,
      response: "250 2.0.0 OK (Accepted)",
      accepted: Array.isArray(options.to) ? options.to : [options.to],
    }),
    verify: async () => true,
  });
  if (mongoose.connection.readyState === 0) {
    const mongoUri = env.mongoUri || "mongodb://localhost:27017/ashivam_technologies_test";
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  }

  // Ensure superadmin exists for admin routes
  const adminUsername = `superadmin_email_e2e_${TEST_TIMESTAMP}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const admin = await Admin.create({
    username: adminUsername,
    name: "Email E2E Superadmin",
    email: `superadmin_${TEST_TIMESTAMP}@ashivam.test`,
    passwordHash,
    role: "Superadmin",
    isActive: true,
  });
  superadminId = admin._id.toString();

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: adminUsername,
      password: "Password123!",
    });

  superadminToken = loginRes.body.token || loginRes.body.accessToken || loginRes.body.data?.token || loginRes.body.data?.accessToken;

  // Create an active job opening
  const job = await Job.create({
    title: `Full Stack Developer ${TEST_TIMESTAMP}`,
    slug: `full-stack-dev-${TEST_TIMESTAMP}`,
    department: "Engineering",
    location: "Remote",
    employmentType: "Full-time",
    experience: "2-4 years",
    description: "End-to-end email verification role",
    requirements: ["Node.js", "React", "MongoDB"],
    responsibilities: ["Build and test software"],
    createdBy: superadminId,
    isActive: true,
  });
  testJobId = job._id.toString();
});

after(async () => {
  resetTransporter();
  // Clean test artifacts
  await Admin.deleteMany({ username: new RegExp(`email_e2e_${TEST_TIMESTAMP}`) });
  await Employee.deleteMany({ email: new RegExp(`email_e2e_${TEST_TIMESTAMP}`) });
  if (testJobId && mongoose.Types.ObjectId.isValid(testJobId)) {
    await Job.deleteMany({ _id: testJobId });
    await Application.deleteMany({ job: testJobId });
  }
  await Inquiry.deleteMany({ subject: new RegExp(`E2E Email Test ${TEST_TIMESTAMP}`) });
  await OutboxJob.deleteMany({ dedupKey: new RegExp(String(TEST_TIMESTAMP)) });
  await mongoose.disconnect();
});

test("Email E2E Workflow 1: Public Inquiry Submission triggers Company Alert & Customer Confirmation via SMTP", async () => {
  const inquiryPayload = {
    name: "Ritik Gupta",
    email: TARGET_EMAIL,
    phone: "+91 9506100000",
    subject: `E2E Email Test ${TEST_TIMESTAMP} - Website Inquiry`,
    message: "Verifying that inquiry emails are dispatched reliably to customer and company via SMTP.",
  };

  const res = await request(app)
    .post("/api/v1/inquiries")
    .send(inquiryPayload);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  const inquiryId = res.body.data?.inquiry?._id || res.body.data?._id;
  assert.ok(inquiryId, "Inquiry ID must be returned");

  // Drain outbox to guarantee dispatch
  await processPendingOutbox();

  // Find generated outbox jobs
  const inquiryDoc = await Inquiry.findById(inquiryId);
  const refNum = inquiryDoc.referenceNumber || inquiryDoc._id.toString();

  const outboxJobs = await OutboxJob.find({
    dedupKey: {
      $in: [
        `outbox:inquiry:company:${refNum}`,
        `outbox:inquiry:customer:${refNum}`,
      ],
    },
  });

  assert.equal(outboxJobs.length, 2, "Both company alert and customer confirmation outbox jobs must be generated");
  for (const job of outboxJobs) {
    assert.ok(
      job.status === "sent" || job.status === "processing",
      `Job ${job.eventType} must be sent or processing, got: ${job.status}`
    );
  }
});

test("Email E2E Workflow 2: Career Application Submission triggers Candidate Confirmation & Company Alert via SMTP", async () => {
  const res = await request(app)
    .post(`/api/v1/career/jobs/${testJobId}/apply`)
    .field("firstName", "Ritik")
    .field("lastName", "Gupta")
    .field("email", TARGET_EMAIL)
    .field("phone", "+91 9506100000")
    .field("coverLetter", "Excited to join the engineering team at Ashivam Technologies.")
    .attach("resume", Buffer.from("%PDF-1.4 test resume content for email verification"), "ritik_resume.pdf");

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  const appId = res.body.data?.application?.id || res.body.data?._id || res.body.application?._id || res.body.data?.id;
  assert.ok(appId, "Application ID must be returned");

  // Drain outbox to guarantee dispatch
  await processPendingOutbox();

  const outboxJobs = await OutboxJob.find({
    dedupKey: {
      $in: [
        `outbox:career:company:${appId}`,
        `outbox:career:candidate:${appId}`,
      ],
    },
  });

  assert.equal(outboxJobs.length, 2, "Both company alert and candidate confirmation outbox jobs must be generated");
  for (const job of outboxJobs) {
    assert.ok(
      job.status === "sent" || job.status === "processing",
      `Job ${job.eventType} must be sent or processing, got: ${job.status}`
    );
  }
});

test("Email E2E Workflow 3: Admin creates Employee -> Sends Invitation Email via SMTP -> Token Activation", async () => {
  const empEmail = `email_e2e_${TEST_TIMESTAMP}_emp@ashivam.test`;
  const empId = `ASH-E2E-${TEST_TIMESTAMP.toString().slice(-4)}`;

  const createRes = await request(app)
    .post("/api/v1/employees")
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      firstName: "Aarav",
      lastName: "Sharma",
      email: empEmail,
      employeeId: empId,
      department: "Engineering",
      designation: "Software Engineer",
      employmentType: "Full-time",
      joiningDate: new Date().toISOString(),
      role: "Employee",
    });

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.success, true);
  const empData = createRes.body.data?.employee || createRes.body.data;
  assert.equal(empData?.invitationStatus, "SENT");
  assert.equal(empData?.invitationProvider, "smtp");

  // Verify employee state in database
  const createdEmp = await Employee.findOne({ employeeId: empId }).select("+activationTokenHash");
  assert.ok(createdEmp, "Employee must exist in database");
  assert.equal(createdEmp.accountStatus, "PENDING_ACTIVATION");
  assert.ok(createdEmp.activationTokenHash, "Activation token hash must be set");
});

test("Email E2E Workflow 4: Employee Password Reset Request dispatches Reset Link via SMTP", async () => {
  // Create an active employee
  const activeEmpEmail = `email_e2e_${TEST_TIMESTAMP}_active@ashivam.test`;
  const activeEmpId = `ASH-ACT-${TEST_TIMESTAMP.toString().slice(-4)}`;

  const emp = await Employee.create({
    firstName: "Priya",
    lastName: "Verma",
    email: activeEmpEmail,
    employeeId: activeEmpId,
    department: "Quality Assurance",
    designation: "QA Lead",
    employmentType: "Full-time",
    joiningDate: new Date(),
    role: "Employee",
    accountStatus: "ACTIVE",
    isActive: true,
    passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr",
  });

  const resetReqRes = await request(app)
    .post("/api/v1/auth/forgot-password")
    .send({ email: activeEmpEmail });

  assert.equal(resetReqRes.statusCode, 200);
  assert.equal(resetReqRes.body.success, true);

  // Verify reset token was generated on employee document
  const updatedEmp = await Employee.findById(emp._id).select("+resetPasswordTokenHash");
  assert.ok(updatedEmp.resetPasswordTokenHash, "Reset password token hash must be stored");
  assert.ok(updatedEmp.resetPasswordExpiresAt, "Reset expiration must be set");
});

test("Email E2E Workflow 5: GET /api/v1/health exposes email configuration metadata cleanly", async () => {
  const healthRes = await request(app).get("/api/v1/health");

  assert.equal(healthRes.statusCode, 200);
  assert.equal(healthRes.body.success, true);
  assert.equal(healthRes.body.database, "connected");

  assert.ok(healthRes.body.email, "Email metadata must be present in health response");
  assert.equal(healthRes.body.email.provider, "smtp");
  assert.equal(typeof healthRes.body.email.configured, "boolean");
  assert.equal(healthRes.body.email.host, env.smtpHost);
  assert.equal(healthRes.body.email.port, env.smtpPort);
  assert.equal(healthRes.body.email.secure, Boolean(env.smtpSecure));
  assert.equal(healthRes.body.email.companyRecipient, env.companyNotificationEmail);
});
