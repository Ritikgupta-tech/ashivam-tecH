import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    meetingType: {
      type: String,
      enum: [
        "Daily Standup",
        "Weekly Sync",
        "Department Meeting",
        "Project Review",
        "One-on-One",
        "Town Hall",
        "Custom",
      ],
      default: "Daily Standup",
      required: true,
    },
    scheduledStartTime: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledEndTime: {
      type: Date,
      required: true,
    },
    timeZone: {
      type: String,
      default: "Asia/Kolkata",
    },
    googleMeetingSpaceName: {
      type: String,
      trim: true,
      default: null,
      index: true, // e.g. "spaces/AAAAAAAAAA"
    },
    googleMeetingUri: {
      type: String,
      trim: true,
      default: null, // e.g. "https://meet.google.com/xxx-yyyy-zzz"
    },
    googleMeetingCode: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      index: true, // e.g. "xxx-yyyy-zzz"
    },
    assignedDepartments: {
      type: [String],
      default: [],
      index: true,
    },
    assignedEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        index: true,
      },
    ],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceRule: {
      type: String,
      enum: ["NONE", "DAILY", "WEEKDAYS", "WEEKLY"],
      default: "NONE",
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendancePolicy",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

meetingSchema.index({ scheduledStartTime: 1, status: 1 });
meetingSchema.index({ googleMeetingSpaceName: 1, status: 1 });

const Meeting =
  mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);

export default Meeting;
