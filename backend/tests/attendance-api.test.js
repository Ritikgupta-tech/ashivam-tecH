import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import Employee from "../src/modules/employee/employee.model.js";
import Meeting from "../src/modules/attendance/models/meeting.model.js";
import AttendanceRecord from "../src/modules/attendance/models/attendanceRecord.model.js";
import AttendanceCorrectionRequest from "../src/modules/attendance/models/attendanceCorrectionRequest.model.js";
import GoogleEventInbox from "../src/modules/attendance/models/googleEventInbox.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";

const TIMESTAMP = Date.now();
let testSuperadmin = null;
let testAdminToken = null;
let testEmployee = null;
let testEmployeeToken = null;
let testMeeting = null;
let testRecord = null;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }

  // 1. Create Test Superadmin
  const adminPassHash = await bcrypt.hash("AdminSecurePassword!2026", 10);
  testSuperadmin = await Admin.create({
    username: `super_att_${TIMESTAMP}`,
    name: "Superadmin Attendance Tester",
    email: `super.att.${TIMESTAMP}@ashivam.test`,
    passwordHash: adminPassHash,
    role: "Superadmin",
    permissions: ["dashboard", "employees", "settings"],
    isActive: true,
  });
  testAdminToken = generateAccessToken(testSuperadmin);

  // 2. Create Test Employee with password
  const empPassHash = await bcrypt.hash("EmpSecurePassword!2026", 10);
  testEmployee = await Employee.create({
    firstName: "Rohan",
    lastName: "Verma",
    email: `rohan.${TIMESTAMP}@ashivam.test`,
    employeeId: `ASH-EMP-${TIMESTAMP.toString().slice(-4)}`,
    googleEmail: `rohan.google.${TIMESTAMP}@gmail.com`,
    passwordHash: empPassHash,
    role: "Employee",
    designation: "Senior Frontend Engineer",
    department: "Engineering",
    employmentType: "Full-time",
    joiningDate: new Date(),
    workLocation: "Office",
    isActive: true,
  });
  testEmployeeToken = generateAccessToken(testEmployee);

  // 3. Create Scheduled Meeting
  testMeeting = await Meeting.create({
    title: `Daily Standup ${TIMESTAMP}`,
    meetingType: "Daily Standup",
    scheduledStartTime: new Date(Date.now() + 10 * 60 * 1000),
    scheduledEndTime: new Date(Date.now() + 55 * 60 * 1000),
    googleMeetingSpaceName: `spaces/TEST_${TIMESTAMP}`,
    googleMeetingUri: "https://meet.google.com/test-meet-code",
    assignedEmployees: [testEmployee._id],
    status: "SCHEDULED",
    createdBy: testSuperadmin._id,
  });

  // 4. Create Initial Attendance Record for dispute testing
  testRecord = await AttendanceRecord.create({
    meetingId: testMeeting._id,
    employeeId: testEmployee._id,
    status: "LATE",
    isProvisional: false,
    lateArrivalMinutes: 8,
    totalConnectedDurationMinutes: 37,
    verifiedVia: "MEET_REST_API",
  });
});

after(async () => {
  if (testSuperadmin) await Admin.deleteOne({ _id: testSuperadmin._id });
  if (testEmployee) await Employee.deleteOne({ _id: testEmployee._id });
  if (testMeeting) await Meeting.deleteOne({ _id: testMeeting._id });
  if (testRecord) await AttendanceRecord.deleteMany({ meetingId: testMeeting?._id });
  await AttendanceCorrectionRequest.deleteMany({ employeeId: testEmployee?._id });
  await GoogleEventInbox.deleteMany({ messageId: new RegExp(String(TIMESTAMP)) });
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("Attendance API: Unified Employee Authentication via POST /api/v1/auth/login", async () => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testEmployee.email,
      password: "EmpSecurePassword!2026",
    });

  assert.equal(res.statusCode, 200, "Employee login should succeed with 200");
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.user.role, "Employee", "Returned user role should be Employee");
  assert.equal(res.body.data.user.employeeId, testEmployee.employeeId);
  assert.ok(res.body.data.accessToken, "Should return valid access token");
});

test("Attendance API: Employee accesses GET /api/v1/attendance/my", async () => {
  const res = await request(app)
    .get("/api/v1/attendance/my")
    .set("Authorization", `Bearer ${testEmployeeToken}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.records));
});

test("Attendance API: Employee is strictly BLOCKED from Admin Attendance Dashboard (RBAC isolation)", async () => {
  const res = await request(app)
    .get("/api/v1/attendance/admin/dashboard")
    .set("Authorization", `Bearer ${testEmployeeToken}`);

  assert.equal(res.statusCode, 403, "Employee must be rejected with 403 Forbidden from admin endpoints");
  assert.equal(res.body.success, false);
});

test("Attendance API: Admin accesses GET /api/v1/attendance/admin/dashboard", async () => {
  const res = await request(app)
    .get("/api/v1/attendance/admin/dashboard")
    .set("Authorization", `Bearer ${testAdminToken}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.totalEmployees >= 1);
});

test("Attendance API: Admin schedules new meeting via POST /api/v1/attendance/admin/meetings", async () => {
  const res = await request(app)
    .post("/api/v1/attendance/admin/meetings")
    .set("Authorization", `Bearer ${testAdminToken}`)
    .send({
      title: "Sprint Retrospective",
      meetingType: "Department Meeting",
      scheduledStartTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      scheduledEndTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      assignedDepartments: ["Engineering"],
    });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.title, "Sprint Retrospective");

  // Cleanup created meeting
  await Meeting.deleteOne({ _id: res.body.data._id });
});

test("Attendance API: Employee submits correction dispute via POST /api/v1/attendance/corrections", async () => {
  const res = await request(app)
    .post("/api/v1/attendance/corrections")
    .set("Authorization", `Bearer ${testEmployeeToken}`)
    .send({
      attendanceRecordId: testRecord._id.toString(),
      reason: "Joined at 8:01 PM but laptop battery died; reconnected promptly at 8:04 PM.",
      requestedStatus: "PRESENT",
    });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, "PENDING");
  assert.equal(res.body.data.requestedStatus, "PRESENT");
});

test("Attendance API: Admin reviews and approves dispute via PATCH /api/v1/attendance/admin/corrections/:id", async () => {
  const pending = await AttendanceCorrectionRequest.findOne({ employeeId: testEmployee._id, status: "PENDING" });
  assert.ok(pending, "Should locate pending dispute request");

  const res = await request(app)
    .patch(`/api/v1/attendance/admin/corrections/${pending._id}`)
    .set("Authorization", `Bearer ${testAdminToken}`)
    .send({
      action: "APPROVE",
      reviewNotes: "Verified with engineering manager",
    });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, "APPROVED");

  // Verify attendance record was updated
  const updatedRecord = await AttendanceRecord.findById(testRecord._id);
  assert.equal(updatedRecord.status, "PRESENT", "Attendance record status should now be updated to PRESENT");
  assert.equal(updatedRecord.correctionStatus, "RESOLVED_APPROVED");
});

test("Attendance API: Pub/Sub Webhook processes participant event idempotently", async () => {
  const pubsubMessageId = `msg_test_${TIMESTAMP}`;
  const cloudEventPayload = {
    type: "google.workspace.meet.participantSession.v2.started",
    data: {
      name: `${testMeeting.googleMeetingSpaceName}/participants/p123/participantSessions/s456`,
      space: testMeeting.googleMeetingSpaceName,
      signedinUser: {
        user: `users/${testEmployee.googleEmail}`,
        displayName: "Rohan Verma",
      },
      startTime: new Date().toISOString(),
    },
  };

  const base64Data = Buffer.from(JSON.stringify(cloudEventPayload)).toString("base64");

  // 1. Initial Webhook delivery
  const res1 = await request(app)
    .post("/api/v1/google/events/pubsub")
    .send({
      message: {
        messageId: pubsubMessageId,
        data: base64Data,
        publishTime: new Date().toISOString(),
      },
    });

  assert.equal(res1.statusCode, 200);
  assert.equal(res1.body.status, "PROCESSED");

  // 2. Duplicate delivery (Pub/Sub at-least-once replay)
  const res2 = await request(app)
    .post("/api/v1/google/events/pubsub")
    .send({
      message: {
        messageId: pubsubMessageId,
        data: base64Data,
        publishTime: new Date().toISOString(),
      },
    });

  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.status, "ALREADY_PROCESSED", "Duplicate message must return ALREADY_PROCESSED without double processing");
});

test("Attendance API: Admin exports attendance report CSV via GET /api/v1/attendance/admin/export", async () => {
  const res = await request(app)
    .get("/api/v1/attendance/admin/export?format=csv")
    .set("Authorization", `Bearer ${testAdminToken}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"], "text/csv; charset=utf-8");
  assert.ok(res.text.includes("Employee ID"), "CSV must contain header 'Employee ID'");
  assert.ok(res.text.includes("Meeting Title"), "CSV must contain header 'Meeting Title'");
});
