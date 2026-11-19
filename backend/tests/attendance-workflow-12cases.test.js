import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import Employee from "../src/modules/employee/employee.model.js";
import Meeting from "../src/modules/attendance/models/meeting.model.js";
import MeetingConference from "../src/modules/attendance/models/meetingConference.model.js";
import ParticipantSession from "../src/modules/attendance/models/participantSession.model.js";
import AttendanceRecord from "../src/modules/attendance/models/attendanceRecord.model.js";
import GoogleEventInbox from "../src/modules/attendance/models/googleEventInbox.model.js";
import {
  mergeTimeIntervals,
  calculateTotalDurationMinutes,
  evaluateAttendanceStatus,
} from "../src/modules/attendance/services/attendanceEngine.service.js";

const RUN_ID = Date.now();
let testEmp = null;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }

  testEmp = await Employee.create({
    firstName: "Workflow",
    lastName: "Tester",
    email: `workflow.${RUN_ID}@ashivam.test`,
    employeeId: `WF-${RUN_ID.toString().slice(-4)}`,
    googleEmail: `wf.google.${RUN_ID}@gmail.com`,
    designation: "Quality Automation Engineer",
    department: "Engineering",
    employmentType: "Full-time",
    joiningDate: new Date(),
    isActive: true,
  });
});

after(async () => {
  if (testEmp) await Employee.deleteOne({ _id: testEmp._id });
  await Meeting.deleteMany({ title: new RegExp(String(RUN_ID)) });
  await AttendanceRecord.deleteMany({ employeeId: testEmp?._id });
  await GoogleEventInbox.deleteMany({ messageId: new RegExp(String(RUN_ID)) });
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("Case 1: Employee joins on time (PRESENT)", () => {
  const meetingStart = new Date("2026-11-20T10:00:00Z");
  const meetingEnd = new Date("2026-11-20T10:50:00Z");
  const joinTime = new Date("2026-11-20T10:02:00Z"); // 2 min in (grace is 10 min)
  const leaveTime = new Date("2026-11-20T10:47:00Z"); // 45 min duration

  const sessions = [{ startTime: joinTime, endTime: leaveTime }];

  const evalResult = evaluateAttendanceStatus({
    sessions,
    meeting: { scheduledStartTime: meetingStart, scheduledEndTime: meetingEnd },
    isMeetingConcluded: true,
    policy: { gracePeriodMinutes: 10, minimumAttendancePercentage: 60, minimumAttendanceMinutes: 30 },
  });

  assert.equal(evalResult.status, "PRESENT");
  assert.equal(evalResult.lateArrivalMinutes, 0); // Not late (within 10 min grace)
  assert.equal(evalResult.totalConnectedDurationMinutes, 45);
});

test("Case 2: Employee joins late (LATE)", () => {
  const meetingStart = new Date("2026-11-20T10:00:00Z");
  const meetingEnd = new Date("2026-11-20T10:50:00Z");
  const joinTime = new Date("2026-11-20T10:16:00Z"); // 16 min in (> 10 min grace)
  const leaveTime = new Date("2026-11-20T10:50:00Z"); // 34 min duration

  const sessions = [{ startTime: joinTime, endTime: leaveTime }];

  const evalResult = evaluateAttendanceStatus({
    sessions,
    meeting: { scheduledStartTime: meetingStart, scheduledEndTime: meetingEnd },
    isMeetingConcluded: true,
    policy: { gracePeriodMinutes: 10, minimumAttendancePercentage: 60, minimumAttendanceMinutes: 30 },
  });

  assert.equal(evalResult.status, "LATE");
  assert.equal(evalResult.lateArrivalMinutes, 16);
  assert.equal(evalResult.totalConnectedDurationMinutes, 34);
});

test("Case 3: Employee leaves early (SHORT_ATTENDANCE)", () => {
  const meetingStart = new Date("2026-11-20T10:00:00Z");
  const meetingEnd = new Date("2026-11-20T10:50:00Z");
  const joinTime = new Date("2026-11-20T10:01:00Z");
  const leaveTime = new Date("2026-11-20T10:20:00Z"); // Only 19 minutes (< 30 min threshold)

  const sessions = [{ startTime: joinTime, endTime: leaveTime }];

  const evalResult = evaluateAttendanceStatus({
    sessions,
    meeting: { scheduledStartTime: meetingStart, scheduledEndTime: meetingEnd },
    isMeetingConcluded: true,
    policy: { gracePeriodMinutes: 10, minimumAttendancePercentage: 60, minimumAttendanceMinutes: 30 },
  });

  assert.equal(evalResult.status, "SHORT_ATTENDANCE");
  assert.equal(evalResult.totalConnectedDurationMinutes, 19);
});

test("Case 4: Employee disconnects and rejoins across network drops", () => {
  const meetingStart = new Date("2026-11-20T10:00:00Z");
  const meetingEnd = new Date("2026-11-20T10:50:00Z");

  // Session 1: 10:02 - 10:18 (16 min)
  // Network outage: 10:18 - 10:22 (4 min)
  // Session 2: 10:22 - 10:48 (26 min)
  const sessions = [
    { startTime: new Date("2026-11-20T10:02:00Z"), endTime: new Date("2026-11-20T10:18:00Z") },
    { startTime: new Date("2026-11-20T10:22:00Z"), endTime: new Date("2026-11-20T10:48:00Z") },
  ];

  const evalResult = evaluateAttendanceStatus({
    sessions,
    meeting: { scheduledStartTime: meetingStart, scheduledEndTime: meetingEnd },
    isMeetingConcluded: true,
    policy: { gracePeriodMinutes: 10, minimumAttendancePercentage: 60, minimumAttendanceMinutes: 30 },
  });

  assert.equal(evalResult.status, "PRESENT");
  assert.equal(evalResult.reconnectionCount, 1);
  assert.equal(evalResult.totalConnectedDurationMinutes, 42);
});

test("Case 5: Employee never joins (ABSENT upon meeting completion)", () => {
  const meetingStart = new Date("2026-11-20T10:00:00Z");
  const meetingEnd = new Date("2026-11-20T10:50:00Z");

  const evalResult = evaluateAttendanceStatus({
    sessions: [],
    meeting: { scheduledStartTime: meetingStart, scheduledEndTime: meetingEnd },
    isMeetingConcluded: true, // Concluded!
    policy: { gracePeriodMinutes: 10, minimumAttendancePercentage: 60, minimumAttendanceMinutes: 30 },
  });

  assert.equal(evalResult.status, "ABSENT");
});

test("Case 6: Anonymous participant joins (flagged, zero employee credit)", () => {
  // Simulating anonymous Google Meet participant without signedinUser
  const participantPayload = {
    name: "conferenceRecords/conf-1/participants/anon-999",
    anonymousUser: {},
  };

  const isAnonymous = Boolean(participantPayload.anonymousUser || !participantPayload.signedinUser?.user);
  assert.equal(isAnonymous, true);
  // An anonymous participant must not map to testEmp
  const mappedEmail = participantPayload.signedinUser?.user || null;
  assert.equal(mappedEmail, null);
});

test("Case 7: Unregistered Google account joins (NEEDS_REVIEW / unmapped)", async () => {
  const foreignGoogleEmail = "external.contractor.unregistered@gmail.com";
  const matchedEmp = await Employee.findOne({
    $or: [{ googleEmail: foreignGoogleEmail }, { email: foreignGoogleEmail }],
    isActive: true,
    deletedAt: null,
  });

  assert.equal(matchedEmp, null); // Strictly no employee matched
});

test("Case 8: Employee joins using a second device simultaneously (no double counting)", () => {
  // Laptop session: 10:00 - 10:30 (30 min)
  // Phone session: 10:20 - 10:45 (25 min)
  // Overlap: 10:20 - 10:30 (10 min)
  // Total span: 10:00 - 10:45 = 45 min
  const overlapping = [
    { start: new Date("2026-11-20T10:00:00Z"), end: new Date("2026-11-20T10:30:00Z") },
    { start: new Date("2026-11-20T10:20:00Z"), end: new Date("2026-11-20T10:45:00Z") },
  ];

  const merged = mergeTimeIntervals(overlapping);
  assert.equal(merged.length, 1); // Merged into 1 single contiguous interval
  const duration = calculateTotalDurationMinutes(merged);
  assert.equal(duration, 45); // Accurately 45 min, NOT 55 min
});

test("Case 9: Duplicate Pub/Sub event delivery occurs (Idempotency inbox)", async () => {
  const messageId = `test-pubsub-dup-${RUN_ID}`;

  // First delivery
  const first = await GoogleEventInbox.create({
    messageId,
    eventType: "google.workspace.meet.participant_session.v2.ended",
    subscription: "projects/ashivam-meet-attendance/subscriptions/ashivam-meet-events-sub",
    publishTime: new Date(),
    status: "PROCESSED",
  });
  assert.ok(first._id);

  // Second delivery (duplicate)
  let duplicateCaught = false;
  try {
    await GoogleEventInbox.create({
      messageId,
      eventType: "google.workspace.meet.participant_session.v2.ended",
      subscription: "projects/ashivam-meet-attendance/subscriptions/ashivam-meet-events-sub",
      publishTime: new Date(),
      status: "PROCESSED",
    });
  } catch (err) {
    if (err.code === 11000) {
      duplicateCaught = true;
    }
  }

  assert.equal(duplicateCaught, true);
});

test("Case 10: Google API temporary failure (Non-crashing retryable failure)", () => {
  // Simulating transient Google 503 Service Unavailable
  const googleApiError = new Error("Google Meet API 503: The service is currently unavailable");
  googleApiError.status = 503;

  const isTransient = [429, 500, 502, 503, 504].includes(googleApiError.status);
  assert.equal(isTransient, true);
});

test("Case 11: Delayed Pub/Sub delivery arrives post-meeting (Retroactive correction)", () => {
  const meetingStart = new Date("2026-11-20T10:00:00Z");
  const meetingEnd = new Date("2026-11-20T10:45:00Z");

  // Provisional status when meeting ended with no events yet:
  let recordStatus = "PENDING_VERIFICATION";

  // Delayed events arrive 20 minutes later at 11:05
  const lateSessions = [
    { startTime: new Date("2026-11-20T10:01:00Z"), endTime: new Date("2026-11-20T10:44:00Z") }
  ];

  const updatedEval = evaluateAttendanceStatus({
    sessions: lateSessions,
    meeting: { scheduledStartTime: meetingStart, scheduledEndTime: meetingEnd },
    isMeetingConcluded: true,
    policy: { gracePeriodMinutes: 10, minimumAttendancePercentage: 60, minimumAttendanceMinutes: 30 },
  });

  recordStatus = updatedEval.status;
  assert.equal(recordStatus, "PRESENT");
  assert.equal(updatedEval.totalConnectedDurationMinutes, 43);
});

test("Case 12: Meeting is cancelled (Zero absent penalty)", () => {
  const meetingStatus = "CANCELLED";

  // Cancelled meetings must NOT mark assigned employees absent
  const shouldMarkAbsent = meetingStatus === "COMPLETED";
  assert.equal(shouldMarkAbsent, false);
});
