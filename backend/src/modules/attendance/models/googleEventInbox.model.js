import mongoose from "mongoose";

const googleEventInboxSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subscription: {
      type: String,
      trim: true,
      default: null,
    },
    eventType: {
      type: String,
      trim: true,
      index: true,
    },
    publishTime: {
      type: Date,
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

googleEventInboxSchema.index({ processed: 1, createdAt: 1 });

const GoogleEventInbox =
  mongoose.models.GoogleEventInbox ||
  mongoose.model("GoogleEventInbox", googleEventInboxSchema);

export default GoogleEventInbox;
