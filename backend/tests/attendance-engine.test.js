import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeTimeIntervals,
  calculateTotalDurationMinutes,
  evaluateAttendanceStatus,
} from "../src/modules/attendance/services/attendanceEngine.service.js";

test("Attendance Engine: mergeTimeIntervals correctly merges overlapping intervals", () => {
  const base = new Date("2026-11-19T14:30:00Z").getTime();

  // Three intervals: 0-15m, 10-25m (overlaps), 30-40m (disjoint)
  const intervals = [
    { start: new Date(base), end: new Date(base + 15 * 60 * 1000) },
    { start: new Date(base + 10 * 60 * 1000), end: new Date(base + 25 * 60 * 1000) },
    { start: new Date(base + 30 * 60 * 1000), end: new Date(base + 40 * 60 * 1000) },
  ];

  const merged = mergeTimeIntervals(intervals);

  assert.equal(merged.length, 2, "Should merge overlapping intervals into exactly 2 disjoint intervals");
  assert.equal(merged[0].start, base);
  assert.equal(merged[0].end, base + 25 * 60 * 1000);
  assert.equal(merged[1].start, base + 30 * 60 * 1000);
  assert.equal(merged[1].end, base + 40 * 60 * 1000);
});

test("Attendance Engine: calculateTotalDurationMinutes sums disjoint intervals accurately", () => {
  const base = new Date("2026-11-19T14:30:00Z").getTime();

  const intervals = [
    { start: new Date(base), end: new Date(base + 15 * 60 * 1000) }, // 15 mins
    { start: new Date(base + 20 * 60 * 1000), end: new Date(base + 40 * 60 * 1000) }, // 20 mins
  ];

  const duration = calculateTotalDurationMinutes(intervals);
  assert.equal(duration, 35, "Total duration should be 15 + 20 = 35 minutes");
});

test("Attendance Engine: evaluateAttendanceStatus marks PRESENT when within grace period and met threshold", () => {
  const scheduledStart = new Date("2026-11-19T14:30:00Z");
  const scheduledEnd = new Date("2026-11-19T15:15:00Z"); // 45 min meeting

  const meeting = { scheduledStartTime: scheduledStart, scheduledEndTime: scheduledEnd };
  const policy = { gracePeriodMinutes: 5, minimumAttendanceMinutes: 30, minimumAttendancePercentage: 60 };

  // Employee joins 3 mins after start (within 5m grace), stays for 38 mins
  const sessions = [
    {
      startTime: new Date(scheduledStart.getTime() + 3 * 60 * 1000),
      endTime: new Date(scheduledStart.getTime() + 41 * 60 * 1000),
    },
  ];

  const result = evaluateAttendanceStatus({
    sessions,
    meeting,
    policy,
    isMeetingConcluded: true,
  });

  assert.equal(result.status, "PRESENT");
  assert.equal(result.isProvisional, false);
  assert.equal(result.lateArrivalMinutes, 0);
  assert.ok(result.totalConnectedDurationMinutes >= 35);
});

test("Attendance Engine: evaluateAttendanceStatus marks LATE when joining after grace period", () => {
  const scheduledStart = new Date("2026-11-19T14:30:00Z");
  const scheduledEnd = new Date("2026-11-19T15:15:00Z");

  const meeting = { scheduledStartTime: scheduledStart, scheduledEndTime: scheduledEnd };
  const policy = { gracePeriodMinutes: 5, minimumAttendanceMinutes: 30, minimumAttendancePercentage: 60 };

  // Employee joins 12 mins late, stays until the end (33 mins total >= 30 mins)
  const sessions = [
    {
      startTime: new Date(scheduledStart.getTime() + 12 * 60 * 1000),
      endTime: scheduledEnd,
    },
  ];

  const result = evaluateAttendanceStatus({
    sessions,
    meeting,
    policy,
    isMeetingConcluded: true,
  });

  assert.equal(result.status, "LATE");
  assert.equal(result.lateArrivalMinutes, 12);
  assert.equal(result.totalConnectedDurationMinutes, 33);
});

test("Attendance Engine: evaluateAttendanceStatus marks SHORT_ATTENDANCE when duration < minimum", () => {
  const scheduledStart = new Date("2026-11-19T14:30:00Z");
  const scheduledEnd = new Date("2026-11-19T15:15:00Z");

  const meeting = { scheduledStartTime: scheduledStart, scheduledEndTime: scheduledEnd };
  const policy = { gracePeriodMinutes: 5, minimumAttendanceMinutes: 30, minimumAttendancePercentage: 60 };

  // Employee joins on time but leaves after 15 mins (< 30 min threshold)
  const sessions = [
    {
      startTime: scheduledStart,
      endTime: new Date(scheduledStart.getTime() + 15 * 60 * 1000),
    },
  ];

  const result = evaluateAttendanceStatus({
    sessions,
    meeting,
    policy,
    isMeetingConcluded: true,
  });

  assert.equal(result.status, "SHORT_ATTENDANCE");
  assert.equal(result.totalConnectedDurationMinutes, 15);
});

test("Attendance Engine: evaluateAttendanceStatus marks PENDING_VERIFICATION while meeting is in progress", () => {
  const scheduledStart = new Date("2026-11-19T14:30:00Z");
  const scheduledEnd = new Date("2026-11-19T15:15:00Z");

  const meeting = { scheduledStartTime: scheduledStart, scheduledEndTime: scheduledEnd };
  const policy = { gracePeriodMinutes: 5, minimumAttendanceMinutes: 30 };

  // No sessions recorded yet, but meeting is still active
  const result = evaluateAttendanceStatus({
    sessions: [],
    meeting,
    policy,
    isMeetingConcluded: false,
  });

  assert.equal(result.status, "PENDING_VERIFICATION");
  assert.equal(result.isProvisional, true);
});

test("Attendance Engine: evaluateAttendanceStatus marks ABSENT only after meeting conclusion", () => {
  const scheduledStart = new Date("2026-11-19T14:30:00Z");
  const scheduledEnd = new Date("2026-11-19T15:15:00Z");

  const meeting = { scheduledStartTime: scheduledStart, scheduledEndTime: scheduledEnd };
  const policy = { gracePeriodMinutes: 5, minimumAttendanceMinutes: 30 };

  // Meeting concluded and employee never joined
  const result = evaluateAttendanceStatus({
    sessions: [],
    meeting,
    policy,
    isMeetingConcluded: true,
  });

  assert.equal(result.status, "ABSENT");
  assert.equal(result.isProvisional, false);
});

test("Attendance Engine: Handles multiple reconnections without duplicating attendance", () => {
  const scheduledStart = new Date("2026-11-19T14:30:00Z");
  const scheduledEnd = new Date("2026-11-19T15:15:00Z");

  const meeting = { scheduledStartTime: scheduledStart, scheduledEndTime: scheduledEnd };
  const policy = { gracePeriodMinutes: 5, minimumAttendanceMinutes: 30 };

  // Employee drops out and rejoins 3 times
  const sessions = [
    {
      startTime: new Date(scheduledStart.getTime() + 1 * 60 * 1000), // joined at 1m
      endTime: new Date(scheduledStart.getTime() + 15 * 60 * 1000),  // dropped at 15m (14m)
    },
    {
      startTime: new Date(scheduledStart.getTime() + 18 * 60 * 1000), // rejoined at 18m
      endTime: new Date(scheduledStart.getTime() + 30 * 60 * 1000),  // dropped at 30m (12m)
    },
    {
      startTime: new Date(scheduledStart.getTime() + 32 * 60 * 1000), // rejoined at 32m
      endTime: new Date(scheduledStart.getTime() + 42 * 60 * 1000),  // left at 42m (10m)
    },
  ];

  const result = evaluateAttendanceStatus({
    sessions,
    meeting,
    policy,
    isMeetingConcluded: true,
  });

  assert.equal(result.status, "PRESENT", "Total 14 + 12 + 10 = 36 mins >= 30 mins threshold -> PRESENT");
  assert.equal(result.reconnectionCount, 2, "3 sessions means 2 reconnections");
  assert.equal(result.totalConnectedDurationMinutes, 36);
});
