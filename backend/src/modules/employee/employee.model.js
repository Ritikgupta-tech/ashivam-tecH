import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },

    employeeId: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    googleEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },

    passwordHash: {
      type: String,
      select: false,
      default: null,
    },

    role: {
      type: String,
      enum: ["Employee", "Admin", "Superadmin"],
      default: "Employee",
    },

    accountStatus: {
      type: String,
      enum: ["INVITED", "PENDING_ACTIVATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"],
      default: "INVITED",
      index: true,
    },

    employmentStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "TERMINATED", "ON_LEAVE"],
      default: "ACTIVE",
      index: true,
    },

    activationTokenHash: {
      type: String,
      select: false,
      default: null,
    },

    activationTokenExpiresAt: {
      type: Date,
      default: null,
    },

    activationSentAt: {
      type: Date,
      default: null,
    },

    activationResendCount: {
      type: Number,
      default: 0,
    },

    resetPasswordTokenHash: {
      type: String,
      select: false,
      default: null,
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null,
    },

    resetPasswordSentAt: {
      type: Date,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    verifiedGoogleEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },

    googleEmailVerifiedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    profileImage: {
      type: String,
      default: null,
      trim: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    employmentType: {
      type: String,
      enum: [
        "Full-time",
        "Part-time",
        "Contract",
        "Intern",
        "Freelance",
      ],
      required: true,
    },

    joiningDate: {
      type: Date,
      required: true,
    },

    workLocation: {
      type: String,
      enum: [
        "Office",
        "Remote",
        "Hybrid",
      ],
      default: "Office",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    skills: {
      type: [String],
      default: [],
    },

    socialLinks: {
      linkedin: {
        type: String,
        trim: true,
        default: "",
      },

      github: {
        type: String,
        trim: true,
        default: "",
      },
    },

    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    deletedAt: {
      type: Date,
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

employeeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

employeeSchema.set("toJSON", {
  virtuals: true,
});

employeeSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: "email_active_unique",
  }
);

employeeSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { employeeId: { $type: "string" }, deletedAt: null },
    name: "employeeId_active_unique",
  }
);

employeeSchema.index(
  { googleEmail: 1 },
  {
    sparse: true,
    name: "googleEmail_sparse",
  }
);

employeeSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
  designation: "text",
  department: "text",
});

employeeSchema.index({
  department: 1,
  isActive: 1,
});

employeeSchema.index({
  designation: 1,
  isActive: 1,
});

employeeSchema.index({
  displayOrder: 1,
  createdAt: -1,
});

employeeSchema.index(
  { activationTokenHash: 1 },
  {
    sparse: true,
    name: "activationTokenHash_sparse",
  }
);

employeeSchema.index(
  { resetPasswordTokenHash: 1 },
  {
    sparse: true,
    name: "resetPasswordTokenHash_sparse",
  }
);

employeeSchema.index(
  { accountStatus: 1, employmentStatus: 1 },
  {
    name: "account_employment_status_idx",
  }
);

employeeSchema.pre("save", function () {
  // Synchronize isActive with accountStatus and employmentStatus
  if (
    this.accountStatus === "DEACTIVATED" ||
    this.accountStatus === "SUSPENDED" ||
    this.employmentStatus === "INACTIVE" ||
    this.employmentStatus === "TERMINATED"
  ) {
    this.isActive = false;
  } else if (this.accountStatus === "ACTIVE" && this.employmentStatus === "ACTIVE") {
    this.isActive = true;
  } else if (this.isModified("isActive") && !this.isActive) {
    if (this.accountStatus === "ACTIVE") {
      this.accountStatus = "DEACTIVATED";
    }
  }

  // Auto-promote accounts created with explicit password to ACTIVE
  if (this.passwordHash && this.accountStatus === "INVITED") {
    this.accountStatus = "ACTIVE";
    this.isEmailVerified = true;
    this.isActive = true;
  }
});

const Employee =
  mongoose.models.Employee ||
  mongoose.model("Employee", employeeSchema);

export default Employee;