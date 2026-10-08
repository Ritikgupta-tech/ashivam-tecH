import mongoose from "mongoose";

const { Schema } = mongoose;

const HR_DOCUMENT_TYPES = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Driving License",
  "Resume",
  "Offer Letter",
  "Joining Letter",
  "NDA",
  "Salary Slip",
  "Experience Letter",
  "Relieving Letter",
  "Performance Review",
  "Bank Details",
  "Education Certificate",
  "Other",
];

const DOCUMENT_STATUS = [
  "Pending",
  "Verified",
  "Rejected",
  "Expired",
];

const hrDocumentSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      enum: HR_DOCUMENT_TYPES,
      required: true,
      trim: true,
      index: true,
    },

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

    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    storedName: {
      type: String,
      required: true,
      trim: true,
    },

    filePath: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },

    documentNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    issueDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: DOCUMENT_STATUS,
      default: "Pending",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

hrDocumentSchema.index({
  employee: 1,
  documentType: 1,
});

hrDocumentSchema.index({
  status: 1,
  expiryDate: 1,
});

hrDocumentSchema.index({
  createdAt: -1,
});

export {
  HR_DOCUMENT_TYPES,
  DOCUMENT_STATUS,
};

export default mongoose.model(
  "HRDocument",
  hrDocumentSchema
);