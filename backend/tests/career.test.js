import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import Job from "../src/modules/career/job.model.js";
import Application from "../src/modules/career/application.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";
import {
  validateFileSignature,
  sanitizeDownloadFilename,
} from "../src/services/storage.service.js";
import { formatApplicationResponse } from "../src/modules/career/career.service.js";

// Valid mock PDF buffer (starts with %PDF)
const VALID_PDF_BUFFER = Buffer.from(
  "%PDF-1.4\n%test-stream\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
);
// Spoofed PDF buffer (starts with ASCII text)
const FAKE_PDF_BUFFER = Buffer.from(
  "This is a fake PDF with invalid magic bytes"
);

let superadminToken = "";
let unauthorizedAdminToken = "";
let testJobId = "";
let testApplicationId = "";
let dbConnected = false;

before(async () => {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 2500 });
    dbConnected = true;

    // 1. Create Superadmin for tests
    const superadmin = await Admin.create({
      username: `test-superadmin-${Date.now()}`,
      name: "Test Superadmin",
      passwordHash: "hash-not-used-for-jwt",
      role: "Superadmin",
      permissions: ["all"],
      isActive: true,
    });
    superadminToken = generateAccessToken(superadmin);

    // 2. Create Admin WITHOUT 'careers' permission
    const unauthorizedAdmin = await Admin.create({
      username: `test-unauth-admin-${Date.now()}`,
      name: "Test Unauth Admin",
      passwordHash: "hash-not-used-for-jwt",
      role: "Admin",
      permissions: ["inquiries"], // lacks 'careers'
      isActive: true,
    });
    unauthorizedAdminToken = generateAccessToken(unauthorizedAdmin);

    // 3. Create active test Job
    const job = await Job.create({
      title: "Security Automation Engineer",
      slug: `security-eng-${Date.now()}`,
      department: "Security",
      location: "Agra, India",
      employmentType: "Full-time",
      description: "Testing secure resume lifecycle and downloads.",
      createdBy: superadmin._id,
      isActive: true,
    });
    testJobId = job._id.toString();
  } catch (err) {
    console.warn("[Test Setup] Database connection failed or skipped:", err.message);
  }
});

after(async () => {
  if (dbConnected) {
    try {
      if (testJobId) {
        await Job.deleteOne({ _id: testJobId });
      }
      if (testApplicationId) {
        await Application.deleteOne({ _id: testApplicationId });
      }
      await Admin.deleteMany({ username: /^test-(superadmin|unauth-admin)-/ });
    } finally {
      await mongoose.disconnect();
    }
  }
});

// ==============================================================================
// 1. UNIT TESTS: FILE SIGNATURE & SANITIZATION
// ==============================================================================

test("Unit - validateFileSignature correctly identifies PDF, DOC, DOCX and rejects fakes", () => {
  // Real PDF
  assert.equal(
    validateFileSignature(VALID_PDF_BUFFER, "application/pdf", ".pdf"),
    true
  );

  // Spoofed PDF (has .pdf extension and application/pdf MIME, but fake magic bytes)
  assert.equal(
    validateFileSignature(FAKE_PDF_BUFFER, "application/pdf", ".pdf"),
    false
  );

  // Real DOC (OLE header 0xD0 0xCF 0x11 0xE0)
  const docBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  assert.equal(
    validateFileSignature(docBuffer, "application/msword", ".doc"),
    true
  );

  // Real DOCX (ZIP header PK\x03\x04)
  const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  assert.equal(
    validateFileSignature(
      docxBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".docx"
    ),
    true
  );

  // Shell script disguised as pdf
  assert.equal(
    validateFileSignature(Buffer.from("#!/bin/bash\necho 1"), "application/pdf", ".pdf"),
    false
  );
});

test("Unit - sanitizeDownloadFilename neutralizes directory traversal and safe headers", () => {
  assert.equal(
    sanitizeDownloadFilename("../../../etc/passwd.pdf"),
    "passwd.pdf"
  );
  assert.equal(
    sanitizeDownloadFilename("..\\..\\windows\\system32\\calc.doc"),
    "calc.doc"
  );
  assert.equal(
    sanitizeDownloadFilename('Jane "Candidate" CV [v1].pdf'),
    "Jane__Candidate__CV__v1_.pdf"
  );
  assert.equal(
    sanitizeDownloadFilename("malicious.sh"),
    "malicious.pdf" // ensures allowed extension
  );
});

test("Unit - formatApplicationResponse removes internal paths and adds safe downloadUrl", () => {
  const rawApplication = {
    _id: "6ac887576fae1810cc0e576d",
    firstName: "Ritik",
    lastName: "Gupta",
    email: "ritik@example.com",
    resume: {
      originalName: "ritik-cv.pdf",
      fileName: "1741512345678-uuid.pdf",
      path: "/opt/render/project/src/uploads/resumes/1741512345678-uuid.pdf",
      storageKey: "resumes/1741512345678-uuid.pdf",
      storageProvider: "s3",
      mimeType: "application/pdf",
      size: 1024,
    },
  };

  const formatted = formatApplicationResponse(rawApplication);

  assert.equal(formatted.resume.path, undefined, "Internal path must be stripped");
  assert.equal(formatted.resume.storageKey, undefined, "Storage key must be stripped");
  assert.equal(formatted.resume.originalName, "ritik-cv.pdf");
  assert.equal(formatted.resume.size, 1024);
  assert.equal(
    formatted.resume.downloadUrl,
    "/api/v1/career/admin/applications/6ac887576fae1810cc0e576d/resume"
  );
});

// ==============================================================================
// 2. SECURITY TESTS: PUBLIC STATIC ACCESS PREVENTION
// ==============================================================================

test("Security - Direct public GET /uploads/resumes/* returns 404 (private resumes blocked)", async () => {
  const response = await request(app).get(
    "/uploads/resumes/1741512345678-secret-resume.pdf"
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Resource not found");
});

test("Security - Direct public GET /uploads/employee-documents/* returns 404", async () => {
  const response = await request(app).get(
    "/uploads/employee-documents/confidential.pdf"
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("Security - Direct public GET /uploads/hr-documents/* returns 404", async () => {
  const response = await request(app).get(
    "/uploads/hr-documents/contract.pdf"
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

// ==============================================================================
// 3. CAREER APPLY & UPLOAD VALIDATION TESTS
// ==============================================================================

test("Career API - POST /api/v1/career/jobs/:jobId/apply rejects missing application body", async () => {
  const response = await request(app)
    .post("/api/v1/career/jobs/507f1f77bcf86cd799439011/apply")
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Validation failed");
  assert.ok(response.body.errors);
});

test("Career API - Upload filter rejects disallowed file extensions (.sh)", async () => {
  const response = await request(app)
    .post("/api/v1/career/jobs/507f1f77bcf86cd799439011/apply")
    .field("firstName", "Jane")
    .field("lastName", "Doe")
    .field("email", "jane@example.com")
    .field("phone", "+1234567890")
    .attach("resume", Buffer.from("echo 'malicious shell'"), "exploit.sh");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message.includes("resumes are allowed"));
});

test("Career API - Upload filter rejects fake PDF with invalid file signature", async () => {
  const response = await request(app)
    .post("/api/v1/career/jobs/507f1f77bcf86cd799439011/apply")
    .field("firstName", "Jane")
    .field("lastName", "Doe")
    .field("email", "jane.spoofed@example.com")
    .field("phone", "+1234567890")
    .attach("resume", FAKE_PDF_BUFFER, "spoofed.pdf");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message.includes("Invalid file signature"));
});

// ==============================================================================
// 4. AUTHENTICATED RESUME DOWNLOAD & RBAC TESTS
// ==============================================================================

test("Career API - GET /api/v1/career/admin/applications/:id/resume rejects unauthenticated request with 401", async () => {
  const response = await request(app).get(
    "/api/v1/career/admin/applications/6ac887576fae1810cc0e576d/resume"
  );

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Authentication required");
});

test("Career API - GET /api/v1/career/admin/applications/:id/resume rejects invalid ObjectId with 400", async () => {
  if (!dbConnected) return;

  const response = await request(app)
    .get("/api/v1/career/admin/applications/invalid-not-an-objectid/resume")
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message.includes("Invalid application ID"));
});

test("Career API - GET /api/v1/career/admin/applications/:id/resume rejects path traversal in ID with 400 or 404", async (t) => {
  if (!dbConnected) {
    t.skip("Database connection not available for integration check");
    return;
  }

  const response = await request(app)
    .get("/api/v1/career/admin/applications/..%2f..%2fetc%2fpasswd/resume")
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.ok([400, 404].includes(response.status));
  assert.equal(response.body.success, false);
});

test("Career API - GET /api/v1/career/admin/applications/:id/resume returns 404 for non-existent application", async () => {
  if (!dbConnected) return;

  const nonExistentId = new mongoose.Types.ObjectId().toString();
  const response = await request(app)
    .get(`/api/v1/career/admin/applications/${nonExistentId}/resume`)
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Application not found");
});

test("Career API - Full application lifecycle: submit with valid PDF, inspect detail without paths, and download resume", async () => {
  if (!dbConnected || !testJobId) return;

  const candidateEmail = `test.candidate.${Date.now()}@example.com`;

  // 1. Submit valid job application
  const applyRes = await request(app)
    .post(`/api/v1/career/jobs/${testJobId}/apply`)
    .field("firstName", "Secure")
    .field("lastName", "Applicant")
    .field("email", candidateEmail)
    .field("phone", "+919876543210")
    .field("currentLocation", "Agra, India")
    .field("experience", "3 years")
    .field("coverLetter", "Testing secure resume storage.")
    .attach("resume", VALID_PDF_BUFFER, "applicant-original-resume.pdf");

  assert.equal(applyRes.status, 201);
  assert.equal(applyRes.body.success, true);
  assert.ok(applyRes.body.data.application.id);

  testApplicationId = applyRes.body.data.application.id;

  // 2. Duplicate submission prevention
  const dupRes = await request(app)
    .post(`/api/v1/career/jobs/${testJobId}/apply`)
    .field("firstName", "Secure")
    .field("lastName", "Applicant")
    .field("email", candidateEmail)
    .field("phone", "+919876543210")
    .attach("resume", VALID_PDF_BUFFER, "applicant-original-resume.pdf");

  assert.equal(dupRes.status, 409);
  assert.equal(dupRes.body.success, false);
  assert.ok(dupRes.body.message.includes("already applied"));

  // 3. Inspect application detail as Admin (Path must NEVER be exposed!)
  const detailRes = await request(app)
    .get(`/api/v1/career/admin/applications/${testApplicationId}`)
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.body.success, true);
  const appData = detailRes.body.data.application;

  assert.equal(appData.resume.originalName, "applicant-original-resume.pdf");
  assert.equal(appData.resume.mimeType, "application/pdf");
  assert.ok(appData.resume.downloadUrl);
  assert.equal(
    appData.resume.path,
    undefined,
    "CRITICAL: resume.path must NEVER be exposed in application detail API"
  );
  assert.equal(
    appData.resume.storageKey,
    undefined,
    "CRITICAL: resume.storageKey must NEVER be exposed in application detail API"
  );

  // 4. Unauthorized Admin (lacks 'careers' permission) is rejected with 403
  const forbiddenRes = await request(app)
    .get(`/api/v1/career/admin/applications/${testApplicationId}/resume`)
    .set("Authorization", `Bearer ${unauthorizedAdminToken}`);

  assert.equal(forbiddenRes.status, 403);
  assert.equal(forbiddenRes.body.success, false);
  assert.equal(forbiddenRes.body.message, "Insufficient permissions");

  // 5. Authorized Superadmin downloads resume successfully
  const downloadRes = await request(app)
    .get(`/api/v1/career/admin/applications/${testApplicationId}/resume`)
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(downloadRes.status, 200);
  assert.equal(downloadRes.headers["content-type"], "application/pdf");
  assert.ok(
    downloadRes.headers["content-disposition"].includes("attachment")
  );
  assert.ok(
    downloadRes.headers["content-disposition"].includes("applicant-original-resume.pdf")
  );
  assert.equal(downloadRes.headers["x-content-type-options"], "nosniff");
  assert.equal(
    downloadRes.body.toString("utf8"),
    VALID_PDF_BUFFER.toString("utf8"),
    "Streamed content must match uploaded PDF bytes exactly"
  );

  // 6. Alias route /download works identically
  const aliasRes = await request(app)
    .get(`/api/v1/career/admin/applications/${testApplicationId}/download`)
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(aliasRes.status, 200);
  assert.equal(aliasRes.headers["content-type"], "application/pdf");
  assert.equal(
    aliasRes.body.toString("utf8"),
    VALID_PDF_BUFFER.toString("utf8")
  );
});
