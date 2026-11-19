import mongoose from "mongoose";

const meetingConferenceSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    googleConferenceRecordId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true, // e.g. "conferenceRecords/4a8b1c2d"
    },
    spaceName: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ENDED"],
      default: "ACTIVE",
    },
    rawMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

meetingConferenceSchema.index({ meetingId: 1, createdAt: -1 });

const MeetingConference =
  mongoose.models.MeetingConference ||
  mongoose.model("MeetingConference", meetingConferenceSchema);

export default MeetingConference;
