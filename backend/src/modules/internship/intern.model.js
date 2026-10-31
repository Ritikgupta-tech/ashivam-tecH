import mongoose from "mongoose";

const internSchema = new mongoose.Schema(
  {
    internId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    college: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    course: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
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

    designation: {
      type: String,
      default: "Software Engineering Intern",
      trim: true,
    },

    mentorName: {
      type: String,
      trim: true,
      default: "",
    },

    joiningDate: {
      type: Date,
      required: true,
    },

    duration: {
      type: String,
      default: "3 Months",
    },

    expectedEndDate: {
      type: Date,
      default: null,
    },

    actualEndDate: {
      type: Date,
      default: null,
    },

    workLocation: {
      type: String,
      enum: ["Office", "Remote", "Hybrid"],
      default: "Remote",
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

    onboarding: {
      status: {
        type: String,
        enum: ["pending", "in_progress", "completed"],
        default: "pending",
      },
      idProofVerified: {
        type: Boolean,
        default: false,
      },
      collegeNocVerified: {
        type: Boolean,
        default: false,
      },
      agreementSigned: {
        type: Boolean,
        default: false,
      },
      ndaSigned: {
        type: Boolean,
        default: false,
      },
      completedAt: {
        type: Date,
        default: null,
      },
    },

    status: {
      type: String,
      enum: [
        "active",
        "on_hold",
        "completed",
        "extended",
        "withdrawn",
        "terminated",
      ],
      default: "active",
    },

    performanceNotes: {
      type: String,
      trim: true,
      default: "",
    },

    extensionReason: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

internSchema.index({ status: 1, createdAt: -1 });
internSchema.index({ email: 1, domain: 1 });
internSchema.index(
  { applicationId: 1 },
  {
    unique: true,
    partialFilterExpression: { applicationId: { $type: "objectId" } },
  }
);

const Intern =
  mongoose.models.Intern || mongoose.model("Intern", internSchema);

export default Intern;
