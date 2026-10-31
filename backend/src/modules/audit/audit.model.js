import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
      },

      username: {
        type: String,
        default: null,
        trim: true,
      },

      role: {
        type: String,
        default: null,
        trim: true,
      },
    },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    entity: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    entityId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    request: {
      method: {
        type: String,
        default: null,
      },

      path: {
        type: String,
        default: null,
      },

      ip: {
        type: String,
        default: null,
      },

      userAgent: {
        type: String,
        default: null,
      },
    },

    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ "actor.userId": 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, entity: 1, "actor.userId": 1, createdAt: -1 });

// Strictly enforce immutability: Audit logs cannot be modified or deleted
const forbidAuditMutation = function () {
  const err = new Error(
    "Audit logs are strictly append-only and immutable for compliance and security."
  );
  err.statusCode = 403;
  throw err;
};

// Document-level middleware: forbid updating an existing audit document via save()
auditLogSchema.pre("save", function () {
  if (!this.isNew) {
    forbidAuditMutation();
  }
});

// Query-level middleware: forbid all update, replacement, and deletion queries
auditLogSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "findOneAndRemove",
  ],
  forbidAuditMutation
);

export default mongoose.model("AuditLog", auditLogSchema);