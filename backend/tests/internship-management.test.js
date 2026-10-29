import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import Internship from "../src/modules/internship/internship.model.js";
import Intern from "../src/modules/internship/intern.model.js";
import InternshipProgram from "../src/modules/internship/internshipProgram.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";

let superadminToken = null;
let superadminId = null;
let operationalAdminToken = null;
let operationalAdminId = null;
let restrictedAdminToken = null;
let restrictedAdminId = null;

const TEST_SUPER_USER = `test-super-intern-${Date.now()}`;
const TEST_ADMIN_USER = `test-op-intern-${Date.now()}`;
const TEST_RESTRICTED_USER = `test-restr-intern-${Date.now()}`;
const TEST_PASS = "TestInternPass2026!#$";

let createdInternId = null;
let createdApplicationId = null;
let createdProgramId = null;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }

  const passwordHash = await bcrypt.hash(TEST_PASS, 10);

  // 1. Superadmin with careers permission
  const superadmin = await Admin.create({
    username: TEST_SUPER_USER,
    name: "Intern Superadmin Tester",
    email: `super.${Date.now()}@ashivamtechnologies.com`,
    passwordHash,
    role: "Superadmin",
    permissions: ["careers", "dashboard"],
    isActive: true,
  });
  superadminId = superadmin._id.toString();
  superadminToken = generateAccessToken(superadmin);

  // 2. Operational Admin with careers permission
  const opAdmin = await Admin.create({
    username: TEST_ADMIN_USER,
    name: "Intern Operations Admin",
    email: `op.${Date.now()}@ashivamtechnologies.com`,
    passwordHash,
    role: "Admin",
    permissions: ["careers"],
    isActive: true,
  });
  operationalAdminId = opAdmin._id.toString();
  operationalAdminToken = generateAccessToken(opAdmin);

  // 3. Restricted Admin without careers permission
  const restrictedAdmin = await Admin.create({
    username: TEST_RESTRICTED_USER,
    name: "Restricted Inquiries Only Admin",
    email: `restricted.${Date.now()}@ashivamtechnologies.com`,
    passwordHash,
    role: "Admin",
    permissions: ["inquiries"],
    isActive: true,
  });
  restrictedAdminId = restrictedAdmin._id.toString();
  restrictedAdminToken = generateAccessToken(restrictedAdmin);
});

after(async () => {
  try {
    if (superadminId) await Admin.findByIdAndDelete(superadminId);
    if (operationalAdminId) await Admin.findByIdAndDelete(operationalAdminId);
    if (restrictedAdminId) await Admin.findByIdAndDelete(restrictedAdminId);
    if (createdInternId) await Intern.findByIdAndDelete(createdInternId);
    if (createdApplicationId) await Internship.findByIdAndDelete(createdApplicationId);
    if (createdProgramId) await InternshipProgram.findByIdAndDelete(createdProgramId);
    // Cleanup any lingering test interns
    await Intern.deleteMany({ email: /@test-intern-mgmt\.com$/ });
    await Internship.deleteMany({ email: /@test-intern-mgmt\.com$/ });
  } catch {
    // cleanup fallback
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  }
});

/* -------------------------------------------------------------
 * 1. RBAC & Security Authentication Tests
 * ----------------------------------------------------------- */

test("RBAC: Unauthenticated requests to /api/v1/internships/interns are rejected with 401", async () => {
  const res = await request(app).get("/api/v1/internships/interns");
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("RBAC: Admin without careers permission is rejected with 403", async () => {
  const res = await request(app)
    .get("/api/v1/internships/interns")
    .set("Authorization", `Bearer ${restrictedAdminToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

/* -------------------------------------------------------------
 * 2. Direct "Add New Intern" Provisioning Tests
 * ----------------------------------------------------------- */

test("Direct Intern: POST /api/v1/internships/interns validates required fields", async () => {
  const res = await request(app)
    .post("/api/v1/internships/interns")
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      name: "Incomplete Intern",
      // missing email, phone, college, domain
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test("Direct Intern: POST /api/v1/internships/interns provisions intern with collision-safe ID", async () => {
  const currentYear = new Date().getFullYear();
  const res = await request(app)
    .post("/api/v1/internships/interns")
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      name: "Priya Sharma",
      email: `priya.${Date.now()}@test-intern-mgmt.com`,
      phone: "+91 98765 43210",
      college: "Indian Institute of Information Technology",
      course: "B.Tech IT",
      domain: "Web Engineering",
      department: "Software Engineering",
      designation: "Frontend Engineering Intern",
      mentorName: "Lead Engineer",
      joiningDate: new Date().toISOString(),
      duration: "3 Months",
      workLocation: "Remote",
      stipend: 6000,
      isUnpaid: false,
      idProofVerified: true,
      collegeNocVerified: true,
      agreementSigned: false,
      ndaSigned: false,
      performanceNotes: "Passed React and TypeScript assessment with 95% score.",
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.internId);
  assert.match(res.body.data.internId, new RegExp(`^ASH-INT-${currentYear}-\\d{3}$`));
  assert.equal(res.body.data.name, "Priya Sharma");
  assert.equal(res.body.data.status, "active");
  assert.equal(res.body.data.onboarding.idProofVerified, true);
  assert.equal(res.body.data.onboarding.agreementSigned, false);

  createdInternId = res.body.data._id;
});

test("Direct Intern: POST /api/v1/internships/interns blocks duplicate active intern with same email", async () => {
  const duplicateEmail = `dup.${Date.now()}@test-intern-mgmt.com`;

  const firstRes = await request(app)
    .post("/api/v1/internships/interns")
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      name: "Candidate First",
      email: duplicateEmail,
      phone: "+91 99999 11111",
      college: "University A",
      domain: "Cloud & DevOps",
    });
  assert.equal(firstRes.status, 201);

  const secondRes = await request(app)
    .post("/api/v1/internships/interns")
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      name: "Candidate Second",
      email: duplicateEmail,
      phone: "+91 99999 22222",
      college: "University B",
      domain: "Cloud & DevOps",
    });

  assert.equal(secondRes.status, 409);
  assert.equal(secondRes.body.success, false);
});

/* -------------------------------------------------------------
 * 3. Intern Directory Listing & Filtering
 * ----------------------------------------------------------- */

test("Directory: GET /api/v1/internships/interns lists interns with pagination and domain filter", async () => {
  const res = await request(app)
    .get("/api/v1/internships/interns?domain=Web+Engineering&page=1&limit=10")
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.items));
  assert.ok(res.body.data.pagination);
  assert.ok(res.body.data.items.length >= 1);

  const found = res.body.data.items.find((i) => i._id === createdInternId);
  assert.ok(found);
  assert.equal(found.domain, "Web Engineering");
});

test("Directory: GET /api/v1/internships/interns/:id returns single intern details", async () => {
  const res = await request(app)
    .get(`/api/v1/internships/interns/${createdInternId}`)
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data._id, createdInternId);
  assert.equal(res.body.data.name, "Priya Sharma");
});

/* -------------------------------------------------------------
 * 4. Onboarding Compliance Checklist Toggle
 * ----------------------------------------------------------- */

test("Onboarding: PATCH /api/v1/internships/interns/:id/onboarding updates checklist items", async () => {
  const res = await request(app)
    .patch(`/api/v1/internships/interns/${createdInternId}/onboarding`)
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      agreementSigned: true,
      ndaSigned: true,
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.onboarding.agreementSigned, true);
  assert.equal(res.body.data.onboarding.ndaSigned, true);
  // All 4 documents verified => onboarding status should be completed
  assert.equal(res.body.data.onboarding.status, "completed");
  assert.ok(res.body.data.onboarding.completedAt);
});

/* -------------------------------------------------------------
 * 5. Intern Status Transition & Extension
 * ----------------------------------------------------------- */

test("Status: PATCH /api/v1/internships/interns/:id/status updates status to extended with reason", async () => {
  const res = await request(app)
    .patch(`/api/v1/internships/interns/${createdInternId}/status`)
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      status: "extended",
      extensionReason: "Extended for high performance on cloud migration project.",
      performanceNotes: "Exceptional code quality and timely deliverables.",
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, "extended");
  assert.equal(
    res.body.data.extensionReason,
    "Extended for high performance on cloud migration project."
  );
});

/* -------------------------------------------------------------
 * 6. Candidate Application Conversion Workflow
 * ----------------------------------------------------------- */

test("Conversion: POST /api/v1/internships/applications/:id/convert transforms applicant to intern", async () => {
  // First create a candidate application
  const appRes = await request(app)
    .post("/api/v1/internships")
    .send({
      name: "Amit Kumar Patel",
      email: `amit.${Date.now()}@test-intern-mgmt.com`,
      phone: "+91 91234 56789",
      college: "Delhi Technological University",
      course: "B.Tech CSE",
      domain: "AI, ML & Data Science",
      duration: "3 Months",
      statement: "Aspiring machine learning engineer with PyTorch experience.",
    });

  assert.equal(appRes.status, 201);
  assert.equal(appRes.body.success, true);
  createdApplicationId = appRes.body.data.id || appRes.body.data._id;

  // Now convert candidate to enrolled intern
  const convertRes = await request(app)
    .post(`/api/v1/internships/applications/${createdApplicationId}/convert`)
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      mentorName: "Data Science Director",
      joiningDate: new Date().toISOString(),
      duration: "6 Months",
      stipend: 8000,
      workLocation: "Remote",
      idProofVerified: true,
      collegeNocVerified: true,
      agreementSigned: true,
      ndaSigned: true,
      performanceNotes: "Selected after technical presentation on LLM fine-tuning.",
    });

  assert.equal(convertRes.status, 201);
  assert.equal(convertRes.body.success, true);
  assert.ok(convertRes.body.data.intern);
  assert.ok(convertRes.body.data.intern.internId);
  assert.equal(convertRes.body.data.intern.name, "Amit Kumar Patel");
  assert.equal(convertRes.body.data.intern.duration, "6 Months");
  assert.equal(convertRes.body.data.intern.stipend, 8000);
  assert.equal(convertRes.body.data.application.status, "selected");
  assert.equal(convertRes.body.data.application.convertedToIntern, true);

  // Attempting to convert again must fail with 409 Conflict
  const secondConvertRes = await request(app)
    .post(`/api/v1/internships/applications/${createdApplicationId}/convert`)
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      mentorName: "Another Mentor",
    });

  assert.equal(secondConvertRes.status, 409);
  assert.equal(secondConvertRes.body.success, false);
});

/* -------------------------------------------------------------
 * 7. Internship Programs & Tracks CRUD
 * ----------------------------------------------------------- */

test("Programs: POST /api/v1/internships/programs creates an internship track", async () => {
  const trackSlug = `fullstack-track-${Date.now()}`;
  const res = await request(app)
    .post("/api/v1/internships/programs")
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      title: "Full Stack Web Engineering Track",
      slug: trackSlug,
      domain: "Web Engineering",
      department: "Software Engineering",
      description:
        "Comprehensive 3-month immersive internship building scalable microservices and React frontends.",
      openings: 3,
      duration: "3 Months",
      workLocation: "Remote",
      stipend: 5000,
      isUnpaid: false,
      eligibility: "B.Tech / MCA students",
      status: "published",
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  createdProgramId = res.body.data._id;
  assert.equal(res.body.data.title, "Full Stack Web Engineering Track");
  assert.equal(res.body.data.slug, trackSlug);
  assert.equal(res.body.data.openings, 3);
});

test("Programs: Public GET /api/v1/internships/programs/public returns published tracks without auth", async () => {
  const res = await request(app).get("/api/v1/internships/programs/public");
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.items));
});

test("Programs: PATCH /api/v1/internships/programs/:id updates program track", async () => {
  const res = await request(app)
    .patch(`/api/v1/internships/programs/${createdProgramId}`)
    .set("Authorization", `Bearer ${superadminToken}`)
    .send({
      openings: 5,
      stipend: 6500,
      status: "published",
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.openings, 5);
  assert.equal(res.body.data.stipend, 6500);
});

/* -------------------------------------------------------------
 * 8. Safe CSV Formula-Neutralized Exports
 * ----------------------------------------------------------- */

test("CSV Export: GET /api/v1/internships/export neutralizes formula triggers and returns CSV", async () => {
  const res = await request(app)
    .get("/api/v1/internships/export")
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"], "text/csv; charset=utf-8");
  assert.ok(res.headers["content-disposition"].includes("attachment"));
  assert.ok(res.text.includes("Application ID") && res.text.includes("Candidate Name"));
});

test("CSV Export: GET /api/v1/internships/interns/export exports enrolled intern directory", async () => {
  const res = await request(app)
    .get("/api/v1/internships/interns/export")
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"], "text/csv; charset=utf-8");
  assert.ok(res.headers["content-disposition"].includes("attachment"));
  assert.ok(res.text.includes("Intern ID") && res.text.includes("Intern Name"));
  assert.ok(res.text.includes("Priya Sharma"));
});

/* -------------------------------------------------------------
 * 9. Superadmin-Only Deletion Enforcement
 * ----------------------------------------------------------- */

test("Deletion RBAC: Operational Admin cannot delete intern record (403 forbidden)", async () => {
  const res = await request(app)
    .delete(`/api/v1/internships/interns/${createdInternId}`)
    .set("Authorization", `Bearer ${operationalAdminToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test("Deletion RBAC: Superadmin can delete intern record (200 success)", async () => {
  const res = await request(app)
    .delete(`/api/v1/internships/interns/${createdInternId}`)
    .set("Authorization", `Bearer ${superadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Intern record removed successfully");
  createdInternId = null; // already deleted
});
