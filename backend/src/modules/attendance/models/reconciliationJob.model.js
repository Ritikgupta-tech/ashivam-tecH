import mongoose from "mongoose";

const reconciliationJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["RUNNING", "COMPLETED", "FAILED", "PARTIALLY_RECONCILED"],
      default: "RUNNING",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    participantsProcessed: {
      type: Number,
      default: 0,
    },
    attendanceUpdated: {
      type: Number,
      default: 0,
    },
    unmatchedParticipants: {
      type: [String],
      default: [],
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reconciliationJobSchema.index({ meetingId: 1, createdAt: -1 });

const ReconciliationJob =
  mongoose.models.ReconciliationJob ||
  mongoose.model("ReconciliationJob", reconciliationJobSchema);

export default ReconciliationJob;
