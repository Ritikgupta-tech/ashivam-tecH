import test, { before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import env from "../src/config/env.js";
import Job from "../src/modules/career/job.model.js";
import Application from "../src/modules/career/application.model.js";
import Inquiry from "../src/modules/inquiry/inquiry.model.js";
import Internship from "../src/modules/internship/internship.model.js";
import { createInquiry } from "../src/modules/inquiry/inquiry.service.js";
import { createApplication } from "../src/modules/career/career.service.js";
import { createInternship } from "../src/modules/internship/internship.service.js";
import { createAndSendNotification } from "../src/modules/notification/notification.service.js";
import Notification from "../src/modules/notification/notification.model.js";
import {
  setTransporter,
  resetTransporter,
} from "../src/modules/notification/email.service.js";

const VALID_PDF_BUFFER = Buffer.from(
  "%PDF-1.4\n%e2e-test-stream\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
);

const MANDATED_ALERT_EMAIL = "team.ashivam@gmail.com";

let dbConnected = false;
let testJob = null;
let dispatchedEmails = [];

before(async () => {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 3000 });
    dbConnected = true;

    testJob = await Job.create({
      title: "Senior Full Stack Architect",
      slug: `full-stack-arch-${Date.now()}`,
      department: "Software Engineering",
      location: "Agra, India",
      employmentType: "Full-time",
      description: "E2E verification role for Ashivam recruitment portal.",
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(),
    });
  } catch (err) {
    console.warn("[E2E Setup] MongoDB connection skipped:", err.message);
  }
});

after(async () => {
  if (dbConnected) {
    try {
      if (testJob?._id) {
        await Job.deleteOne({ _id: testJob._id });
        await Application.deleteMany({ job: testJob._id });
      }
      await Inquiry.deleteMany({ email: /^e2e-.*@example\.com$/ });
      await Internship.deleteMany({ email: /^e2e-.*@example\.com$/ });
      await Notification.deleteMany({ title: /^\[E2E Broadcast\]/ });
    } finally {
      await mongoose.disconnect();
    }
  }
});

beforeEach(() => {
  dispatchedEmails = [];
  setTransporter({
    sendMail: async (mailOptions) => {
      dispatchedEmails.push(mailOptions);
      return {
        messageId: `<sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 6)}@ashivam>`,
        response: "250 2.0.0 OK (Sandbox Captured)",
      };
    },
    verify: async () => true,
  });
});

afterEach(() => {
  resetTransporter();
});

test("E2E Sandbox: Environment configuration strictly mandates team.ashivam@gmail.com as alert recipient", () => {
  assert.equal(
    env.companyNotificationEmail.toLowerCase(),
    MANDATED_ALERT_EMAIL.toLowerCase(),
    "env.companyNotificationEmail must be team.ashivam@gmail.com"
  );
  assert.equal(
    env.alertEmail.toLowerCase(),
    MANDATED_ALERT_EMAIL.toLowerCase(),
    "env.alertEmail must be team.ashivam@gmail.com"
  );
  assert.equal(
    env.notificationRecipient.toLowerCase(),
    MANDATED_ALERT_EMAIL.toLowerCase(),
    "env.notificationRecipient must be team.ashivam@gmail.com"
  );
});

test("E2E Sandbox: Project Discussion / Contact Inquiry alerts go STRICTLY to team.ashivam@gmail.com", async (t) => {
  if (!dbConnected) {
    t.skip("Database not connected");
    return;
  }

  const clientEmail = `e2e-client-${Date.now()}@example.com`;
  const inquiryData = {
    name: "Vikram Rathore",
    email: clientEmail,
    phone: "+91 98765 11223",
    subject: "Project Discussion - Enterprise Banking Platform",
    message: "We would like to discuss building a real-time banking ledger and microservices architecture.",
  };

  const inquiry = await createInquiry(inquiryData);
  assert.ok(inquiry._id);

  await new Promise((r) => setTimeout(r, 120));

  assert.equal(dispatchedEmails.length, 2, "Expected exactly 2 emails (Admin Alert & User Confirmation)");

  const adminAlert = dispatchedEmails.find((m) =>
    m.subject.includes("[Ashivam Inquiries]")
  );
  assert.ok(adminAlert, "Admin inquiry alert must be dispatched");
  assert.equal(
    adminAlert.to,
    MANDATED_ALERT_EMAIL,
    `Admin alert must ONLY be sent to ${MANDATED_ALERT_EMAIL}`
  );
  assert.equal(adminAlert.cc, undefined, "Admin alert must contain zero CC recipients");
  assert.equal(adminAlert.bcc, undefined, "Admin alert must contain zero BCC recipients");
  assert.equal(
    adminAlert.replyTo,
    clientEmail.toLowerCase(),
    "Reply-To must point to client email so Ashivam can reply directly"
  );
  assert.ok(adminAlert.html.includes("Project Discussion - Enterprise Banking Platform"));
  assert.ok(adminAlert.html.includes("Vikram Rathore"));
  assert.ok(adminAlert.html.includes("+91 98765 11223"));

  const userConfirm = dispatchedEmails.find((m) =>
    m.subject.includes("Inquiry Received - Ashivam Technologies")
  );
  assert.ok(userConfirm, "Client confirmation must be dispatched");
  assert.equal(userConfirm.to, clientEmail.toLowerCase());
  assert.equal(
    userConfirm.replyTo,
    MANDATED_ALERT_EMAIL,
    "Client confirmation Reply-To must route replies to team.ashivam@gmail.com"
  );
  assert.equal(userConfirm.cc, undefined, "Client confirmation must contain zero CC recipients");
  assert.equal(userConfirm.bcc, undefined, "Client confirmation must contain zero BCC recipients");
});

test("E2E Sandbox: Career Job Application (Apply Role) alerts go STRICTLY to team.ashivam@gmail.com", async (t) => {
  if (!dbConnected || !testJob) {
    t.skip("Database or test job not available");
    return;
  }

  const applicantEmail = `e2e-applicant-${Date.now()}@example.com`;
  const applicantData = {
    firstName: "Sunita",
    lastName: "Deshmukh",
    email: applicantEmail,
    phone: "+91 91234 88990",
    currentLocation: "Pune, Maharashtra, India",
    experience: "6 years",
  };

  const resumeFile = {
    buffer: VALID_PDF_BUFFER,
    originalname: "sunita-deshmukh-cv.pdf",
    mimetype: "application/pdf",
    size: VALID_PDF_BUFFER.length,
  };

  const application = await createApplication(testJob._id, applicantData, resumeFile);
  assert.ok(application._id);

  await new Promise((r) => setTimeout(r, 120));

  assert.equal(dispatchedEmails.length, 2, "Expected exactly 2 emails (Admin Alert & Candidate Confirmation)");

  const adminAlert = dispatchedEmails.find((m) =>
    m.subject.includes("[Ashivam Careers]")
  );
  assert.ok(adminAlert, "Career admin alert must be dispatched");
  assert.equal(
    adminAlert.to,
    MANDATED_ALERT_EMAIL,
    `Career alert must ONLY be sent to ${MANDATED_ALERT_EMAIL}`
  );
  assert.equal(adminAlert.cc, undefined, "Career alert must contain zero CC recipients");
  assert.equal(adminAlert.bcc, undefined, "Career alert must contain zero BCC recipients");
  assert.equal(
    adminAlert.replyTo,
    applicantEmail.toLowerCase(),
    "Reply-To must point to applicant so recruitment team can reply directly"
  );
  assert.ok(adminAlert.html.includes("Sunita Deshmukh"));
  assert.ok(adminAlert.html.includes("Senior Full Stack Architect"));
  assert.ok(adminAlert.html.includes("sunita-deshmukh-cv.pdf"));

  const candidateConfirm = dispatchedEmails.find((m) =>
    m.subject.includes("Application Received - Ashivam Technologies")
  );
  assert.ok(candidateConfirm, "Candidate confirmation must be dispatched");
  assert.equal(candidateConfirm.to, applicantEmail.toLowerCase());
  assert.equal(
    candidateConfirm.replyTo,
    MANDATED_ALERT_EMAIL,
    "Candidate confirmation Reply-To must route replies to team.ashivam@gmail.com"
  );
  assert.equal(candidateConfirm.cc, undefined, "Candidate confirmation must contain zero CC recipients");
  assert.equal(candidateConfirm.bcc, undefined, "Candidate confirmation must contain zero BCC recipients");
});

test("E2E Sandbox: Internship Applications alerts go STRICTLY to team.ashivam@gmail.com", async (t) => {
  if (!dbConnected) {
    t.skip("Database not connected");
    return;
  }

  const studentEmail = `e2e-intern-${Date.now()}@example.com`;
  const internshipData = {
    name: "Arjun Verma",
    email: studentEmail,
    phone: "+91 98888 77777",
    college: "IIT Roorkee",
    course: "B.Tech Computer Science",
    domain: "Cloud Infrastructure & DevOps",
    duration: "3 Months",
  };

  const internship = await createInternship(internshipData);
  assert.ok(internship._id);

  await new Promise((r) => setTimeout(r, 120));

  assert.equal(dispatchedEmails.length, 2, "Expected exactly 2 emails (Admin Alert & Student Confirmation)");

  const adminAlert = dispatchedEmails.find((m) =>
    m.subject.includes("[Ashivam Internship]")
  );
  assert.ok(adminAlert, "Internship alert must be dispatched");
  assert.equal(
    adminAlert.to,
    MANDATED_ALERT_EMAIL,
    `Internship alert must ONLY be sent to ${MANDATED_ALERT_EMAIL}`
  );
  assert.equal(adminAlert.cc, undefined, "Internship alert must contain zero CC recipients");
  assert.equal(adminAlert.bcc, undefined, "Internship alert must contain zero BCC recipients");
  assert.equal(
    adminAlert.replyTo,
    studentEmail.toLowerCase(),
    "Reply-To must point to student email"
  );
  assert.ok(adminAlert.html.includes("Arjun Verma"));
  assert.ok(adminAlert.html.includes("IIT Roorkee"));

  const studentConfirm = dispatchedEmails.find((m) =>
    m.subject.includes("Internship Application Received - Ashivam Technologies")
  );
  assert.ok(studentConfirm, "Student confirmation must be dispatched");
  assert.equal(studentConfirm.to, studentEmail.toLowerCase());
  assert.equal(
    studentConfirm.replyTo,
    MANDATED_ALERT_EMAIL,
    "Student confirmation Reply-To must route replies to team.ashivam@gmail.com"
  );
  assert.equal(studentConfirm.cc, undefined, "Student confirmation must contain zero CC recipients");
  assert.equal(studentConfirm.bcc, undefined, "Student confirmation must contain zero BCC recipients");
});

test("E2E Sandbox: Public submission payload tampering cannot override company notification recipient", async (t) => {
  if (!dbConnected) {
    t.skip("Database not connected");
    return;
  }

  const evilClientEmail = `e2e-tamper-${Date.now()}@example.com`;
  // Attempting to inject 'to', 'cc', 'bcc', 'recipient' into the body
  const tamperedData = {
    name: "Attacker Malicious",
    email: evilClientEmail,
    phone: "+91 99999 88888",
    subject: "Hacked Recipient Attempt",
    message: "Trying to redirect alert to attacker mailbox",
    to: "evil.hacker@darkweb.org",
    cc: "spy@darkweb.org",
    bcc: "exfiltrate@darkweb.org",
    recipient: "evil.hacker@darkweb.org",
    notificationRecipient: "evil.hacker@darkweb.org",
  };

  await createInquiry(tamperedData);
  await new Promise((r) => setTimeout(r, 120));

  const adminAlert = dispatchedEmails.find((m) =>
    m.subject.includes("[Ashivam Inquiries]") && m.subject.includes("Hacked Recipient Attempt")
  );
  assert.ok(adminAlert, "Admin inquiry alert must be dispatched");
  assert.equal(
    adminAlert.to,
    MANDATED_ALERT_EMAIL,
    `Admin alert must strictly go to ${MANDATED_ALERT_EMAIL} despite payload injection`
  );
  assert.equal(adminAlert.cc, undefined, "CC must be completely stripped");
  assert.equal(adminAlert.bcc, undefined, "BCC must be completely stripped");
  assert.equal(adminAlert.replyTo, evilClientEmail.toLowerCase(), "Reply-To is preserved as submitter email");
});

test("E2E Sandbox: System broadcast notifications without admin email route to team.ashivam@gmail.com", async (t) => {
  if (!dbConnected) {
    t.skip("Database not connected");
    return;
  }

  const broadcastTitle = `[E2E Broadcast] Security Update ${Date.now()}`;
  const broadcastMessage = "All administrative passwords have been rotated in accordance with policy.";
  const fallbackRecipientId = new mongoose.Types.ObjectId();

  await createAndSendNotification({
    recipient: fallbackRecipientId,
    type: "system",
    title: broadcastTitle,
    message: broadcastMessage,
    priority: "high",
    sendEmailNotification: true,
  });

  await new Promise((r) => setTimeout(r, 120));

  assert.equal(dispatchedEmails.length, 1, "Expected exactly 1 broadcast email dispatched");
  const alert = dispatchedEmails[0];
  assert.equal(
    alert.to,
    MANDATED_ALERT_EMAIL,
    `Broadcast email must route to ${MANDATED_ALERT_EMAIL}`
  );
  assert.equal(alert.cc, undefined, "Broadcast must contain zero CC recipients");
  assert.equal(alert.bcc, undefined, "Broadcast must contain zero BCC recipients");
  assert.equal(alert.subject, broadcastTitle);
  assert.ok(alert.html.includes(broadcastMessage));
});
