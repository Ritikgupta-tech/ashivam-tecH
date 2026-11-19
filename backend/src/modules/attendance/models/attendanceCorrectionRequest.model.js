import mongoose from "mongoose";

const attendanceCorrectionRequestSchema = new mongoose.Schema(
  {
    attendanceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceRecord",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    requestedStatus: {
      type: String,
      enum: ["PRESENT", "LATE", "EXEMPTED"],
      default: "PRESENT",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    alternativeEmailUsed: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    proofReference: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

attendanceCorrectionRequestSchema.index({ employeeId: 1, createdAt: -1 });
attendanceCorrectionRequestSchema.index({ status: 1, createdAt: -1 });

const AttendanceCorrectionRequest =
  mongoose.models.AttendanceCorrectionRequest ||
  mongoose.model(
    "AttendanceCorrectionRequest",
    attendanceCorrectionRequestSchema
  );

export default AttendanceCorrectionRequest;
