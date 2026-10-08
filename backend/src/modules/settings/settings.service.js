import Settings from "./settings.model.js";

const SETTINGS_KEY = "website";

const defaultSettings = {
  key: SETTINGS_KEY,

  company: {
    name: "",
    tagline: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  },

  social: {
    linkedin: "",
    github: "",
    instagram: "",
    facebook: "",
    twitter: "",
    youtube: "",
  },

  seo: {
    title: "",
    description: "",
    keywords: [],
    ogImage: "",
    favicon: "",
  },

  branding: {
    logo: "",
    darkLogo: "",
    favicon: "",
  },

  businessHours: {
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  },

  maintenance: {
    enabled: false,
    message: "",
  },

  features: {
    contactForm: true,
    careerApplications: true,
    notifications: true,
    publicContent: true,
  },
};

export const getSettings = async () => {
  let settings = await Settings.findOne({
    key: SETTINGS_KEY,
  }).lean();

  if (!settings) {
    settings = await Settings.create(defaultSettings);
    settings = settings.toObject();
  }

  return settings;
};

export const updateSettings = async (
  payload,
  adminId
) => {
  const settings = await Settings.findOneAndUpdate(
    {
      key: SETTINGS_KEY,
    },
    {
      $set: {
        ...payload,
        key: SETTINGS_KEY,
        updatedBy: adminId,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  ).lean();

  return settings;
};

export const resetSettings = async (adminId) => {
  const settings = await Settings.findOneAndUpdate(
    {
      key: SETTINGS_KEY,
    },
    {
      $set: {
        ...defaultSettings,
        updatedBy: adminId,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  ).lean();

  return settings;
};

export const getPublicSettings = async () => {
  const settings = await getSettings();

  return {
    company: settings.company,
    social: settings.social,
    seo: settings.seo,
    branding: settings.branding,
    businessHours: settings.businessHours,
    maintenance: settings.maintenance,
    features: settings.features,
  };
};
