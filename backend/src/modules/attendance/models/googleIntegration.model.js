import mongoose from "mongoose";

const googleIntegrationSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      default: "google_meet",
      unique: true,
      required: true,
    },
    encryptedRefreshToken: {
      type: String,
      default: null,
    },
    iv: {
      type: String,
      default: null,
    },
    authTag: {
      type: String,
      default: null,
    },
    accessToken: {
      type: String,
      default: null,
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    scopes: {
      type: [String],
      default: [],
    },
    connectedAccountEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "CONNECTED",
        "REAUTH_REQUIRED",
        "DEGRADED",
        "SUBSCRIPTION_SUSPENDED",
        "RECONCILIATION_PENDING",
        "ERROR",
        "DISCONNECTED",
      ],
      default: "DISCONNECTED",
      index: true,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
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

const GoogleIntegration =
  mongoose.models.GoogleIntegration ||
  mongoose.model("GoogleIntegration", googleIntegrationSchema);

export default GoogleIntegration;
