import mongoose from "mongoose";

const systemLockSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    fencingToken: {
      type: Number,
      default: 1,
      required: true,
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const SystemLock = mongoose.models.SystemLock || mongoose.model("SystemLock", systemLockSchema);

export default SystemLock;
