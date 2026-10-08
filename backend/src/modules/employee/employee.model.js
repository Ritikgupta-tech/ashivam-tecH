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
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
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

const Employee =
  mongoose.models.Employee ||
  mongoose.model("Employee", employeeSchema);

export default Employee;