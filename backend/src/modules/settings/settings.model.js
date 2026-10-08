import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    company: {
      name: {
        type: String,
        default: "",
        trim: true,
        maxlength: 150,
      },

      tagline: {
        type: String,
        default: "",
        trim: true,
        maxlength: 250,
      },

      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },

      email: {
        type: String,
        default: "",
        trim: true,
        lowercase: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },

      address: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },

      state: {
        type: String,
        default: "",
        trim: true,
      },

      country: {
        type: String,
        default: "",
        trim: true,
      },

      postalCode: {
        type: String,
        default: "",
        trim: true,
      },
    },

    social: {
      linkedin: {
        type: String,
        default: "",
        trim: true,
      },

      github: {
        type: String,
        default: "",
        trim: true,
      },

      instagram: {
        type: String,
        default: "",
        trim: true,
      },

      facebook: {
        type: String,
        default: "",
        trim: true,
      },

      twitter: {
        type: String,
        default: "",
        trim: true,
      },

      youtube: {
        type: String,
        default: "",
        trim: true,
      },
    },

    seo: {
      title: {
        type: String,
        default: "",
        trim: true,
        maxlength: 160,
      },

      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: 320,
      },

      keywords: {
        type: [String],
        default: [],
      },

      ogImage: {
        type: String,
        default: "",
        trim: true,
      },

      favicon: {
        type: String,
        default: "",
        trim: true,
      },
    },

    branding: {
      logo: {
        type: String,
        default: "",
        trim: true,
      },

      darkLogo: {
        type: String,
        default: "",
        trim: true,
      },

      favicon: {
        type: String,
        default: "",
        trim: true,
      },
    },

    businessHours: {
      monday: { type: String, default: "" },
      tuesday: { type: String, default: "" },
      wednesday: { type: String, default: "" },
      thursday: { type: String, default: "" },
      friday: { type: String, default: "" },
      saturday: { type: String, default: "" },
      sunday: { type: String, default: "" },
    },

    maintenance: {
      enabled: {
        type: Boolean,
        default: false,
      },

      message: {
        type: String,
        default: "",
        maxlength: 500,
      },
    },

    features: {
      contactForm: {
        type: Boolean,
        default: true,
      },

      careerApplications: {
        type: Boolean,
        default: true,
      },

      notifications: {
        type: Boolean,
        default: true,
      },

      publicContent: {
        type: Boolean,
        default: true,
      },
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

export default mongoose.model("Settings", settingsSchema);