import mongoose from "mongoose";

const employeeDocumentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "offer-letter",
        "appointment-letter",
        "nda",
        "salary-slip",
        "experience-letter",
        "relieving-letter",
        "id-proof",
        "address-proof",
        "education",
        "other",
      ],
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    file: {
      originalName: {
        type: String,
        required: true,
        trim: true,
      },

      fileName: {
        type: String,
        required: true,
        trim: true,
      },

      path: {
        type: String,
        required: true,
        trim: true,
      },

      mimeType: {
        type: String,
        required: true,
        trim: true,
      },

      size: {
        type: Number,
        required: true,
        min: 1,
      },
    },

    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },

    uploadedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
      },

      username: {
        type: String,
        default: null,
      },
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

employeeDocumentSchema.index({
  employee: 1,
  documentType: 1,
  status: 1,
});

employeeDocumentSchema.index({
  createdAt: -1,
});

const EmployeeDocument =
  mongoose.models.EmployeeDocument ||
  mongoose.model(
    "EmployeeDocument",
    employeeDocumentSchema
  );

export default EmployeeDocument;