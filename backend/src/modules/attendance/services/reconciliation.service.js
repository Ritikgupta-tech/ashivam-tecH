import crypto from "crypto";
import Meeting from "../models/meeting.model.js";
import MeetingConference from "../models/meetingConference.model.js";
import ParticipantSession from "../models/participantSession.model.js";
import AttendanceRecord from "../models/attendanceRecord.model.js";
import AttendancePolicy from "../models/attendancePolicy.model.js";
import GoogleEventInbox from "../models/googleEventInbox.model.js";
import ReconciliationJob from "../models/reconciliationJob.model.js";
import Employee from "../../employee/employee.model.js";
import {
  listConferenceRecords,
  listConferenceParticipants,
  listParticipantSessions,
} from "./googleMeet.service.js";
import { evaluateAttendanceStatus } from "./attendanceEngine.service.js";

/**
 * Ingests a Google Cloud Pub/Sub message safely and idempotently.
 */
export const ingestPubSubMessage = async ({ message, subscription }) => {
  if (!message || !message.messageId) {
    throw new Error("Invalid Pub/Sub envelope: missing messageId");
  }

  const { messageId, data, publishTime } = message;

  // 1. Idempotency check: see if message was already ingested
  const existing = await GoogleEventInbox.findOne({ messageId });
  if (existing) {
    return { status: "ALREADY_PROCESSED", messageId };
  }

  // 2. Decode Base64 data
  let parsedPayload = {};
  if (data) {
    try {
      const decoded = Buffer.from(data, "base64").toString("utf8");
      parsedPayload = JSON.parse(decoded);
    } catch {
      parsedPayload = { rawData: data };
    }
  }

  const eventType =
    parsedPayload.type ||
    parsedPayload["ce-type"] ||
    message.attributes?.["ce-type"] ||
    "unknown";

  // 3. Save to inbox
  const inboxRecord = await GoogleEventInbox.create({
    messageId,
    subscription,
    eventType,
    publishTime: publishTime ? new Date(publishTime) : new Date(),
    payload: parsedPayload,
    processed: false,
  });

  // 4. Process event based on type
  try {
    await processMeetCloudEvent(eventType, parsedPayload);
    inboxRecord.processed = true;
    inboxRecord.processedAt = new Date();
    await inboxRecord.save();
    return { status: "PROCESSED", messageId };
  } catch (err) {
    inboxRecord.errorMessage = err.message;
    await inboxRecord.save();
    throw err;
  }
};

/**
 * Processes a decoded Google Meet CloudEvent
 */
export const processMeetCloudEvent = async (eventType, payload) => {
  const eventData = payload.data || payload;

  // Match event types
  if (
    eventType.includes("participantSession.v2.started") ||
    eventType.includes("participant.v2.joined")
  ) {
    await handleParticipantJoinedEvent(eventData);
  } else if (
    eventType.includes("participantSession.v2.ended") ||
    eventType.includes("participant.v2.left")
  ) {
    await handleParticipantLeftEvent(eventData);
  } else if (eventType.includes("conferenceRecord.v2.ended")) {
    await handleConferenceEndedEvent(eventData);
  }
};

export const processParticipantJoinedEvent = async (eventData) => {
  const sessionName =
    eventData.session?.sessionName ||
    eventData.participantSession ||
    eventData.name;
  if (!sessionName) return null;

  const parts = sessionName.split("/");
  let conferenceRecordId = "";
  const confIdx = parts.indexOf("conferenceRecords");
  if (confIdx !== -1 && parts.length > confIdx + 1) {
    conferenceRecordId = parts.slice(confIdx, confIdx + 2).join("/");
  } else {
    conferenceRecordId = parts.slice(0, 2).join("/");
  }

  let participantName = "";
  const partIdx = parts.indexOf("participants");
  if (partIdx !== -1 && parts.length > partIdx + 1) {
    participantName = parts.slice(0, partIdx + 2).join("/");
  } else {
    participantName = parts.slice(0, 4).join("/");
  }

  // Locate the meeting linked to this conference record or space
  let conference = await MeetingConference.findOne({ googleConferenceRecordId: conferenceRecordId });
  let meeting = conference ? await Meeting.findById(conference.meetingId) : null;

  if (!meeting && (eventData.space || eventData.conferenceRecord)) {
    const spaceQuery = eventData.space || (eventData.conferenceRecord ? eventData.conferenceRecord.split("/conferenceRecords")[0] : null);
    if (spaceQuery) {
      meeting = await Meeting.findOne({
        googleMeetingSpaceName: spaceQuery,
        status: { $in: ["SCHEDULED", "IN_PROGRESS"] },
      }).sort({ scheduledStartTime: -1 });
    }
  }

  // Fallback to active meeting if in progress
  if (!meeting) {
    meeting = await Meeting.findOne({ status: "IN_PROGRESS" }).sort({ updatedAt: -1 });
  }

  if (!meeting) return null;

  // Extract participant identity
  const userType = eventData.signedinUser ? "SIGNED_IN" : eventData.phoneUser ? "PHONE" : "ANONYMOUS";
  const googleEmail = eventData.signedinUser?.user
    ? eventData.signedinUser.user.replace(/^users\//, "").toLowerCase()
    : null;
  const displayName = eventData.signedinUser?.displayName || eventData.displayName || "";

  // Match with employee
  let matchedEmployee = null;
  if (googleEmail) {
    matchedEmployee = await Employee.findOne({
      $or: [{ googleEmail }, { email: googleEmail }],
      deletedAt: null,
      isActive: true,
      accountStatus: "ACTIVE",
    });
  }

  const startTime = eventData.session?.startTime
    ? new Date(eventData.session.startTime)
    : eventData.startTime
    ? new Date(eventData.startTime)
    : new Date();

  // Create or update participant session
  const session = await ParticipantSession.findOneAndUpdate(
    { sessionName },
    {
      meetingId: meeting._id,
      conferenceRecordId,
      participantName,
      sessionName,
      googleEmail,
      displayName,
      userType,
      matchedEmployeeId: matchedEmployee ? matchedEmployee._id : null,
      startTime,
      endTime: null,
      deviceType: eventData.deviceType || "UNKNOWN",
    },
    { upsert: true, returnDocument: "after" }
  );

  // Update meeting status to IN_PROGRESS
  if (meeting.status === "SCHEDULED") {
    meeting.status = "IN_PROGRESS";
    await meeting.save();
  }

  return session;
};

const handleParticipantJoinedEvent = async (eventData) => {
  const session = await processParticipantJoinedEvent(eventData);
  if (!session) return;

  const meeting = await Meeting.findById(session.meetingId);
  if (!meeting) return;

  // Update provisional attendance record if employee is matched
  if (session.matchedEmployeeId) {
    const policy = meeting.policyId ? await AttendancePolicy.findById(meeting.policyId) : {};
    const sessions = await ParticipantSession.find({
      meetingId: meeting._id,
      matchedEmployeeId: session.matchedEmployeeId,
    });

    const evaluated = evaluateAttendanceStatus({
      sessions,
      meeting,
      policy: policy || {},
      isMeetingConcluded: false,
    });

    await AttendanceRecord.findOneAndUpdate(
      { meetingId: meeting._id, employeeId: session.matchedEmployeeId },
      {
        $set: {
          ...evaluated,
          verifiedVia: "PUBSUB_EVENT",
        },
      },
      { upsert: true, returnDocument: "after" }
    );
  }
};

const handleParticipantLeftEvent = async (eventData) => {
  const sessionName = eventData.name;
  if (!sessionName) return;

  const endTime = eventData.endTime ? new Date(eventData.endTime) : new Date();

  const session = await ParticipantSession.findOne({ sessionName });
  if (!session) return;

  session.endTime = endTime;
  session.durationSeconds = Math.max(
    0,
    Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 1000)
  );
  await session.save();

  // Update provisional attendance calculation for matched employee
  if (session.matchedEmployeeId) {
    const meeting = await Meeting.findById(session.meetingId);
    if (!meeting) return;

    const policy = meeting.policyId ? await AttendancePolicy.findById(meeting.policyId) : {};
    const sessions = await ParticipantSession.find({
      meetingId: meeting._id,
      matchedEmployeeId: session.matchedEmployeeId,
    });

    const evaluated = evaluateAttendanceStatus({
      sessions,
      meeting,
      policy: policy || {},
      isMeetingConcluded: false,
    });

    await AttendanceRecord.findOneAndUpdate(
      { meetingId: meeting._id, employeeId: session.matchedEmployeeId },
      {
        $set: {
          ...evaluated,
          verifiedVia: "PUBSUB_EVENT",
        },
      },
      { upsert: true, returnDocument: "after" }
    );
  }
};

const handleConferenceEndedEvent = async (eventData) => {
  const conferenceRecordId = eventData.name;
  if (!conferenceRecordId) return;

  let conference = await MeetingConference.findOne({ googleConferenceRecordId: conferenceRecordId });
  if (conference) {
    conference.endTime = eventData.endTime ? new Date(eventData.endTime) : new Date();
    conference.status = "ENDED";
    await conference.save();

    const meeting = await Meeting.findById(conference.meetingId);
    if (meeting) {
      meeting.status = "COMPLETED";
      await meeting.save();
      // Trigger full reconciliation
      await reconcileMeetingAttendance(meeting._id);
    }
  }
};

/**
 * Authoritative Reconciliation:
 * Verifies final participant sessions against Google Meet REST API v2 and finalizes attendance.
 */
export const reconcileMeetingAttendance = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new Error("Meeting not found");

  const jobId = `rec_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const job = await ReconciliationJob.create({
    jobId,
    meetingId: meeting._id,
    status: "RUNNING",
    startedAt: new Date(),
  });

  try {
    const policy = meeting.policyId ? await AttendancePolicy.findById(meeting.policyId) : {};

    // 1. If meeting has space name, attempt to fetch authoritative conference records
    if (meeting.googleMeetingSpaceName) {
      try {
        const confRecords = await listConferenceRecords(meeting.googleMeetingSpaceName);
        for (const conf of confRecords) {
          await MeetingConference.findOneAndUpdate(
            { googleConferenceRecordId: conf.name },
            {
              meetingId: meeting._id,
              spaceName: meeting.googleMeetingSpaceName,
              startTime: conf.startTime ? new Date(conf.startTime) : undefined,
              endTime: conf.endTime ? new Date(conf.endTime) : undefined,
              status: conf.endTime ? "ENDED" : "ACTIVE",
              rawMetadata: conf,
            },
            { upsert: true }
          );

          // Fetch all participants
          const participants = await listConferenceParticipants(conf.name);
          for (const p of participants) {
            const googleEmail = p.signedinUser?.user
              ? p.signedinUser.user.replace(/^users\//, "").toLowerCase()
              : null;
            const displayName = p.signedinUser?.displayName || p.displayName || "";
            const userType = p.signedinUser ? "SIGNED_IN" : p.phoneUser ? "PHONE" : "ANONYMOUS";

            let matchedEmployee = null;
            if (googleEmail) {
              matchedEmployee = await Employee.findOne({
                $or: [{ googleEmail }, { email: googleEmail }],
                deletedAt: null,
                isActive: true,
                accountStatus: "ACTIVE",
              });
            }

            if (!matchedEmployee) {
              job.unmatchedParticipants.push(googleEmail || displayName || "Unknown");
            }

            // Fetch participant sessions
            const sessions = await listParticipantSessions(p.name);
            for (const s of sessions) {
              const start = s.startTime ? new Date(s.startTime) : new Date();
              const end = s.endTime ? new Date(s.endTime) : null;
              const duration = end ? Math.max(0, Math.round((end - start) / 1000)) : 0;

              await ParticipantSession.findOneAndUpdate(
                { sessionName: s.name },
                {
                  meetingId: meeting._id,
                  conferenceRecordId: conf.name,
                  participantName: p.name,
                  sessionName: s.name,
                  googleEmail,
                  displayName,
                  userType,
                  matchedEmployeeId: matchedEmployee ? matchedEmployee._id : null,
                  startTime: start,
                  endTime: end,
                  durationSeconds: duration,
                },
                { upsert: true }
              );
            }
          }
        }
      } catch (apiErr) {
        // Log API error, fall back to existing ingested sessions
        console.warn(`[Reconciliation Notice] Google Meet API fetch: ${apiErr.message}`);
      }
    }

    // 2. Resolve eligible employees for this meeting
    let targetEmployees = [];
    if (meeting.assignedEmployees && meeting.assignedEmployees.length > 0) {
      targetEmployees = await Employee.find({
        _id: { $in: meeting.assignedEmployees },
        isActive: true,
        deletedAt: null,
      });
    } else if (meeting.assignedDepartments && meeting.assignedDepartments.length > 0) {
      targetEmployees = await Employee.find({
        department: { $in: meeting.assignedDepartments },
        isActive: true,
        deletedAt: null,
      });
    } else {
      targetEmployees = await Employee.find({
        isActive: true,
        deletedAt: null,
      });
    }

    let recordsUpdated = 0;

    // 3. Calculate finalized attendance for every employee
    for (const emp of targetEmployees) {
      const empSessions = await ParticipantSession.find({
        meetingId: meeting._id,
        matchedEmployeeId: emp._id,
      });

      const evaluated = evaluateAttendanceStatus({
        sessions: empSessions,
        meeting,
        policy: policy || {},
        isMeetingConcluded: true,
      });

      await AttendanceRecord.findOneAndUpdate(
        { meetingId: meeting._id, employeeId: emp._id },
        {
          $set: {
            ...evaluated,
            isProvisional: false,
            verifiedVia: empSessions.length > 0 ? "MEET_REST_API" : "SYSTEM_DEFAULT",
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      recordsUpdated++;
    }

    job.status = "COMPLETED";
    job.completedAt = new Date();
    job.participantsProcessed = targetEmployees.length;
    job.attendanceUpdated = recordsUpdated;
    await job.save();

    return {
      status: "COMPLETED",
      jobId,
      recordsUpdated,
    };
  } catch (err) {
    job.status = "FAILED";
    job.completedAt = new Date();
    job.errorMessage = err.message;
    await job.save();
    throw err;
  }
};
