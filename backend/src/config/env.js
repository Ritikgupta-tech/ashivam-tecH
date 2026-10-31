import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isProd = process.env.NODE_ENV === "production";

const parseOrigins = () => {
  const defaultOrigins = isProd
    ? [
        "https://ashivam.com",
        "https://www.ashivam.com",
        "https://ashivam-tec-h.vercel.app",
        "https://ashivamtechnologies.com",
        "https://www.ashivamtechnologies.com",
      ]
    : [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://ashivam.com",
        "https://ashivam-tec-h.vercel.app",
      ];

  const clientUrl = (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    process.env.CLIENT_ORIGIN
  )?.trim();
  const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN)?.trim();

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

export const DEPLOYED_VERCEL_URL = "https://ashivam-tec-h.vercel.app";

const resolveClientUrl = () => {
  const configured = (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    process.env.CLIENT_ORIGIN ||
    ""
  ).trim().replace(/\/+$/, "");

  if (!configured) {
    return isProd ? DEPLOYED_VERCEL_URL : "http://localhost:5173";
  }

  // If configured as ashivam.com or ashivamtechnologies.com (which have no active DNS records yet),
  // automatically fall back in production to the working Vercel deployment so email links never break!
  if (
    isProd &&
    !process.env.FORCE_CUSTOM_DOMAIN &&
    /https?:\/\/(www\.)?ashivam(\.com|technologies\.com)$/i.test(configured)
  ) {
    return DEPLOYED_VERCEL_URL;
  }

  return configured;
};

const resolveAdminUrl = (clientBaseUrl) => {
  const configured = (process.env.ADMIN_URL || "").trim().replace(/\/+$/, "");

  if (configured) {
    if (
      isProd &&
      !process.env.FORCE_CUSTOM_DOMAIN &&
      /https?:\/\/(www\.)?ashivam(\.com|technologies\.com)\/admin/i.test(configured)
    ) {
      return `${DEPLOYED_VERCEL_URL}/admin`;
    }
    return configured;
  }

  return `${clientBaseUrl}/admin`;
};

const resolvedClientUrl = resolveClientUrl();
const resolvedAdminUrl = resolveAdminUrl(resolvedClientUrl);

export const MANDATED_COMPANY_NOTIFICATION_EMAIL = "team.ashivam@gmail.com";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resolveCompanyNotificationEmail = () => {
  const candidate = (
    process.env.COMPANY_NOTIFICATION_EMAIL ||
    process.env.NOTIFICATION_RECIPIENT ||
    process.env.ALERT_EMAIL ||
    process.env.CONTACT_TO_EMAIL ||
    ""
  ).trim();

  if (!candidate) {
    return MANDATED_COMPANY_NOTIFICATION_EMAIL;
  }

  const clean = candidate.toLowerCase();
  if (!EMAIL_REGEX.test(clean)) {
    console.error(
      `[Config Error] Invalid COMPANY_NOTIFICATION_EMAIL format: "${clean.replace(/[\r\n\t]/g, "")}". Defaulting to authorized company recipient: ${MANDATED_COMPANY_NOTIFICATION_EMAIL}`
    );
    return MANDATED_COMPANY_NOTIFICATION_EMAIL;
  }

  return clean;
};

const companyNotificationRecipient = resolveCompanyNotificationEmail();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest:
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.NODE_TEST_CONTEXT),

  port: Number(process.env.PORT) || 5000,

  clientUrl: resolvedClientUrl,
  adminUrl: resolvedAdminUrl,
  allowedOrigins: allowedOriginsList,

  mongodbUri:
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/ashivam_technologies",

  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production"
      ? null
      : "ashivam-default-development-secret-key-32chars-min!"),
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    (process.env.NODE_ENV === "production"
      ? null
      : "ashivam-default-refresh-secret-key-32chars-min!"),

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // Cookie Configuration for Cross-Origin Authentication
  cookieSameSite: (process.env.COOKIE_SAMESITE || (isProd ? "none" : "lax")).toLowerCase(),
  cookieSecure:
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : isProd,

  // Rate Limiting Settings
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT) || 5,
  loginRateWindowMs: Number(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000,

  publicFormRateLimit: Number(process.env.PUBLIC_FORM_RATE_LIMIT) || 10,
  publicFormRateWindowMs:
    Number(process.env.PUBLIC_FORM_RATE_WINDOW_MS) || 15 * 60 * 1000,

  globalRateLimit: Number(process.env.GLOBAL_RATE_LIMIT) || 100,
  globalRateWindowMs:
    Number(process.env.GLOBAL_RATE_WINDOW_MS) || 15 * 60 * 1000,

  // Reverse Proxy Configuration (Render / Cloudflare)
  trustProxy:
    process.env.TRUST_PROXY !== undefined
      ? (!isNaN(Number(process.env.TRUST_PROXY))
          ? Number(process.env.TRUST_PROXY)
          : process.env.TRUST_PROXY === "true"
            ? 1
            : process.env.TRUST_PROXY === "false"
              ? false
              : process.env.TRUST_PROXY)
      : (isProd ? 1 : false),

  // Email Delivery Configuration (Supports Resend HTTPS API, Brevo HTTPS API, or SMTP)
  emailProvider: (
    process.env.EMAIL_PROVIDER ||
    (process.env.RESEND_API_KEY ? "resend" : process.env.BREVO_API_KEY ? "brevo" : "smtp")
  ).toLowerCase(),
  resendApiKey: (process.env.RESEND_API_KEY || "").trim(),
  brevoApiKey: (process.env.BREVO_API_KEY || "").trim(),

  // SMTP Settings
  smtpHost: (process.env.SMTP_HOST || "").trim(),
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure:
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
      : Number(process.env.SMTP_PORT) === 465,
  smtpUser: (process.env.SMTP_USER || "").trim(),
  smtpPassword: process.env.SMTP_PASSWORD || "",
  smtpFrom:
    (process.env.SMTP_FROM || process.env.CONTACT_FROM_EMAIL || process.env.EMAIL_FROM || "").trim() ||
    (process.env.COMPANY_EMAIL
      ? `Ashivam Technologies <${process.env.COMPANY_EMAIL.trim()}>`
      : "Ashivam Technologies <teamashivam@gmail.com>"),
  emailFrom:
    (process.env.SMTP_FROM || process.env.CONTACT_FROM_EMAIL || process.env.EMAIL_FROM || "").trim() ||
    (process.env.COMPANY_EMAIL
      ? `Ashivam Technologies <${process.env.COMPANY_EMAIL.trim()}>`
      : "Ashivam Technologies <teamashivam@gmail.com>"),
  // Centralized Authorized Company Notification Recipient (Mandated: team.ashivam@gmail.com)
  companyNotificationEmail: companyNotificationRecipient,
  alertEmail: companyNotificationRecipient,
  notificationRecipient: companyNotificationRecipient,

  smtpConnectionTimeoutMs: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
  smtpGreetingTimeoutMs: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
  smtpSocketTimeoutMs: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 15000,

  isSmtpConfigured: Boolean(
    (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) ||
    (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) ||
    ((process.env.SMTP_HOST || "").trim() &&
      process.env.SMTP_PORT &&
      (process.env.SMTP_USER || "").trim() &&
      process.env.SMTP_PASSWORD)
  ),
  isEmailConfigured: Boolean(
    (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) ||
    (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) ||
    ((process.env.SMTP_HOST || "").trim() &&
      process.env.SMTP_PORT &&
      (process.env.SMTP_USER || "").trim() &&
      process.env.SMTP_PASSWORD)
  ),

  // Persistent Object Storage Configuration
  // Uses S3 if S3 credentials and bucket are provided, otherwise defaults to local filesystem
  storageProvider: (
    process.env.STORAGE_PROVIDER ||
    (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? "s3"
      : "local")
  ).toLowerCase(),
  s3Bucket: (process.env.S3_BUCKET || "").trim(),
  s3Region: (process.env.S3_REGION || "us-east-1").trim(),
  s3Endpoint: (process.env.S3_ENDPOINT || "").trim(),
  s3ForcePathStyle:
    String(process.env.S3_FORCE_PATH_STYLE).toLowerCase() === "true",
  s3AccessKeyId: (process.env.S3_ACCESS_KEY_ID || "").trim(),
  s3SecretAccessKey: (process.env.S3_SECRET_ACCESS_KEY || "").trim(),
};

if (env.isProduction) {
  if (!EMAIL_REGEX.test(env.companyNotificationEmail)) {
    throw new Error(
      `Invalid COMPANY_NOTIFICATION_EMAIL: "${env.companyNotificationEmail}". Must be a valid email address.`
    );
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is mandatory in production mode.");
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production mode.");
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET environment variable is mandatory in production mode.");
  }
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be at least 32 characters in production mode.");
  }
  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      "JWT_SECRET and JWT_REFRESH_SECRET must be distinct cryptographic secrets in production mode."
    );
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
  if (env.storageProvider === "s3") {
    if (!process.env.S3_BUCKET) {
      throw new Error(
        "S3_BUCKET environment variable is mandatory when STORAGE_PROVIDER is 's3'."
      );
    }
    if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      throw new Error(
        "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables are mandatory when STORAGE_PROVIDER is 's3'."
      );
    }
  } else if (env.storageProvider === "local") {
    if (!env.isTest) {
      console.warn(
        "[Storage] Notice: Running with local filesystem storage. For multi-instance persistent object storage, configure S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY."
      );
    }
  }
}

export default env;