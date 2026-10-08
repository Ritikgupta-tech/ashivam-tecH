import "dotenv/config";
import app from "./app.js";
import env from "./config/env.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./db/database.js";

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