import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import AttendanceRecord from "../src/modules/attendance/models/attendanceRecord.model.js";
import GoogleEventInbox from "../src/modules/attendance/models/googleEventInbox.model.js";

const RUN_ID = Date.now();
const testMeetingId = new mongoose.Types.ObjectId();
const testEmployeeId = new mongoose.Types.ObjectId();

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }
});

after(async () => {
  await AttendanceRecord.deleteMany({ meetingId: testMeetingId });
  await GoogleEventInbox.deleteMany({ messageId: new RegExp(String(RUN_ID)) });
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("Concurrency Verification: 20 simultaneous attendance upserts yield exactly 1 consolidated record", async () => {
  const promises = [];

  for (let i = 0; i < 20; i++) {
    promises.push(
      AttendanceRecord.findOneAndUpdate(
        { meetingId: testMeetingId, employeeId: testEmployeeId },
        {
          $set: {
            totalConnectedDurationMinutes: 40 + (i % 5),
            status: "PRESENT",
            isProvisional: false,
            verifiedVia: "PUBSUB_EVENT",
          },
        },
        { upsert: true, returnDocument: "after" }
      )
    );
  }

  const results = await Promise.all(promises);
  assert.equal(results.length, 20);

  // Assert exactly 1 document exists in the collection for this meeting + employee
  const count = await AttendanceRecord.countDocuments({
    meetingId: testMeetingId,
    employeeId: testEmployeeId,
  });
  assert.equal(count, 1);
});

test("Concurrency Verification: 20 simultaneous duplicate Pub/Sub deliveries yield exactly 1 inbox record", async () => {
  const sharedMessageId = `concurrent-msg-${RUN_ID}`;
  let successCount = 0;
  let duplicateCount = 0;

  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(
      (async () => {
        try {
          await GoogleEventInbox.create({
            messageId: sharedMessageId,
            eventType: "google.workspace.meet.participant_session.v2.ended",
            subscription: "test-sub",
            publishTime: new Date(),
            status: "PROCESSED",
          });
          successCount++;
        } catch (err) {
          if (err.code === 11000) {
            duplicateCount++;
          } else {
            throw err;
          }
        }
      })()
    );
  }

  await Promise.all(promises);

  assert.equal(successCount, 1);
  assert.equal(duplicateCount, 19);

  const inboxCount = await GoogleEventInbox.countDocuments({ messageId: sharedMessageId });
  assert.equal(inboxCount, 1);
});
