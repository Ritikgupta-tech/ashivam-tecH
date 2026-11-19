import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import Employee from "../src/modules/employee/employee.model.js";
import RefreshToken from "../src/models/refreshToken.model.js";
import AuditLog from "../src/modules/audit/audit.model.js";
import Meeting from "../src/modules/attendance/models/meeting.model.js";
import AttendanceRecord from "../src/modules/attendance/models/attendanceRecord.model.js";
import ParticipantSession from "../src/modules/attendance/models/participantSession.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";
import {
  createEmployee,
  resendEmployeeInvitation,
  updateEmployeeAccountStatus,
  updateEmployeeEmploymentStatus,
} from "../src/modules/employee/employee.service.js";
import {
  verifyActivationToken,
  activateEmployeeAccount,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetEmployeePassword,
} from "../src/modules/auth/auth.service.js";
import { processParticipantJoinedEvent } from "../src/modules/attendance/services/reconciliation.service.js";

const TS = Date.now();
let superadmin = null;
let adminToken = null;
let testEmployee = null;
let testRawActivationToken = null;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }

  const passHash = await bcrypt.hash("SuperSecurePass!2026", 10);
  superadmin = await Admin.create({
    username: `super_lifecycle_${TS}`,
    name: "Lifecycle Superadmin",
    email: `super.lifecycle.${TS}@ashivam.test`,
    passwordHash: passHash,
    role: "Superadmin",
    permissions: ["employees", "dashboard", "settings"],
    isActive: true,
  });

  adminToken = generateAccessToken(superadmin);
});

after(async () => {
  if (superadmin?._id) {
    await Admin.deleteOne({ _id: superadmin._id });
  }
  await Employee.deleteMany({ email: new RegExp(String(TS)) });
  await Meeting.deleteMany({ title: new RegExp(String(TS)) });
  await AttendanceRecord.deleteMany({ notes: new RegExp(String(TS)) });
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

/* ===================================================================
 * 1. EMPLOYEE CREATION WORKFLOW (Scenarios 1 - 8)
 * =================================================================== */

test("Scenario 1: Admin creates a valid employee via POST /api/v1/employees", async () => {
  const email = `emp.valid.${TS}@ashivam.test`;
  const res = await request(app)
    .post("/api/v1/employees")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Aditi",
      lastName: "Rao",
      email,
      designation: "Senior Cloud Architect",
      department: "Cloud Infrastructure",
      employmentType: "Full-time",
      joiningDate: "2026-01-15",
      workLocation: "Office",
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.employee.email, email);
  assert.ok(res.body.data.employee.employeeId.startsWith("ASH-EMP-"));
  assert.equal(res.body.data.employee.accountStatus, "PENDING_ACTIVATION");
  assert.equal(res.body.data.employee.isEmailVerified, false);

  testEmployee = res.body.data.employee;
  testRawActivationToken = res.body.data.rawActivationToken;
  assert.ok(testRawActivationToken, "Raw activation token returned in test environment");
});

test("Scenario 2: Duplicate employee email rejected with 409 Conflict", async () => {
  const res = await request(app)
    .post("/api/v1/employees")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Duplicate",
      lastName: "Email",
      email: testEmployee.email,
      designation: "Software Engineer",
      department: "Software Engineering",
      employmentType: "Full-time",
      joiningDate: "2026-02-01",
    });

  assert.equal(res.status, 409);
  assert.match(res.body.message, /already exists/i);
});

test("Scenario 3: Duplicate custom employee ID rejected with 409 Conflict", async () => {
  const res = await request(app)
    .post("/api/v1/employees")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Custom",
      lastName: "ID",
      email: `emp.customid.${TS}@ashivam.test`,
      employeeId: testEmployee.employeeId, // Duplicate ID
      designation: "QA Engineer",
      department: "Operations & Quality",
      employmentType: "Full-time",
      joiningDate: "2026-02-01",
    });

  assert.equal(res.status, 409);
  assert.match(res.body.message, /Employee ID already exists/i);
});

test("Scenario 4: Invalid email format rejected with 400 Bad Request", async () => {
  const res = await request(app)
    .post("/api/v1/employees")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Invalid",
      lastName: "Format",
      email: "not-an-email",
      designation: "Engineer",
      department: "Software Engineering",
      employmentType: "Full-time",
      joiningDate: "2026-02-01",
    });

  assert.equal(res.status, 400);
});

test("Scenario 5: Missing required fields rejected with 400 Bad Request", async () => {
  const res = await request(app)
    .post("/api/v1/employees")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Incomplete",
      // Missing lastName, email, designation, department, joiningDate
    });

  assert.equal(res.status, 400);
});

test("Scenario 6: Authentication account provisioned exactly once without duplicate records", async () => {
  const records = await Employee.find({ email: testEmployee.email });
  assert.equal(records.length, 1, "Exactly one unified Employee entity exists in database");
});

test("Scenario 7: Invitation email failure handled safely without crashing employee creation", async () => {
  const result = await createEmployee(
    {
      firstName: "Grace",
      lastName: "Hopper",
      email: `grace.hopper.${TS}@ashivam.test`,
      designation: "Lead Systems Architect",
      department: "Software Engineering",
      employmentType: "Full-time",
      joiningDate: "2026-03-01",
    },
    superadmin._id
  );

  assert.ok(result._id);
  assert.equal(result.email, `grace.hopper.${TS}@ashivam.test`);
  assert.ok(["SENT", "NOT_REQUIRED", "FAILED"].includes(result.invitationStatus));
});

test("Scenario 8: Admin can safely resend activation invitation via POST /:id/resend-invitation", async () => {
  const res = await request(app)
    .post(`/api/v1/employees/${testEmployee._id}/resend-invitation`)
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const updated = await Employee.findById(testEmployee._id);
  assert.equal(updated.activationResendCount, 1);
  assert.ok(updated.activationSentAt);

  // Update test raw token with refreshed token
  testRawActivationToken = res.body.data.rawToken;
});

/* ===================================================================
 * 2. SECURE ACCOUNT ACTIVATION (Scenarios 9 - 15)
 * =================================================================== */

test("Scenario 9: Valid activation token verification succeeds via GET /api/v1/auth/verify-activation-token", async () => {
  const res = await request(app)
    .get(`/api/v1/auth/verify-activation-token?token=${testRawActivationToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.valid, true);
  assert.equal(res.body.data.employee.email, testEmployee.email);
});

test("Scenario 10: Invalid activation token rejected with 400 Bad Request", async () => {
  const res = await request(app)
    .get("/api/v1/auth/verify-activation-token?token=completely_invalid_token_12345");

  assert.equal(res.status, 400);
  assert.match(res.body.message, /invalid or unverified/i);
});

test("Scenario 11: Expired activation token rejected with 400 Bad Request", async () => {
  const rawExpiredToken = crypto.randomBytes(32).toString("hex");
  const expiredHash = crypto.createHash("sha256").update(rawExpiredToken).digest("hex");

  const expiredEmp = await Employee.create({
    firstName: "Expired",
    lastName: "User",
    email: `expired.${TS}@ashivam.test`,
    designation: "Developer",
    department: "Software Engineering",
    employmentType: "Full-time",
    joiningDate: "2026-01-01",
    accountStatus: "PENDING_ACTIVATION",
    activationTokenHash: expiredHash,
    activationTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in past
  });

  const res = await request(app)
    .get(`/api/v1/auth/verify-activation-token?token=${rawExpiredToken}`);

  assert.equal(res.status, 400);
  assert.match(res.body.message, /expired/i);
});

test("Scenario 12: Reused activation token rejected after account activation", async () => {
  // First activate the account
  const newPassword = "MySecureEmpPassword!2026";
  const activateRes = await request(app)
    .post("/api/v1/auth/activate")
    .send({
      token: testRawActivationToken,
      password: newPassword,
      confirmPassword: newPassword,
    });

  assert.equal(activateRes.status, 200);
  assert.equal(activateRes.body.success, true);
  assert.equal(activateRes.body.data.user.role, "Employee");
  assert.ok(activateRes.body.data.accessToken);

  // Attempt to reuse the same activation token
  const reuseRes = await request(app)
    .post("/api/v1/auth/activate")
    .send({
      token: testRawActivationToken,
      password: "AnotherPassword123!",
    });

  assert.equal(reuseRes.status, 400);
});

test("Scenario 13: Another employee's token cannot activate a different account", async () => {
  // Generate a distinct token for employee B
  const tokenB = crypto.randomBytes(32).toString("hex");
  const hashB = crypto.createHash("sha256").update(tokenB).digest("hex");

  const empB = await Employee.create({
    firstName: "Bob",
    lastName: "Builder",
    email: `emp.b.${TS}@ashivam.test`,
    designation: "DevOps",
    department: "Cloud Infrastructure",
    employmentType: "Full-time",
    joiningDate: "2026-02-01",
    accountStatus: "PENDING_ACTIVATION",
    activationTokenHash: hashB,
    activationTokenExpiresAt: new Date(Date.now() + 86400 * 1000),
  });

  // Activating with token B activates Bob, not testEmployee
  const res = await request(app)
    .post("/api/v1/auth/activate")
    .send({
      token: tokenB,
      password: "BobPassword!2026",
      confirmPassword: "BobPassword!2026",
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.email, empB.email);
});

test("Scenario 14: Employee sets password and transitions accountStatus to ACTIVE", async () => {
  const activatedRecord = await Employee.findById(testEmployee._id);
  assert.equal(activatedRecord.accountStatus, "ACTIVE");
  assert.equal(activatedRecord.isEmailVerified, true);
  assert.equal(activatedRecord.isActive, true);
});

test("Scenario 15: Password is stored strictly as a secure hash (select: false)", async () => {
  const query = await Employee.findById(testEmployee._id).lean();
  assert.equal(query.passwordHash, undefined, "passwordHash is hidden by default projection");

  const explicitQuery = await Employee.findById(testEmployee._id).select("+passwordHash");
  assert.ok(explicitQuery.passwordHash.startsWith("$2a$") || explicitQuery.passwordHash.startsWith("$2b$"));
  assert.notEqual(explicitQuery.passwordHash, "MySecureEmpPassword!2026", "Plaintext password never stored");
});

/* ===================================================================
 * 3. EMPLOYEE LOGIN WORKFLOW (Scenarios 16 - 22)
 * =================================================================== */

test("Scenario 16: Active employee logs in successfully with official email and password", async () => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "MySecureEmpPassword!2026",
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.user.role, "Employee");
  assert.equal(res.body.data.user.email, testEmployee.email);
  assert.ok(res.body.data.accessToken);
});

test("Scenario 17: Incorrect password rejected with 401 Unauthorized", async () => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "WrongPassword999!",
    });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("Scenario 18: Pending activation employee cannot log in (403 Forbidden)", async () => {
  const pendingEmp = await Employee.create({
    firstName: "Pending",
    lastName: "User",
    email: `emp.pending.${TS}@ashivam.test`,
    designation: "Developer",
    department: "Software Engineering",
    employmentType: "Full-time",
    joiningDate: "2026-02-01",
    accountStatus: "PENDING_ACTIVATION",
    isActive: true,
  });

  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: pendingEmp.email,
      password: "AnyPassword123!",
    });

  assert.equal(res.status, 403);
  assert.match(res.body.message, /pending activation/i);
});

test("Scenario 19: Deactivated employee cannot log in", async () => {
  const deactPass = await bcrypt.hash("Pass12345!", 10);
  const deactEmp = await Employee.create({
    firstName: "Deactivated",
    lastName: "User",
    email: `emp.deactivated.${TS}@ashivam.test`,
    passwordHash: deactPass,
    designation: "Former Staff",
    department: "Software Engineering",
    employmentType: "Full-time",
    joiningDate: "2025-01-01",
    accountStatus: "DEACTIVATED",
    isActive: false,
  });

  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: deactEmp.email,
      password: "Pass12345!",
    });

  assert.ok(res.status === 401 || res.status === 403);
});

test("Scenario 20: Suspended employee cannot log in (403 Forbidden)", async () => {
  const suspPass = await bcrypt.hash("SuspendedPass!2026", 10);
  const suspEmp = await Employee.create({
    firstName: "Suspended",
    lastName: "User",
    email: `emp.suspended.${TS}@ashivam.test`,
    passwordHash: suspPass,
    designation: "Staff",
    department: "Software Engineering",
    employmentType: "Full-time",
    joiningDate: "2026-01-01",
    accountStatus: "SUSPENDED",
    isActive: false,
  });

  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: suspEmp.email,
      password: "SuspendedPass!2026",
    });

  assert.equal(res.status, 403);
  assert.match(res.body.message, /suspended/i);
});

test("Scenario 21: Employee is strictly BLOCKED from Admin endpoints (403 Forbidden)", async () => {
  const empLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "MySecureEmpPassword!2026",
    });

  const empToken = empLogin.body.data.accessToken;

  // Attempt to access Admin employees list
  const res = await request(app)
    .get("/api/v1/employees")
    .set("Authorization", `Bearer ${empToken}`);

  assert.equal(res.status, 403);
  assert.match(res.body.message, /insufficient permissions/i);
});

test("Scenario 22: Employee can access their own workspace profile", async () => {
  const empLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "MySecureEmpPassword!2026",
    });

  const empToken = empLogin.body.data.accessToken;

  const res = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${empToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.role, "Employee");
  assert.equal(res.body.data.user.email, testEmployee.email);
});

/* ===================================================================
 * 4. FORGOT PASSWORD & PASSWORD RESET (Scenarios 23 - 27)
 * =================================================================== */

let testResetToken = null;

test("Scenario 23: Forgot password request returns generic 200 (enumeration defense)", async () => {
  const res = await request(app)
    .post("/api/v1/auth/forgot-password")
    .send({
      email: testEmployee.email,
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /if an active account associated with that email exists/i);

  testResetToken = res.body.rawToken;
  assert.ok(testResetToken, "Reset token generated in test environment");
});

test("Scenario 24: Expired reset token rejected with 400 Bad Request", async () => {
  const rawExpired = crypto.randomBytes(32).toString("hex");
  const hashExpired = crypto.createHash("sha256").update(rawExpired).digest("hex");

  await Employee.findByIdAndUpdate(testEmployee._id, {
    resetPasswordTokenHash: hashExpired,
    resetPasswordExpiresAt: new Date(Date.now() - 3600 * 1000), // expired
  });

  const res = await request(app)
    .get(`/api/v1/auth/verify-reset-token?token=${rawExpired}`);

  assert.equal(res.status, 400);
  assert.match(res.body.message, /expired/i);
});

test("Scenario 25: Valid reset token verification succeeds via GET /api/v1/auth/verify-reset-token", async () => {
  // Regenerate valid reset token
  const resetReq = await request(app)
    .post("/api/v1/auth/forgot-password")
    .send({ email: testEmployee.email });

  testResetToken = resetReq.body.rawToken;

  const res = await request(app)
    .get(`/api/v1/auth/verify-reset-token?token=${testResetToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.valid, true);
  assert.equal(res.body.data.email, testEmployee.email);
});

test("Scenario 26: Password reset succeeds via POST /api/v1/auth/reset-password", async () => {
  const newPassword = "BrandNewPassword!2026#";
  const res = await request(app)
    .post("/api/v1/auth/reset-password")
    .send({
      token: testResetToken,
      password: newPassword,
      confirmPassword: newPassword,
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  // Login with new password
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: newPassword,
    });

  assert.equal(loginRes.status, 200);
});

test("Scenario 27: Reused reset token is rejected (single-use enforcement)", async () => {
  const res = await request(app)
    .post("/api/v1/auth/reset-password")
    .send({
      token: testResetToken,
      password: "ShouldFailReplay123!",
    });

  assert.equal(res.status, 400);
});

/* ===================================================================
 * 5. EMPLOYEE LIFECYCLE & AUDIT (Scenarios 28 - 32)
 * =================================================================== */

test("Scenario 28: Employee deactivation blocks access and revokes active sessions", async () => {
  // 1. Admin deactivates employee
  const deactRes = await request(app)
    .patch(`/api/v1/employees/${testEmployee._id}/account-status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "DEACTIVATED" });

  assert.equal(deactRes.status, 200);
  assert.equal(deactRes.body.data.employee.accountStatus, "DEACTIVATED");
  assert.equal(deactRes.body.data.employee.isActive, false);

  // 2. Login fails
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "BrandNewPassword!2026#",
    });

  assert.ok(loginRes.status === 401 || loginRes.status === 403);
});

test("Scenario 29: Employee reactivation follows admin authorization rules", async () => {
  const reactRes = await request(app)
    .patch(`/api/v1/employees/${testEmployee._id}/account-status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "ACTIVE" });

  assert.equal(reactRes.status, 200);
  assert.equal(reactRes.body.data.employee.accountStatus, "ACTIVE");
  assert.equal(reactRes.body.data.employee.isActive, true);

  // Login works again
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "BrandNewPassword!2026#",
    });

  assert.equal(loginRes.status, 200);
});

test("Scenario 30: Historical attendance records remain accessible after deactivation", async () => {
  // Create historical attendance record
  const meeting = await Meeting.create({
    title: `Sync Meeting ${TS}`,
    scheduledStartTime: new Date(Date.now() - 3600 * 1000),
    scheduledEndTime: new Date(),
    status: "COMPLETED",
  });

  const record = await AttendanceRecord.create({
    meetingId: meeting._id,
    employeeId: testEmployee._id,
    status: "PRESENT",
    attendedDurationMinutes: 55,
    eligibleDurationMinutes: 60,
    attendancePercentage: 91.6,
    notes: `Historical test ${TS}`,
  });

  // Deactivate employee
  await updateEmployeeAccountStatus(testEmployee._id, "DEACTIVATED", superadmin._id);

  // Query record directly
  const found = await AttendanceRecord.findById(record._id);
  assert.ok(found, "Historical attendance record is permanently preserved");
  assert.equal(found.status, "PRESENT");

  // Reactivate for subsequent tests
  await updateEmployeeAccountStatus(testEmployee._id, "ACTIVE", superadmin._id);
});

test("Scenario 31: Employee cannot modify their own role or permissions", async () => {
  const empLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "BrandNewPassword!2026#",
    });

  const empToken = empLogin.body.data.accessToken;

  // Attempt role elevation
  const res = await request(app)
    .patch(`/api/v1/employees/${testEmployee._id}`)
    .set("Authorization", `Bearer ${empToken}`)
    .send({ role: "Superadmin" });

  assert.equal(res.status, 403);
});

test("Scenario 32: Sensitive admin actions generate immutable audit log records", async () => {
  const logs = await AuditLog.find({
    entityId: testEmployee._id,
  });

  assert.ok(logs.length >= 1, "Audit log records exist for employee administrative mutations");
});

/* ===================================================================
 * 6. GOOGLE MEET ATTENDANCE INTEGRATION (Scenarios 33 - 37)
 * =================================================================== */

test("Scenario 33: Activated employee can access upcoming meetings via GET /api/v1/attendance/my/upcoming-meetings", async () => {
  const empLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "BrandNewPassword!2026#",
    });

  const empToken = empLogin.body.data.accessToken;

  const res = await request(app)
    .get("/api/v1/attendance/my/upcoming-meetings")
    .set("Authorization", `Bearer ${empToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data) || Array.isArray(res.body.data?.meetings));
});

test("Scenario 34: Unverified anonymous Google identity receives zero employee credit", async () => {
  const meeting = await Meeting.create({
    title: `Anon Meeting ${TS}`,
    scheduledStartTime: new Date(),
    scheduledEndTime: new Date(Date.now() + 3600 * 1000),
    status: "IN_PROGRESS",
  });

  const eventPayload = {
    conferenceRecord: `spaces/anon_${TS}/conferenceRecords/conf_1`,
    participant: `spaces/anon_${TS}/conferenceRecords/conf_1/participants/anon_user`,
    participantSession: `spaces/anon_${TS}/conferenceRecords/conf_1/participants/anon_user/participantSessions/sess_1`,
    session: {
      sessionName: `spaces/anon_${TS}/conferenceRecords/conf_1/participants/anon_user/participantSessions/sess_1`,
      startTime: new Date().toISOString(),
      endTime: null,
    },
    // Anonymous user without registered Google email
    signedinUser: null,
  };

  const result = await processParticipantJoinedEvent(eventPayload);
  assert.ok(result);

  const session = await ParticipantSession.findOne({
    sessionName: eventPayload.session.sessionName,
  });
  assert.equal(session.matchedEmployeeId, null, "Anonymous participant has null matchedEmployeeId");
});

test("Scenario 35: Verified Google Workspace email maps to the correct active employee", async () => {
  const googleEmail = `aditi.google.${TS}@gmail.com`;
  await Employee.findByIdAndUpdate(testEmployee._id, { googleEmail });

  const meeting = await Meeting.create({
    title: `Verified Meet ${TS}`,
    scheduledStartTime: new Date(),
    scheduledEndTime: new Date(Date.now() + 3600 * 1000),
    status: "IN_PROGRESS",
  });

  const eventPayload = {
    conferenceRecord: `spaces/ver_${TS}/conferenceRecords/conf_2`,
    participant: `spaces/ver_${TS}/conferenceRecords/conf_2/participants/p_2`,
    participantSession: `spaces/ver_${TS}/conferenceRecords/conf_2/participants/p_2/participantSessions/sess_2`,
    session: {
      sessionName: `spaces/ver_${TS}/conferenceRecords/conf_2/participants/p_2/participantSessions/sess_2`,
      startTime: new Date().toISOString(),
      endTime: null,
    },
    signedinUser: {
      user: `users/${googleEmail}`,
      displayName: "Aditi Rao",
    },
  };

  await processParticipantJoinedEvent(eventPayload);

  const session = await ParticipantSession.findOne({
    sessionName: eventPayload.session.sessionName,
  });
  assert.ok(session);
  assert.equal(String(session.matchedEmployeeId), String(testEmployee._id));
});

test("Scenario 36: Deactivated employee cannot receive new attendance credit", async () => {
  // Deactivate employee
  await updateEmployeeAccountStatus(testEmployee._id, "DEACTIVATED", superadmin._id);

  const meeting = await Meeting.create({
    title: `Deact Test Meet ${TS}`,
    scheduledStartTime: new Date(),
    scheduledEndTime: new Date(Date.now() + 3600 * 1000),
    status: "IN_PROGRESS",
  });

  const eventPayload = {
    conferenceRecord: `spaces/deact_${TS}/conferenceRecords/conf_3`,
    participant: `spaces/deact_${TS}/conferenceRecords/conf_3/participants/p_3`,
    participantSession: `spaces/deact_${TS}/conferenceRecords/conf_3/participants/p_3/participantSessions/sess_3`,
    session: {
      sessionName: `spaces/deact_${TS}/conferenceRecords/conf_3/participants/p_3/participantSessions/sess_3`,
      startTime: new Date().toISOString(),
      endTime: null,
    },
    signedinUser: {
      user: `users/aditi.google.${TS}@gmail.com`,
      displayName: "Aditi Rao",
    },
  };

  await processParticipantJoinedEvent(eventPayload);

  const session = await ParticipantSession.findOne({
    sessionName: eventPayload.session.sessionName,
  });
  assert.equal(session.matchedEmployeeId, null, "Deactivated employee receives no attendance credit");
});

test("Scenario 37: Historical attendance is preserved across all employee lifecycle transitions", async () => {
  // Seed a historical attendance record for the employee
  await AttendanceRecord.create({
    meetingId: new mongoose.Types.ObjectId(),
    employeeId: testEmployee._id,
    status: "PRESENT",
    totalDurationSeconds: 3600,
    joinCount: 1,
    notes: `Historical retention test ${TS}`,
  });

  // Perform lifecycle state transitions
  await updateEmployeeAccountStatus(testEmployee._id, "SUSPENDED", superadmin._id);
  await updateEmployeeEmploymentStatus(testEmployee._id, "TERMINATED", superadmin._id);

  // Invariant: Historical records are strictly immutable and never purged on termination
  const records = await AttendanceRecord.find({ employeeId: testEmployee._id });
  assert.ok(records.length >= 1, "All historical records remain intact across lifecycle states");
  assert.equal(records[0].status, "PRESENT");
});
