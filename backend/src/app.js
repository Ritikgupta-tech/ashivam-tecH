import express from "express";
import helmet from "helmet";
import cors from "cors";

import env from "./config/env.js";
import requestIdMiddleware from "./middlewares/requestId.middleware.js";
import { globalLimiter } from "./middlewares/rateLimit.middleware.js";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import inquiryRoutes from "./modules/inquiry/inquiry.routes.js";
import careerRoutes from "./modules/career/career.routes.js";
import internshipRoutes from "./modules/internship/internship.routes.js";
import contentRoutes from "./modules/content/content.routes.js";
import mediaRoutes from "./modules/media/media.routes.js";
import notificationRoutes from "./modules/notification/notification.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import employeeRoutes from "./modules/employee/employee.routes.js";
import employeeDocumentRoutes from "./modules/employee-document/employee-document.routes.js";
import hrDocumentRoutes from "./modules/hr-document/hrDocument.routes.js";

import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/error.middleware.js";

const app = express();

app.disable("x-powered-by");

/*
 * Request Correlation ID
 */
app.use(requestIdMiddleware);

/*
 * Security headers via Helmet
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // API server: avoid CSP blocking JSON responses
  })
);

/*
 * Multi-Origin CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or curl requests with no origin
    if (!origin) {
      return callback(null, true);
    }

    if (env.allowedOrigins.includes(origin) || !env.isProduction) {
      return callback(null, true);
    }

    const error = new Error(`Origin ${origin} not allowed by CORS`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
};

app.use(cors(corsOptions));

/*
 * Global Rate Limiting
 */
app.use(globalLimiter);

/*
 * Request body parsing with strict size bounds
 */
app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

/*
 * Static uploads directory (safe file serving, index traversal denied)
 */
app.use(
  "/uploads",
  express.static("uploads", {
    index: false,
    dotfiles: "deny",
  })
);

/*
 * Root Discovery
 */
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Ashivam Technologies Official API",
    version: "v1",
    documentation: "/api/v1/health",
    requestId: req.id,
  });
});

/*
 * API v1 Routes
 */
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/inquiries", inquiryRoutes);
app.use("/api/v1/internships", internshipRoutes);
app.use("/api/v1/career", careerRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/employee-documents", employeeDocumentRoutes);
app.use("/api/v1/hr-documents", hrDocumentRoutes);

/*
 * 404 handler
 */
app.use(notFoundHandler);

/*
 * Centralized global error handler
 */
app.use(errorHandler);

export default app;
