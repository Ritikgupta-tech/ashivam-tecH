import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    currentLocation: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },

    experience: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    coverLetter: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },

    resume: {
      originalName: {
        type: String,
        required: true,
      },

      fileName: {
        type: String,
        required: true,
      },

      storageProvider: {
        type: String,
        enum: ["s3", "local"],
        default: "local",
      },

      storageKey: {
        type: String,
        default: null,
      },

      path: {
        type: String,
        default: null,
      },

      mimeType: {
        type: String,
        required: true,
      },

      size: {
        type: Number,
        required: true,
      },
    },

    status: {
      type: String,
      enum: [
        "applied",
        "under_review",
        "shortlisted",
        "rejected",
        "hired",
      ],
      default: "applied",
      index: true,
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
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

applicationSchema.index({
  job: 1,
  createdAt: -1,
});

applicationSchema.index({
  status: 1,
  createdAt: -1,
});

applicationSchema.index({
  email: 1,
  createdAt: -1,
});

export default mongoose.model(
  "Application",
  applicationSchema
);