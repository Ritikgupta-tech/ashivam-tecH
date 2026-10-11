import "dotenv/config";
import dns from "node:dns";

// Prioritize IPv4 DNS resolution to prevent ENETUNREACH errors on cloud container networks without IPv6 routes
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // safe fallback for older Node runtimes
}

import app from "./app.js";
import env from "./config/env.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./db/database.js";
import {
  getSafeSmtpStatus,
  verifyEmailTransport,
} from "./modules/notification/email.service.js";

const startServer = async () => {
  process.on("uncaughtException", (error) => {
    console.error("[FATAL] Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
  });

  try {
    await connectDatabase();
  } catch (err) {
    console.error("[Server] Boot failed due to database connection error:", err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[Ashivam Backend] Operational on port ${env.port} (${env.nodeEnv})`);

    const emailStatus = getSafeSmtpStatus();
    if (emailStatus.configured) {
      console.log(
        `[Email Service] Provider: ${emailStatus.provider.toUpperCase()} | Configured (from: ${emailStatus.from})`
      );
      if (!env.isTest) {
        verifyEmailTransport()
          .then((verification) => {
            if (verification.verified) {
              console.log(
                `[Email Service] ${emailStatus.provider.toUpperCase()} connection & authentication verified successfully.`
              );
            } else {
              console.warn(
                `[Email Service] Transport verification warning: ${verification.message}`
              );
            }
          })
          .catch(() => {});
      }
    } else if (!env.isTest) {
      console.log(
        "[Email Service] Email transport is unconfigured. Operating in simulated dispatch mode."
      );
    }
  });

  const shutdown = async (signal) => {
    console.log(`[Server] ${signal} signal received. Initiating graceful shutdown...`);

    server.close(async () => {
      await disconnectDatabase();
      console.log("[Server] Graceful shutdown completed.");
      process.exit(0);
    });

    // Force close after 10s timeout if hung
    setTimeout(() => {
      console.error("[Server] Forced shutdown timeout reached. Exiting immediately.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer();