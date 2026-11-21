import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isProd = process.env.NODE_ENV === "production";

const deriveRefreshSecret = (secret) => {
  if (!secret) return null;
  return crypto
    .createHmac("sha256", secret)
    .update("ashivam_technologies_jwt_refresh_token_derivation_secret_key_v1")
    .digest("hex");
};

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

export const MANDATED_COMPANY_NOTIFICATION_EMAIL = "ritik95061@gmail.com";
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

const isTestRunner = Boolean(
  process.env.NODE_ENV === "test" ||
  process.env.NODE_TEST_CONTEXT ||
  process.argv.some((arg) => typeof arg === "string" && (/--test/i.test(arg) || /tests?[\\/]/i.test(arg)))
);

const env = {
  nodeEnv: process.env.NODE_ENV || (isTestRunner ? "test" : "development"),
  isProduction: process.env.NODE_ENV === "production",
  isTest: isTestRunner,

  port: Number(process.env.PORT) || 5000,

  clientUrl: resolvedClientUrl,
  adminUrl: resolvedAdminUrl,
  allowedOrigins: allowedOriginsList,

  mongodbUri:
    (isTestRunner || process.env.NODE_ENV === "test")
      ? (process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/ashivam_technologies_test")
      : (process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ashivam_technologies"),

  jwtSecret:
    (process.env.JWT_SECRET || "").trim() ||
    (process.env.NODE_ENV === "production"
      ? null
      : "ashivam-default-development-secret-key-32chars-min!"),
  jwtRefreshSecret:
    (process.env.JWT_REFRESH_SECRET || "").trim() ||
    (process.env.JWT_SECRET ? deriveRefreshSecret(process.env.JWT_SECRET.trim()) : null) ||
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

  // Email Delivery Configuration — Primary & Exclusive Transport: SMTP (Nodemailer)
  emailProvider: (process.env.EMAIL_PROVIDER || "smtp").toLowerCase().trim(),
  resendApiKey: (process.env.RESEND_API_KEY || "").trim(),
  resendFrom: (process.env.RESEND_FROM || "").trim(),
  brevoApiKey: (process.env.BREVO_API_KEY || "").trim(),
  brevoSender:
    (/teamashivam@gmail\.com/i.test(process.env.BREVO_SENDER || process.env.BREVO_FROM || process.env.BREVO_VERIFIED_SENDER || "")
      ? "Ashivam Technologies <ritik95061@gmail.com>"
      : (process.env.BREVO_SENDER || process.env.BREVO_FROM || process.env.BREVO_VERIFIED_SENDER || "").trim()) ||
    "Ashivam Technologies <ritik95061@gmail.com>",

  // SMTP Settings
  smtpHost: (process.env.SMTP_HOST || "smtp.gmail.com").trim(),
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpSecure:
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
      : (Number(process.env.SMTP_PORT) === 465 || !process.env.SMTP_PORT),
  smtpUser: (process.env.SMTP_USER || "").trim(),
  smtpPassword: (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim(),
  smtpFrom:
    ((process.env.BREVO_VERIFIED_SENDER || process.env.BREVO_SENDER) &&
    (process.env.SMTP_HOST || "").toLowerCase().match(/(brevo|mailin|sendinblue)/)
      ? `Ashivam Technologies <${(process.env.BREVO_VERIFIED_SENDER || process.env.BREVO_SENDER).trim()}>`
      : null) ||
    ((process.env.SMTP_HOST || "").toLowerCase().match(/(brevo|mailin|sendinblue)/) &&
    /teamashivam@gmail\.com/i.test(process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.COMPANY_EMAIL || "")
      ? "Ashivam Technologies <ritik95061@gmail.com>"
      : null) ||
    (process.env.SMTP_FROM || process.env.CONTACT_FROM_EMAIL || process.env.EMAIL_FROM || "").trim() ||
    (process.env.COMPANY_EMAIL
      ? `Ashivam Technologies <${process.env.COMPANY_EMAIL.trim()}>`
      : "Ashivam Technologies <ritik95061@gmail.com>"),
  emailFrom:
    ((process.env.BREVO_VERIFIED_SENDER || process.env.BREVO_SENDER) &&
    (process.env.SMTP_HOST || "").toLowerCase().match(/(brevo|mailin|sendinblue)/)
      ? `Ashivam Technologies <${(process.env.BREVO_VERIFIED_SENDER || process.env.BREVO_SENDER).trim()}>`
      : null) ||
    ((process.env.SMTP_HOST || "").toLowerCase().match(/(brevo|mailin|sendinblue)/) &&
    /teamashivam@gmail\.com/i.test(process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.COMPANY_EMAIL || "")
      ? "Ashivam Technologies <ritik95061@gmail.com>"
      : null) ||
    (process.env.SMTP_FROM || process.env.CONTACT_FROM_EMAIL || process.env.EMAIL_FROM || "").trim() ||
    (process.env.COMPANY_EMAIL
      ? `Ashivam Technologies <${process.env.COMPANY_EMAIL.trim()}>`
      : "Ashivam Technologies <ritik95061@gmail.com>"),
  // Centralized Authorized Company Notification Recipient (Mandated: ritik95061@gmail.com)
  companyNotificationEmail: companyNotificationRecipient,
  alertEmail: companyNotificationRecipient,
  notificationRecipient: companyNotificationRecipient,

  smtpConnectionTimeoutMs: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 7000,
  smtpGreetingTimeoutMs: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 7000,
  smtpSocketTimeoutMs: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 10000,

  isSmtpConfigured: Boolean(
    (process.env.SMTP_HOST || "smtp.gmail.com").trim() &&
    (process.env.SMTP_USER || "").trim() &&
    (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim()
  ),
  isEmailConfigured: Boolean(
    (process.env.SMTP_HOST || "smtp.gmail.com").trim() &&
    (process.env.SMTP_USER || "").trim() &&
    (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim()
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

  // Service-to-Service Integration Configuration (Phase 6)
  internshipServiceUrl: (process.env.INTERNSHIP_SERVICE_URL || "http://localhost:5001").replace(/\/$/, ""),
  internshipServiceSecret: (process.env.INTERNSHIP_SERVICE_SECRET || "ashivam_sec_svc_internship_handover_2026_xyz987").trim(),

  // Google Workspace & Meet Attendance Configuration
  get googleClientId() {
    return (process.env.GOOGLE_CLIENT_ID || "").trim();
  },
  get googleClientSecret() {
    return (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  },
  get googleRedirectUri() {
    const raw = (process.env.GOOGLE_REDIRECT_URI || "").trim();
    if (raw) return raw;
    return this.isProduction
      ? "https://ashivam-tech.onrender.com/api/v1/google/oauth/callback"
      : "http://localhost:5000/api/v1/google/oauth/callback";
  },
  get googleOAuthScopes() {
    const defaultScopes = "https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/meetings.space.readonly openid email";
    const raw = (process.env.GOOGLE_OAUTH_SCOPES || defaultScopes).trim();
    return raw.split(/\s+/).filter(Boolean);
  },
  get isGoogleOAuthConfigured() {
    return Boolean(this.googleClientId && this.googleClientSecret && this.googleRedirectUri);
  },
  get googleCloudProjectId() {
    return (process.env.GOOGLE_CLOUD_PROJECT_ID || "ashivam-meet-attendance").trim();
  },
  get googlePubSubTopic() {
    return (process.env.GOOGLE_PUBSUB_TOPIC || "projects/ashivam-meet-attendance/topics/ashivam-meet-events").trim();
  },
  get googlePubSubSubscription() {
    return (process.env.GOOGLE_PUBSUB_SUBSCRIPTION || "projects/ashivam-meet-attendance/subscriptions/ashivam-meet-events-sub").trim();
  },
  get googlePubSubSecret() {
    return (process.env.GOOGLE_PUBSUB_SECRET || process.env.PUBSUB_VERIFICATION_TOKEN || "ashivam_pubsub_sec_key_2026").trim();
  },
  get googleTokenEncryptionKey() {
    return (process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "ashivam_meet_token_encryption_key_32b!").trim();
  },
};

if (env.isProduction) {
  if (!EMAIL_REGEX.test(env.companyNotificationEmail)) {
    throw new Error(
      `Invalid COMPANY_NOTIFICATION_EMAIL: "${env.companyNotificationEmail}". Must be a valid email address.`
    );
  }
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET environment variable is mandatory in production mode.");
  }
  if (env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production mode.");
  }
  if (!env.jwtRefreshSecret) {
    throw new Error(
      "JWT_REFRESH_SECRET (or a valid JWT_SECRET to derive from) is mandatory in production mode."
    );
  }
  if (env.jwtRefreshSecret.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be at least 32 characters in production mode.");
  }
  if (env.jwtSecret === env.jwtRefreshSecret) {
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

/**
 * Validates required SMTP environment configuration.
 * Returns structured validation result without throwing, defending against boot crashes.
 */
export const validateSmtpConfig = (customEnv = env) => {
  const errors = [];
  const missing = [];

  const host = (customEnv.smtpHost || "").trim();
  const port = Number(customEnv.smtpPort);
  const user = (customEnv.smtpUser || "").trim();
  const pass = (customEnv.smtpPassword || "").trim();

  if (!host) {
    missing.push("SMTP_HOST");
    errors.push("SMTP_HOST is required (e.g. smtp.gmail.com)");
  }
  if (!port || isNaN(port) || port <= 0 || port > 65535) {
    missing.push("SMTP_PORT");
    errors.push("SMTP_PORT must be a valid port number (e.g. 465 or 587)");
  }
  if (!user) {
    missing.push("SMTP_USER");
    errors.push("SMTP_USER is required");
  }
  if (!pass) {
    missing.push("SMTP_PASS / SMTP_PASSWORD");
    errors.push("SMTP_PASS or SMTP_PASSWORD is required");
  }

  return {
    valid: errors.length === 0,
    errors,
    missing,
  };
};

export default env;