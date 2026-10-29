import mongoose from "mongoose";

const internshipProgramSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    domain: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      default: "Software Engineering",
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    responsibilities: {
      type: [String],
      default: [],
    },

    requirements: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    duration: {
      type: String,
      default: "3 Months",
    },

    workLocation: {
      type: String,
      enum: ["Office", "Remote", "Hybrid"],
      default: "Remote",
    },

    openings: {
      type: Number,
      default: 2,
      min: 1,
    },

    stipend: {
      type: Number,
      default: 0,
      min: 0,
    },

    isUnpaid: {
      type: Boolean,
      default: false,
    },

    eligibility: {
      type: String,
      default: "B.Tech / BCA / MCA / B.Sc IT students or recent graduates",
      trim: true,
    },

    applicationDeadline: {
      type: Date,
      default: null,
    },

    startDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "published", "paused", "closed", "archived"],
      default: "published",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

internshipProgramSchema.index({ status: 1, createdAt: -1 });

const InternshipProgram =
  mongoose.models.InternshipProgram ||
  mongoose.model("InternshipProgram", internshipProgramSchema);

export default InternshipProgram;
