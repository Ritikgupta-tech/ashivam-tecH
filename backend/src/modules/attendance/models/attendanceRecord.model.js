import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "PRESENT",
        "LATE",
        "SHORT_ATTENDANCE",
        "ABSENT",
        "EXEMPTED",
        "PENDING_VERIFICATION",
        "NEEDS_REVIEW",
      ],
      default: "PENDING_VERIFICATION",
      required: true,
      index: true,
    },
    isProvisional: {
      type: Boolean,
      default: true,
      index: true,
    },
    firstJoinTime: {
      type: Date,
      default: null,
    },
    lastLeaveTime: {
      type: Date,
      default: null,
    },
    totalConnectedDurationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    eligibleSessionMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateArrivalMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    earlyDepartureMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    reconnectionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    verifiedVia: {
      type: String,
      enum: [
        "PUBSUB_EVENT",
        "MEET_REST_API",
        "MANUAL_CORRECTION",
        "SYSTEM_DEFAULT",
      ],
      default: "SYSTEM_DEFAULT",
    },
    correctionStatus: {
      type: String,
      enum: ["NONE", "DISPUTED", "RESOLVED_APPROVED", "RESOLVED_REJECTED"],
      default: "NONE",
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// One final attendance record per employee per meeting
attendanceRecordSchema.index(
  { meetingId: 1, employeeId: 1 },
  { unique: true, name: "meeting_employee_unique_attendance" }
);
attendanceRecordSchema.index({ employeeId: 1, createdAt: -1 });
attendanceRecordSchema.index({ status: 1, createdAt: -1 });

const AttendanceRecord =
  mongoose.models.AttendanceRecord ||
  mongoose.model("AttendanceRecord", attendanceRecordSchema);

export default AttendanceRecord;
