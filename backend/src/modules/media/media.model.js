import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    fileName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    extension: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    size: {
      type: Number,
      required: true,
      min: 1,
    },

    category: {
      type: String,
      enum: [
        "image",
        "document",
        "video",
        "other",
      ],
      default: "other",
      index: true,
    },

    storagePath: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

mediaSchema.index({
  originalName: "text",
  fileName: "text",
});

export default mongoose.model("Media", mediaSchema);