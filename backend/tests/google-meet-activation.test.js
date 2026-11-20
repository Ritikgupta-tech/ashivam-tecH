import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import {
  generateOAuthAuthUrl,
  validateOAuthState,
  getIntegrationHealth,
  disconnectGoogleIntegration,
  createWorkspaceEventsSubscription,
  renewWorkspaceEventsSubscription,
  deleteWorkspaceEventsSubscription,
} from "../src/modules/attendance/services/googleMeet.service.js";
import {
  encryptSecret,
  decryptSecret,
} from "../src/modules/attendance/services/crypto.service.js";
import {
  extractGoogleEmail,
  ingestPubSubMessage,
  processParticipantJoinedEvent,
  handleParticipantLeftEvent,
  reconcileMeetingAttendance,
} from "../src/modules/attendance/services/reconciliation.service.js";
import GoogleIntegration from "../src/modules/attendance/models/googleIntegration.model.js";
import GoogleEventInbox from "../src/modules/attendance/models/googleEventInbox.model.js";
import Meeting from "../src/modules/attendance/models/meeting.model.js";
import MeetingConference from "../src/modules/attendance/models/meetingConference.model.js";
import ParticipantSession from "../src/modules/attendance/models/participantSession.model.js";
import AttendanceRecord from "../src/modules/attendance/models/attendanceRecord.model.js";
import AttendancePolicy from "../src/modules/attendance/models/attendancePolicy.model.js";
import ReconciliationJob from "../src/modules/attendance/models/reconciliationJob.model.js";
import Employee from "../src/modules/employee/employee.model.js";

const TEST_TIMESTAMP = Date.now();

before(async () => {
  if (mongoose.connection.readyState === 0) {
    const mongoUri = env.mongoUri || "mongodb://localhost:27017/ashivam_test";
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  }
});

after(async () => {
  // Clean test artifacts
  await AttendancePolicy.deleteMany({ name: new RegExp(TEST_TIMESTAMP) });
  await GoogleIntegration.deleteMany({ serviceName: `test_meet_${TEST_TIMESTAMP}` });
  await GoogleEventInbox.deleteMany({ messageId: new RegExp(`test_meet_act_${TEST_TIMESTAMP}`) });
  await Meeting.deleteMany({ title: new RegExp(`Meet Activation Test ${TEST_TIMESTAMP}`) });
  await Employee.deleteMany({ email: new RegExp(`meet_activation_${TEST_TIMESTAMP}`) });
  await mongoose.disconnect();
});

test("Regression 1 & 2: Missing or empty GOOGLE_CLIENT_ID throws 503 GOOGLE_OAUTH_NOT_CONFIGURED", () => {
  const origClientId = process.env.GOOGLE_CLIENT_ID;
  try {
    delete process.env.GOOGLE_CLIENT_ID;
    assert.throws(
      () => generateOAuthAuthUrl(),
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, "GOOGLE_OAUTH_NOT_CONFIGURED");
        assert.match(err.message, /GOOGLE_CLIENT_ID/);
        return true;
      }
    );

    process.env.GOOGLE_CLIENT_ID = "   ";
    assert.throws(
      () => generateOAuthAuthUrl(),
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, "GOOGLE_OAUTH_NOT_CONFIGURED");
        return true;
      }
    );
  } finally {
    if (origClientId !== undefined) {
      process.env.GOOGLE_CLIENT_ID = origClientId;
    }
  }
});

test("Regression 3, 4, 5, 6: Correct client_id, redirect_uri, required scopes, and valid state in generated authorization URL", () => {
  const origClientId = process.env.GOOGLE_CLIENT_ID;
  const origRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!process.env.GOOGLE_CLIENT_ID) {
    process.env.GOOGLE_CLIENT_ID = "950533040414-testmockclientid123456789.apps.googleusercontent.com";
  }
  if (!process.env.GOOGLE_REDIRECT_URI) {
    process.env.GOOGLE_REDIRECT_URI = "https://ashivam-tech.onrender.com/api/v1/google/oauth/callback";
  }
  try {
    const { url, state } = generateOAuthAuthUrl();

    assert.ok(url, "Authorization URL should be generated");
    assert.ok(state, "CSRF state should be generated");
    assert.equal(state.length, 48, "State must be 24-byte hex string (48 characters)");

    const parsedUrl = new URL(url);
    assert.equal(parsedUrl.hostname, "accounts.google.com");
    assert.equal(parsedUrl.searchParams.get("client_id"), env.googleClientId);
    assert.ok(parsedUrl.searchParams.get("client_id")?.length > 10, "client_id must be non-empty");
    assert.equal(parsedUrl.searchParams.get("redirect_uri"), env.googleRedirectUri);
    assert.equal(parsedUrl.searchParams.get("response_type"), "code");
    assert.equal(parsedUrl.searchParams.get("access_type"), "offline");
    assert.equal(parsedUrl.searchParams.get("prompt"), "consent");

    const scopes = parsedUrl.searchParams.get("scope").split(" ");
    assert.ok(scopes.includes("openid"), "Scope must include openid");
    assert.ok(scopes.includes("email"), "Scope must include email");
    assert.ok(
      scopes.includes("https://www.googleapis.com/auth/meetings.space.created"),
      "Scope must include meetings.space.created"
    );
    assert.ok(
      scopes.includes("https://www.googleapis.com/auth/meetings.space.readonly"),
      "Scope must include meetings.space.readonly"
    );

    // Validate state consumption (single-use CSRF)
    const isValidFirst = validateOAuthState(state);
    assert.equal(isValidFirst, true, "State should be valid upon first validation");

    const isValidSecond = validateOAuthState(state);
    assert.equal(isValidSecond, false, "State should be invalidated after single use (anti-replay)");

    const isValidBogus = validateOAuthState("bogus_state_123456");
    assert.equal(isValidBogus, false, "Unknown state must be rejected");
  } finally {
    if (origClientId !== undefined) {
      process.env.GOOGLE_CLIENT_ID = origClientId;
    } else {
      delete process.env.GOOGLE_CLIENT_ID;
    }
    if (origRedirectUri !== undefined) {
      process.env.GOOGLE_REDIRECT_URI = origRedirectUri;
    } else {
      delete process.env.GOOGLE_REDIRECT_URI;
    }
  }
});

test("Regression 7: Invalid or missing redirect URI is rejected", () => {
  const origUri = process.env.GOOGLE_REDIRECT_URI;
  try {
    process.env.GOOGLE_REDIRECT_URI = "not-a-valid-url";
    assert.throws(
      () => generateOAuthAuthUrl(),
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, "INVALID_GOOGLE_REDIRECT_URI");
        return true;
      }
    );

    process.env.GOOGLE_REDIRECT_URI = "ftp://invalid-protocol.example.com";
    assert.throws(
      () => generateOAuthAuthUrl(),
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, "INVALID_GOOGLE_REDIRECT_URI");
        return true;
      }
    );
  } finally {
    if (origUri !== undefined) {
      process.env.GOOGLE_REDIRECT_URI = origUri;
    } else {
      delete process.env.GOOGLE_REDIRECT_URI;
    }
  }
});

test("Phase 2: AES-256-GCM Token Encryption, Storage and Anti-Tamper Verification", () => {
  const sampleRefreshToken = `1//04test_refresh_token_${crypto.randomBytes(16).toString("hex")}`;
  const encrypted = encryptSecret(sampleRefreshToken);

  assert.ok(encrypted.encryptedText, "Encrypted text must be generated");
  assert.ok(encrypted.iv, "IV must be generated");
  assert.ok(encrypted.authTag, "Auth tag must be generated");
  assert.notEqual(encrypted.encryptedText, sampleRefreshToken, "Ciphertext must not match plaintext");

  // Decrypt valid
  const decrypted = decryptSecret(encrypted);
  assert.equal(decrypted, sampleRefreshToken, "Decrypted token must exactly match original plaintext");

  // Tampered ciphertext fails authentication
  const tamperedCipher = {
    ...encrypted,
    encryptedText:
      encrypted.encryptedText.slice(0, -2) +
      (encrypted.encryptedText.endsWith("aa") ? "bb" : "aa"),
  };
  assert.throws(
    () => decryptSecret(tamperedCipher),
    /Unsupported state or unable to authenticate data|bad decrypt/i,
    "Tampered ciphertext must fail GCM authentication"
  );

  // Tampered authTag fails authentication
  const tamperedTag = {
    ...encrypted,
    authTag: crypto.randomBytes(16).toString("hex"),
  };
  assert.throws(
    () => decryptSecret(tamperedTag),
    /Unsupported state or unable to authenticate data|bad decrypt/i,
    "Tampered auth tag must fail GCM authentication"
  );
});

test("Phase 4: extractGoogleEmail strictly matches canonical corporate email and rejects non-identities", () => {
  // Case 1: Canonical signedinUser.email
  const res1 = extractGoogleEmail({ email: "Employee.One@Ashivam.Com" }, null);
  assert.equal(res1, "employee.one@ashivam.com", "Email must be normalized to lowercase");

  // Case 2: signedinUser.user with users/ prefix
  const res2 = extractGoogleEmail({ user: "users/Engineer.Dev@Ashivam.com" }, null);
  assert.equal(res2, "engineer.dev@ashivam.com", "users/ prefix must be stripped and email normalized");

  // Case 3: Rejection of numeric Google IDs (no domain or @)
  const res3 = extractGoogleEmail({ user: "users/109283746592837461928" }, null);
  assert.equal(res3, null, "Numeric Google User ID without email domain must be rejected");

  // Case 4: Rejection of Anonymous participant
  const res4 = extractGoogleEmail(null, null);
  assert.equal(res4, null, "Anonymous participant without identity must return null");

  // Case 5: Rejection of phone user
  const res5 = extractGoogleEmail({ displayName: "+1 (555) 019-2834" }, null);
  assert.equal(res5, null, "Phone user without email must return null");

  // Case 6: Rejection of display-name-only participant
  const res6 = extractGoogleEmail({ displayName: "Ritik Gupta" }, null);
  assert.equal(res6, null, "Display name alone without verified Google email must be rejected");

  // Case 7: Rejection of malformed email strings
  const res7 = extractGoogleEmail({ email: "invalid-email@" }, null);
  assert.equal(res7, null, "Malformed email missing domain must be rejected");

  const res8 = extractGoogleEmail({ email: "@nodomain.com" }, null);
  assert.equal(res8, null, "Malformed email missing local part must be rejected");

  const res9 = extractGoogleEmail({ email: "user space@ashivam.com" }, null);
  assert.equal(res9, null, "Malformed email containing spaces must be rejected");
});

test("Phase 3: Pub/Sub Webhook Ingestion Idempotency & Deduplication", async () => {
  const msgId = `test_meet_act_${TEST_TIMESTAMP}_idempotency`;
  const testPayload = {
    type: "google.workspace.meet.participantSession.v2.started",
    data: {
      session: {
        sessionName: `conferenceRecords/test_conf_${TEST_TIMESTAMP}/participants/p1/participantSessions/s1`,
        startTime: new Date().toISOString(),
      },
      signedinUser: {
        email: `tester_${TEST_TIMESTAMP}@ashivam.test`,
      },
    },
  };

  const envelope = {
    message: {
      messageId: msgId,
      data: Buffer.from(JSON.stringify(testPayload)).toString("base64"),
      publishTime: new Date().toISOString(),
    },
    subscription: env.googlePubSubSubscription,
  };

  // First ingestion -> PROCESSED
  const res1 = await ingestPubSubMessage(envelope);
  assert.equal(res1.status, "PROCESSED");
  assert.equal(res1.messageId, msgId);

  // Second ingestion of same messageId -> ALREADY_PROCESSED
  const res2 = await ingestPubSubMessage(envelope);
  assert.equal(res2.status, "ALREADY_PROCESSED");
  assert.equal(res2.messageId, msgId);

  // Verify only 1 record exists in GoogleEventInbox
  const count = await GoogleEventInbox.countDocuments({ messageId: msgId });
  assert.equal(count, 1, "Exactly 1 record must exist in GoogleEventInbox for duplicate deliveries");
});

test("Phase 3 & 5: Out-of-Order Webhook Handling (Left event arrives before Joined event)", async () => {
  const empEmail = `meet_activation_${TEST_TIMESTAMP}_ooo@ashivam.test`;
  const emp = await Employee.create({
    employeeId: `ASH-ACT-${TEST_TIMESTAMP.toString().slice(-4)}`,
    firstName: "OutOfOrder",
    lastName: "Employee",
    fullName: "OutOfOrder Employee",
    email: empEmail,
    googleEmail: empEmail,
    department: "Engineering",
    designation: "Software Engineer",
    employmentType: "Full-time",
    joiningDate: new Date(),
    role: "Employee",
    accountStatus: "ACTIVE",
    isActive: true,
  });

  const meeting = await Meeting.create({
    title: `Meet Activation Test ${TEST_TIMESTAMP} OOO`,
    meetingType: "Daily Standup",
    scheduledStartTime: new Date(Date.now() - 30 * 60 * 1000),
    scheduledEndTime: new Date(Date.now() + 30 * 60 * 1000),
    googleMeetingSpaceName: `spaces/test_space_${TEST_TIMESTAMP}`,
    status: "IN_PROGRESS",
    assignedEmployees: [emp._id],
  });

  const sessionName = `conferenceRecords/rec_${TEST_TIMESTAMP}/participants/p1/participantSessions/sess_ooo`;
  const joinTime = new Date(Date.now() - 25 * 60 * 1000);
  const leaveTime = new Date(Date.now() - 5 * 60 * 1000); // 20 minutes duration = 1200 seconds

  // STEP 1: Simulate OUT-OF-ORDER arrival: handleParticipantLeftEvent arrives FIRST
  await handleParticipantLeftEvent({
    name: sessionName,
    space: meeting.googleMeetingSpaceName,
    signedinUser: { email: empEmail },
    endTime: leaveTime.toISOString(),
  });

  // Verify session placeholder was recorded with leave time
  const oooSession = await ParticipantSession.findOne({ sessionName });
  assert.ok(oooSession, "Session must be created even if Left event arrived before Joined event");
  assert.ok(oooSession.endTime, "Leave time must be stored");

  // STEP 2: handleParticipantJoinedEvent arrives LATER
  await processParticipantJoinedEvent({
    session: { sessionName, startTime: joinTime.toISOString() },
    space: meeting.googleMeetingSpaceName,
    signedinUser: { email: empEmail },
  });

  // Verify session was reconciled with accurate startTime and durationSeconds
  const updatedSession = await ParticipantSession.findOne({ sessionName });
  assert.ok(updatedSession);
  assert.equal(
    new Date(updatedSession.startTime).getTime(),
    joinTime.getTime(),
    "Start time must be updated when Join event arrives"
  );
  assert.equal(
    new Date(updatedSession.endTime).getTime(),
    leaveTime.getTime(),
    "End time must be preserved"
  );
  assert.equal(
    updatedSession.durationSeconds,
    1200,
    "Duration must be accurately calculated as 1200 seconds (20 minutes)"
  );
  assert.equal(
    String(updatedSession.matchedEmployeeId),
    String(emp._id),
    "Employee must be matched by verified canonical email"
  );
});

test("Phase 5: Authoritative Post-Meeting Attendance Reconciliation and Status Classification", async () => {
  const empEmail = `meet_activation_${TEST_TIMESTAMP}_rec@ashivam.test`;
  const emp = await Employee.create({
    employeeId: `ASH-REC-${TEST_TIMESTAMP.toString().slice(-4)}`,
    firstName: "Reconciliation",
    lastName: "Employee",
    fullName: "Reconciliation Employee",
    email: empEmail,
    googleEmail: empEmail,
    department: "Quality Assurance",
    designation: "QA Engineer",
    employmentType: "Full-time",
    joiningDate: new Date(),
    role: "Employee",
    accountStatus: "ACTIVE",
    isActive: true,
  });

  const meetingStartTime = new Date(Date.now() - 40 * 60 * 1000);
  const meetingEndTime = new Date(Date.now() - 10 * 60 * 1000); // 30-minute meeting

  const policy = await AttendancePolicy.create({
    name: `Test Standup Policy ${TEST_TIMESTAMP}`,
    gracePeriodMinutes: 5,
    minimumAttendanceMinutes: 15,
    minimumAttendancePercentage: 60,
  });

  const meeting = await Meeting.create({
    title: `Meet Activation Test ${TEST_TIMESTAMP} Rec`,
    meetingType: "Daily Standup",
    scheduledStartTime: meetingStartTime,
    scheduledEndTime: meetingEndTime,
    policyId: policy._id,
    status: "COMPLETED",
    assignedEmployees: [emp._id],
  });

  // Create participant session showing employee attended for 25 minutes (out of 30m = 83% > 70% threshold)
  const sessionStart = new Date(meetingStartTime.getTime() + 2 * 60 * 1000); // joined 2m in (within 5m grace period)
  const sessionEnd = new Date(meetingStartTime.getTime() + 27 * 60 * 1000); // attended 25 minutes

  await ParticipantSession.create({
    meetingId: meeting._id,
    conferenceRecordId: `conferenceRecords/rec_${TEST_TIMESTAMP}`,
    participantName: `participants/p_${TEST_TIMESTAMP}`,
    sessionName: `conferenceRecords/rec_${TEST_TIMESTAMP}/participants/p/participantSessions/s_${TEST_TIMESTAMP}`,
    googleEmail: empEmail,
    displayName: "Reconciliation Test Employee",
    userType: "SIGNED_IN",
    matchedEmployeeId: emp._id,
    startTime: sessionStart,
    endTime: sessionEnd,
    durationSeconds: 1500, // 25 minutes
  });

  // Run authoritative reconciliation
  const recResult = await reconcileMeetingAttendance(meeting._id);
  assert.equal(recResult.status, "COMPLETED");

  // Check generated AttendanceRecord
  const record = await AttendanceRecord.findOne({
    meetingId: meeting._id,
    employeeId: emp._id,
  });

  assert.ok(record, "AttendanceRecord must be generated");
  assert.equal(record.status, "PRESENT", "Employee joined within grace period and attended 83% -> PRESENT");
  assert.equal(record.isProvisional, false, "Authoritative record must have isProvisional: false");
  assert.equal(record.verifiedVia, "MEET_REST_API", "Must be verifiedVia MEET_REST_API");
  assert.ok(record.totalConnectedDurationMinutes >= 25, "Connected duration must be at least 25 minutes");
});

test("Phase 2: Google Integration Health and Token Revocation Cycle", async () => {
  // Test DISCONNECTED health state
  await GoogleIntegration.deleteMany({ serviceName: "google_meet" });
  const healthDisconnected = await getIntegrationHealth();
  assert.equal(healthDisconnected.status, "DISCONNECTED");
  assert.equal(healthDisconnected.isConnected, false);
  assert.equal(healthDisconnected.connectedAccountEmail, null);

  // Test CONNECTED state with mock token
  const enc = encryptSecret("sample_mock_refresh_token");
  await GoogleIntegration.findOneAndUpdate(
    { serviceName: "google_meet" },
    {
      encryptedRefreshToken: enc.encryptedText,
      iv: enc.iv,
      authTag: enc.authTag,
      accessToken: "mock_access_token_12345",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      connectedAccountEmail: "admin@ashivam.test",
      status: "CONNECTED",
      lastSyncAt: new Date(),
    },
    { upsert: true }
  );

  const healthConnected = await getIntegrationHealth();
  assert.equal(healthConnected.status, "CONNECTED");
  assert.equal(healthConnected.isConnected, true);
  assert.equal(healthConnected.connectedAccountEmail, "admin@ashivam.test");
  assert.equal(healthConnected.tokenExpired, false);

  // Test Token Revocation and Disconnect
  const disconnectResult = await disconnectGoogleIntegration();
  assert.equal(disconnectResult.success, true);
  assert.equal(disconnectResult.status, "DISCONNECTED");

  const healthAfterDisconnect = await getIntegrationHealth();
  assert.equal(healthAfterDisconnect.status, "DISCONNECTED");
  assert.equal(healthAfterDisconnect.isConnected, false);
});
