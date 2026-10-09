import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    employmentType: {
      type: String,
      enum: [
        "Full-time",
        "Part-time",
        "Internship",
        "Contract",
      ],
      required: true,
    },

    experience: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },

    requirements: {
      type: [String],
      default: [],
    },

    qualifications: {
      type: [String],
      default: [],
    },

    responsibilities: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    salary: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    applicationDeadline: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({
  isActive: 1,
  createdAt: -1,
});

jobSchema.index({
  department: 1,
  employmentType: 1,
});

export default mongoose.model("Job", jobSchema);