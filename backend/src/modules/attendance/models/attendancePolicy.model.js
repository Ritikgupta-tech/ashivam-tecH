import mongoose from "mongoose";

const attendancePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    gracePeriodMinutes: {
      type: Number,
      default: 5,
      min: 0,
      max: 60,
    },
    minimumAttendanceMinutes: {
      type: Number,
      default: 30,
      min: 1,
      max: 480,
    },
    minimumAttendancePercentage: {
      type: Number,
      default: 60,
      min: 1,
      max: 100,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    applicableDepartments: {
      type: [String],
      default: [],
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

const AttendancePolicy =
  mongoose.models.AttendancePolicy ||
  mongoose.model("AttendancePolicy", attendancePolicySchema);

export default AttendancePolicy;
