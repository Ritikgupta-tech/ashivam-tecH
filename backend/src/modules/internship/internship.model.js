import mongoose from "mongoose";

import {
  INTERNSHIP_STATUSES,
  INTERNSHIP_DOMAINS,
  INTERNSHIP_DURATIONS,
} from "./internship.constants.js";

const internshipSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    college: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    course: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    year: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },

    domain: {
      type: String,
      required: true,
      enum: INTERNSHIP_DOMAINS,
    },

    duration: {
      type: String,
      enum: [...INTERNSHIP_DURATIONS, null],
      default: null,
    },

    startDate: {
      type: Date,
      default: null,
    },

    portfolio: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: null,
    },

    status: {
      type: String,
      enum: INTERNSHIP_STATUSES,
      default: "applied",
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

internshipSchema.index({ status: 1, createdAt: -1 });
internshipSchema.index({ email: 1, domain: 1 });
internshipSchema.index({ domain: 1, createdAt: -1 });

export default mongoose.model("Internship", internshipSchema);
