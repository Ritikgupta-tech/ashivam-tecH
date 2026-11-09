import mongoose from 'mongoose';

export const HANDOFF_STATUS = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING'
};

const integrationHandoffSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true
    },
    candidateEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    candidateName: {
      type: String,
      required: true,
      trim: true
    },
    correlationId: {
      type: String,
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    internshipReference: {
      type: String,
      default: null,
      index: true
    },
    deliveryStatus: {
      type: String,
      enum: Object.values(HANDOFF_STATUS),
      default: HANDOFF_STATUS.PENDING,
      index: true
    },
    payloadSnapshot: {
      type: Object,
      required: true
    },
    retryCount: {
      type: Number,
      default: 0
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true
    },
    lastError: {
      type: String,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

integrationHandoffSchema.index({ deliveryStatus: 1, nextRetryAt: 1 });

export const IntegrationHandoff = mongoose.models.IntegrationHandoff || mongoose.model('IntegrationHandoff', integrationHandoffSchema);
