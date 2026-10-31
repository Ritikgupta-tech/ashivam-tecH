import test, { before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import env from "../src/config/env.js";
import Job from "../src/modules/career/job.model.js";
import Application from "../src/modules/career/application.model.js";
import Inquiry from "../src/modules/inquiry/inquiry.model.js";
import { createInquiry } from "../src/modules/inquiry/inquiry.service.js";
import { createApplication } from "../src/modules/career/career.service.js";
import {
  setTransporter,
  resetTransporter,
} from "../src/modules/notification/email.service.js";

// Valid mock PDF buffer (starts with %PDF)
const VALID_PDF_BUFFER = Buffer.from(
  "%PDF-1.4\n%test-stream\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
);

let dbConnected = false;
let testJob = null;
let sentMails = [];

before(async () => {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 2500 });
    dbConnected = true;

    testJob = await Job.create({
      title: "Senior Cloud Engineer",
      slug: `cloud-eng-${Date.now()}`,
      department: "Cloud Architecture",
      location: "Agra, India",
      employmentType: "Full-time",
      description: "Automated test role for email workflows.",
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(),
    });
  } catch (err) {
    console.warn("[Test Setup] MongoDB setup for email workflows skipped:", err.message);
  }
});

after(async () => {
  if (dbConnected) {
    try {
      if (testJob?._id) {
        await Job.deleteOne({ _id: testJob._id });
        await Application.deleteMany({ job: testJob._id });
      }
      await Inquiry.deleteMany({ email: /^test-workflow-.*@example\.com$/ });
    } finally {
      await mongoose.disconnect();
    }
  }
});

beforeEach(async () => {
  sentMails = [];
  if (dbConnected) {
    try {
      await mongoose.connection.collection("outboxjobs").deleteMany({
        $or: [
          { "payload.to": /^test-workflow-.*@example\.com$/ },
          { "payload.replyTo": /^test-workflow-.*@example\.com$/ },
        ],
      });
    } catch {}
  }
  setTransporter({
    sendMail: async (mailOptions) => {
      sentMails.push(mailOptions);
      return {
        messageId: `<mock-id-${Date.now()}-${Math.random().toString(36).substring(2, 6)}@ashivam>`,
        response: "250 2.0.0 OK",
      };
    },
    verify: async () => true,
  });
});

afterEach(() => {
  resetTransporter();
});

// ==============================================================================
// WORKFLOW 1: CONTACT INQUIRY NOTIFICATION
// ==============================================================================

test("Workflow 1 - Contact Inquiry Notification: saves inquiry, alerts admin with Reply-To, and confirms to inquirer", async (t) => {
  if (!dbConnected) {
    t.skip("Database not available for integration test");
    return;
  }

  const email = `test-workflow-${Date.now()}@example.com`;
  const inquiryData = {
    name: "Aarav Sharma <script>alert(1)</script>",
    email,
    phone: "+91 98765 43210",
    subject: "Enterprise Software Inquiry & Cloud",
    message: "We need custom React and Spring Boot development for our platform.",
  };

  const inquiry = await createInquiry(inquiryData);

  assert.ok(inquiry._id);
  assert.equal(inquiry.name, inquiryData.name);

  // Give asynchronous dispatches a moment to complete
  for (let i = 0; i < 20 && sentMails.length < 2; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }

  // Should have sent 2 emails: Admin Alert & Inquirer Confirmation
  assert.equal(sentMails.length, 2);

  const adminAlert = sentMails.find((m) =>
    m.subject.includes("[Ashivam Inquiries]")
  );
  assert.ok(adminAlert, "Admin alert email was dispatched");
  assert.equal(adminAlert.to, "team.ashivam@gmail.com", "Admin alert must go strictly to team.ashivam@gmail.com");
  assert.equal(adminAlert.replyTo, email.toLowerCase());
  assert.equal(adminAlert.cc, undefined, "Zero CC allowed");
  assert.equal(adminAlert.bcc, undefined, "Zero BCC allowed");
  assert.ok(adminAlert.html.includes("Aarav Sharma &lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(adminAlert.html.includes(inquiry._id.toString()));
  assert.ok(!adminAlert.html.includes("<script>alert(1)</script>"));

  const userConfirm = sentMails.find((m) =>
    m.subject.includes("Inquiry Received - Ashivam Technologies")
  );
  assert.ok(userConfirm, "User confirmation email was dispatched");
  assert.equal(userConfirm.to, email.toLowerCase());
  assert.equal(userConfirm.replyTo, "team.ashivam@gmail.com", "User confirmation Reply-To routes to team.ashivam@gmail.com");
  assert.equal(userConfirm.cc, undefined, "Zero CC allowed");
  assert.equal(userConfirm.bcc, undefined, "Zero BCC allowed");
  assert.ok(userConfirm.html.includes(inquiry._id.toString()));
});

test("Workflow 1 - Deduplication: rapid retry with same inquiry returns existing and suppresses duplicate notifications", async (t) => {
  if (!dbConnected) {
    t.skip("Database not available for integration test");
    return;
  }

  const email = `test-workflow-dedup-${Date.now()}@example.com`;
  const inquiryData = {
    name: "Priya Patel",
    email,
    subject: "Consultation Request",
    message: "Identical consultation message for testing deduplication suppression.",
  };

  const first = await createInquiry(inquiryData);
  await new Promise((r) => setTimeout(r, 100));
  const mailsCountAfterFirst = sentMails.length;
  assert.equal(mailsCountAfterFirst, 2);

  // Second submission within 60s
  const second = await createInquiry(inquiryData);
  await new Promise((r) => setTimeout(r, 100));

  assert.equal(second._id.toString(), first._id.toString());
  // No extra emails dispatched
  assert.equal(sentMails.length, mailsCountAfterFirst);
});

test("Workflow 1 - Email transport failure does not roll back or fail database save of inquiry", async (t) => {
  if (!dbConnected) {
    t.skip("Database not available for integration test");
    return;
  }

  // Inject failing transporter
  setTransporter({
    sendMail: async () => {
      const err = new Error("SMTP connection dropped by peer");
      err.code = "ECONNRESET";
      throw err;
    },
  });

  const email = `test-workflow-fail-${Date.now()}@example.com`;
  const inquiryData = {
    name: "Vikram Malhotra",
    email,
    subject: "Resilience Test",
    message: "Verifying that transport failure does not crash or roll back the inquiry.",
  };

  const inquiry = await createInquiry(inquiryData);

  assert.ok(inquiry._id);
  const foundInDb = await Inquiry.findById(inquiry._id);
  assert.ok(foundInDb, "Inquiry remains safely persisted in MongoDB despite email error");
});

// ==============================================================================
// WORKFLOW 2 & 3: CAREER APPLICATION NOTIFICATION & CANDIDATE CONFIRMATION
// ==============================================================================

test("Workflow 2 & 3 - Career Application: alerts admin (without attaching resume) and confirms to candidate with reference", async (t) => {
  if (!dbConnected || !testJob) {
    t.skip("Database not available for integration test");
    return;
  }

  const candidateEmail = `test-workflow-cand-${Date.now()}@example.com`;
  const candidateData = {
    firstName: "Rohan",
    lastName: "Verma",
    email: candidateEmail,
    phone: "+91 99887 76655",
    currentLocation: "New Delhi, India",
    experience: "5 years",
  };

  const mockFile = {
    buffer: VALID_PDF_BUFFER,
    originalname: "rohan-verma-resume.pdf",
    mimetype: "application/pdf",
    size: VALID_PDF_BUFFER.length,
  };

  const application = await createApplication(testJob._id, candidateData, mockFile);

  assert.ok(application._id);
  assert.equal(application.status, "applied");

  // Give asynchronous dispatches a moment to complete
  for (let i = 0; i < 20 && sentMails.length < 2; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }

  // Should have sent 2 emails: Admin Alert & Candidate Confirmation
  assert.equal(sentMails.length, 2);

  const adminAlert = sentMails.find((m) =>
    m.subject.includes("[Ashivam Careers] New application for Senior Cloud Engineer")
  );
  assert.ok(adminAlert, "Career admin alert was dispatched");
  assert.equal(adminAlert.to, "team.ashivam@gmail.com", "Career alert must go strictly to team.ashivam@gmail.com");
  assert.equal(adminAlert.replyTo, candidateEmail.toLowerCase());
  assert.equal(adminAlert.cc, undefined, "Zero CC allowed");
  assert.equal(adminAlert.bcc, undefined, "Zero BCC allowed");
  assert.ok(adminAlert.html.includes(application._id.toString()));
  assert.ok(adminAlert.html.includes("Rohan Verma"));
  assert.ok(adminAlert.html.includes("Senior Cloud Engineer"));
  // Resume must NOT be attached directly
  assert.equal(adminAlert.attachments, undefined);
  assert.ok(adminAlert.html.includes("rohan-verma-resume.pdf"));
  assert.ok(adminAlert.html.includes("Retained in secure storage; access via admin portal"));

  const candidateConfirm = sentMails.find((m) =>
    m.subject.includes("Application Received - Ashivam Technologies [Senior Cloud Engineer]")
  );
  assert.ok(candidateConfirm, "Candidate confirmation email was dispatched");
  assert.equal(candidateConfirm.to, candidateEmail.toLowerCase());
  assert.equal(candidateConfirm.replyTo, "team.ashivam@gmail.com", "Candidate confirmation Reply-To routes to team.ashivam@gmail.com");
  assert.equal(candidateConfirm.cc, undefined, "Zero CC allowed");
  assert.equal(candidateConfirm.bcc, undefined, "Zero BCC allowed");
  assert.ok(candidateConfirm.html.includes(application._id.toString()));
  assert.ok(candidateConfirm.html.includes("Rohan"));
  assert.ok(candidateConfirm.html.includes("Senior Cloud Engineer"));
  // Neutral wording: must not promise interview selection or response deadline
  assert.ok(candidateConfirm.html.includes("will review your qualifications and reach out if your background aligns"));
  assert.ok(!candidateConfirm.html.includes("guaranteed interview"));
  assert.ok(!candidateConfirm.html.includes("within 24 hours"));
});

test("Workflow 2 & 3 - Duplicate candidate submission for same job returns 409 and sends no extra emails", async (t) => {
  if (!dbConnected || !testJob) {
    t.skip("Database not available for integration test");
    return;
  }

  const candidateEmail = `test-workflow-cand-retry-${Date.now()}@example.com`;
  const candidateData = {
    firstName: "Neha",
    lastName: "Kapoor",
    email: candidateEmail,
    phone: "+91 91234 56789",
  };

  const mockFile = {
    buffer: VALID_PDF_BUFFER,
    originalname: "neha-resume.pdf",
    mimetype: "application/pdf",
    size: VALID_PDF_BUFFER.length,
  };

  // First application succeeds
  await createApplication(testJob._id, candidateData, mockFile);
  await new Promise((r) => setTimeout(r, 100));
  const mailCount = sentMails.length;
  assert.equal(mailCount, 2);

  // Second application with identical email and job must be rejected
  await assert.rejects(
    async () => {
      await createApplication(testJob._id, candidateData, mockFile);
    },
    { statusCode: 409, message: "You have already applied for this position" }
  );

  await new Promise((r) => setTimeout(r, 100));
  // No extra emails sent
  assert.equal(sentMails.length, mailCount);
});

test("Workflow 2 & 3 - Email transport failure does not roll back or delete valid application", async (t) => {
  if (!dbConnected || !testJob) {
    t.skip("Database not available for integration test");
    return;
  }

  setTransporter({
    sendMail: async () => {
      const err = new Error("SMTP 421 Service not available");
      err.code = "ESOCKET";
      throw err;
    },
  });

  const candidateEmail = `test-workflow-cand-fail-${Date.now()}@example.com`;
  const candidateData = {
    firstName: "Amit",
    lastName: "Gupta",
    email: candidateEmail,
    phone: "+91 98111 22334",
  };

  const mockFile = {
    buffer: VALID_PDF_BUFFER,
    originalname: "amit-resume.pdf",
    mimetype: "application/pdf",
    size: VALID_PDF_BUFFER.length,
  };

  const application = await createApplication(testJob._id, candidateData, mockFile);

  assert.ok(application._id);
  const foundInDb = await Application.findById(application._id);
  assert.ok(foundInDb, "Application persists in database even when email transport fails");
});
