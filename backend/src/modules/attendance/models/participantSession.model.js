import mongoose from "mongoose";

const participantSessionSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    conferenceRecordId: {
      type: String,
      required: true,
      index: true,
    },
    participantName: {
      type: String,
      trim: true,
      index: true, // e.g. "conferenceRecords/xxx/participants/yyy"
    },
    sessionName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true, // e.g. "conferenceRecords/xxx/participants/yyy/participantSessions/zzz"
    },
    googleUserId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    googleEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: "",
    },
    userType: {
      type: String,
      enum: ["SIGNED_IN", "ANONYMOUS", "PHONE"],
      default: "SIGNED_IN",
      index: true,
    },
    matchedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    deviceType: {
      type: String,
      default: "UNKNOWN",
    },
  },
  {
    timestamps: true,
  }
);

participantSessionSchema.index({ meetingId: 1, matchedEmployeeId: 1 });
participantSessionSchema.index({ meetingId: 1, googleEmail: 1 });

const ParticipantSession =
  mongoose.models.ParticipantSession ||
  mongoose.model("ParticipantSession", participantSessionSchema);

export default ParticipantSession;
