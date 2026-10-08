import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

const parseOrigins = () => {
  const defaultOrigins = isProd
    ? [
        "https://ashivam-tec-h.vercel.app",
        "https://ashivamtechnologies.com",
        "https://www.ashivamtechnologies.com",
      ]
    : [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://ashivam-tec-h.vercel.app",
      ];

  const clientUrl = process.env.CLIENT_URL?.trim();
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS?.trim();

  const customOrigins = [];
  if (clientUrl) {
    customOrigins.push(...clientUrl.split(",").map((s) => s.trim()));
  }
  if (allowedOriginsEnv) {
    customOrigins.push(...allowedOriginsEnv.split(",").map((s) => s.trim()));
  }

  let combined = Array.from(new Set([...defaultOrigins, ...customOrigins])).filter(Boolean);

  if (isProd) {
    combined = combined.filter(
      (origin) => !origin.includes("localhost") && !origin.includes("127.0.0.1")
    );
  }

  return combined;
};

const allowedOriginsList = parseOrigins();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",

  port: Number(process.env.PORT) || 5000,

  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  allowedOrigins: allowedOriginsList,

  mongodbUri:
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/ashivam_technologies",

  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production"
      ? null
      : "ashivam-default-development-secret-key-32chars-min!"),

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",

  // Rate Limiting Settings
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT) || 5,
  loginRateWindowMs: Number(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000,

  publicFormRateLimit: Number(process.env.PUBLIC_FORM_RATE_LIMIT) || 10,
  publicFormRateWindowMs:
    Number(process.env.PUBLIC_FORM_RATE_WINDOW_MS) || 15 * 60 * 1000,

  globalRateLimit: Number(process.env.GLOBAL_RATE_LIMIT) || 100,
  globalRateWindowMs:
    Number(process.env.GLOBAL_RATE_WINDOW_MS) || 15 * 60 * 1000,

  // SMTP Settings
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
  emailFrom:
    process.env.EMAIL_FROM ||
    "Ashivam Technologies <no-reply@ashivamtechnologies.com>",
  notificationRecipient:
    process.env.NOTIFICATION_RECIPIENT || "admin@ashivamtechnologies.com",

  isSmtpConfigured: Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
  ),
};

if (env.isProduction) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is mandatory in production mode.");
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production mode.");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is mandatory in production mode.");
  }
  if (
    process.env.MONGODB_URI.includes("127.0.0.1") ||
    process.env.MONGODB_URI.includes("localhost")
  ) {
    throw new Error(
      "Localhost/127.0.0.1 MongoDB URI cannot be used in production mode. A real MongoDB Atlas connection string is required."
    );
  }
}

export default env;