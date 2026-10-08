import mongoose from "mongoose";
import env from "../config/env.js";

let isConnecting = false;

export const connectDatabase = async (customUri = null) => {
  const uri = customUri || env.mongodbUri;

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return;
  }

  isConnecting = true;

  try {
    const options = {
      autoIndex: !env.isProduction,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    await mongoose.connect(uri, options);
    console.log(`[Database] MongoDB connected successfully: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("[Database] MongoDB connection failed:", error.message);
    if (!env.isTest) {
      process.exit(1);
    }
    throw error;
  } finally {
    isConnecting = false;
  }

  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log("[Database] MongoDB connection closed cleanly");
  }
};

export const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

mongoose.connection.on("disconnected", () => {
  if (!env.isTest) {
    console.warn("[Database] MongoDB disconnected. Awaiting automatic reconnect...");
  }
});

mongoose.connection.on("reconnected", () => {
  console.log("[Database] MongoDB reconnected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("[Database] MongoDB runtime error:", err.message);
});